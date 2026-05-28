-- M.M Bags initial schema
-- Apply via: supabase db push (or paste into Supabase SQL editor)

-- =====================
-- CATALOG
-- =====================

create table if not exists public.collections (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name_ar         text not null,
  name_en         text not null,
  description_ar  text,
  description_en  text,
  cover_image     text,
  sort_order      int default 0,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  collection_id   uuid references public.collections(id) on delete set null,
  name_ar         text not null,
  name_en         text not null,
  description_ar  text,
  description_en  text,
  base_price      numeric(10,2) not null,
  sale_price      numeric(10,2),
  images          text[] default '{}',
  tags            text[] default '{}',
  material_ar     text,
  material_en     text,
  weight_kg       numeric(4,2),
  is_active       boolean default true,
  sort_order      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists products_collection_idx on public.products(collection_id);
create index if not exists products_active_idx on public.products(is_active);

create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products(id) on delete cascade,
  color_ar       text,
  color_en       text,
  color_hex      text,
  size_inches    int,
  size_label_ar  text,
  is_set         boolean default false,
  sku            text unique,
  stock_qty      int default 0,
  price_override numeric(10,2),
  created_at     timestamptz default now()
);
create index if not exists variants_product_idx on public.product_variants(product_id);

-- =====================
-- ORDERS
-- =====================

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text unique not null,
  user_id           uuid references auth.users(id) on delete set null,
  guest_email       text,
  guest_phone       text,
  status            text default 'pending'
    check (status in ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled')),
  payment_method    text not null check (payment_method in ('card','cod')),
  payment_status    text default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  paymob_order_id   text,
  subtotal          numeric(10,2) not null,
  shipping_fee      numeric(10,2) default 0,
  discount_amount   numeric(10,2) default 0,
  loyalty_discount  numeric(10,2) default 0,
  total             numeric(10,2) not null,
  shipping_address  jsonb not null,
  referral_code     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references public.orders(id) on delete cascade,
  variant_id      uuid references public.product_variants(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  qty             int not null check (qty > 0),
  unit_price      numeric(10,2) not null,
  snapshot_name   text,
  snapshot_image  text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.cod_tracking (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid references public.orders(id) on delete cascade unique,
  courier_name       text,
  tracking_number    text,
  current_status     text,
  current_location   text,
  estimated_delivery date,
  events             jsonb[] default '{}',
  last_updated       timestamptz default now()
);

-- =====================
-- USER FEATURES
-- =====================

create table if not exists public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  added_at   timestamptz default now(),
  unique(user_id, product_id, variant_id)
);

create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid references public.products(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  guest_name        text,
  rating            int not null check (rating between 1 and 5),
  title             text,
  body              text,
  images            text[] default '{}',
  verified_purchase boolean default false,
  is_approved       boolean default false,
  created_at        timestamptz default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id);

-- =====================
-- NOTIFICATIONS
-- =====================

create table if not exists public.notification_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  guest_email text,
  guest_phone text,
  channel     text not null check (channel in ('email','whatsapp')),
  notified    boolean default false,
  created_at  timestamptz default now()
);
create index if not exists notif_pending_idx on public.notification_subscriptions(variant_id) where notified = false;

-- =====================
-- AUTO-UPDATE timestamps
-- =====================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cod_tracking enable row level security;
alter table public.wishlists enable row level security;
alter table public.notification_subscriptions enable row level security;

-- Public catalog reads (anyone can browse active products + collections)
drop policy if exists "Public read collections" on public.collections;
create policy "Public read collections" on public.collections
  for select using (is_active);

drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products
  for select using (is_active);

drop policy if exists "Public read variants" on public.product_variants;
create policy "Public read variants" on public.product_variants
  for select using (true);

-- Public can read APPROVED reviews; users can insert their own
drop policy if exists "Public read approved reviews" on public.reviews;
create policy "Public read approved reviews" on public.reviews
  for select using (is_approved);

drop policy if exists "Users insert own reviews" on public.reviews;
create policy "Users insert own reviews" on public.reviews
  for insert with check (auth.uid() = user_id);

-- Users see their own orders only
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders" on public.orders
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Users read own tracking" on public.cod_tracking;
create policy "Users read own tracking" on public.cod_tracking
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = cod_tracking.order_id and o.user_id = auth.uid()
    )
  );

-- Wishlist is per-user
drop policy if exists "Users own wishlist" on public.wishlists;
create policy "Users own wishlist" on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anyone can subscribe to back-in-stock; reads restricted
drop policy if exists "Anyone can subscribe to restock" on public.notification_subscriptions;
create policy "Anyone can subscribe to restock" on public.notification_subscriptions
  for insert with check (true);

drop policy if exists "Users read own subscriptions" on public.notification_subscriptions;
create policy "Users read own subscriptions" on public.notification_subscriptions
  for select using (auth.uid() = user_id);
