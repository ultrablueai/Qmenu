# BEGER — Execution Board / Next-Agent Handoff
Updated 2026-11-01. This is the operational checklist; `BEGER-CANONICAL-PLAN.md` owns phase order and product contract, `BEGER-LOYALTY-CARD-NOTIFICATIONS-SPEC.md` owns detailed future loyalty/notification design.

## Rule zero
ONE phase at a time. Do not treat documentation, mocks, test counts, build or READY as commercial GO. Do not silently jump to loyalty or paid customer subscriptions. No production changes, PR merge or irreversible operations without explicit approval. Beger/Qmenu is independent of DIMASQ, Garfix, Sovereign, SatışDesk, LearningOS.

## Environments and known references
- Code GitHub `ultrablueai/Qmenu`; working branch `feat/g1-foundation`; draft PR #1.
- Supabase **Staging** project `qandxrcuetwzenlqspez`. Vercel preview project `qmenu-staging`.
- Dedicated platform owner login is confirmed by user on /admin in earlier conversation; separate `platform_owner` role in Staging. Never put login secrets in this board or confuse owner with merchant role.
- Most recently independently verified preview from prior phase: commit `2906e64`, Vercel READY, 91/91 automated tests and Next.js build. This is historical evidence, not assurance that a later code/doc-only commit is deployed.
- Notes: staging database contains 1 existing authenticated owner/merchant and currently no real second independent login for acceptance. No manufactured second account should be represented as independently authenticated.

## Phase scoreboard
| Phase | State | GO gate |
| --- | --- | --- |
| 1. Auth, platform owner, tenant/branch isolation | **OPEN — NO-GO** | Two real independent accounts and browser/device E2E, final role/RLS negative security, audit, mobile UX, release/rollback evidence |
| 2. Shop/table QR + public menu | **BLOCKED by 1** | Android/iOS QR-to-real-branch menu without account, inventory/availability, tenant separation |
| 3. Order + kitchen + live pager | **BLOCKED by 2** | Guest order -> real branch -> ready -> pager -> pickup; idempotency and negative paths |
| 4. Loyalty, offers, notifications, customer membership | **BLOCKED by 3** | Optional customer card, correct reward ledger/reversal, consent, redemption, supported push/wallet, payments only by approval |
| 5. Pilot and commercial launch | **BLOCKED by 1–4** | Separate verifiable GO checklist and explicit owner release approval |

## Confirmed completed in Phase 1 (Staging)
- Owner /admin, summary directory, audited plan definition/toggling, one-time unpaid merchant trial, platform access roster and limited audit viewer.
- Staging role checks: unauthorized caller cannot read platform admin RPCs; temporary platform_operator can read bounded overviews but cannot see owner roster or mutate plan/trial. Reversible fixture in `tests/sql/staging-operator-privilege-matrix.sql`.
- Tenant/branch RLS negative tests with temporary two businesses and staff assigned to one of two branches, all test records rolled back. Fixture `tests/sql/staging-tenant-branch-isolation.sql`. This does not replace true two-account browser testing.
- Premature merchant-assisted customer QR functions disabled, speculative self-registration migration intentionally retired as no-op; no public customer menu/order implemented yet.
- Do not misrepresent plans as priced, subscriptions as paid, audit viewer as complete monitoring, or preview-ready as launch-ready.

## Current NEXT TASK — Phase 1 acceptance, not new feature
1. Verify latest working branch, latest preview, Node tests and Next build without adding unrelated features.
2. Inspect actual login route and browser redirect handling; test authorized platform owner /admin and merchant /dashboard, signout and session expiry.
3. **Blocker: second independent confirmed Staging identity** to test unauthorized /admin, merchant cross-tenant, branch assignment in real browser. Obtain owner-approved route to use/create second test identity; do not invent credentials or reuse owner role as proof. Do not grant platform privileges automatically.
4. Test Android phone RTL Arabic, Turkish LTR, compact layout and navigation. Device-specific differences and push consent are deferred to appropriate phases; no unbuilt-feature claims.
5. Record exact actual results with environment/commit and failures; resolve Phase 1 blockers, verify rollback, only mark GO after meeting evidence. If blocker requires human input, request precisely what's needed.
6. Keep owner reports short: accomplished, evidence, blockers, next step.

## Later task slices — planned, NOT implemented
Phase 2A -> real branch/shop QR public route; 2B -> table QR binding; 2C -> server-authoritative merchant categories/items/availability and locale.
Phase 3A -> guest cart/server-priced order; 3B -> branch KDS status machine/idempotency; 3C -> live pager/ready/pickup and recover after reconnect.
Phase 4A -> opt-in customer wallet/card identity + 5+1 stamps; 4B -> verified earn/redeem/reversal; 4C -> discounts/offers and consented in-app/push; 4D -> optional Apple/Google Wallet passes and customer paid membership (provider/commercial/legal approval).
Phase 5 -> live pilot, privacy and finance release gate, metrics, backup, external E2E, GO/NO-GO.

## Design and quality gates for EVERY role
Owner: neutral clarity, platform KPIs, merchant plans/roster/audit without tenant-private data.
Merchant: manage only own activity/catalog/loyalty programs and campaigns, no owner power.
Branch: assigned-only operations, KDS, verifiable rewards, readable high-contrast status.
Customer: no app/account required for guest order; card optional, saved link and later wallet; no secret on shared QR; 320px phone first.
All: Arabic RTL/Turkish LTR, responsive, reduced motion, accessibility, real empty/error states, no fake buttons/counters, privacy, reliable navigation, functional rather than static mockup.

## Change log protocol
On each phase closure add to this file:
- Date/commit/build/deployment state;
- Verified database migration status and rollback;
- Real role and two-tenant negative tests;
- Browser/device E2E evidence;
- Open blockers and explicit GO/NO-GO.
Never edit historical PASS to imply later tests passed.

## Owner session refresh correction — 2026-11-01
- Found and corrected a concrete auth boundary omission: `middleware.ts` refreshed sessions for merchant routes but lacked `/admin/:path*`. It now covers `/admin` while `app/admin/page.tsx` continues verifying identity and separate platform role server-side.
- Owner /admin anonymous redirect now targets `/login?next=/admin`. Login return URL uses a strict two-path allowlist (`/admin`, otherwise `/dashboard`), never an arbitrary untrusted redirect. The normal merchant route remains unchanged.
- Updated old merchant auth expectation to match the safe return logic; added `tests/platform-owner-login-return.test.mjs`. One intermediate build failed exactly due to an outdated literal redirect assertion; it was corrected, **not suppressed**.
- Confirmed Vercel Staging deployment `a93f7cd` **READY**, full Node suite **93/93 pass**, Next compile and type checks succeeded. Real phone/browser refresh behavior remains unverified, and second independent account remains missing; Phase 1 **NO-GO**.
