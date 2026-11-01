# Phase 1 branch access isolation — 2026-11-01
Status: Staging migration applied and database rollback test passed. Phase 1 overall remains OPEN.

## Guardrail
Source of truth: docs/BEGER-CANONICAL-PLAN.md. Merchant/branch roles must never be conferred by platform ownership, and guest QR/cafe order modules are not part of this phase.

## Implemented
- Migration `202611010009_branch_scoped_assignments.sql`: branch_assignments with composite business+branch and business+membership FK constraints; select-only RLS; owner/manager can read activity of branches in their business, branch staff see only assigned branches.
- Replaced overly broad `branches_member_read` with `branches_scoped_member_read`. Staff can no longer list all branches merely because of a business membership.
- New guarded `assign_branch_staff` RPC for owner/manager only, target must already be staff of same business. Audits assignment through existing tenant audit log. No front-end staff invitation or assignment workflow is falsely advertised as ready.
- Branch workspace now allows staff only after explicit assignment verification. Merchant home page lists and links to the RLS-visible branches but branch editing remains owner/manager only.

## Verified
- Rollback-only SQL transaction on Staging: converted test session owner membership to `staff` temporarily; two branches of first business plus one unrelated tenant; granted one branch_assignment for staff.
- Under authenticated role, the staff sees exactly 1 of 2 branches of its business and 0 of foreign tenant; update attempts on assigned and unassigned branches write 0 rows. All conditions pass.
- Rollback restored actual data: 1 business, 1 branch, 0 assignments, 1 owner membership. No test users/branches persist.
- Pre-existing branch permissions grant only name column UPDATE; reparenting business_id is already forbidden, no redundant migration added.
- Static regression tests in `tests/branch-scope-security.test.mjs` and amended `tests/branch-workspace.test.mjs`.

## Remaining before Phase 1 acceptance
- Test real staff account assignment and browser login, owner/manager assignment RPC positive case with a distinct authorized staff user.
- Test owner/admin + staff journey on real Android and iOS browsers. No real-device automation evidence yet.
- Verify logout, session expiry, email recovery and redirect behavior; validate independent cross-tenant negative tests for all future tenant-owned modules.
- Platform admin operational workflows beyond overview and basic plans/trials remain incomplete.
- Production untouched, PR remains draft; no commercial GO.
