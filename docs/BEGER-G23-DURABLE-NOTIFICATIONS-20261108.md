# Beger G23 — Durable tenant-scoped station notification inbox
**2026-11-08 · Supabase Staging only · Commercial NO-GO**

## Delivery
- Added `supabase/migrations/20261108020000_g23_durable_station_notifications.sql`, applied to Staging only. A database trigger creates a durable event in the SAME transaction when an order is inserted (`pending`) or moves into `accepted`, `ready`, or `rejected`. Idempotency `unique(order_id,status,station)` protects repeated status updates. No historical orders are artificially backfilled.
- Routing: new pending → merchant and cashier; accepted → kitchen; ready → cashier; rejected → merchant. Actual order status remains the source of truth, independent of alert read state.
- `g23_branch_notifications(branch,station)` returns up to 60 event summaries from the past 7 days. Verified owner/manager memberships may inspect their own branch stations; staff membership must also match explicit G9/G10 branch assignment for kitchen/cashier. No unrelated staff merchant feed. Only a stable order reference/table/status/time is included, with no customer payment or account secrets.
- `g23_mark_notification_read(event)` stores each user's read receipt idempotently, without mutating the order. Direct table grants revoked; RLS enabled on events and receipts. Anonymous RPC privileges revoked.
- Mounted `components/beger-durable-station-notifications.tsx` into merchant order board, cashier and kitchen. Separate inbox renders unread counts, recent events, and an explicit "read" action; polls every 15 seconds and on visibility return. G22 local sound/vibration notification is kept for foreground signals, avoiding double sound from the G23 inbox.
- New static security regression `tests/beger-g23-durable-station-notifications.test.mjs`.

## Database verification
- Staging migration applied successfully.
- Existing demo order simulated in a rolled-back transaction as pending → accepted → ready: merchant received 1, cashier 2 and kitchen 1, and reading then re-reading an event remained idempotent. All test updates rolled back.
- A separate rollback-only real-owner/foreign-branch pair verified: own station read allowed; foreign branch read, invalid role and arbitrary event acknowledgement all denied (SQLSTATE 42501). No user accounts or notifications permanently seeded.
- Database tests simulated JWT sub under `SET LOCAL ROLE authenticated`, not a real browser-signed JWT; real independent employee devices and session behavior still require acceptance.

## Explicit limitations
- Database events persist, but the UI currently queries a seven-day window and at most 60 recent entries. The event table currently has no retention/cleanup schedule; add a documented retention policy before production use.
- This is **not** Web Push; no Android/iOS delivery, service-worker subscription or background permissions, and sound/vibration are browser dependent.
- Receipt read status is per-user, not a signal that an order is accepted, prepared, printed or fulfilled. The staff role/notification API does not grant station order privileges.
- Physical automatic printing, fiscal invoices, signed-device tests and commercial payment subscriptions remain NO-GO release gates.

## Deployment gate
Request full protected exact-HEAD Staging CI via `[beger-deploy]`; verify tests, Next.js type/build, 14 static pages, READY status, and stable alias mapping. Production must not be modified.
