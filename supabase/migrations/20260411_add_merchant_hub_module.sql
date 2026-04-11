create table if not exists public.merchant_hub_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  physical_commission numeric not null default 0,
  physical_cash_capital numeric not null default 0,
  electronic_commission numeric not null default 0,
  electronic_cash_capital numeric not null default 0,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint merchant_hub_entries_entry_date_key unique (entry_date),
  constraint merchant_hub_entries_physical_commission_non_negative
    check (physical_commission >= 0),
  constraint merchant_hub_entries_physical_cash_capital_non_negative
    check (physical_cash_capital >= 0),
  constraint merchant_hub_entries_electronic_commission_non_negative
    check (electronic_commission >= 0),
  constraint merchant_hub_entries_electronic_cash_capital_non_negative
    check (electronic_cash_capital >= 0)
);

create index if not exists merchant_hub_entries_entry_date_idx
  on public.merchant_hub_entries (entry_date desc);

create index if not exists merchant_hub_entries_created_at_idx
  on public.merchant_hub_entries (created_at desc);

create table if not exists public.merchant_hub_entry_extras (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.merchant_hub_entries(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint merchant_hub_entry_extras_label_not_blank check (btrim(label) <> ''),
  constraint merchant_hub_entry_extras_amount_non_negative check (amount >= 0)
);

create index if not exists merchant_hub_entry_extras_entry_id_idx
  on public.merchant_hub_entry_extras (entry_id);

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

  if not public.is_admin_user() then
    raise exception 'Only admin users can manage merchant hub entries.';
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
  on conflict (entry_date) do update
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

alter table public.merchant_hub_entries enable row level security;
alter table public.merchant_hub_entry_extras enable row level security;

drop policy if exists "merchant_hub_entries_select_admin" on public.merchant_hub_entries;
create policy "merchant_hub_entries_select_admin"
on public.merchant_hub_entries
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "merchant_hub_entries_insert_admin" on public.merchant_hub_entries;
create policy "merchant_hub_entries_insert_admin"
on public.merchant_hub_entries
for insert
to authenticated
with check (
  public.is_admin_user()
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "merchant_hub_entries_update_admin" on public.merchant_hub_entries;
create policy "merchant_hub_entries_update_admin"
on public.merchant_hub_entries
for update
to authenticated
using (public.is_admin_user())
with check (
  public.is_admin_user()
  and updated_by = auth.uid()
);

drop policy if exists "merchant_hub_entry_extras_select_admin" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_select_admin"
on public.merchant_hub_entry_extras
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "merchant_hub_entry_extras_insert_admin" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_insert_admin"
on public.merchant_hub_entry_extras
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "merchant_hub_entry_extras_delete_admin" on public.merchant_hub_entry_extras;
create policy "merchant_hub_entry_extras_delete_admin"
on public.merchant_hub_entry_extras
for delete
to authenticated
using (public.is_admin_user());

grant execute on function public.upsert_merchant_hub_entry(date, numeric, numeric, numeric, numeric, text, jsonb) to authenticated;
