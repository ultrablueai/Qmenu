# Beger G21 — Print operations monitoring

**2026-11-08 · Staging only · Commercial launch NO-GO**

## Built and integrated
- `supabase/migrations/20261108010000_g21_branch_print_health.sql`: read-only security-definer RPC `g21_branch_print_health(branch)`, with business membership limited to owner/manager, no anonymous execution, and fully branch-scoped counts.
- Distinguishes `no_jobs`, `normal`, `delayed` and `needs_attention`; tracks queued/previewed/failed/confirmed, queued older than five minutes, previewed older than ten minutes, and five latest failure reasons. Reports G20 simulated device/active/expired lease counts, **not real printer connectivity**.
- `app/dashboard/merchant-print-health.tsx`: compact RTL light UI embedded in `merchant-print-queue.tsx`, refreshing every 15 seconds while the panel is mounted. No alert means there are no print jobs, **not** that a USB printer is online.
- Static test suite `tests/beger-g21-print-health.test.mjs` verifies scope, thresholds, no mutation and truthful hardware limitations.

## Live staging validation
- Read-only inspection before changes: **zero G17 jobs and zero G20 simulation devices/leases**; prior G20 stable Vercel alias was verified.
- Applied G21 migration successfully to Staging.
- Used an existing real owner identity under `SET LOCAL ROLE authenticated` within `BEGIN ... ROLLBACK`: confirmed empty queue reports `no_jobs`, while foreign-branch read rejects 42501.
- In another rolled-back SQL transaction, accepted an existing demo order to create exactly three jobs; health returned `normal` with three jobs. Marked kitchen ticket failed with a reason via G18; health became `needs_attention`, failed=1 and included the failure example. Rolled back all temporary changes.
- No production, no unrelated tenant, no new live order/print data changed. Tests are DB-claim simulations, not signed-JWT browser/device E2E.

## Known open items
- A physical printer-connected agent, authenticated hardware pairing, secure leases and signed acknowledgments have **not** been implemented. G20 is only a reservation simulation.
- Push notifications or background monitoring when the browser tab is closed are **not** part of G21.
- Pending release gates: real multi-device test, thermal printer USB/LAN and paper-out, backups/restore, compliance/fiscal document checks, subscriptions/billing and security acceptance.
- Exact-HEAD CI and stable Vercel alias must pass before G21 can be marked READY.
