alter table public.inventory
  add column if not exists selling_price numeric;

update public.inventory
set selling_price = coalesce(selling_price, cost, 0)
where selling_price is null;

alter table public.inventory
  alter column selling_price set default 0;

alter table public.inventory
  alter column selling_price set not null;

create sequence if not exists public.sale_number_seq start 1;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  sale_date date not null default current_date,
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric not null default 0,
  payment_method text not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sales_total_amount_non_negative check (total_amount >= 0)
);

create index if not exists sales_sale_date_idx
  on public.sales (sale_date desc);

create index if not exists sales_created_at_idx
  on public.sales (created_at desc);

create index if not exists sales_customer_id_idx
  on public.sales (customer_id);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  item_name_snapshot text not null,
  unit_snapshot text not null,
  unit_price numeric not null,
  quantity integer not null,
  line_total numeric not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_unit_price_non_negative check (unit_price >= 0),
  constraint sale_items_line_total_non_negative check (line_total >= 0)
);

create index if not exists sale_items_sale_id_idx
  on public.sale_items (sale_id);

create index if not exists sale_items_inventory_id_idx
  on public.sale_items (inventory_id);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.set_inventory_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.qty := coalesce(new.qty, 0);
  new.threshold := coalesce(new.threshold, 0);
  new.selling_price := coalesce(new.selling_price, 0);
  new.cost := coalesce(new.cost, 0);
  new.status := case
    when new.qty <= new.threshold then 'Low Stock'
    else 'In Stock'
  end;

  return new;
end;
$$;

drop trigger if exists inventory_set_status_trigger on public.inventory;
create trigger inventory_set_status_trigger
before insert or update of qty, threshold, cost, selling_price on public.inventory
for each row
execute function public.set_inventory_status();

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
  v_inventory public.inventory%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record a sale.';
  end if;

  if not public.is_admin_user() then
    raise exception 'Only admin users can record sales.';
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

    insert into public.sale_items (
      sale_id,
      inventory_id,
      item_name_snapshot,
      unit_snapshot,
      unit_price,
      quantity,
      line_total
    )
    values (
      v_sale_id,
      v_inventory.id,
      v_inventory.name,
      coalesce(v_inventory.unit, 'pcs'),
      v_unit_price,
      v_quantity,
      v_unit_price * v_quantity
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

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "sales_select_admin" on public.sales;
create policy "sales_select_admin"
on public.sales
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "sales_insert_admin" on public.sales;
create policy "sales_insert_admin"
on public.sales
for insert
to authenticated
with check (public.is_admin_user() and created_by = auth.uid());

drop policy if exists "sales_update_admin" on public.sales;
create policy "sales_update_admin"
on public.sales
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "sale_items_select_admin" on public.sale_items;
create policy "sale_items_select_admin"
on public.sale_items
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "sale_items_insert_admin" on public.sale_items;
create policy "sale_items_insert_admin"
on public.sale_items
for insert
to authenticated
with check (public.is_admin_user());

grant execute on function public.create_sale(date, uuid, text, text, jsonb) to authenticated;

