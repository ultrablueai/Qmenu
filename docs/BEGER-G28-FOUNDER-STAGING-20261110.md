# Beger G28 — Founder Pro staging quota rehearsal (2026-11-10)

**Scope:** G27 Pro founder-offer 799 TRY gross monthly for up to 30 eligible paid merchants for six billed months. This release adds only a **simulation** of slot allocation; it does not decide paid eligibility or activate financial entitlements.

## Applied to isolated Staging
- `supabase/migrations/20261110000100_g28_founder_dry_run_slots.sql`: private RLS-protected 30-slot simulation table; one slot per business, Turkish businesses only, owner-authorized RPC, transaction-scoped advisory lock serializes competing claims, uniqueness/PK protect against double allocation; denies direct customer/merchant reads/writes.
- `supabase/migrations/20261110000200_g28_founder_dry_run_status.sql`: read-only admin-authorized count RPC, with unambiguous `kind=simulation`, `promo_live=false`, `billing_enabled=false`.
- `app/admin/page.tsx`, `app/admin/turkey-offer-drafts.tsx`: Staging owner dashboard displays simulation quota with explicit warning; no claim button or checkout.
- `supabase/tests/beger-g28-30-slot-rollback.sql`: reproducible disposable 31-business fixture; transaction ROLLBACK.
- `tests/beger-g28-founder-simulation.test.mjs`: structural safety/authorization/source regression; exact-HEAD CI result pending.

## Observed results
1. Owner role simulation in a transaction: slot 1 issued to first Turkish business, duplicate claim reused slot 1, second business issued slot 2; all ROLLBACK.
2. Merchant role simulation: claiming rejected with SQLSTATE 42501; all ROLLBACK.
3. Disposable 31-business fixture: all 30 slots allocated sequentially; slot 31 rejected with SQLSTATE P0001; all ROLLBACK. **This demonstrates sequential cap behaviour, not simultaneous two-session concurrency under load.**
4. Fresh read-only Staging check: `persistent_simulation_allocations=0`; `subscriptions=0`; `plans=0`; anonymous EXECUTE grant false; authenticated direct INSERT on simulation table false.
5. Read-only status RPC with simulated platform-owner claims returned `max_slots=30,used_slots=0,remaining_slots=30,promo_live=false,billing_enabled=false`.

## Important exclusions and next gates
- No actual paid eligibility, provider webhook, initial successful charge, invoice, subscription activation or trial provisioning. G28 slots are **not** commercial reservations. A future production mechanism must allocate **only after validated first settled payment**, anchor the six discounted months to billed cycles rather than dry-run timestamps, reject duplicates, and handle charge reversals, cancellations, renewals and post-offer price disclosure.
- This database test simulated JWT claims; it is not independently authenticated JWT/web E2E.
- Concurrent two-connection tests and exact-HEAD Node/Next/Vercel CI are still needed.
- No Production, primary Supabase, live pricing, payment setup, `main`, merchant records or real transactions modified.
- Next technical milestone: G29 merchant plan entitlement state machine and trial expiry in Staging, **default disabled**, plus billing ledger prepared for PSP confirmation, with no production checkout until legal/tax sign-off.

## Staging-only CI request
Please run the existing guarded `feat/g1-foundation` staging pipeline and verify the exact commit SHA, tests, typecheck, Next build and preview alias. Keep `main` and Production untouched.

[beger-deploy]
