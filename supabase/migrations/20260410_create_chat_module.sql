do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'chat_rooms'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'channels'
  ) then
    alter table public.chat_rooms rename to channels;
  end if;
end $$;

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text,
  type text not null default 'channel' check (type in ('channel', 'job', 'dm')),
  job_id uuid,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.channels
  add column if not exists job_id uuid,
  add column if not exists created_by uuid;

update public.channels
set job_id = reference_id
where job_id is null
  and type = 'job'
  and reference_id is not null;

alter table public.channels
  alter column created_at set default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channels'
      and column_name = 'reference_id'
  ) then
    alter table public.channels drop column reference_id;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'channels_job_id_fkey'
  ) then
    alter table public.channels
      add constraint channels_job_id_fkey
      foreign key (job_id) references public.jobs(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'channels_created_by_fkey'
  ) then
    alter table public.channels
      add constraint channels_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists channels_general_unique_idx
  on public.channels ((lower(coalesce(name, ''))))
  where type = 'channel' and job_id is null;

create unique index if not exists channels_job_unique_idx
  on public.channels (job_id)
  where job_id is not null;

create index if not exists channels_type_created_idx
  on public.channels (type, created_at desc);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (channel_id, user_id)
);

create index if not exists channel_members_user_idx
  on public.channel_members (user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'room_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'channel_id'
  ) then
    alter table public.messages rename column room_id to channel_id;
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null,
  sender_id uuid not null,
  content text not null default '',
  attachment_url text,
  seen_by uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_content_or_attachment_check
    check (btrim(content) <> '' or attachment_url is not null)
);

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists seen_by uuid[] not null default '{}'::uuid[];

alter table public.messages
  alter column content set default '',
  alter column created_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_channel_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_channel_id_fkey
      foreign key (channel_id) references public.channels(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'messages_sender_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_sender_id_fkey
      foreign key (sender_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists messages_channel_created_idx
  on public.messages (channel_id, created_at desc);

create index if not exists messages_sender_idx
  on public.messages (sender_id);

create or replace function public.user_can_access_channel(target_channel_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = target_channel_id
      and (
        c.type in ('channel', 'job')
        or exists (
          select 1
          from public.channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "channels_select_accessible" on public.channels;
create policy "channels_select_accessible"
on public.channels
for select
to authenticated
using (
  type in ('channel', 'job')
  or exists (
    select 1
    from public.channel_members cm
    where cm.channel_id = id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "channels_insert_authenticated" on public.channels;
create policy "channels_insert_authenticated"
on public.channels
for insert
to authenticated
with check (
  auth.uid() = created_by
  and type in ('channel', 'job', 'dm')
);

drop policy if exists "channel_members_select_accessible" on public.channel_members;
create policy "channel_members_select_accessible"
on public.channel_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.user_can_access_channel(channel_id)
);

drop policy if exists "channel_members_insert_creator_or_self" on public.channel_members;
create policy "channel_members_insert_creator_or_self"
on public.channel_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.channels c
    where c.id = channel_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "messages_select_accessible" on public.messages;
create policy "messages_select_accessible"
on public.messages
for select
to authenticated
using (public.user_can_access_channel(channel_id));

drop policy if exists "messages_insert_accessible" on public.messages;
create policy "messages_insert_accessible"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.user_can_access_channel(channel_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
