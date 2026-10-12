-- STER CLOSEE / Supabase schema v1
-- Execute no SQL Editor de um projeto Supabase novo.
-- Antes, crie um bucket público chamado product-photos em Storage.
-- IMPORTANTE: nunca execute chaves secretas no frontend.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
drop policy if exists "admin_read_own_membership" on public.admin_users;
create policy "admin_read_own_membership" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Verificação protegida contra recursão em políticas RLS.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create sequence if not exists public.ster_product_number_seq start 1;
revoke all on sequence public.ster_product_number_seq from public, anon;
grant usage on sequence public.ster_product_number_seq to authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique default ('SC-' || lpad(nextval('public.ster_product_number_seq')::text, 5, '0')),
  name text not null check (char_length(trim(name)) between 1 and 110),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('blusas','camisas','calcas','vestidos','saias','shorts','casacos','sapatos','acessorios','outros')),
  price numeric(10,2) not null check (price > 0),
  size text not null,
  color text not null,
  patterned boolean not null default false,
  condition text not null default 'Ótimo estado',
  material text not null default '',
  badge text check (badge is null or char_length(badge) <= 40),
  availability text not null default 'available' check (availability in ('available','reserved','sold')),
  is_published boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint images_must_be_array check (jsonb_typeof(images) = 'array'),
  constraint published_needs_photo check (not is_published or jsonb_array_length(images) > 0),
  constraint max_six_photos check (jsonb_array_length(images) <= 6)
);
create index if not exists products_public_index on public.products (is_published, published_at desc);
create index if not exists products_created_index on public.products (created_at desc);

create or replace function public.set_product_timestamps() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.is_published then new.published_at := now(); else new.published_at := null; end if;
  elsif new.is_published and not old.is_published then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists products_update_timestamps on public.products;
create trigger products_update_timestamps before insert or update on public.products
  for each row execute function public.set_product_timestamps();

alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;

drop policy if exists "public_read_published_products" on public.products;
create policy "public_read_published_products" on public.products
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "admins_insert_products" on public.products;
create policy "admins_insert_products" on public.products
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admins_update_products" on public.products;
create policy "admins_update_products" on public.products
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "admins_delete_products" on public.products;
create policy "admins_delete_products" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- STORAGE: o bucket "product-photos" deve existir, estar marcado como Public
-- e limitar o upload a 10 MB / image/jpeg, image/png, image/webp.
-- Arquivos públicos são legíveis por URL; operações de escrita são restritas.
drop policy if exists "ster_admin_storage_select" on storage.objects;
create policy "ster_admin_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'product-photos' and (select public.is_admin()));

drop policy if exists "ster_admin_storage_insert" on storage.objects;
create policy "ster_admin_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and (select public.is_admin()));

drop policy if exists "ster_admin_storage_update" on storage.objects;
create policy "ster_admin_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and (select public.is_admin()))
  with check (bucket_id = 'product-photos' and (select public.is_admin()));

drop policy if exists "ster_admin_storage_delete" on storage.objects;
create policy "ster_admin_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and (select public.is_admin()));

-- DEPOIS DE CRIAR O USUÁRIO NO PAINEL AUTHENTICATION > USERS,
-- execute à parte, substituindo pelo UUID verdadeiro:
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
