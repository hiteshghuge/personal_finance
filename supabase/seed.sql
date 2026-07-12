-- Optional starter data. Run AFTER signing up your user in the app,
-- while logged in via the SQL editor you must replace auth.uid() with your user id,
-- or simply add these from the app's Settings page instead.

insert into public.payment_methods (user_id, name, kind) values
  (auth.uid(), 'gpay', 'upi'),
  (auth.uid(), 'phonepe', 'upi'),
  (auth.uid(), 'imobile', 'bank'),
  (auth.uid(), 'Debit Card', 'card'),
  (auth.uid(), 'Credit Card', 'card'),
  (auth.uid(), 'cash', 'cash')
on conflict do nothing;

-- Tags as used in the original Google Sheet (the importer auto-creates any others it finds)
insert into public.categories (user_id, name, color) values
  (auth.uid(), 'home', '#3987e5'),
  (auth.uid(), 'fastfood', '#e66767'),
  (auth.uid(), 'hotel', '#c98500'),
  (auth.uid(), 'trip', '#199e70'),
  (auth.uid(), 'petrol', '#9085e9'),
  (auth.uid(), 'cloaths', '#d55181'),
  (auth.uid(), 'farm', '#d95926'),
  (auth.uid(), 'Investment', '#008300'),
  (auth.uid(), 'LIC', '#3987e5'),
  (auth.uid(), 'misc', '#e66767'),
  (auth.uid(), 'Income', '#199e70')
on conflict do nothing;
