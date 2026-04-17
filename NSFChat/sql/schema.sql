-- NSFChat schema.sql
-- Clean Supabase schema for a real messaging app

begin;

create extension if not exists pgcrypto;

-- -----------------------------
-- Core tables
-- -----------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  nationality text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  is_group boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id),
  constraint conversation_members_role_check
    check (role in ('owner', 'admin', 'member'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  content_type text not null default 'text',
  reply_to uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint messages_content_type_check
    check (content_type in ('text', 'image', 'file', 'system'))
);

-- Helpful indexes
create index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

create index if not exists idx_conversations_created_by
  on public.conversations (created_by);

create index if not exists idx_conversation_members_user_id
  on public.conversation_members (user_id);

create index if not exists idx_messages_conversation_id_created_at
  on public.messages (conversation_id, created_at desc);

create index if not exists idx_messages_sender_id
  on public.messages (sender_id);

-- Unique username, case-insensitive
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'profiles_username_lower_key'
  ) then
    create unique index profiles_username_lower_key
      on public.profiles (lower(username))
      where username is not null;
  end if;
end $$;

-- -----------------------------
-- Triggers and helper functions
-- -----------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    username,
    nationality,
    avatar_url,
    bio
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    coalesce(new.raw_user_meta_data->>'nationality', ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), ''),
    coalesce(new.raw_user_meta_data->>'bio', '')
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    username = coalesce(excluded.username, public.profiles.username),
    nationality = coalesce(excluded.nationality, public.profiles.nationality),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    bio = coalesce(excluded.bio, public.profiles.bio),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = coalesce(p_user_id, auth.uid())
  );
$$;

create or replace function public.is_conversation_creator(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.created_by = coalesce(p_user_id, auth.uid())
  );
$$;

create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_members (
    conversation_id,
    user_id,
    role
  )
  values (
    new.id,
    new.created_by,
    'owner'
  )
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$$;

create or replace function public.bump_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

-- -----------------------------
-- Attach triggers
-- -----------------------------

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row
execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists trg_add_creator_member on public.conversations;
create trigger trg_add_creator_member
after insert on public.conversations
for each row
execute function public.add_creator_as_member();

drop trigger if exists trg_bump_conversation_activity on public.messages;
create trigger trg_bump_conversation_activity
after insert on public.messages
for each row
execute function public.bump_conversation_activity();

-- -----------------------------
-- Row Level Security
-- -----------------------------

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Drop old policies if they exist
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Conversation members can read conversations" on public.conversations;
drop policy if exists "Creators can create conversations" on public.conversations;
drop policy if exists "Creators can update conversations" on public.conversations;
drop policy if exists "Creators can delete conversations" on public.conversations;

drop policy if exists "Members can read member rows" on public.conversation_members;
drop policy if exists "Creators can add members" on public.conversation_members;
drop policy if exists "Creators can update members" on public.conversation_members;
drop policy if exists "Creators can delete members" on public.conversation_members;

drop policy if exists "Members can read messages" on public.messages;
drop policy if exists "Members can insert messages" on public.messages;
drop policy if exists "Senders can update messages" on public.messages;
drop policy if exists "Senders can delete messages" on public.messages;

-- Profiles
create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Conversations
create policy "Conversation members can read conversations"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id));

create policy "Creators can create conversations"
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Creators can update conversations"
on public.conversations
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Creators can delete conversations"
on public.conversations
for delete
to authenticated
using (created_by = auth.uid());

-- Conversation members
create policy "Members can read member rows"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Creators can add members"
on public.conversation_members
for insert
to authenticated
with check (public.is_conversation_creator(conversation_id));

create policy "Creators can update members"
on public.conversation_members
for update
to authenticated
using (public.is_conversation_creator(conversation_id))
with check (public.is_conversation_creator(conversation_id));

create policy "Creators can delete members"
on public.conversation_members
for delete
to authenticated
using (public.is_conversation_creator(conversation_id));

-- Messages
create policy "Members can read messages"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Members can insert messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "Senders can update messages"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "Senders can delete messages"
on public.messages
for delete
to authenticated
using (sender_id = auth.uid());

commit;
