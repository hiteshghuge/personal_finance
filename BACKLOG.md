# Feature Backlog

Ideas noted during development, roughly in priority order. Move an item to a
GitHub issue (or just ask Claude) when it's time to build it.

## Planned

- **Credit-card due notifications** — use the billing cycles configured in
  Settings → Credit cards to notify before each card's due date. Options:
  browser push (PWA `Notification` + service worker), email via Supabase Edge
  Function on a cron schedule, or both. Data model is already in place
  (`credit_cards.statement_day` / `due_day`).
- **Salary-cycle everywhere** — History month filter and monthly trend chart
  could optionally follow the configured salary cycle, not just the Analytics
  period chips.

## Ideas

- **People kinds** — mark a "person" as person / bank / bhishi so the People
  screen groups loans, EMIs, and chit funds separately from friends & family.
- **Recurring transactions** — auto-add monthly entries (LIC, SIP, bhishi,
  EMIs, salary) on their due day, matching the sheet's recurring side table.
- **Password reset & Google login** — Supabase supports both; add if ever
  locked out or tired of passwords.
- **Budgets & alerts** — per-tag monthly budgets with progress bars and
  overspend warnings.
- **Full-sheet analysis** — one-off deep analysis of the complete 2023-2026
  history (patterns, anomalies, category drift) after import.
- **Export** — download filtered transactions back to CSV/XLSX for backup or
  the accountant.
