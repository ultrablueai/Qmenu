# Beger G20 — Exclusive printer dry-run reservation lab
**7 November 2026 · Staging only** · repo `ultrablueai/Qmenu` / `feat/g1-foundation`

## What was actually built
- `supabase/migrations/20261107010000_g20_test_printer_leases.sql` creates private tenant/branch-scoped **simulated print devices** and short-lived **test job leases**. RLS is on; direct `anon`/`authenticated` table privileges revoked.
- `g20_register_test_printer`: owner/manager creates a named simulation station of type kitchen/pickup/summary; no hardware secrets, physical printer pairing, or API credentials are created.
- `g20_claim_test_print`: obtains a 90-second exclusive reservation on **one queued print job of the same tenant, branch and kind** using `FOR UPDATE OF j SKIP LOCKED`. A second claim cannot take that same job until release or expiry. The returned token is short lived and only usable as part of the same authorized session context.
- `g20_release_test_print`: checks owner/manager, device/job scope, matching lease token and the claiming actor. It drops the lease only, never changes the original print job state to printed/confirmed.
- `g20_test_printer_status`: reports simulated stations and active reservations to authorized branch owner/manager.
- `app/dashboard/merchant-printer-lease-lab.tsx` is now embedded in the merchant print queue. It allows the authorized owner to register a dry-run station, claim a pending job and release it; prominently states **NO physical output**, USB or silent printing.

## Verification performed on Supabase Staging
- Applied migration successfully; no changes to Production.
- Rollback-only SQL exercise on an existing demo order: accepted order created its G17 job, registered a simulated kitchen, claim succeeded, second claim returned `claimed=false`, invalid release token returned false, valid release returned true, same job reclaimed successfully, final release completed, **original print job stayed `queued`**. All fixture changes rolled back.
- Rollback-only unauthorized identity test: lab status, registration, claim and release all rejected with SQLSTATE `42501`.
- `tests/beger-g20-printer-lease-lab.test.mjs` checks isolation, lock/expiry, token validation and truthful dry-run UI.
- Build/tests/alias must be verified at exact deployment commit before marking staging READY.

## Outstanding gates — not represented as complete
1. **Actual printing bridge is not connected.** G20 is an isolated reservation rehearsal, not secure printer-device provisioning; no external background agent or desktop service has been installed.
2. Build trusted short-lived device credential issuance and revocation, secure printer software with authenticated polling, durable error/retry acknowledgements, and device heartbeat before moving this lease path to production.
3. Test USB/LAN thermal output on merchant hardware, 58/80mm RTL tickets, offline/paper-out, multiple printers and duplicate retries. Manual browser printing remains the fallback.
4. Signed JWT and multi-account device E2E tests, backup restoration, fiscal paperwork and commercial subscription billing are still release blockers.

**Commercial launch remains NO-GO; Production unchanged.**

## CI rerun note
- First G20 CI attempt failed in a static source-contract assertion (399/400): a SQL comment mentioning the forbidden key type was incorrectly matched as executable usage. Fixed the assertion to ignore standalone SQL comments before checking for privileged credentials/mutations; no change to runtime database access controls.
- Re-run the complete guarded Staging pipeline on the next exact-head commit. Do not mark this increment READY until the whole Next.js build and stable alias pass.
