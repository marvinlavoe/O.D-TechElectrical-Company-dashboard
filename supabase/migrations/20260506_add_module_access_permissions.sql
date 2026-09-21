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

alter table public.merchant_hub_entries
  drop constraint if exists merchant_hub_entries_entry_date_key;

create unique index if not exists merchant_hub_entries_entry_date_created_by_unique_idx
  on public.merchant_hub_entries (entry_date, created_by);

create or replace function public.create_sale(
  p_sale_date date default current_date,
  p_customer_id uuid default null,
  p_payment_method text default 'Cash',
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_sale_number text;
  v_total numeric := 0;
  v_item jsonb;
  v_inventory_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_cost_price numeric;
  v_inventory public.inventory%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record a sale.';
  end if;

  if not public.user_has_module_access('sales') then
    raise exception 'You do not have access to the sales module.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must include at least one item.';
  end if;

  if p_payment_method is null or btrim(p_payment_method) = '' then
    raise exception 'Payment method is required.';
  end if;

  v_sale_number := format(
    'SAL-%s-%s',
    to_char(coalesce(p_sale_date, current_date), 'YYYYMMDD'),
    lpad(nextval('public.sale_number_seq')::text, 4, '0')
  );

  insert into public.sales (
    sale_number,
    sale_date,
    customer_id,
    total_amount,
    payment_method,
    notes,
    created_by
  )
  values (
    v_sale_number,
    coalesce(p_sale_date, current_date),
    p_customer_id,
    0,
    btrim(p_payment_method),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_sale_id;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_inventory_id := (v_item ->> 'inventory_id')::uuid;
    v_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 0), 0);
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, 0);

    if v_inventory_id is null then
      raise exception 'Each sale item must reference an inventory item.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Sale quantities must be greater than zero.';
    end if;

    select *
    into v_inventory
    from public.inventory
    where id = v_inventory_id
    for update;

    if not found then
      raise exception 'Inventory item not found for sale line.';
    end if;

    if coalesce(v_inventory.qty, 0) < v_quantity then
      raise exception 'Not enough stock for %.', v_inventory.name;
    end if;

    if v_unit_price <= 0 then
      v_unit_price := coalesce(v_inventory.selling_price, 0);
    end if;

    if v_unit_price < 0 then
      raise exception 'Unit price cannot be negative.';
    end if;

    v_cost_price := coalesce(v_inventory.cost, 0);

    insert into public.sale_items (
      sale_id,
      inventory_id,
      item_name_snapshot,
      unit_snapshot,
      unit_price,
      cost_price_snapshot,
      quantity,
      line_total,
      line_profit
    )
    values (
      v_sale_id,
      v_inventory.id,
      v_inventory.name,
      coalesce(v_inventory.unit, 'pcs'),
      v_unit_price,
      v_cost_price,
      v_quantity,
      v_unit_price * v_quantity,
      (v_unit_price - v_cost_price) * v_quantity
    );

    update public.inventory
    set qty = coalesce(qty, 0) - v_quantity
    where id = v_inventory.id;

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  update public.sales
  set total_amount = v_total
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

create or replace function public.upsert_merchant_hub_entry(
  p_entry_date date default current_date,
  p_physical_commission numeric default 0,
  p_physical_cash_capital numeric default 0,
  p_electronic_commission numeric default 0,
  p_electronic_cash_capital numeric default 0,
  p_notes text default null,
  p_extras jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_extra jsonb;
  v_extras jsonb := coalesce(p_extras, '[]'::jsonb);
  v_label text;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to save a merchant hub entry.';
  end if;

  if not public.user_has_module_access('merchant_hub') then
    raise exception 'You do not have access to the merchant hub module.';
  end if;

  if p_entry_date is null then
    raise exception 'Entry date is required.';
  end if;

  if coalesce(p_physical_commission, 0) < 0
    or coalesce(p_physical_cash_capital, 0) < 0
    or coalesce(p_electronic_commission, 0) < 0
    or coalesce(p_electronic_cash_capital, 0) < 0 then
    raise exception 'Merchant hub amounts cannot be negative.';
  end if;

  if jsonb_typeof(v_extras) <> 'array' then
    raise exception 'Extras must be sent as an array.';
  end if;

  for v_extra in
    select value
    from jsonb_array_elements(v_extras)
  loop
    v_label := btrim(coalesce(v_extra ->> 'label', ''));
    v_amount := coalesce((v_extra ->> 'amount')::numeric, 0);

    if v_label = '' then
      raise exception 'Extra labels cannot be blank.';
    end if;

    if v_amount < 0 then
      raise exception 'Extra amounts cannot be negative.';
    end if;
  end loop;

  insert into public.merchant_hub_entries (
    entry_date,
    physical_commission,
    physical_cash_capital,
    electronic_commission,
    electronic_cash_capital,
    notes,
    created_by,
    updated_by,
    updated_at
  )
  values (
    p_entry_date,
    coalesce(p_physical_commission, 0),
    coalesce(p_physical_cash_capital, 0),
    coalesce(p_electronic_commission, 0),
    coalesce(p_electronic_cash_capital, 0),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid(),
    timezone('utc', now())
  )
  on conflict (entry_date, created_by) do update
    set physical_commission = excluded.physical_commission,
        physical_cash_capital = excluded.physical_cash_capital,
        electronic_commission = excluded.electronic_commission,
        electronic_cash_capital = excluded.electronic_cash_capital,
        notes = excluded.notes,
        updated_by = auth.uid(),
        updated_at = timezone('utc', now())
  returning id into v_entry_id;

  delete from public.merchant_hub_entry_extras
  where entry_id = v_entry_id;

  for v_extra in
    select value
    from jsonb_array_elements(v_extras)
  loop
    insert into public.merchant_hub_entry_extras (entry_id, label, amount)
    values (
      v_entry_id,
      btrim(v_extra ->> 'label'),
      coalesce((v_extra ->> 'amount')::numeric, 0)
    );
  end loop;

  return v_entry_id;
end;
$$;

drop policy if exists "sales_select_admin" on public.sales;
drop policy if exists "sales_select_by_module_access" on public.sales;
create policy "sales_select_by_module_access"
on public.sales
for select
to authenticated
using (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and public.user_has_module_access('sales')
  )
);

drop policy if exists "sales_insert_admin" on public.sales;
drop policy if exists "sales_insert_by_module_access" on public.sales;
create policy "sales_insert_by_module_access"
on public.sales
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.user_has_module_access('sales')
);

drop policy if exists "sales_update_admin" on public.sales;
drop policy if exists "sales_update_by_module_access" on public.sales;
create policy "sales_update_by_module_access"
on public.sales
for update
to authenticated
using (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and public.user_has_module_access('sales')
  )
)
with check (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and public.user_has_module_access('sales')
  )
);

drop policy if exists "sale_items_select_admin" on public.sale_items;
drop policy if exists "sale_items_select_by_visible_sale" on public.sale_items;
create policy "sale_items_select_by_visible_sale"
on public.sale_items
for select
to authenticated
using (
  exists (
    select 1
    from public.sales s
    where s.id = sale_items.sale_id
  )
);

drop policy if exists "sale_items_insert_admin" on public.sale_items;
drop policy if exists "sale_items_insert_by_module_access" on public.sale_items;
create policy "sale_items_insert_by_module_access"
on public.sale_items
for insert
to authenticated
with check (
  public.user_has_module_access('sales')
  and exists (
    select 1
    from public.sales s
    where s.id = sale_items.sale_id
  )
);

drop policy if exists "merchant_hub_entries_select_admin" on public.merchant_hub_entries;
drop policy if exists "merchant_hub_entries_select_by_module_access" on public.merchant_hub_entries;
create policy "merchant_hub_entries_select_by_module_access"
on public.merchant_hub_entries
for select
to authenticated
using (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and public.user_has_module_access('merchant_hub')
  )
);

drop policy if exists "merchant_hub_entries_insert_admin" on public.merchant_hub_entries;
drop policy if exists "merchant_hub_entries_insert_by_module_access" on public.merchant_hub_entries;
create policy "merchant_hub_entries_insert_by_module_access"
on public.merchant_hub_entries
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.user_has_module_access('merchant_hub')
);

drop policy if exists "merchant_hub_entries_update_admin" on public.merchant_hub_entries;
drop policy if exists "merchant_hub_entries_update_by_module_access" on public.merchant_hub_entries;
create policy "merchant_hub_entries_update_by_module_access"
on public.merchant_hub_entries
for update
to authenticated
using (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and public.user_has_module_access('merchant_hub')
  )
)
with check (
  public.is_admin_user()
  or (
    created_by = auth.uid()
    and updated_by = auth.uid()
    and public.user_has_module_access('merchant_hub')
  )
);

drop policy if exists "merchant_hub_entry_extras_select_admin" on public.merchant_hub_entry_extras;
drop policy if exists "merchant_hub_entry_extras_select_by_visible_entry" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_select_by_visible_entry"
on public.merchant_hub_entry_extras
for select
to authenticated
using (
  exists (
    select 1
    from public.merchant_hub_entries mhe
    where mhe.id = merchant_hub_entry_extras.entry_id
  )
);

drop policy if exists "merchant_hub_entry_extras_insert_admin" on public.merchant_hub_entry_extras;
drop policy if exists "merchant_hub_entry_extras_insert_by_module_access" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_insert_by_module_access"
on public.merchant_hub_entry_extras
for insert
to authenticated
with check (
  public.user_has_module_access('merchant_hub')
  and exists (
    select 1
    from public.merchant_hub_entries mhe
    where mhe.id = merchant_hub_entry_extras.entry_id
  )
);

drop policy if exists "merchant_hub_entry_extras_delete_admin" on public.merchant_hub_entry_extras;
drop policy if exists "merchant_hub_entry_extras_delete_by_visible_entry" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_delete_by_visible_entry"
on public.merchant_hub_entry_extras
for delete
to authenticated
using (
  public.is_admin_user()
  or exists (
    select 1
    from public.merchant_hub_entries mhe
    where mhe.id = merchant_hub_entry_extras.entry_id
      and mhe.created_by = auth.uid()
      and public.user_has_module_access('merchant_hub')
  )
);

drop policy if exists "inventory_select_sales_module_access" on public.inventory;
create policy "inventory_select_sales_module_access"
on public.inventory
for select
to authenticated
using (public.is_admin_user() or public.user_has_module_access('sales'));

drop policy if exists "inventory_update_sales_module_access" on public.inventory;
create policy "inventory_update_sales_module_access"
on public.inventory
for update
to authenticated
using (public.is_admin_user() or public.user_has_module_access('sales'))
with check (public.is_admin_user() or public.user_has_module_access('sales'));

drop policy if exists "customers_select_sales_module_access" on public.customers;
create policy "customers_select_sales_module_access"
on public.customers
for select
to authenticated
using (public.is_admin_user() or public.user_has_module_access('sales'));

grant execute on function public.current_auth_email() to authenticated;
grant execute on function public.user_has_module_access(text) to authenticated;

notify pgrst, 'reload schema';
