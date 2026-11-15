# BEGER — Central Management + Limited Branch Operations
Approved by product owner: 2026-11-02. **AUTHORITATIVE DESIGN SPEC**; approval of architecture is not approval to deploy or migrate Production.

## 1. Non-negotiable tenant hierarchy
Platform (Beger) > Business / merchant organization (one subscription and ownership boundary) > Branch (operational scope) > Assigned users / stations. A branch is **never** an independently owned merchant or independent subscription merely because it has a QR, public URL, staff or operations screen.

Business owners and delegated headquarters managers operate centrally. Authorized branch staff operate only within explicitly assigned branches and capabilities. Platform operators do not automatically inherit access to merchant customer, medical or transactional private data. A platform administrator who also owns a merchant uses an independently verified merchant membership.

## 2. Interface contract
- `/admin`: Beger platform governance; plans, support oversight and audit under platform roles, not a tenant superuser by assumption.
- `/dashboard`: business headquarters — branch creation, central catalog, pricing, publishing, branch configuration, staffing/permissions, reports and QR/table management. The same interface serves single-branch merchants with complexity progressively hidden.
- `/dashboard/branches/[branchId]`: **branch operations only** — receiving/fulfilling orders, KDS, queue/pager, appointment check-in where relevant, product stock-out/temporary availability controls when permitted, printing QR and reading branch-local operational summaries. Do **not** expose headquarters product creation/editing, persistent price editing, assigning permissions or subscription management.
- `/b/[branchId]` and `/t/[token]`: public guest views only; QR locators are never authentication, payment, on-premise presence or order-state credentials.
- Existing G2 feature branch currently has menu/table CRUD inside branch workspace: **known implementation drift** against newly approved design. Move controls; do not silently claim architecture already shipped.

## 3. Explicit role / permission taxonomy
Authorization decisions are (business_id, optional branch_id, capability, actor_id) and fail closed. Business affiliation alone does not grant branch staff access.

| Capability | business_owner | headquarters_manager | branch_manager | branch_staff |
| --- | --- | --- | --- | --- |
| business/settings, subscriptions | full | delegated read only | none | none |
| branches/create, archive, rename | full | individually delegated | none | none |
| staff/assign, grant or revoke | full | individually delegated, no self-escalation | none in baseline | none |
| catalog/create, edit or delete | full | delegated catalog management | none | none |
| prices/change, bulk publish | full | explicitly delegated | none | none |
| product/mark temporarily unavailable | full | delegated | assigned branches | only explicitly delegated operational staff |
| table/create, revoke or rotate QR | full | delegated | no in baseline | none |
| QR/print | full | delegated | assigned branches | assigned branches if print permission |
| orders/operate, KDS, pager | all business branches | delegated | assigned branches | assigned queue/station and branch |
| appointments/check in | all business branches | delegated | assigned branches | assigned role only |
| reports/financial | all business | separate explicit delegation | no by default | none |
| reports/operations | all business | delegated | assigned branches only | assigned station subset |

No broad 'manager' flag substitutes for a capability policy. Headquarters manager is a business-level role; branch manager is scoped by explicit branch assignment. A user's role may differ by business and branch. Deny by default, checks on backend and Postgres RLS/RPC, not only hidden UI. Deny self-assignment, role elevation and business/branch cross-references; audit privileged changes with actor, scope, previous/new state, timestamp and request ID. Do not leak PII in audit payload.

## 4. Central catalog without breaking existing G2 tenant data
Target: catalog items and categories owned by the business; branch publications/overrides reference those definitions. Price stored in integer minor units with verified currency and canonical server calculation. Per-branch availability, visibility, display sorting and optional authorized branch price override. Only central roles can alter price or publish to multiple branches. Branch operations may stock-out without changing the canonical product, base price or other branches.

Migration plan:
1. Inventory actual current `menu_categories`, `menu_items`, `dining_tables`, per-branch references and existing published guest URLs. Do not invent duplicates or drop existing data.
2. Introduce business-owned catalog identity and branch publication mapping via additive migration on Staging with referential constraints and RLS; preserve stable guest URL/QR tokens. Backfill deterministically, keep legacy rows readable until dual-read/compatibility tests pass. Resolve same-label products across branches explicitly; never auto-merge distinct items based solely on names.
3. Move catalog/price/table CRUD to business HQ, with explicit branch selection and bulk publish preview. Keep local operation limited to temporary availability and QR printing.
4. Verify two-merchant / two-branch negative reads and writes, manager delegation, staff stock-out only, owner override and revocation, Arabic/Turkish guest catalog, QR rotation, rollback. Require real authenticated user/API sessions in addition to transactional RLS simulation.
5. Only retire legacy write paths after Staging E2E and signed-off data reconciliation; no production migration without owner authorization.

## 5. Vertical plugin boundary
Same tenant/branch authorization primitives across businesses. Food & café: order/KDS/queue/pager. Barber/salon: appointments, check-in, staff calendars and station assignment. Clinic: appointment and check-in only in generic operations; medical records or clinical content must have a separate high-sensitivity domain, least-privilege access, audit and privacy review. Do not reuse food checkout or branch membership to authorize medical records.

## 6. Global-grade implementation standards
- International-first: Arabic RTL and Turkish LTR at pilot, locale-aware prices/dates, accessibility (keyboard, screen reader, error feedback), later additional locales without duplicating authorization code.
- Operational reliability: idempotent write commands, transactions, pessimistic failure handling, limits and input validation, observability, explicit rollback and source-backed acceptance.
- Security: distinct actor/tenant/branch capabilities, no reliance on editable JWT user metadata, server-derived scope, separate public display RPCs, deny cross-tenant leakage; audit high-risk actions.
- Performance: branch-scoped indexes, bulk edits safely batched with previews, paginate large catalog/branch lists, branch-local caching with invalidation, mobile-friendly operator UI.
- Commercial product: one merchant subscription boundary, allowed plan-specific branch limits in the future; **do not** silently create extra per-branch subscriptions.

## 7. Acceptance and delivery gates
Architecture is **approved; implementation is NOT done**. The current G2 branch has staging schema and branch editor but needs refactoring to centralized headquarters management before G2 acceptance. Vercel preview quota recently returned 402; fixed branch link points to prior ready build. Do not claim the latest code deployed. Update G2 acceptance and execute a single consolidated preview build only when quota permits; G3 stays blocked until G2 verified. No Production, no main merge, no plan upgrade, no weakening of Preview SSO as part of this specification.

Change control: preserve this spec as the source of truth for branch governance. Any deviations require explicit product-owner approval and corresponding tests/documentation.
