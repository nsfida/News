-- ============================================================
-- NSFChat Database Schema
-- Light, reliable 1:1 chat with live presence and message states
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  nationality text,
  bio text,
  status_text text default 'Available',
  avatar_url text,
  is_online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists username text;
alter table profiles add column if not exists nationality text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists status_text text default 'Available';
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists is_online boolean default false;
alter table profiles add column if not exists last_seen timestamptz default now();
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz default now();

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',
  name text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now(),
  last_message_preview text
);

alter table conversations add column if not exists type text not null default 'direct';
alter table conversations add column if not exists name text;
alter table conversations add column if not exists created_by uuid references profiles(id) on delete set null;
alter table conversations add column if not exists created_at timestamptz default now();
alter table conversations add column if not exists updated_at timestamptz default now();
alter table conversations add column if not exists last_message_at timestamptz default now();
alter table conversations add column if not exists last_message_preview text;

create table if not exists conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  content text,
  content_type text not null default 'text',
  file_url text,
  metadata jsonb default '{}'::jsonb,
  delivered_at timestamptz,
  seen_at timestamptz,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table messages add column if not exists content text;
alter table messages add column if not exists content_type text not null default 'text';
alter table messages add column if not exists file_url text;
alter table messages add column if not exists metadata jsonb default '{}'::jsonb;
alter table messages add column if not exists delivered_at timestamptz;
alter table messages add column if not exists seen_at timestamptz;
alter table messages add column if not exists is_deleted boolean default false;
alter table messages add column if not exists created_at timestamptz default now();
alter table messages add column if not exists updated_at timestamptz default now();

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_profiles_last_seen on profiles (last_seen desc);
create index if not exists idx_conversations_last_message_at on conversations (last_message_at desc);
create index if not exists idx_conversation_members_user_id on conversation_members (user_id);
create index if not exists idx_conversation_members_conversation_id on conversation_members (conversation_id);
create index if not exists idx_messages_conversation_created_at on messages (conversation_id, created_at);
create index if not exists idx_messages_sender_id on messages (sender_id);
create index if not exists idx_messages_delivered_at on messages (delivered_at);
create index if not exists idx_messages_seen_at on messages (seen_at);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversations c
    where c.id = p_conversation_id
      and c.created_by = auth.uid()
  );
$$;

create or replace function touch_my_presence(p_status_text text default null)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update profiles
  set
    last_seen = now(),
    is_online = true,
    status_text = coalesce(nullif(trim(p_status_text), ''), status_text),
    updated_at = now()
  where id = auth.uid()
  returning * into p;

  return p;
end;
$$;

-- Create or return an existing direct conversation with a peer.
-- Advisory lock prevents duplicate direct conversations when two users start at once.
create or replace function create_direct_conversation(peer_id uuid)
returns conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  conv conversations;
  lock_key bigint;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if peer_id is null then
    raise exception 'peer_id is required';
  end if;

  if peer_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  lock_key := hashtext(least(auth.uid()::text, peer_id::text) || ':' || greatest(auth.uid()::text, peer_id::text));
  perform pg_advisory_xact_lock(lock_key);

  select c.*
    into conv
  from conversations c
  where c.type = 'direct'
    and exists (
      select 1
      from conversation_members m1
      where m1.conversation_id = c.id
        and m1.user_id = auth.uid()
    )
    and exists (
      select 1
      from conversation_members m2
      where m2.conversation_id = c.id
        and m2.user_id = peer_id
    )
  limit 1;

  if found then
    return conv;
  end if;

  insert into conversations (type, created_by, created_at, updated_at, last_message_at)
  values ('direct', auth.uid(), now(), now(), now())
  returning * into conv;

  insert into conversation_members (conversation_id, user_id)
  values
    (conv.id, auth.uid()),
    (conv.id, peer_id);

  return conv;
end;
$$;

create or replace function mark_conversation_messages_delivered(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not is_conversation_member(p_conversation_id) then
    raise exception 'Not a conversation member';
  end if;

  update messages
  set delivered_at = coalesce(delivered_at, now()),
      updated_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and delivered_at is null
    and is_deleted = false;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function mark_conversation_messages_seen(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not is_conversation_member(p_conversation_id) then
    raise exception 'Not a conversation member';
  end if;

  update messages
  set
    delivered_at = coalesce(delivered_at, now()),
    seen_at = coalesce(seen_at, now()),
    updated_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and is_deleted = false
    and seen_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;

drop policy if exists conversations_select on conversations;
drop policy if exists conversations_insert on conversations;
drop policy if exists conversations_update on conversations;

drop policy if exists members_select on conversation_members;
drop policy if exists members_insert on conversation_members;
drop policy if exists members_update on conversation_members;
drop policy if exists members_delete on conversation_members;

drop policy if exists messages_select on messages;
drop policy if exists messages_insert on messages;
drop policy if exists messages_update on messages;
drop policy if exists messages_delete on messages;

create policy profiles_select
on profiles
for select
using (true);

create policy profiles_insert
on profiles
for insert
with check (auth.uid() = id);

create policy profiles_update
on profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy conversations_select
on conversations
for select
using (is_conversation_member(id));

create policy conversations_insert
on conversations
for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
);

create policy conversations_update
on conversations
for update
using (is_conversation_member(id))
with check (is_conversation_member(id));

create policy members_select
on conversation_members
for select
using (
  user_id = auth.uid()
  or is_conversation_member(conversation_id)
);

create policy members_insert
on conversation_members
for insert
with check (
  auth.uid() is not null
  and is_conversation_creator(conversation_id)
);

create policy members_update
on conversation_members
for update
using (is_conversation_creator(conversation_id))
with check (is_conversation_creator(conversation_id));

create policy members_delete
on conversation_members
for delete
using (is_conversation_creator(conversation_id));

create policy messages_select
on messages
for select
using (is_conversation_member(conversation_id));

create policy messages_insert
on messages
for insert
with check (
  auth.uid() = sender_id
  and is_conversation_member(conversation_id)
);

create policy messages_update
on messages
for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

create policy messages_delete
on messages
for delete
using (auth.uid() = sender_id);

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

drop policy if exists avatars_select on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

drop policy if exists chat_images_select on storage.objects;
drop policy if exists chat_images_insert on storage.objects;
drop policy if exists chat_images_update on storage.objects;
drop policy if exists chat_images_delete on storage.objects;

drop policy if exists voice_select on storage.objects;
drop policy if exists voice_insert on storage.objects;
drop policy if exists voice_update on storage.objects;
drop policy if exists voice_delete on storage.objects;

create policy avatars_select
on storage.objects
for select
using (bucket_id = 'avatars');

create policy avatars_insert
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_update
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_delete
on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy chat_images_select
on storage.objects
for select
using (bucket_id = 'chat-images');

create policy chat_images_insert
on storage.objects
for insert
with check (
  bucket_id = 'chat-images'
  and auth.uid() is not null
);

create policy chat_images_update
on storage.objects
for update
using (
  bucket_id = 'chat-images'
  and auth.uid() is not null
)
with check (
  bucket_id = 'chat-images'
  and auth.uid() is not null
);

create policy chat_images_delete
on storage.objects
for delete
using (
  bucket_id = 'chat-images'
  and auth.uid() is not null
);

create policy voice_select
on storage.objects
for select
using (bucket_id = 'voice-messages');

create policy voice_insert
on storage.objects
for insert
with check (
  bucket_id = 'voice-messages'
  and auth.uid() is not null
);

create policy voice_update
on storage.objects
for update
using (
  bucket_id = 'voice-messages'
  and auth.uid() is not null
)
with check (
  bucket_id = 'voice-messages'
  and auth.uid() is not null
);

create policy voice_delete
on storage.objects
for delete
using (
  bucket_id = 'voice-messages'
  and auth.uid() is not null
);

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function update_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
before update on profiles
for each row
execute function update_profile_updated_at();

create or replace function update_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
before update on conversations
for each row
execute function update_conversation_updated_at();

create or replace function update_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set
    last_message_at = new.created_at,
    last_message_preview = case
      when new.content_type = 'text' then left(coalesce(new.content, ''), 100)
      when new.content_type = 'image' then '📷 Image'
      when new.content_type = 'voice' then '🎤 Voice message'
      else coalesce(new.content, '')
    end,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists on_new_message on messages;
create trigger on_new_message
after insert on messages
for each row
execute function update_conversation_on_message();

-- ============================================================
-- REALTIME
-- ============================================================

do $$
begin
  begin
    alter table public.profiles replica identity full;
  exception
    when others then null;
  end;

  begin
    alter table public.conversations replica identity full;
  exception
    when others then null;
  end;

  begin
    alter table public.messages replica identity full;
  exception
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.profiles;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.conversations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.conversation_members;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when others then null;
  end;
end $$;

-- ============================================================
-- REMOVE OLD AUTH TRIGGER IF IT EXISTS
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
