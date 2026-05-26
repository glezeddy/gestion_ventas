-- Prin Epic - actualización de persistencia
-- Ejecuta este script una vez en Supabase SQL Editor para que pedidos y cupones
-- se guarden completos en la base de datos y funcionen entre dispositivos.

alter table if exists public.orders
    add column if not exists customer_phone text,
    add column if not exists subtotal numeric(12,2) not null default 0,
    add column if not exists coupon_code text,
    add column if not exists coupon_id text,
    add column if not exists coupon_discount numeric(12,2) not null default 0,
    add column if not exists shirt_cost_kids numeric(12,2) not null default 0;

alter table if exists public.order_items
    add column if not exists custom_price boolean not null default false;

create table if not exists public.coupons (
    id text primary key,
    code text not null unique,
    customer_name text,
    customer_phone text,
    order_id text references public.orders(id) on delete set null,
    discount_type text not null default 'fixed',
    discount_amount numeric(12,2) not null default 100,
    min_purchase numeric(12,2) not null default 600,
    not_stackable_with_wholesale boolean not null default true,
    status text not null default 'pending' check (status in ('pending', 'active', 'used', 'expired')),
    created_at timestamptz not null default now(),
    used_at timestamptz,
    used_order_id text,
    used boolean not null default false,
    requirements jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists "Authenticated users can manage coupons" on public.coupons;
create policy "Authenticated users can manage coupons"
on public.coupons
for all
to authenticated
using (true)
with check (true);
