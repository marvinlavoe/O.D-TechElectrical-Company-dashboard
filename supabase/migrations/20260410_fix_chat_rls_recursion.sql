create or replace function public.user_can_access_channel(target_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = target_channel_id
      and (
        c.type in ('channel', 'job')
        or c.created_by = auth.uid()
        or exists (
          select 1
          from public.channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.user_can_access_channel(uuid) from public;
grant execute on function public.user_can_access_channel(uuid) to authenticated;

drop policy if exists "channels_select_accessible" on public.channels;
create policy "channels_select_accessible"
on public.channels
for select
to authenticated
using (public.user_can_access_channel(id));
