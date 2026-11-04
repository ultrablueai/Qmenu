# Beger — verified implementation inventory and duplicate-work gate
Date: 2026-11-04. Scope: READ-ONLY platform inspection; no production mutation.

## Canonical ownership and evidence
- GitHub repository: `ultrablueai/Qmenu`; active integration branch: `feat/g1-foundation`, observed deployed commit `566bdefc308ed7da6276209bec7b7edf2419fa60`. `main` is *not* the working implementation baseline.
- Vercel preview project: `qmenu-staging`; deployment `dpl_E5SSjMnoWbFoaQRuQTU6JfW7N6Vj` READY for the above commit. READY is not evidence of authenticated browser/device acceptance.
- Supabase isolated Staging: `qandxrcuetwzenlqspez`, ACTIVE_HEALTHY. Inspected live migration history includes `g6_independent_pager`, `g6_pager_display_and_analytics`, `g7_branch_print_settings`, `g7_branch_staff_pager_access`, `g7_pager_audit_trail`, `g8_collection_close`, `g9_kitchen_staff_workstation`, `g10_branch_cashier`. Inspected public tables had RLS enabled, with 0 pager tickets and 0 cashier/kitchen assignments at audit time.
- Separate Supabase production reference: `fstpxknegaxppjilbnke` had **no migrations and no public tables** in the read-only inspection. Do not deploy there without separate owner approval.
- Source of product requirements: `docs/BEGER-CANONICAL-PLAN.md`, plus `docs/beger-pager-reference-20-images.md`. Prior `docs/BEGER-EXECUTION-BOARD.md` phase snapshot was dated 2026-11-01/03 and **must not be used alone** to claim modules are unbuilt. Existing snapshots remain as historical evidence.

## Module inventory — source and database, not commercial certification
| Stage | Existing source entrypoints | Database / evidence | Acceptance |
|---|---|---|---|
| G1 | `app/login/page.tsx`, `app/dashboard/page.tsx`, `app/admin/page.tsx` | business/branch membership, platform roles + RLS | independent browser/mobile signoff and recovery/security gates pending |
| G2 | `app/t/[token]/page.tsx`, `app/b/[branchId]/page.tsx`, `components/public-menu.tsx` | catalog, branch publications, table QR, themes | real guest/phone E2E pending |
| G3 | `components/guest-cart.tsx`, `components/guest-order-submission.tsx`, `app/dashboard/merchant-order-board.tsx` | `g3_orders`, `g3_order_items`, `g3_order_events` | multi-device actual-order signoff pending |
| G4 | `app/dashboard/merchant-report.tsx`, order printing components | `g3_payment_events`, branch reporting RPC | merchant-recorded collection only, no PSP settlement |
| G5 | `components/guest-order-rating.tsx`, `app/dashboard/merchant-loyalty.tsx` | `g5_order_ratings`, `g5_loyalty_stamps` | pilot only; never claim offers/redemption certified |
| G6 | `app/dashboard/merchant-pager.tsx`, `app/pager/[token]/pager-customer.tsx`, `app/pager/display/[token]/public-board.tsx` | `g6_pager_tickets`, `g6_pager_issue`, `g6_pager_transition`, public token RPC | database present, zero live tickets observed; full two-device test pending |
| G7 | `app/staff/pager/page.tsx`, `app/dashboard/merchant-pager-audit.tsx`, print settings | `g7_staff_branch_access`, `g7_pager_audit_events`, `g7_branch_print_settings` | physical printer and real staff tests pending |
| G8 | `app/dashboard/merchant-collection-close.tsx` | `g8_collection_closes`, `g8_collection_close` | real authorized close and negative tests pending; see `docs/BEGER-G8-STATUS.md` |
| G9 | `app/staff/kitchen/page.tsx`, `app/dashboard/merchant-kitchen.tsx` | `g9_kitchen_staff_branches`, kitchen events | no kitchen assignments observed; staff browser tests pending |
| G10 | `app/staff/cashier/page.tsx`, `app/dashboard/merchant-cashier.tsx`, `app/dashboard/merchant-cashier-access.tsx` | `g10_cashier_staff_branches`, `g10_cashier_order_action`, `g10_cashier_mark_collected`, `g10_cashier_assign` | no cashier assignments observed; real account/role and payment-record tests pending |

## Duplicate-work and Pager state conflict
- Existing G6 *already* stores independent tickets and atomically issues per-branch sequence numbers with unguessable customer links. Existing G6 uses `SELECT ... FOR UPDATE` and server-side role authorization; G7 adds staff permissions and audit history. Never replace with another ticket model without a migration and behavior contract.
- Branch `feat/pager-ticket-lifecycle`, draft PR #5, created in a later conversation, adds `src/lib/pager-ticket-lifecycle.mjs` and tests. **Do not merge as written.**
- Difference: PR #5 allows `ready -> cancelled`; live `g6_pager_transition(uuid,text)` on Staging permits `waiting -> preparing|ready|cancelled`, `preparing -> ready|cancelled`, `ready -> fulfilled`; terminal `fulfilled` and `cancelled` cannot move further. PR #5 also introduces a version field that does not exist in `g6_pager_tickets`. Duplicating these two state machines risks semantic drift.
- Action: keep PR #5 draft and unmerged; review any useful test ideas against existing `tests/beger-g6-independent-pager.test.mjs` and live SQL; implement only a verified gap in the current G6/G7 source.

## One-phase, no-duplication protocol (mandatory per conversation)
1. Read this inventory, `AGENTS.md`, canonical plan and most recent relevant status document.
2. Inspect actual branch SHA, pending PRs, existing frontend/server code, migrations, and Staging state **before writing**. Search by feature/RPC/table names. Mark existing functionality **REUSE**, missing **BUILD**, conflict **RECONCILE**, tested only by text assertion **NOT E2E**.
3. Pick one testable missing or broken vertical slice; write acceptance and negative tests. Never implement parallel feature models for a function already covered by G1–G10.
4. Keep work on scoped feature branches. PR review, test/build evidence, security review, then isolated staging acceptance; **no main merge/production writes without explicit approval**.
5. Report: exact commit/PR, files changed, tests executed (not merely added), real device/browser evidence, staging status, defects and next gate. Do not treat Vercel READY or a migration as a completed user journey.

## Next work after this inventory
- Reconcile PR #5 with G6 rather than merging duplicate lifecycle rules.
- Verify existing G6/G7/G9/G10 using independent actual staff accounts, multi-branch denial, customer QR on a second device, payment-record restrictions and no duplicate ready/fulfilled actions. No test fixture or auth identity should be silently created in real merchant accounts.
- Review 320px/Android/iOS layout and Arabic RTL / Turkish & English LTR; fix **specific** observed defects, no broad redesign before screenshot acceptance.
- Run `npm test && npm run build` on exact HEAD and record results. Guard real printer and Web Push claims behind physical-device evidence.
- Maintain `docs/BEGER-EXECUTION-BOARD.md` as chronological history while the inventory is the current working baseline. No commercial GO yet.
