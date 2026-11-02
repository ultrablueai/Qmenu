# BEGER — Canonical Product Plan & Execution Guardrails
Status: APPROVED product scope / execution order. Date: 2026-11-01.
Repository: ultrablueai/Qmenu. Staging branch: feat/g1-foundation.

## Priority and sources of truth
This document is the operational execution contract for Beger, capturing the owner's confirmed requirements and the established master plans:
- SMART_MENU_PAGER_MASTER_PLAN_2026-10-29.md
- SMART_MENU_PAGER_UNIFIED_PRODUCT_PLAN_2026-10-28.md

The master product plans define business behavior and the 21-day *target*, not proof that functionality has shipped. The current repository code and Supabase state determine implementation status, not aspirational descriptions or automated test counts alone.

When requirements conflict, stop and explicitly reconcile with the owner BEFORE writing or applying a migration. Do not infer registration, payment, identity, or QR semantics from convenience. New features are forbidden while closing an open phase.

## Product definition
A standalone, multi-tenant Smart Business OS, independent of DIMASQ, Sovereign, Garfix and SatışDesk. Initial markets Türkiye and Syria with Arabic RTL + Turkish LTR; extensible to GCC. Initial operational vertical is café/restaurant/bakery. Other verticals (retail, barber/salon, clinic) are enabled through sector-specific modules **after** proving the common core. Never reuse café ordering logic for medical records.

## Separate interfaces and authority
1. Platform Super Admin `/admin`: merchant onboarding oversight, plans/subscriptions, platform status, operational incidents, platform reporting and support audit. No implicit unrestricted access to tenant customers, or impersonation without audited approvals.
2. Merchant/Business Owner `/dashboard`: only that merchant's overall management, branches, catalog, permissions, subscription and aggregated reports.
3. Branch workspace `/dashboard/branches/[branchId]`: only branch-assigned operations, orders, kitchen/queue/pager and staff. Owner/manager authorized access; branch staff needs specific assignments, not automatic all-branch access.
4. Customer public experience `/b/[branchId]` (table-specific context separately): no merchant/admin UI, mobile browser, no mandatory customer app/account.

Tenant_id/business_id and branch_id must be enforced in database RLS and verified server-side on every sensitive request; roles include platform_admin, business_owner, business_manager, branch_manager, branch_staff, customer. Do not confuse platform administrators with tenant roles.

## The three distinctly different QR flows — DO NOT CONFLATE
A. **Branch/shop QR** belongs to merchant/branch, opens the correct public menu/service page and order flow; available to all visitors, not a credential.
B. **Table QR** belongs to branch/table, opens same public menu with table context; not a credential and never trusted as authority to change totals or order state.
C. **Customer QR/loyalty identity** is OPTIONAL: one customer-facing Beger card hub can be used in participating stores across cities, but each business has its own isolated loyalty wallet/rewards and customer consent relationship. The same business may opt to share a loyalty program across its participating branches. The customer QR is not a payment/redemption credential and is *not* a prerequisite to view menu or place/track an order. Customer enrolls or claims an account themselves; the merchant does NOT create their account. If customer loyalty cards are implemented, consent and identity lifecycle must be reviewed.

The **primary customer journey** is:
Scan SHOP/TABLE QR → see the merchant/branch menu → choose items/services → cart → submit order (guest allowed) → kitchen/branch accepts/prepares → order READY → customer follows status on phone as digital pager → pickup/fulfillment. Optional account/loyalty is later. Never make customer QR issuance or account signup the entry point to order.

For salon/clinic verticals, QR opens correct service/appointment or queue workflow, not a food menu, and clinical data is isolated with stricter handling.

## Payments and loyalty
- Pilot: verified cash/pay-at-counter states; never mark paid from unauthenticated client assertion.
- Official merchant payment integrations for Türkiye/Syria only when approved/certified; never block cash/web-pager MVP on unapproved integrations.
- Server-calculated integer minor-unit prices, verified discounts, currency and timezone. No client-trusted totals.
- Single authoritative order state machine (pending -> accepted -> preparing -> ready -> fulfilled, with audited cancel/refund transitions); idempotent commands and webhook handling.
- Kitchen & pager need live state delivery with reconnection fallback.
- Loyalty points/stamps derived from qualifying confirmed order with append-only ledger, idempotent credit and refund reversals; opt-in promotional consent distinct from transactional notifications.
- Scheduled pickup constrained by server-authoritative slots/capacity, availability, preparation time and cancellations. Start simple; do not misrepresent it as shipped.

## Execution order — A to Z with proof, one phase at a time
PHASE 1 — Foundation and separation: reconcile code/DB drift, audit login, memberships, Super Admin and tenant/branch access architecture, rollback or disable incompatible merchant-assisted customer issuance. Scope and acceptance must be demonstrated; no unrelated features.

PHASE 2 — Public SHOP/TABLE QR + real merchant catalog: business/branch/table context, category, product price, availability, Arabic and Turkish mobile experience. E2E: Android/iOS scan correctly opens the right live menu; cross-tenant IDs fail closed.

PHASE 3 — Order → KDS → Pager: branch-scoped server-authoritative orders, validation, state transitions, kiosk/table flows, customer status/pickup and resilience. E2E: scan to verified pickup and no duplicate orders; independent branch permissions.

PHASE 4 — Optional customer identity, loyalty, rewards, promotions: no mandatory registration; opt-in consent, credit only once, refunds reverse credit, rewards redeem once, marketing separation.

PHASE 5 — Pilot & commercial release gate: admin and merchant reporting, subscription trial operation, export, security/RLS negative tests, accessibility/RTL/LTR, real-device tests, observability, backup and rollback; documented GO/NO-GO with concrete evidence.

Each phase must document scope, acceptance evidence, tests, security checks, human/browser E2E and rollback strategy. An automated test PASS or Vercel READY is **not** commercial GO; no next phase until the current one is closed.

## Current audit facts (2026-11-01)
- Auth/onboarding and basic merchant/branch dashboards exist on staging, but require stronger real-browser/security checks.
- Merchant-assisted customer QR issuance and staff scan code were implemented **out of priority and in conflict with the approved guest-order journey**; they are not an approved sign-up flow or substitute for shop/table QR.
- The premature `202611010002_customer_self_registration.sql` draft was retired as an explicit no-op; merchant-assisted customer QR RPCs were disabled on Staging. Optional loyalty identity is deferred to Phase 4.
- Supabase Staging has businesses, branches and memberships, but no catalog/order/KDS/pager database tables. The separate platform owner panel now exists with overview, read-only directory, audited plan catalog, manual trial assignment, administrator roster and limited audit overview. This is not a production/commercial release.
- The QR drift has been contained without dropping legacy data; remaining Phase 1 work includes real browser/device acceptance and release-gate evidence. No invented QR mechanism is allowed.

## Locked customer loyalty identity decision — 2026-11-01
The owner approved a **single Beger customer card identity/hub across businesses, cities and provinces** with independent per-business wallets and programs. Another branch belonging to the *same* business may share its program only if configured to participate; unrelated merchants never automatically share points, orders, customer history, entitlements or marketing consent. Customer scans SHOP/TABLE QR for guest access and optional merchant program enrollment; authorized merchant staff may scan a **customer card QR** at counter to view only their merchant's permitted reward status, followed by independent server verification of earning/redeeming. No static QR screenshot may spend monetary value. No forced app or traditional account for guest service. This is a Phase 4 product decision, not implemented; detailed threat model, cross-city E2E, join/scan flows and design acceptance in `docs/BEGER-LOYALTY-CARD-NOTIFICATIONS-SPEC.md`. No Phase 4 code until Phase 1–3 gates complete.

## Safety and project separation
- STAGING only until explicit owner approval for Production. No production schema changes, deploys, secrets, irreversible operations or PR merge by default.
- Never expose service-role credentials or personal/medical data in client components or QR.
- Fail closed when role/tenant/branch validation fails. Negative two-tenant/two-branch tests are mandatory.
- All user data changes must be reversible where possible; no destructive schema cleanup without approval.
- This plan is immutable as a baseline until owner explicitly approves a change. Any approved changes must update this file and the relevant tests/docs together.

## Execution discipline
Before implementing: read this document, inspect current code, migrations, test evidence, staging deployment and source master plans. Identify *one* smallest missing vertical slice. Build, test, independently verify, and report true remaining blockers. Stop and ask when scope/consent/product semantics are unclear. No speculative features, no unrelated projects, no unsupported READY claims.

## Phase 1 isolation verification — 2026-11-01
- SQL editor on Supabase **Staging**: two temporary businesses (one owned by test actor, one unrelated) confirmed RLS hides the unrelated business, branch and membership.
- Additional temporary **staff membership** with two branches (one assigned, one unassigned) and a separate unrelated tenant: authenticated staff could read only the assigned branch. This is DB-level RLS verification, **not** a complete browser E2E or a second real login.
- Both tests were run in transactions ending with ROLLBACK. Reproducible fixture: `tests/sql/staging-tenant-branch-isolation.sql`. No persistent test businesses or staff memberships were created.
- Checked that authenticated role cannot execute the retired customer-QR issue/rotate/scan/deactivate RPCs.
- Remaining Phase 1 acceptance: two independent authenticated real accounts and mobile/browser E2E, UI/accessibility regression and rollback readiness. Phase 1 remains **NO-GO** until this evidence is collected; no move to Phase 2 by implication.

## Phase 1 operator security acceptance — 2026-11-01
- Latest full Staging preview at prior commit `1478ce5` was Vercel READY and passed 90/90 automated checks.
- Supabase Staging SQL verified an **existing approved platform owner temporarily downgraded to platform_operator inside a single transaction ending in ROLLBACK**: all four bounded read-only admin RPCs allowed; owner roster, creating plans, editing plan state and assigning trials all denied with SQLSTATE 42501. Original owner privilege retained after rollback. Reproducible script `tests/sql/staging-operator-privilege-matrix.sql`.
- Independently inspected the public SECURITY DEFINER RPC inventory and login-exposed table grants. Retired customer QR RPCs continue to deny authenticated execution. No new auth users or fake subscriptions were introduced.
- **Critical caveat:** these are database role simulations, not a second authenticated real-account browser test. Thus Phase 1 remains NO-GO pending browser/mobile and distinct-user acceptance, as explicitly required by canonical execution contract.

## Frozen 2026-11-01 product design handoff — loyalty, notifications and cross-role UX
The owner asked to preserve **all** discussed design/research decisions and execute in order without drifting. Read these two committed companion documents **before any future implementation**:
- `docs/BEGER-LOYALTY-CARD-NOTIFICATIONS-SPEC.md` — persistent optional customer card, merchant-scoped wallets, 5+1 reward example, coupons/discounts, possible paid customer memberships, web/push/Wallet notifications, privacy/consent, accessible modern UX for platform owner, merchant, branch and customer.
- `docs/BEGER-EXECUTION-BOARD.md` — one-phase-at-a-time authoritative GO/NO-GO and code/test/browser handoff, evidence and blockers.

Explicit distinction: the capabilities requested by the owner (loyalty/offers, optional saved customer card, notifications, customer membership products, appealing screens for all roles) are **in scope but not implemented**. The recommended one Beger card hub with independent per-business loyalty wallets and Wallet integration are **PROPOSED architecture/design choices**, not a deployed feature, and commercial/customer identity specifics require consent/compliance and owner decisions. Guest order stays available without account or install. Never treat saving a QR screenshot as notification permission, nor let a static QR itself spend rewards.

The phase order (1 foundation -> 2 shop/table QR and menu -> 3 order/KDS/pager -> 4 optional loyalty/notifications/subscriptions -> 5 pilot/GO) remains unchanged. Future engineering agents must not implement Phase 4 work during open Phase 1. Do not claim the referenced legacy master plans exist at repository root unless verified: they are historical discussion baselines, whereas these committed docs are available in the working branch.

## Approved table QR and pager anti-confusion policy — 2026-11-01
Owner confirmed **every physical table must have a distinct merchant/branch/table-bound QR**, eliminating editable customer-chosen table numbers in the default dine-in journey. This belongs to Phase 2 (table QR) and Phase 3 (order/pager verification); not implemented yet.
- The merchant creates/labels tables through an authorized branch-scoped operation; printed table QR is a revocable opaque public locator, not an administrator credential. Backend resolves its actual business_id/branch_id/table_id, checks active status, and rejects mismatched, revoked, cross-tenant or arbitrary customer-supplied identifiers. A table number printed on a QR is display text only and cannot authorize order routing.
- On scan, public menu opens with table context automatically displayed; server validates table context again on order submission. Never accept a posted table_id, branch_id, amount, or queue sequence as authoritative merely because the client supplied it. Consider optional staff-confirmed dine-in session or short-lived table challenge to mitigate copied QR/remote ordering; **static QR alone cannot prove physical presence**. Staff can rotate/revoke damaged/copied labels.
- Every committed order gets its own server-generated opaque ID and a separate display number; the pager/queue gets its own server-assigned queue reference. Queue display number is NOT an authentication credential and cannot be edited to take another guest's turn. Order tracking requires a scoped, secure order-access token or equivalent; pickup needs staff-confirmed proof or one-time claim code per order, with replay prevention.
- Separate four concepts: SHOP QR (public merchant entry), TABLE QR (physical table locator), CUSTOMER LOYALTY CARD QR (optional merchant-scoped identity lookup), ORDER/PAGER pickup proof (order-specific, time-limited verification). Neither a table QR nor a customer QR by itself claims an order, spends a reward or assigns queue priority.
- Required future E2E: two branches both with table 7 never cross-route; client forged table numbers fail; rotated QR fails; photographed QR from offsite cannot force unverified preparation where staff confirmation is enabled; two guests at same table have distinct orders/pager entitlements; queue/pickup token cannot be replayed; invalid branch/staff cannot accept another branch's order.
- UX: show auto-detected table label, clear 'I am at table 7' context, no free-text table-number field in default table scan; fallback to counter order/assisted staff flow when QR is missing; clear errors and safe retry. Do not force signup or phone number.
- This security/UX requirement is an approved product decision, **not evidence of deployed QR, order or pager features**. Maintain Phase 1 GO gate before implementing.

## Approved central headquarters / limited local branch governance — 2026-11-02
The product owner explicitly approved **Centralized Management + Limited Branch Operations**. Binding design and implementation/rollout gates: `docs/BEGER-CENTRAL-BRANCH-GOVERNANCE.md`.
- One business owns its branches under one merchant/tenant/subscription boundary. Headquarters `/dashboard` manages branch lifecycle, catalog, prices, publishing, permissions and QR/table administration. Branch `/dashboard/branches/[branchId]` is a **local operations console**, not an independent store administrator.
- Branch manager and staff see only assigned branch operations; temporary stock-out, printing QR, orders, pager and appointments per explicit capability. They cannot edit canonical prices/catalog, grant themselves roles or change subscriptions. Business owner and specifically delegated headquarters managers administer centrally. The Beger platform owner is a separate authority and does not impersonate merchant accounts.
- Long-term business-wide product catalog with branch publication/availability and optional centrally authorized pricing override; additive staged migration from current branch-specific G2 schema, preserving records, URL/QR contracts and two-tenant isolation. Avoid destructive shortcut migrations.
- **Important supersession:** the older section that described branch workspace as branch-specific management is narrowed to **operations only** by this new approval. Current code still mounts a G2 catalog editor inside branch page and is **not yet compliant**; record as implementation gap, not delivered. Before refactoring, maintain staged tests and Vercel deployment quota/SSO release caveats. No change to main or Production without explicit approval.
