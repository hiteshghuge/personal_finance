-- Optional starter data. Run AFTER signing up your user in the app,
-- while logged in via the SQL editor you must replace auth.uid() with your user id,
-- or simply add these from the app's Settings page instead.

insert into public.payment_methods (user_id, name, kind) values
  (auth.uid(), 'GPay', 'upi'),
  (auth.uid(), 'PhonePe', 'upi'),
  (auth.uid(), 'Debit Card', 'card'),
  (auth.uid(), 'Credit Card', 'card'),
  (auth.uid(), 'Cash', 'cash')
on conflict do nothing;

insert into public.categories (user_id, name, color) values
  (auth.uid(), 'Home', '#3987e5'),
  (auth.uid(), 'Doctor', '#e66767'),
  (auth.uid(), 'Hotel/FastFood', '#c98500'),
  (auth.uid(), 'Groceries', '#199e70'),
  (auth.uid(), 'Travel', '#9085e9'),
  (auth.uid(), 'Shopping', '#d55181'),
  (auth.uid(), 'Bills', '#d95926'),
  (auth.uid(), 'Other', '#008300')
on conflict do nothing;
