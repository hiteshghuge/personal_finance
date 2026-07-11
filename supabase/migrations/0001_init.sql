-- Personal Finance schema. Run this in Supabase SQL Editor (or via supabase CLI).

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'other' check (kind in ('card', 'upi', 'cash', 'bank', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_on date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  -- expense/income: normal spends & earnings (category applies)
  -- lend: I gave money to a person; borrow: I took money from a person
  -- repay_out: I repaid what I borrowed; repay_in: they repaid what I lent
  type text not null check (type in ('expense', 'income', 'lend', 'borrow', 'repay_out', 'repay_in')),
  direction text not null generated always as (
    case when type in ('expense', 'lend', 'repay_out') then 'out' else 'in' end
  ) stored,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  person_id uuid references public.people (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_person_idx on public.transactions (person_id);

-- Positive balance: the person owes me; negative: I owe them.
create view public.person_balances with (security_invoker = true) as
select
  p.id as person_id,
  p.user_id,
  p.name,
  coalesce(sum(
    case t.type
      when 'lend' then t.amount
      when 'repay_in' then -t.amount
      when 'borrow' then -t.amount
      when 'repay_out' then t.amount
      else 0
    end
  ), 0) as balance
from public.people p
left join public.transactions t on t.person_id = p.id
group by p.id, p.user_id, p.name;

alter table public.payment_methods enable row level security;
alter table public.categories enable row level security;
alter table public.people enable row level security;
alter table public.transactions enable row level security;

create policy "own payment_methods" on public.payment_methods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own people" on public.people
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
