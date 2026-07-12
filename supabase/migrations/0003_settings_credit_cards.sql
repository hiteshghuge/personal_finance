-- Per-user settings (salary cycle) and credit-card billing cycles.

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Day of month the salary lands (1-31). Null = not configured; the app
  -- then only offers calendar-month views.
  salary_day int check (salary_day between 1 and 31),
  updated_at timestamptz not null default now()
);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  -- Day of month the statement is generated (1-31)
  statement_day int not null check (statement_day between 1 and 31),
  -- Day of month the payment is due (1-31); may fall in the month after the statement
  due_day int not null check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.user_settings enable row level security;
alter table public.credit_cards enable row level security;

create policy "own user_settings" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own credit_cards" on public.credit_cards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
