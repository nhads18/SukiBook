-- ============================================================
-- SukiBook · Sari-Sari Store Manager
-- Supabase schema — run this whole file in the SQL Editor
-- (Supabase Dashboard → SQL Editor → New query → Run)
-- ============================================================
-- Tables are namespaced `sb_*`. Every row is owned by one store
-- owner via `store_id` = auth.uid(), enforced by Row Level
-- Security below — the anon key in the frontend is safe because
-- RLS makes each user's data invisible to everyone else.

-- ---------- settings (one row per store) ----------
create table if not exists public.sb_settings (
  store_id   uuid primary key references auth.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.sb_products (
  id         text primary key,
  store_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  cat        text not null,
  price      numeric(10, 2) not null check (price >= 0),
  cost       numeric(10, 2) not null check (cost >= 0),
  stock      integer not null default 0 check (stock >= 0),
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- customers + utang ledger ----------
create table if not exists public.sb_customers (
  id         text primary key,
  store_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  phone      text,
  balance    numeric(10, 2) not null default 0 check (balance >= 0),
  history    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- sales (items embedded as jsonb) ----------
create table if not exists public.sb_sales (
  id          text primary key,
  store_id    uuid not null references auth.users (id) on delete cascade,
  ts          timestamptz not null,
  payment     text not null check (payment in ('cash', 'gcash', 'utang')),
  total       numeric(10, 2) not null check (total >= 0),
  customer_id text,
  items       jsonb not null default '[]'::jsonb,
  voided_at   timestamptz
);

-- ---------- stock movements (in / out audit trail) ----------
create table if not exists public.sb_movements (
  id         text primary key,
  store_id   uuid not null references auth.users (id) on delete cascade,
  ts         timestamptz not null,
  product_id text,
  name       text not null,
  type       text not null check (type in ('sale', 'restock')),
  qty        integer not null,
  sale_id    text
);

-- ---------- indexes (keep reports fast as data grows) ----------
create index if not exists sb_products_store_idx    on public.sb_products (store_id);
create index if not exists sb_customers_store_idx   on public.sb_customers (store_id);
create index if not exists sb_sales_store_ts_idx    on public.sb_sales (store_id, ts desc);
create index if not exists sb_movements_store_ts_idx on public.sb_movements (store_id, ts desc);

-- ============================================================
-- Row Level Security — the whole security model in 5 policies.
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
-- Storage: product photos bucket (Phase-2 camera uploads)
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

create policy "owners delete own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- After running this file:
--  1. Authentication → Providers → Email: enable "Magic Link"
--  2. Copy Project URL + anon public key into your Vercel env
--     (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
-- ============================================================
