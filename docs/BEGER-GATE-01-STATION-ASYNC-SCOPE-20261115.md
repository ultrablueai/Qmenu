# Beger Gate 01 — branch-scoped station response isolation (2026-11-15)

## Scope
Small code-only regression repair, **not** a commercial GO. Preserve existing order state machines, APIs, print routes, platform configuration, and deployed Staging alias.

## Confirmed baseline
- Canonical branch `feat/g1-foundation` and latest READY Staging deployment both at SHA `621936af3d9a9f3318fa043bee8a3b5c054a67f2` (verified Git compare: identical).
- Staging DB `qandxrcuetwzenlqspez` inspected read-only: 71 public tables, no public table without RLS. These numbers do not establish function/role security.
- Distinct salon demo `/demo/salon/customer` uses browser-local storage; actual Staging salon bookings have separate `/salon/book/[slug]` Supabase workflow.

## Problem
An in-flight response from branch A can return after operator selects branch B, and overwrite the new branch's feed/order list in React. React effect cleanup alone does not prevent already-running promise resolution from mutating state.

## Code implemented on separate branch
- `components/beger-durable-station-notifications.tsx`: monotonic request sequence guard + invalidation on effect cleanup.
- `app/dashboard/merchant-order-board.tsx`: guard orders/capability refresh.
- `app/dashboard/merchant-kitchen.tsx`: guard kitchen RPC results and alerts.
- `app/dashboard/merchant-cashier.tsx`: guard cashier RPC results and alerts.
- `app/dashboard/merchant-print-queue.tsx`: guard print queue and history RPC results when a branch changes.
- Tests `tests/beger-g23-stale-notification-scope.test.mjs`, `tests/beger-g37-branch-async-scope.test.mjs` added; the latter covers print jobs as well.

## Verification
- Source files were fetched back from GitHub; expected request guard, invalidation and server-RPC patterns were observed in all **five** components (source-level verification, not behavioral React E2E).
- **Not executed:** full Node tests, TypeScript build, browser E2E or authenticated cross-tenant scenarios on this branch.
- Vercel Git status context reported success but actual recent Vercel deployment records on this branch say **CANCELED**. Treat this as unverified / NO MERGE until a complete READY deployment with tests and consistent SHA is obtained.
- No database migration, Production change, main merge, or stable Staging alias switch.

## Required closing acceptance
1. Run `npm test && npm run lint && npm run build` on exactly the branch commit SHA.
2. Manual UI check: tenant A branch 1 ↔ branch 2 fast switching on slow network; stale results never display; server still denies foreign tenant requests.
3. Test kitchen and cashier two authenticated staff devices, fresh session, signout, and revoked assignment.
4. Review canceled Vercel deployments and ensure only intended branch is deployed once; verify exact-head READY before PR merge.
5. Decide whether stale status errors and action refreshes also need request versioning; test regressions before extension.

## Next sequence
Gate 02 independent JWT tenant/branch/RPC negative checks; Gate 03 full customer QR > accepted > kitchen > cashier > pager + print queue; Gate 04 real printer/notification/backup recovery; Gate 05 merchant billing/legal/production release signoff.

## Gate 02 — read-only live authorization inventory (2026-11-15)
- Supabase Staging read-only catalog check confirmed `anon` cannot EXECUTE: `g3_branch_orders`, `g9_kitchen_queue`, `g9_kitchen_advance`, `g10_cashier_queue`, `g10_cashier_order_action`, `g10_cashier_mark_collected`, `g17_branch_print_jobs`, `g23_branch_notifications`, `g23_mark_notification_read`.
- Inspected `g9_kitchen_allowed` and `g10_cashier_allowed` function bodies: both require `auth.uid()` and a current business membership, with additional role-specific branch assignment for staff; owner/manager scoped by business membership.
- `g10_cashier_order_action` delegates authorization to `g10_cashier_allowed` and locks the matching order row before accepted/fulfilled transitions. Absence of literal `auth.uid()` inside this wrapper is **not by itself an auth gap**.
- **Not yet verified:** real signed-JWT two-merchant negative tests, revoked assignments, valid token least-data review, API abuse/rate limiting. No execution of privileged mutations, test data writes, or production changes.
