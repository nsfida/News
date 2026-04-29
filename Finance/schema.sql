-- LoanLedger schema
-- Static client pages should ideally pair with server-side auth. This schema keeps the data model consistent for personal use.

drop trigger if exists trg_loan_entries_updated_at on public.loan_entries;
drop function if exists public.set_loan_entries_updated_at();
drop table if exists public.loan_entries cascade;
drop type if exists public.loan_entry_type cascade;

create type public.loan_entry_type as enum (
  'given',
  'received_back',
  'taken',
  'returned_back'
);

create table public.loan_entries (
  id uuid primary key,
  entry_type public.loan_entry_type not null,
  person_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency in ('AED', 'SAR', 'PKR')),
  entry_date date not null,
  settled_amount numeric(14,2) not null default 0 check (settled_amount >= 0),
  remaining_balance numeric(14,2) generated always as (round(greatest(amount - settled_amount, 0), 2)) stored,
  status text generated always as (
    case
      when settled_amount <= 0 then 'pending'
      when settled_amount >= amount then 'settled'
      else 'partial'
    end
  ) stored,
  notes text,
  partial_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settled_amount_within_bounds check (settled_amount <= amount)
);

create index loan_entries_entry_type_idx on public.loan_entries (entry_type);
create index loan_entries_entry_date_idx on public.loan_entries (entry_date desc);
create index loan_entries_person_name_idx on public.loan_entries (person_name);

create or replace function public.set_loan_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_loan_entries_updated_at
before update on public.loan_entries
for each row
execute function public.set_loan_entries_updated_at();

-- Open policies for anon-based static usage. Replace these with auth-based policies for real multi-user security.
alter table public.loan_entries enable row level security;

create policy "loan_entries_select_all"
on public.loan_entries
for select
using (true);

create policy "loan_entries_insert_all"
on public.loan_entries
for insert
with check (true);

create policy "loan_entries_update_all"
on public.loan_entries
for update
using (true)
with check (true);

create policy "loan_entries_delete_all"
on public.loan_entries
for delete
using (true);

-- Optional starter row for testing
-- insert into public.loan_entries (
--   id, entry_type, person_name, amount, currency, entry_date, settled_amount, notes, partial_notes
-- ) values (
--   gen_random_uuid(), 'given', 'Sample Person', 1000, 'AED', current_date, 0, 'Seed record', ''
-- );
