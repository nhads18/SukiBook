-- ============================================================
-- SukiBook · Supabase schema (run once in the SQL Editor)
-- Vercel + Supabase stack · offline-first · last-write-wins
-- ============================================================

-- ---------- tables ----------

create table if not exists sb_products (
  id         text primary key,
  store_id   uuid not null,
  name       text not null check (char_length(name) <= 120),
  cat        text not null check (cat in ('noodles','coffee','snacks','drinks','staples','household','personal')),
  price      numeric(10,2) not null check (price >= 0),
  cost       numeric(10,2) not null check (cost >= 0),
  stock      integer not null check (stock >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists sb_customers (
  id       text primary key,
  store_id uuid not null,
  name     text not null check (char_length(name) <= 120),
  phone    text check (char_length(coalesce(phone,'')) <= 32),
  balance  numeric(12,2) not null default 0 check (balance >= 0),
  history  jsonb not null default '[]'::jsonb
);

create table if not exists sb_sales (
  id          text primary key,
  store_id    uuid not null,
  payment     text not null check (payment in ('cash','gcash','utang')),
  total       numeric(12,2) not null check (total >= 0),
  ts          timestamptz not null default now(),
  customer_id text,
  items       jsonb not null default '[]'::jsonb
);

create table if not exists sb_movements (
  id         text primary key,
  store_id   uuid not null,
  product_id text not null,
  name       text not null check (char_length(name) <= 120),
  type       text not null check (type in ('restock','sale')),
  qty        integer not null check (qty <> 0 and abs(qty) <= 100000),
  ts         timestamptz not null default now()
);

create table if not exists sb_settings (
  store_id uuid primary key,
  doc      jsonb not null default '{}'::jsonb
);

-- ---------- indexes ----------

create index if not exists sb_products_store  on sb_products  (store_id);
create index if not exists sb_customers_store on sb_customers (store_id);
create index if not exists sb_sales_store_ts  on sb_sales     (store_id, ts desc);
create index if not exists sb_mov_store_ts    on sb_movements (store_id, ts desc);

-- ---------- row level security ----------

alter table sb_products  enable row level security;
alter table sb_customers enable row level security;
alter table sb_sales     enable row level security;
alter table sb_movements enable row level security;
alter table sb_settings  enable row level security;

drop policy if exists p_products  on sb_products;
drop policy if exists p_customers on sb_customers;
drop policy if exists p_sales     on sb_sales;
drop policy if exists p_movements on sb_movements;
drop policy if exists p_settings  on sb_settings;

create policy p_products  on sb_products  for all using (store_id = auth.uid()) with check (store_id = auth.uid());
create policy p_customers on sb_customers for all using (store_id = auth.uid()) with check (store_id = auth.uid());
create policy p_sales     on sb_sales     for all using (store_id = auth.uid()) with check (store_id = auth.uid());
create policy p_movements on sb_movements for all using (store_id = auth.uid()) with check (store_id = auth.uid());
create policy p_settings  on sb_settings  for all using (store_id = auth.uid()) with check (store_id = auth.uid());

-- ---------- atomic push RPC ----------
-- Replaces a store's collections in ONE transaction. store_id is stamped
-- from the JWT (auth.uid()); the client never sends ownership.

create or replace function sb_push_store(
  p_products  jsonb,
  p_customers jsonb,
  p_sales     jsonb,
  p_movements jsonb,
  p_settings  jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := auth.uid();
begin
  if sid is null then
    raise exception 'not authenticated';
  end if;

  delete from sb_movements where store_id = sid;
  delete from sb_sales     where store_id = sid;
  delete from sb_customers where store_id = sid;
  delete from sb_products  where store_id = sid;

  insert into sb_products (id, store_id, name, cat, price, cost, stock, updated_at)
  select x->>'id', sid, x->>'name', x->>'cat', (x->>'price')::numeric,
         (x->>'cost')::numeric, (x->>'stock')::int, coalesce((x->>'updated_at')::timestamptz, now())
  from jsonb_array_elements(p_products) x;

  insert into sb_customers (id, store_id, name, phone, balance, history)
  select x->>'id', sid, x->>'name', x->>'phone', coalesce((x->>'balance')::numeric, 0),
         coalesce(x->'history', '[]'::jsonb)
  from jsonb_array_elements(p_customers) x;

  insert into sb_sales (id, store_id, payment, total, ts, customer_id, items)
  select x->>'id', sid, x->>'payment', (x->>'total')::numeric,
         coalesce((x->>'ts')::timestamptz, now()), x->>'customer_id',
         coalesce(x->'items', '[]'::jsonb)
  from jsonb_array_elements(p_sales) x;

  insert into sb_movements (id, store_id, product_id, name, type, qty, ts)
  select x->>'id', sid, x->>'product_id', x->>'name', x->>'type', (x->>'qty')::int,
         coalesce((x->>'ts')::timestamptz, now())
  from jsonb_array_elements(p_movements) x;

  insert into sb_settings (store_id, doc) values (sid, p_settings)
  on conflict (store_id) do update set doc = excluded.doc;
end;
$$;

-- ---------- product photos bucket (Phase 2) ----------

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists photos_read   on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_update on storage.objects;

create policy photos_read   on storage.objects for select using (bucket_id = 'product-photos');
create policy photos_insert on storage.objects for insert with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update on storage.objects for update using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
