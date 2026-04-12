alter table public.sale_items
  add column if not exists cost_price_snapshot numeric,
  add column if not exists line_profit numeric;

update public.sale_items si
set
  cost_price_snapshot = coalesce(si.cost_price_snapshot, i.cost, 0),
  line_profit = coalesce(si.line_profit, si.line_total - (coalesce(i.cost, 0) * si.quantity))
from public.inventory i
where i.id = si.inventory_id;

alter table public.sale_items
  alter column cost_price_snapshot set default 0;

alter table public.sale_items
  alter column line_profit set default 0;

update public.sale_items
set
  cost_price_snapshot = coalesce(cost_price_snapshot, 0),
  line_profit = coalesce(line_profit, 0)
where cost_price_snapshot is null
   or line_profit is null;

alter table public.sale_items
  alter column cost_price_snapshot set not null;

alter table public.sale_items
  alter column line_profit set not null;

alter table public.sale_items
  drop constraint if exists sale_items_cost_price_snapshot_non_negative;

alter table public.sale_items
  add constraint sale_items_cost_price_snapshot_non_negative
  check (cost_price_snapshot >= 0);

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
