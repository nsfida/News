-- NSFChat migration-safe schema for Supabase
begin;

create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text not null default '',
  nationality text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
  ) then
    alter table public.profiles add column display_name text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) then
    alter table public.profiles add column username text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'nationality'
  ) then
    alter table public.profiles add column nationality text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'bio'
  ) then
    alter table public.profiles add column bio text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text not null default '';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at'
  ) then
    alter table public.profiles add column last_seen_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at'
  ) then
    alter table public.profiles add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'profiles_username_lower_unique'
  ) then
    execute 'create unique index profiles_username_lower_unique on public.profiles (lower(username))';
  end if;
end $$;

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  title text,
  direct_pair_key text,
  created_by uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_kind_check check (kind in ('direct', 'group'))
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'kind'
  ) then
    alter table public.conversations add column kind text not null default 'direct';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'title'
  ) then
    alter table public.conversations add column title text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'direct_pair_key'
  ) then
    alter table public.conversations add column direct_pair_key text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'created_by'
  ) then
    alter table public.conversations add column created_by uuid references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'last_message_at'
  ) then
    alter table public.conversations add column last_message_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'created_at'
  ) then
    alter table public.conversations add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'updated_at'
  ) then
    alter table public.conversations add column updated_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='conversations_direct_pair_key_unique'
  ) then
    execute 'create unique index conversations_direct_pair_key_unique on public.conversations (direct_pair_key) where direct_pair_key is not null';
  end if;
end $$;

-- Conversation members
create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  constraint conversation_members_unique unique (conversation_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversation_members' and column_name = 'role'
  ) then
    alter table public.conversation_members add column role text not null default 'member';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversation_members' and column_name = 'joined_at'
  ) then
    alter table public.conversation_members add column joined_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversation_members' and column_name = 'last_read_at'
  ) then
    alter table public.conversation_members add column last_read_at timestamptz;
  end if;
end $$;

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text,
  content_type text not null default 'text',
  attachment_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_content_type_check check (content_type in ('text', 'image', 'voice'))
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
  ) then
    alter table public.messages add column content text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content_type'
  ) then
    alter table public.messages add column content_type text not null default 'text';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'attachment_url'
  ) then
    alter table public.messages add column attachment_url text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'metadata'
  ) then
    alter table public.messages add column metadata jsonb not null default '{}'::jsonb;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'created_at'
  ) then
    alter table public.messages add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'updated_at'
  ) then
    alter table public.messages add column updated_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='messages_conversation_created_idx'
  ) then
    execute 'create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='conversation_members_user_idx'
  ) then
    execute 'create index conversation_members_user_idx on public.conversation_members (user_id, conversation_id)';
  end if;
end $$;

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set name = excluded.name, public = excluded.public;

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do update set name = excluded.name, public = excluded.public;

-- Helper functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify_username(base text)
returns text
language plpgsql
as $$
declare
  candidate text;
  suffix text;
begin
  candidate := lower(coalesce(base, 'user'));
  candidate := regexp_replace(candidate, '[^a-z0-9_]+', '', 'g');
  candidate := regexp_replace(candidate, '_+', '_', 'g');
  candidate := trim(both '_' from candidate);

  if candidate = '' then
    candidate := 'user';
  end if;

  if not exists (select 1 from public.profiles where lower(username) = lower(candidate)) then
    return candidate;
  end if;

  loop
    suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
    candidate := left(candidate, 18) || '_' || suffix;
    exit when not exists (select 1 from public.profiles where lower(username) = lower(candidate));
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_username text;
begin
  base_username := coalesce(nullif(meta->>'username', ''), split_part(coalesce(new.email, 'user@example.com'), '@', 1));

  insert into public.profiles (
    id,
    display_name,
    username,
    nationality,
    bio,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(nullif(meta->>'display_name', ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    public.slugify_username(base_username),
    coalesce(nullif(meta->>'nationality', ''), ''),
    coalesce(nullif(meta->>'bio', ''), ''),
    coalesce(nullif(meta->>'avatar_url', ''), ''),
    now(),
    now()
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        nationality = excluded.nationality,
        bio = excluded.bio,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.touch_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = now(),
         updated_at = now()
   where id = new.conversation_id;

  update public.profiles
     set last_seen_at = now(),
         updated_at = now()
   where id = new.sender_id;

  return new;
end;
$$;

create or replace function public.create_direct_conversation(other_user_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  pair_key text;
  convo public.conversations;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot start a direct chat with yourself';
  end if;

  pair_key := least(current_user_id::text, other_user_id::text) || ':' || greatest(current_user_id::text, other_user_id::text);

  select * into convo
    from public.conversations
   where kind = 'direct'
     and direct_pair_key = pair_key
   limit 1;

  if found then
    return convo;
  end if;

  insert into public.conversations (kind, title, direct_pair_key, created_by)
  values ('direct', null, pair_key, current_user_id)
  returning * into convo;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (convo.id, current_user_id, 'member'),
    (convo.id, other_user_id, 'member');

  return convo;
end;
$$;

-- Triggers
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute procedure public.set_updated_at();

drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at
before update on public.messages
for each row execute procedure public.set_updated_at();

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute procedure public.touch_conversation_activity();

-- RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table storage.objects enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles readable by authenticated users') then
    create policy "Profiles readable by authenticated users"
      on public.profiles for select
      to authenticated
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles editable by owner') then
    create policy "Profiles editable by owner"
      on public.profiles for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles insertable by owner') then
    create policy "Profiles insertable by owner"
      on public.profiles for insert
      to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Conversations readable by members') then
    create policy "Conversations readable by members"
      on public.conversations for select
      to authenticated
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Conversations insertable by creator') then
    create policy "Conversations insertable by creator"
      on public.conversations for insert
      to authenticated
      with check (auth.uid() = created_by);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Conversations editable by members') then
    create policy "Conversations editable by members"
      on public.conversations for update
      to authenticated
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Members readable by members') then
    create policy "Members readable by members"
      on public.conversation_members for select
      to authenticated
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Members insertable by conversation creator or self') then
    create policy "Members insertable by conversation creator or self"
      on public.conversation_members for insert
      to authenticated
      with check (
        auth.uid() = user_id or exists (
          select 1 from public.conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Members deletable by member or creator') then
    create policy "Members deletable by member or creator"
      on public.conversation_members for delete
      to authenticated
      using (
        auth.uid() = user_id or exists (
          select 1 from public.conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Messages readable by conversation members') then
    create policy "Messages readable by conversation members"
      on public.messages for select
      to authenticated
      using (
        exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Messages insertable by sender member') then
    create policy "Messages insertable by sender member"
      on public.messages for insert
      to authenticated
      with check (
        auth.uid() = sender_id
        and exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = messages.conversation_id
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Messages editable by sender') then
    create policy "Messages editable by sender"
      on public.messages for update
      to authenticated
      using (auth.uid() = sender_id)
      with check (auth.uid() = sender_id);
  end if;
end $$;

-- Storage policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar uploads by owner') then
    create policy "Avatar uploads by owner"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar updates by owner') then
    create policy "Avatar updates by owner"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      )
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Avatar deletes by owner') then
    create policy "Avatar deletes by owner"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat media uploads by owner') then
    create policy "Chat media uploads by owner"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id in ('chat-media', 'voice-notes')
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat media updates by owner') then
    create policy "Chat media updates by owner"
      on storage.objects for update
      to authenticated
      using (
        bucket_id in ('chat-media', 'voice-notes')
        and auth.uid()::text = split_part(name, '/', 1)
      )
      with check (
        bucket_id in ('chat-media', 'voice-notes')
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat media deletes by owner') then
    create policy "Chat media deletes by owner"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id in ('chat-media', 'voice-notes')
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat media reads by conversation members') then
    create policy "Chat media reads by conversation members"
      on storage.objects for select
      to authenticated
      using (
        bucket_id in ('chat-media', 'voice-notes')
        and exists (
          select 1
          from public.messages m
          join public.conversation_members cm
            on cm.conversation_id = m.conversation_id
          where cm.user_id = auth.uid()
            and m.metadata->>'storage_path' = storage.objects.name
            and m.content_type in ('image', 'voice')
        )
      );
  end if;
end $$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;
grant execute on function public.slugify_username(text) to authenticated;

commit;
