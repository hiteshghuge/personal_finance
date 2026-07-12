-- Multiple tags per transaction: replace transactions.category_id with a join table.
-- Safe to run on a database that already has data from 0001 — existing single
-- tags are copied into the join table before the column is dropped.

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (transaction_id, category_id)
);

create index transaction_tags_category_idx on public.transaction_tags (category_id);

alter table public.transaction_tags enable row level security;
create policy "own transaction_tags" on public.transaction_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Migrate existing single-tag data
insert into public.transaction_tags (transaction_id, category_id, user_id)
select id, category_id, user_id from public.transactions
where category_id is not null
on conflict do nothing;

drop index if exists transactions_category_idx;
alter table public.transactions drop column category_id;
