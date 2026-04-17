-- NSFChat schema for Supabase
-- Run this in the SQL editor after creating the project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  full_name text,
  nationality text,
  avatar_url text,
  bio text,
  website text,
  location text,
  phone text,
  status text default 'Hey there, I am using NSFChat.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct',
  title text,
  dm_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

create or replace function public.touch_conversation()
returns trigger
language plpgsql
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
for each row
execute function public.touch_conversation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    username,
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
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'New user'),
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'nationality', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'bio', ''),
    nullif(new.raw_user_meta_data->>'website', ''),
    nullif(new.raw_user_meta_data->>'location', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'status', ''), 'Hey there, I am using NSFChat.')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.start_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_conversation_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_user_id is null then
    raise exception 'Missing user id';
  end if;

  if p_other_user_id = v_me then
    raise exception 'You cannot start a chat with yourself';
  end if;

  v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text);

  select id
    into v_conversation_id
  from public.conversations
  where dm_key = v_key
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (conversation_type, title, dm_key)
    values ('direct', null, v_key)
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_me),
           (v_conversation_id, p_other_user_id);
  else
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_me)
    on conflict do nothing;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, p_other_user_id)
    on conflict do nothing;
  end if;

  update public.conversations
  set updated_at = now()
  where id = v_conversation_id;

  return v_conversation_id;
end;
$$;

grant execute on function public.start_direct_conversation(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members m
    where m.conversation_id = id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
on public.conversations
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Conversation members can update conversations" on public.conversations;
create policy "Conversation members can update conversations"
on public.conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.conversation_members m
    where m.conversation_id = id
      and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversation_members m
    where m.conversation_id = id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
on public.conversation_members
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert their own membership" on public.conversation_members;
create policy "Users can insert their own membership"
on public.conversation_members
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own membership" on public.conversation_members;
create policy "Users can update their own membership"
on public.conversation_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Members can update their own messages" on public.messages;
create policy "Members can update their own messages"
on public.messages
for update
to authenticated
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_display_name on public.profiles(display_name);
create index if not exists idx_profiles_nationality on public.profiles(nationality);
create index if not exists idx_conversation_members_user_id on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conversation_id on public.conversation_members(conversation_id);
create index if not exists idx_messages_conversation_id_created_at on public.messages(conversation_id, created_at desc);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
