-- NSFChat schema for Supabase
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1) Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null,
  full_name text,
  nationality text,
  avatar_url text,
  bio text,
  website text,
  location text,
  phone text,
  status text default 'Hey there, I am using NSFChat.',
  is_verified boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles using btree (lower(username));
create index if not exists profiles_display_name_idx on public.profiles using btree (lower(display_name));
create index if not exists profiles_nationality_idx on public.profiles using btree (lower(nationality));

-- 2) Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  dm_key text unique,
  title text,
  conversation_type text not null default 'dm' check (conversation_type in ('dm', 'group')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx on public.conversation_members (user_id);
create index if not exists conversation_members_conversation_idx on public.conversation_members (conversation_id);

-- 3) Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  message_type text not null default 'text' check (message_type in ('text', 'system')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id);

-- 4) Helper functions
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at
before update on public.conversations
for each row execute function public.touch_updated_at();

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, 'user@example.com'), '@', 1)
  );

  insert into public.profiles (
    id,
    username,
    display_name,
    full_name,
    nationality,
    avatar_url,
    bio,
    website,
    location,
    phone,
    status
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    v_display_name,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'nationality', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'bio', ''),
    nullif(new.raw_user_meta_data ->> 'website', ''),
    nullif(new.raw_user_meta_data ->> 'location', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'status', ''), 'Hey there, I am using NSFChat.')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  convo_id uuid;
  dm_key_value text;
begin
  if my_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null or other_user_id = my_id then
    raise exception 'Invalid conversation target';
  end if;

  dm_key_value := least(my_id::text, other_user_id::text) || ':' || greatest(my_id::text, other_user_id::text);

  insert into public.conversations (dm_key, conversation_type, created_by)
  values (dm_key_value, 'dm', my_id)
  on conflict (dm_key) do update set dm_key = excluded.dm_key
  returning id into convo_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (convo_id, my_id, 'member'),
    (convo_id, other_user_id, 'member')
  on conflict do nothing;

  return convo_id;
end;
$$;

create or replace function public.user_has_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
  );
$$;

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations
for select
to authenticated
using (
  public.user_has_conversation_member(conversations.id, auth.uid())
);

drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated"
on public.conversations
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "conversations_update_member" on public.conversations;
create policy "conversations_update_member"
on public.conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "conversation_members_select_member_conversations" on public.conversation_members;
create policy "conversation_members_select_member_conversations"
on public.conversation_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.user_has_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "conversation_members_insert_own" on public.conversation_members;
create policy "conversation_members_insert_own"
on public.conversation_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "conversation_members_update_own" on public.conversation_members;
create policy "conversation_members_update_own"
on public.conversation_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages
for select
to authenticated
using (
  public.user_has_conversation_member(messages.conversation_id, auth.uid())
);

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.user_has_conversation_member(messages.conversation_id, auth.uid())
);

drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

drop policy if exists "messages_delete_sender" on public.messages;
create policy "messages_delete_sender"
on public.messages
for delete
to authenticated
using (sender_id = auth.uid());

-- 6) Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.profiles;

-- 7) Seed note:
-- After creating tables, enable Email auth in Supabase, set your Site URL,
-- and use the auth email templates you prefer.
