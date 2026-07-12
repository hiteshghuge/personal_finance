-- OPTIONAL: the app now auto-creates these defaults on first login
-- (see src/lib/store.ts ensureDefaults), so running this file is only
-- needed if you want to seed from SQL instead. Run while authenticated
-- or replace auth.uid() with your user id.

insert into public.payment_methods (user_id, name, kind) values
  (auth.uid(), 'gpay', 'upi'),
  (auth.uid(), 'phonepe', 'upi'),
  (auth.uid(), 'imobile', 'bank'),
  (auth.uid(), 'Debit Card', 'card'),
  (auth.uid(), 'Credit Card', 'card'),
  (auth.uid(), 'cash', 'cash')
on conflict do nothing;

insert into public.categories (user_id, name, color) values
  (auth.uid(), 'home', '#3987e5'),
  (auth.uid(), 'lunch', '#e66767'),
  (auth.uid(), 'dinner', '#c98500'),
  (auth.uid(), 'hotel', '#199e70'),
  (auth.uid(), 'travel', '#9085e9'),
  (auth.uid(), 'fastfood', '#d55181'),
  (auth.uid(), 'petrol', '#d95926'),
  (auth.uid(), 'misc', '#008300')
on conflict do nothing;
