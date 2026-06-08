create table if not exists public.finance_transactions (
  id uuid primary key,
  transaction_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  scope text not null check (scope in ('personal', 'business')),
  source text not null,
  product text,
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  installment_id uuid,
  installment_number integer,
  installment_count integer,
  installment_total numeric(12, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_invoice_checks (
  id uuid primary key,
  source text not null,
  scope text not null check (scope in ('personal', 'business')),
  month_key text not null,
  total numeric(12, 2) not null check (total >= 0),
  due_date date not null,
  created_at timestamptz not null default now()
);

alter table public.finance_transactions
  drop constraint if exists finance_transactions_source_check;

alter table public.finance_invoice_checks
  drop constraint if exists finance_invoice_checks_source_check;

alter table public.finance_transactions
  add column if not exists installment_id uuid,
  add column if not exists installment_number integer,
  add column if not exists installment_count integer,
  add column if not exists installment_total numeric(12, 2),
  add column if not exists product text;

alter table public.finance_transactions enable row level security;
alter table public.finance_invoice_checks enable row level security;

drop policy if exists "Allow local finance reads" on public.finance_transactions;
drop policy if exists "Allow local finance inserts" on public.finance_transactions;
drop policy if exists "Allow local finance deletes" on public.finance_transactions;
drop policy if exists "Allow local finance updates" on public.finance_transactions;
drop policy if exists "Allow invoice reads" on public.finance_invoice_checks;
drop policy if exists "Allow invoice inserts" on public.finance_invoice_checks;
drop policy if exists "Allow invoice deletes" on public.finance_invoice_checks;
drop policy if exists "Allow invoice updates" on public.finance_invoice_checks;

create policy "Allow local finance reads"
  on public.finance_transactions for select
  using (auth.role() = 'authenticated');

create policy "Allow local finance inserts"
  on public.finance_transactions for insert
  with check (auth.role() = 'authenticated');

create policy "Allow local finance deletes"
  on public.finance_transactions for delete
  using (auth.role() = 'authenticated');

create policy "Allow local finance updates"
  on public.finance_transactions for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Allow invoice reads"
  on public.finance_invoice_checks for select
  using (auth.role() = 'authenticated');

create policy "Allow invoice inserts"
  on public.finance_invoice_checks for insert
  with check (auth.role() = 'authenticated');

create policy "Allow invoice deletes"
  on public.finance_invoice_checks for delete
  using (auth.role() = 'authenticated');

create policy "Allow invoice updates"
  on public.finance_invoice_checks for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
