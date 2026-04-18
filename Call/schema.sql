-- Enable required extensions
);

-- Calls table for voice signaling and status tracking
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create profile automatically after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do update
    set username = excluded.username,
        updated_at = now();
  return new;
end;
$$;

-- Drop old trigger if needed
-- create trigger should be executed only once; safe to run manually if table is fresh

-- Realtime for calls
alter table public.calls replica identity full;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.calls enable row level security;

-- Profiles policies
create policy if not exists "profiles readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy if not exists "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Calls policies
create policy if not exists "users can read involved calls"
on public.calls
for select
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy if not exists "users can create calls they initiate"
on public.calls
for insert
to authenticated
with check (auth.uid() = caller_id);
create policy if not exists "users can update involved calls"
on public.calls
for update
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id)
with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- Trigger creation

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Optional: keep profile timestamps fresh

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
