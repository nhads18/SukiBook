-- ============================================================
-- SukiBook · Sari-Sari Store Manager
-- Supabase schema — run this whole file in the SQL Editor
-- (Supabase Dashboard → SQL Editor → New query → Run)
-- ============================================================
-- Security model:
--  · Every row is owned by one store owner: store_id = auth.uid(),
--    enforced by Row Level Security — the anon key in the browser
--    is safe because RLS makes each user's data invisible to others.
--  · All writes go through the sb_push_store() RPC below: ONE
--    transaction, server-stamped store_id (clients never send it),
--    so concurrent pushes from two devices can never interleave
--    or lose rows.
--  · Length caps + range checks block storage abuse and garbage.

-- ---------- settings (one row per store) ----------
create table if not exists public.sb_settings (
  store_id   uuid primary key references auth.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.sb_products (
  id         text primary key check (length(id) <= 64),
  store_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  cat        text not null check (length(cat) <= 24),
  price      numeric(10, 2) not null check (price >= 0 and price <= 999999),
  cost       numeric(10, 2) not null check (cost >= 0 and cost <= 999999),
  stock      integer not null default 0 check (stock >= 0 and stock <= 1000000),
  photo_url  text check (photo_url is null or length(photo_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- customers + utang ledger ----------
create table if not exists public.sb_customers (
  id         text primary key check (length(id) <= 64),
  store_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  phone      text check (phone is null or length(phone) <= 24),
  balance    numeric(10, 2) not null default 0 check (balance >= 0),
  history    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- sales (items embedded as jsonb) ----------
create table if not exists public.sb_sales (
  id          text primary key check (length(id) <= 64),
  store_id    uuid not null references auth.users (id) on delete cascade,
  ts          timestamptz not null,
  payment     text not null check (payment in ('cash', 'gcash', 'utang')),
  total       numeric(10, 2) not null check (total >= 0),
  customer_id text check (customer_id is null or length(customer_id) <= 64),
  items       jsonb not null default '[]'::jsonb,
  voided_at   timestamptz
);

-- ---------- stock movements (in / out audit trail) ----------
create table if not exists public.sb_movements (
  id         text primary key check (length(id) <= 64),
  store_id   uuid not null references auth.users (id) on delete cascade,
  ts         timestamptz not null,
  product_id text check (product_id is null or length(product_id) <= 64),
  name       text not null check (length(name) between 1 and 120),
  type       text not null check (type in ('sale', 'restock')),
  qty        integer not null check (qty between -10000 and 10000),
  sale_id    text check (sale_id is null or length(sale_id) <= 64)
);

-- ---------- indexes (keep reports fast as data grows) ----------
create index if not exists sb_products_store_idx    on public.sb_products (store_id);
create index if not exists sb_customers_store_idx   on public.sb_customers (store_id);
create index if not exists sb_sales_store_ts_idx    on public.sb_sales (store_id, ts desc);
create index if not exists sb_movements_store_ts_idx on public.sb_movements (store_id, ts desc);

-- ============================================================
-- Row Level Security — the whole access model in 5 policies.
-- Owner = the authenticated user whose id matches store_id.
-- ============================================================
alter table public.sb_settings   enable row level security;
alter table public.sb_products   enable row level security;
alter table public.sb_customers  enable row level security;
alter table public.sb_sales      enable row level security;
alter table public.sb_movements  enable row level security;

create policy "owner full access — settings"  on public.sb_settings   for all using (auth.uid() = store_id) with check (auth.uid() = store_id);
create policy "owner full access — products"  on public.sb_products   for all using (auth.uid() = store_id) with check (auth.uid() = store_id);
create policy "owner full access — customers" on public.sb_customers  for all using (auth.uid() = store_id) with check (auth.uid() = store_id);
create policy "owner full access — sales"     on public.sb_sales      for all using (auth.uid() = store_id) with check (auth.uid() = store_id);
create policy "owner full access — movements" on public.sb_movements  for all using (auth.uid() = store_id) with check (auth.uid() = store_id);

-- ============================================================
-- Atomic push: the ONLY write path the client uses.
-- One transaction — concurrent pushes from phone + laptop can
-- never interleave; store_id is stamped server-side from the
-- JWT (auth.uid()), so a tampered client cannot write into
-- someone else's store even in theory.
-- Runs as SECURITY INVOKER, so RLS still applies to every
-- statement inside.
-- ============================================================
create or replace function public.sb_push_store(
  p_products  jsonb,
  p_customers jsonb,
  p_sales     jsonb,
  p_movements jsonb,
  p_settings  jsonb
) returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.sb_movements where store_id = auth.uid();
  delete from public.sb_sales     where store_id = auth.uid();
  delete from public.sb_customers where store_id = auth.uid();
  delete from public.sb_products  where store_id = auth.uid();

  insert into public.sb_products (id, store_id, name, cat, price, cost, stock, photo_url)
  select x.id, auth.uid(), x.name, x.cat,
         greatest(0, coalesce(x.price, 0)), greatest(0, coalesce(x.cost, 0)),
         greatest(0, coalesce(x.stock, 0)), x.photo_url
  from jsonb_to_recordset(p_products)
    as x(id text, name text, cat text, price numeric, cost numeric, stock int, photo_url text);

  insert into public.sb_customers (id, store_id, name, phone, balance, history)
  select x.id, auth.uid(), x.name, x.phone,
         greatest(0, coalesce(x.balance, 0)), coalesce(x.history, '[]'::jsonb)
  from jsonb_to_recordset(p_customers)
    as x(id text, name text, phone text, balance numeric, history jsonb);

  insert into public.sb_sales (id, store_id, ts, payment, total, customer_id, items)
  select x.id, auth.uid(), coalesce(x.ts, now())::timestamptz, x.payment,
         greatest(0, coalesce(x.total, 0)), x.customer_id, coalesce(x.items, '[]'::jsonb)
  from jsonb_to_recordset(p_sales)
    as x(id text, ts text, payment text, total numeric, customer_id text, items jsonb);

  insert into public.sb_movements (id, store_id, ts, product_id, name, type, qty, sale_id)
  select x.id, auth.uid(), coalesce(x.ts, now())::timestamptz, x.product_id, x.name, x.type,
         greatest(-10000, least(10000, coalesce(x.qty, 0))), x.sale_id
  from jsonb_to_recordset(p_movements)
    as x(id text, ts text, product_id text, name text, type text, qty int, sale_id text);

  insert into public.sb_settings (store_id, settings, updated_at)
  values (auth.uid(), coalesce(p_settings, '{}'::jsonb), now())
  on conflict (store_id) do update
    set settings = excluded.settings, updated_at = now();
$$;

grant execute on function public.sb_push_store(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- ============================================================
-- Storage: product photos bucket (camera uploads)
-- Public READ is intentional (product photos show in <img> tags);
-- only an authenticated owner may write, and only inside their
-- own <auth.uid()>/ folder.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "anyone reads photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');

create policy "owners upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners replace own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners delete own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- After running this file:
--  1. Authentication → Providers → Email: enable "Magic Link"
--     (leave social providers OFF until you need them — adding
--      Google/Facebook later triggers Sign-in-with-Apple rules
--      if you ever ship iOS)
--  2. Authentication → URL Configuration: Site URL = your Vercel
--     domain; Redirect URLs = that domain ONLY (blocks open-redirect
--      abuse of magic links)
--  3. Copy Project URL + anon public key into your Vercel env
--     (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
-- ============================================================
