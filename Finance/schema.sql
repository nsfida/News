-- LoanLedger schema for Supabase
-- Safe reset: removes existing objects first.

create extension if not exists pgcrypto;

drop trigger if exists trg_set_loan_ledger_updated_at on public.loan_ledger_entries;
drop function if exists public.set_loan_ledger_updated_at();
drop table if exists public.loan_ledger_entries cascade;

create table public.loan_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  direction text not null check (direction in ('given', 'taken')),
  entry_kind text not null check (entry_kind in ('principal', 'partial', 'full')),
  person_name text not null,
  currency text not null check (currency in ('AED', 'SAR', 'PKR')),
  principal_amount numeric(14,2),
  action_amount numeric(14,2),
  loan_date date not null,
  action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint principal_row_amounts_chk check (
    (entry_kind = 'principal' and principal_amount is not null and action_amount is null)
    or
    (entry_kind in ('partial', 'full') and principal_amount is null and action_amount is not null and action_date is not null)
  )
);

create index if not exists loan_ledger_entries_group_idx on public.loan_ledger_entries(group_id);
create index if not exists loan_ledger_entries_direction_idx on public.loan_ledger_entries(direction);
create index if not exists loan_ledger_entries_currency_idx on public.loan_ledger_entries(currency);
create index if not exists loan_ledger_entries_created_at_idx on public.loan_ledger_entries(created_at desc);

create or replace function public.set_loan_ledger_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_loan_ledger_updated_at
before update on public.loan_ledger_entries
for each row
execute function public.set_loan_ledger_updated_at();

alter table public.loan_ledger_entries enable row level security;

drop policy if exists "Public read access" on public.loan_ledger_entries;
drop policy if exists "Public insert access" on public.loan_ledger_entries;
drop policy if exists "Public update access" on public.loan_ledger_entries;
drop policy if exists "Public delete access" on public.loan_ledger_entries;

create policy "Public read access"
on public.loan_ledger_entries
for select
to anon, authenticated
using (true);

create policy "Public insert access"
on public.loan_ledger_entries
for insert
to anon, authenticated
with check (true);

create policy "Public update access"
on public.loan_ledger_entries
for update
to anon, authenticated
using (true)
with check (true);

create policy "Public delete access"
on public.loan_ledger_entries
for delete
to anon, authenticated
using (true);
