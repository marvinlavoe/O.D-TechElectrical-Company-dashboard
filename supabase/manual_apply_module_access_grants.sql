-- Run this in the Supabase SQL Editor if the app shows:
-- "Could not find the table 'public.module_access_grants' in the schema cache"
--
-- It creates the missing module-access table and reloads PostgREST's schema cache.

create table if not exists public.module_access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role text not null default 'worker',
  modules text[] not null default '{}'::text[],
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint module_access_grants_email_not_blank check (btrim(email) <> ''),
  constraint module_access_grants_role_check check (role in ('admin', 'worker')),
  constraint module_access_grants_modules_check
    check (modules <@ array['sales', 'merchant_hub']::text[])
);

update public.module_access_grants
set email = lower(btrim(email))
where email <> lower(btrim(email));

create unique index if not exists module_access_grants_email_unique_idx
  on public.module_access_grants (lower(email));

create index if not exists module_access_grants_active_modules_idx
  on public.module_access_grants using gin (modules)
  where is_active;

create or replace function public.current_auth_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.user_has_module_access(p_module text)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    public.is_admin_user()
    or exists (
      select 1
      from public.module_access_grants mag
      where mag.is_active
        and lower(mag.email) = public.current_auth_email()
        and p_module = any(mag.modules)
    );
$$;

alter table public.module_access_grants enable row level security;

drop policy if exists "module_access_grants_select_admin_or_self" on public.module_access_grants;
create policy "module_access_grants_select_admin_or_self"
on public.module_access_grants
for select
to authenticated
using (
  public.is_admin_user()
  or (
    is_active
    and lower(email) = public.current_auth_email()
  )
);

drop policy if exists "module_access_grants_insert_admin" on public.module_access_grants;
create policy "module_access_grants_insert_admin"
on public.module_access_grants
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "module_access_grants_update_admin" on public.module_access_grants;
create policy "module_access_grants_update_admin"
on public.module_access_grants
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "module_access_grants_delete_admin" on public.module_access_grants;
create policy "module_access_grants_delete_admin"
on public.module_access_grants
for delete
to authenticated
using (public.is_admin_user());

grant execute on function public.current_auth_email() to authenticated;
grant execute on function public.user_has_module_access(text) to authenticated;

notify pgrst, 'reload schema';
