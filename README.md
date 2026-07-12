# Personal Finance

A mobile-friendly PWA to track every rupee — expenses across GPay / PhonePe / cards / cash, money borrowed from or lent to friends & family, tags on every transaction, and analytics on top. Built to replace a long-running Google Sheet.

## Features

- **Quick Add** — thumb-friendly entry: amount, type, payment-method chips, **multiple tags per transaction** with type-ahead search (create new tags inline), optional person, note, date.
- **Default tags & methods auto-created on first login** — home, lunch, dinner, hotel, travel, fastfood, petrol, misc + gpay/phonepe/imobile/cards/cash.
- **History** — filter by month, type, category, payment method; search notes; edit/delete anything.
- **Analytics** — monthly spend + vs-previous delta, 12-month trend, category breakdown, payment-method split, borrow/lend balances.
- **People** — who owes you, whom you owe, full per-person history (`lend`, `borrow`, `repay` both ways).
- **Import** — upload your Google Sheet as `.xlsx`/`.csv`, map columns, preview, bulk import. Unknown tags/methods/people are created automatically.
- **Settings → Configure** — payment methods, an optional **salary cycle** (set your pay day and Analytics gains salary-day-to-salary-day "This cycle / Last cycle" views), and **credit-card billing cycles** (statement + due day per card, with live next-due-date countdown; due notifications are on the backlog).
- **PWA** — add to home screen, works like an app.

## Stack

Vite + React + TypeScript + Tailwind, Supabase (Postgres + auth + row-level security), Recharts.

## Setup

### 1. Create the Supabase project (free)

1. Sign up at [supabase.com](https://supabase.com) → **New project** (pick a region near you, e.g. Mumbai).
2. In the dashboard open **SQL Editor** and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. In **Authentication → Providers** make sure **Email** is enabled. (Optionally disable "Confirm email" for instant sign-in.)
4. Copy **Project URL** and **anon public key** from **Settings → API**.

### 2. Run the app

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the app, **create your account** (email + password), then optionally run [`supabase/seed.sql`](supabase/seed.sql) — or just add categories/methods from Settings, or let the importer create them.

### 3. Import your Google Sheet

In Google Sheets: **File → Download → Microsoft Excel (.xlsx)**. In the app: **Settings → Import**, upload the file, check the auto-guessed column mapping, preview, import. Import each file only once (re-importing duplicates rows).

### 4. Deploy (free)

Push this repo to GitHub, then on [vercel.com](https://vercel.com): **New Project → import the repo**, framework preset *Vite*, and add the two `VITE_SUPABASE_*` environment variables. Every push redeploys. Open the deployed URL on your phone → browser menu → **Add to Home screen**.

> Netlify / Cloudflare Pages work the same way. For client-side routing add a SPA fallback (Vercel handles it via `vercel.json` included here).

## Tests & CI

- `npm test` — Vitest unit tests covering the sheet-import parsing (dates, amounts, debited/credited mapping, column auto-guessing, credit-card fallback), formatting helpers, and borrow/lend balance arithmetic.
- GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:
  - **Build & unit tests** — `npm ci`, `npm test`, typecheck + production build (artifact uploaded).
  - **Vulnerability scanning** — package level: `npm audit` (fails on high+ in production deps) and Google OSV-Scanner on the lockfile; code level: Semgrep with the `p/default`, `p/react`, and `p/typescript` rulesets (fails the build on findings).

## Demo mode

Run without any Supabase setup:

```bash
VITE_DEMO=1 npm run dev
```

Sample in-memory data (resets on refresh) — useful for trying the UI.

## Data model

`transactions(occurred_on, amount, type, payment_method_id, category_id, person_id, note)` where `type` ∈ `expense | income | lend | borrow | repay_out | repay_in`; `direction` (out/in) is derived from type. `person_balances` view computes net per person: positive → they owe you.
