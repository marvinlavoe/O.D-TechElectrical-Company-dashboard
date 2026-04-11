create schema if not exists private;

create or replace function private.create_or_get_direct_message_channel(target_user_id uuid)
returns public.channels
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_channel public.channels%rowtype;
  created_channel public.channels%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to start a direct message';
  end if;

  if target_user_id is null then
    raise exception 'A teammate is required';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot start a direct message with yourself';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
  ) then
    raise exception 'Selected teammate no longer exists';
  end if;

  select c.*
  into existing_channel
  from public.channels c
  join public.channel_members cm
    on cm.channel_id = c.id
  where c.type = 'dm'
  group by c.id, c.name, c.type, c.created_at, c.job_id, c.created_by
  having count(*) = 2
    and bool_or(cm.user_id = current_user_id)
    and bool_or(cm.user_id = target_user_id)
  order by c.created_at desc
  limit 1;

  if existing_channel.id is not null then
    return existing_channel;
  end if;

  insert into public.channels (name, type, created_by)
  values ('Direct message', 'dm', current_user_id)
  returning * into created_channel;

  insert into public.channel_members (channel_id, user_id)
  values
    (created_channel.id, current_user_id),
    (created_channel.id, target_user_id)
  on conflict (channel_id, user_id) do nothing;

  return created_channel;
end;
$$;

revoke all on function private.create_or_get_direct_message_channel(uuid) from public;
revoke all on function private.create_or_get_direct_message_channel(uuid) from anon, authenticated;

create or replace function public.create_direct_message_channel(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select to_jsonb(channel_row)
  from private.create_or_get_direct_message_channel(target_user_id) as channel_row;
$$;

revoke all on function public.create_direct_message_channel(uuid) from public;
grant execute on function public.create_direct_message_channel(uuid) to authenticated;
