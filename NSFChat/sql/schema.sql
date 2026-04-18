-- ============================================================
-- NSFChat v2 — Supabase schema
-- Features:
-- - direct + group conversations
-- - status/privacy + settings
-- - delivered/seen + edit/delete
-- - message hide for me
-- - media/location support
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
  avatar_url text,
  status_text text default 'Available',
  status_privacy text not null default 'public',
  last_seen_privacy text not null default 'all',
  profile_photo_privacy text not null default 'all',
  read_receipts_enabled boolean not null default true,
  media_auto_download boolean not null default true,
  save_to_gallery boolean not null default false,
  low_data_mode boolean not null default false,
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists username text;
alter table profiles add column if not exists nationality text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists status_text text default 'Available';
alter table profiles add column if not exists status_privacy text not null default 'public';
alter table profiles add column if not exists last_seen_privacy text not null default 'all';
alter table profiles add column if not exists profile_photo_privacy text not null default 'all';
alter table profiles add column if not exists read_receipts_enabled boolean not null default true;
alter table profiles add column if not exists media_auto_download boolean not null default true;
alter table profiles add column if not exists save_to_gallery boolean not null default false;
alter table profiles add column if not exists low_data_mode boolean not null default false;
alter table profiles add column if not exists is_online boolean not null default false;
alter table profiles add column if not exists last_seen timestamptz default now();
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz default now();

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',
  name text,
  description text,
  avatar_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now(),
  last_message_preview text
);

alter table conversations add column if not exists type text not null default 'direct';
alter table conversations add column if not exists name text;
alter table conversations add column if not exists description text;
alter table conversations add column if not exists avatar_url text;
alter table conversations add column if not exists created_by uuid references profiles(id) on delete set null;
alter table conversations add column if not exists created_at timestamptz default now();
alter table conversations add column if not exists updated_at timestamptz default now();
alter table conversations add column if not exists last_message_at timestamptz default now();
alter table conversations add column if not exists last_message_preview text;

create table if not exists conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  unique(conversation_id, user_id)
);

alter table conversation_members add column if not exists role text not null default 'member';
alter table conversation_members add column if not exists joined_at timestamptz default now();

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  content text,
  content_type text not null default 'text',
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  edited_at timestamptz,
  edit_count integer not null default 0,
  deleted_for_all_at timestamptz,
  deleted_for_all_by uuid references profiles(id) on delete set null,
  delivered_at timestamptz,
  seen_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table messages add column if not exists content text;
alter table messages add column if not exists content_type text not null default 'text';
alter table messages add column if not exists file_url text;
alter table messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists edit_count integer not null default 0;
alter table messages add column if not exists deleted_for_all_at timestamptz;
alter table messages add column if not exists deleted_for_all_by uuid references profiles(id) on delete set null;
alter table messages add column if not exists delivered_at timestamptz;
alter table messages add column if not exists seen_at timestamptz;
alter table messages add column if not exists is_deleted boolean not null default false;
alter table messages add column if not exists created_at timestamptz default now();
alter table messages add column if not exists updated_at timestamptz default now();

create table if not exists message_hides (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  hidden_at timestamptz default now(),
  unique(message_id, user_id)
);

create table if not exists status_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  text text,
  media_url text,
  media_type text,
  privacy text not null default 'public',
  privacy_targets uuid[] not null default '{}'::uuid[],
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table status_posts add column if not exists text text;
alter table status_posts add column if not exists media_url text;
alter table status_posts add column if not exists media_type text;
alter table status_posts add column if not exists privacy text not null default 'public';
alter table status_posts add column if not exists privacy_targets uuid[] not null default '{}'::uuid[];
alter table status_posts add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');
alter table status_posts add column if not exists created_at timestamptz default now();
alter table status_posts add column if not exists updated_at timestamptz default now();

create table if not exists status_views (
  id uuid primary key default gen_random_uuid(),
  status_id uuid references status_posts(id) on delete cascade,
  viewer_id uuid references profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  unique(status_id, viewer_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_profiles_last_seen on profiles(last_seen desc);
create index if not exists idx_conversations_last_message_at on conversations(last_message_at desc);
create index if not exists idx_conversation_members_user_id on conversation_members(user_id);
create index if not exists idx_conversation_members_conversation_id on conversation_members(conversation_id);
create index if not exists idx_messages_conversation_created_at on messages(conversation_id, created_at);
create index if not exists idx_messages_sender_id on messages(sender_id);
create index if not exists idx_messages_delivered_at on messages(delivered_at);
create index if not exists idx_messages_seen_at on messages(seen_at);
create index if not exists idx_status_posts_user_id on status_posts(user_id);
create index if not exists idx_status_posts_expires_at on status_posts(expires_at);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('status-media', 'status-media', true)
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
  select exists(
    select 1
    from conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function is_conversation_admin(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
$$;

create or replace function is_contact(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from conversations c
    join conversation_members m1 on m1.conversation_id = c.id and m1.user_id = p_user_a
    join conversation_members m2 on m2.conversation_id = c.id and m2.user_id = p_user_b
    where c.type = 'direct'
  );
$$;

create or replace function can_view_status_post(p_status_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s status_posts;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into s from status_posts where id = p_status_id;
  if not found then
    return false;
  end if;

  if s.user_id = auth.uid() then
    return true;
  end if;

  if s.expires_at <= now() then
    return false;
  end if;

  if s.privacy = 'public' then
    return true;
  elsif s.privacy = 'contacts' then
    return is_contact(s.user_id, auth.uid());
  elsif s.privacy = 'selected' then
    return auth.uid() = any(coalesce(s.privacy_targets, '{}'::uuid[]));
  elsif s.privacy = 'only_me' then
    return false;
  end if;

  return false;
end;
$$;

create or replace function can_edit_message(p_message_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m messages;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into m from messages where id = p_message_id;
  if not found then
    return false;
  end if;

  return m.sender_id = auth.uid()
    and m.deleted_for_all_at is null
    and m.created_at > now() - interval '1 hour';
end;
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
  set last_seen = now(),
      is_online = true,
      status_text = coalesce(nullif(trim(p_status_text), ''), status_text),
      updated_at = now()
  where id = auth.uid()
  returning * into p;

  if not found then
    insert into profiles(id, is_online, last_seen, status_text, created_at, updated_at)
    values (auth.uid(), true, now(), coalesce(nullif(trim(p_status_text), ''), 'Available'), now(), now())
    returning * into p;
  end if;

  return p;
end;
$$;

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
      select 1 from conversation_members m1 where m1.conversation_id = c.id and m1.user_id = auth.uid()
    )
    and exists (
      select 1 from conversation_members m2 where m2.conversation_id = c.id and m2.user_id = peer_id
    )
  limit 1;

  if found then
    return conv;
  end if;

  insert into conversations(type, created_by, created_at, updated_at, last_message_at)
  values ('direct', auth.uid(), now(), now(), now())
  returning * into conv;

  insert into conversation_members(conversation_id, user_id, role)
  values (conv.id, auth.uid(), 'admin'),
         (conv.id, peer_id, 'member');

  return conv;
end;
$$;

create or replace function create_group_conversation(
  p_name text,
  p_member_ids uuid[],
  p_description text default null,
  p_avatar_url text default null
)
returns conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  conv conversations;
  uid uuid;
  members uuid[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Group name is required';
  end if;

  members := coalesce(p_member_ids, '{}'::uuid[]);
  insert into conversations(type, name, description, avatar_url, created_by, created_at, updated_at, last_message_at)
  values ('group', trim(p_name), p_description, p_avatar_url, auth.uid(), now(), now(), now())
  returning * into conv;

  insert into conversation_members(conversation_id, user_id, role)
  values (conv.id, auth.uid(), 'admin');

  foreach uid in array members loop
    if uid is not null and uid <> auth.uid() then
      insert into conversation_members(conversation_id, user_id, role)
      values (conv.id, uid, 'member')
      on conflict do nothing;
    end if;
  end loop;

  return conv;
end;
$$;

create or replace function edit_message(p_message_id uuid, p_content text)
returns messages
language plpgsql
security definer
set search_path = public
as $$
declare
  m messages;
begin
  if not can_edit_message(p_message_id) then
    raise exception 'Message can no longer be edited';
  end if;

  update messages
  set content = p_content,
      edited_at = now(),
      edit_count = edit_count + 1,
      updated_at = now()
  where id = p_message_id
  returning * into m;

  return m;
end;
$$;

create or replace function delete_message_for_everyone(p_message_id uuid)
returns messages
language plpgsql
security definer
set search_path = public
as $$
declare
  m messages;
begin
  if not can_edit_message(p_message_id) then
    raise exception 'Message can no longer be deleted for everyone';
  end if;

  update messages
  set content = null,
      file_url = null,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('deleted_text', 'Message deleted'),
      deleted_for_all_at = now(),
      deleted_for_all_by = auth.uid(),
      updated_at = now()
  where id = p_message_id
  returning * into m;

  return m;
end;
$$;

create or replace function hide_message_for_me(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into message_hides(message_id, user_id)
  values (p_message_id, auth.uid())
  on conflict do nothing;

  return true;
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
    and deleted_for_all_at is null
    and delivered_at is null;

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
  set delivered_at = coalesce(delivered_at, now()),
      seen_at = coalesce(seen_at, now()),
      updated_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and deleted_for_all_at is null
    and seen_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function create_status_post(
  p_text text default null,
  p_media_url text default null,
  p_media_type text default null,
  p_privacy text default 'public',
  p_privacy_targets uuid[] default '{}'::uuid[]
)
returns status_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  s status_posts;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into status_posts(user_id, text, media_url, media_type, privacy, privacy_targets)
  values (
    auth.uid(),
    p_text,
    p_media_url,
    p_media_type,
    coalesce(nullif(trim(p_privacy), ''), 'public'),
    coalesce(p_privacy_targets, '{}'::uuid[])
  )
  returning * into s;

  return s;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table message_hides enable row level security;
alter table status_posts enable row level security;
alter table status_views enable row level security;

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

drop policy if exists message_hides_select on message_hides;
drop policy if exists message_hides_insert on message_hides;
drop policy if exists message_hides_delete on message_hides;

drop policy if exists status_posts_select on status_posts;
drop policy if exists status_posts_insert on status_posts;
drop policy if exists status_posts_update on status_posts;
drop policy if exists status_posts_delete on status_posts;

drop policy if exists status_views_select on status_views;
drop policy if exists status_views_insert on status_views;
drop policy if exists status_views_delete on status_views;

create policy profiles_select on profiles for select using (true);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy conversations_select on conversations for select using (is_conversation_member(id));
create policy conversations_insert on conversations for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy conversations_update on conversations for update using (is_conversation_member(id)) with check (is_conversation_member(id));

create policy members_select on conversation_members for select using (user_id = auth.uid() or is_conversation_member(conversation_id));
create policy members_insert on conversation_members for insert with check (auth.uid() is not null and (is_conversation_admin(conversation_id) or exists(select 1 from conversations c where c.id = conversation_id and c.created_by = auth.uid())));
create policy members_update on conversation_members for update using (is_conversation_admin(conversation_id)) with check (is_conversation_admin(conversation_id));
create policy members_delete on conversation_members for delete using (is_conversation_admin(conversation_id) or exists(select 1 from conversations c where c.id = conversation_id and c.created_by = auth.uid()));

create policy messages_select on messages
for select
using (
  is_conversation_member(conversation_id)
  and not exists (
    select 1 from message_hides h
    where h.message_id = messages.id
      and h.user_id = auth.uid()
  )
);

create policy messages_insert on messages
for insert
with check (
  auth.uid() = sender_id
  and is_conversation_member(conversation_id)
);

create policy messages_update on messages
for update
using (can_edit_message(id))
with check (can_edit_message(id));

create policy messages_delete on messages
for delete
using (can_edit_message(id));

create policy message_hides_select on message_hides
for select
using (user_id = auth.uid());

create policy message_hides_insert on message_hides
for insert
with check (user_id = auth.uid());

create policy message_hides_delete on message_hides
for delete
using (user_id = auth.uid());

create policy status_posts_select on status_posts
for select
using (can_view_status_post(id));

create policy status_posts_insert on status_posts
for insert
with check (auth.uid() = user_id);

create policy status_posts_update on status_posts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy status_posts_delete on status_posts
for delete
using (user_id = auth.uid());

create policy status_views_select on status_views
for select
using (viewer_id = auth.uid() or exists(select 1 from status_posts s where s.id = status_id and s.user_id = auth.uid()));

create policy status_views_insert on status_views
for insert
with check (viewer_id = auth.uid());

create policy status_views_delete on status_views
for delete
using (viewer_id = auth.uid());

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

drop policy if exists avatars_select on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

drop policy if exists chat_media_select on storage.objects;
drop policy if exists chat_media_insert on storage.objects;
drop policy if exists chat_media_update on storage.objects;
drop policy if exists chat_media_delete on storage.objects;

drop policy if exists status_media_select on storage.objects;
drop policy if exists status_media_insert on storage.objects;
drop policy if exists status_media_update on storage.objects;
drop policy if exists status_media_delete on storage.objects;

drop policy if exists voice_select on storage.objects;
drop policy if exists voice_insert on storage.objects;
drop policy if exists voice_update on storage.objects;
drop policy if exists voice_delete on storage.objects;

create policy avatars_select on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_update on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_delete on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy chat_media_select on storage.objects for select using (bucket_id = 'chat-media');
create policy chat_media_insert on storage.objects for insert with check (bucket_id = 'chat-media' and auth.uid() is not null);
create policy chat_media_update on storage.objects for update using (bucket_id = 'chat-media' and auth.uid() is not null) with check (bucket_id = 'chat-media' and auth.uid() is not null);
create policy chat_media_delete on storage.objects for delete using (bucket_id = 'chat-media' and auth.uid() is not null);

create policy status_media_select on storage.objects for select using (bucket_id = 'status-media');
create policy status_media_insert on storage.objects for insert with check (bucket_id = 'status-media' and auth.uid() is not null);
create policy status_media_update on storage.objects for update using (bucket_id = 'status-media' and auth.uid() is not null) with check (bucket_id = 'status-media' and auth.uid() is not null);
create policy status_media_delete on storage.objects for delete using (bucket_id = 'status-media' and auth.uid() is not null);

create policy voice_select on storage.objects for select using (bucket_id = 'voice-messages');
create policy voice_insert on storage.objects for insert with check (bucket_id = 'voice-messages' and auth.uid() is not null);
create policy voice_update on storage.objects for update using (bucket_id = 'voice-messages' and auth.uid() is not null) with check (bucket_id = 'voice-messages' and auth.uid() is not null);
create policy voice_delete on storage.objects for delete using (bucket_id = 'voice-messages' and auth.uid() is not null);

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
create trigger profiles_updated_at before update on profiles for each row execute function update_profile_updated_at();

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
create trigger conversations_updated_at before update on conversations for each row execute function update_conversation_updated_at();

create or replace function update_status_post_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists status_posts_updated_at on status_posts;
create trigger status_posts_updated_at before update on status_posts for each row execute function update_status_post_updated_at();

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
      when new.deleted_for_all_at is not null then 'Message deleted'
      when new.content_type = 'text' then left(coalesce(new.content, ''), 100)
      when new.content_type = 'image' then '📷 Image'
      when new.content_type = 'video' then '🎬 Video'
      when new.content_type = 'voice' then '🎤 Voice message'
      when new.content_type = 'location' then '📍 Location'
      else coalesce(new.content, '')
    end,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists on_new_message on messages;
create trigger on_new_message after insert or update on messages for each row execute function update_conversation_on_message();

-- ============================================================
-- REALTIME
-- ============================================================

do $$
begin
  begin alter table public.profiles replica identity full; exception when others then null; end;
  begin alter table public.conversations replica identity full; exception when others then null; end;
  begin alter table public.conversation_members replica identity full; exception when others then null; end;
  begin alter table public.messages replica identity full; exception when others then null; end;
  begin alter table public.status_posts replica identity full; exception when others then null; end;

  begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
  begin alter publication supabase_realtime add table public.conversations; exception when others then null; end;
  begin alter publication supabase_realtime add table public.conversation_members; exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.status_posts; exception when others then null; end;
end $$;

-- ============================================================
-- CLEAN OLD AUTH TRIGGER IF PRESENT
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
