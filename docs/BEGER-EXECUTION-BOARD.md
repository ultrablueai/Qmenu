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

## Second independently registered merchant accepted — 2026-11-01
- User personally completed signup for `ultraspeedweb@gmail.com` on Staging. Verified in Supabase Auth that email is confirmed and actual sign-in exists; separate merchant membership exists, with **zero active platform-admin roles**.
- Both independently registered accounts have one business membership (role `owner`) and one branch each; businesses have **different UUIDs**.
- Verified actual database RLS with each account's *real auth.uid() simulated in a transaction as role authenticated*: each sees precisely one business/branch, never the other's. The second merchant was denied by all four tested privileged platform RPCs (`platform_admin_overview`, `platform_admin_business_directory`, `platform_owner_access_roster`, `platform_owner_create_plan`) with SQLSTATE 42501. Original platform owner can still access owner roster.
- Read-only verification wrapped in SQL BEGIN/ROLLBACK, with no role, subscription or merchant data writes.
- **Not browser impersonation and not browser E2E**: even with real Auth accounts, these checks set jwt claim inside SQL. Remaining phase gate: confirm unauthorized `/admin` in actual merchant browser session, verify owner login and full branch navigation on Android/iOS, test signout/session expiry/RTL/LTR, and record screenshots/defects. Phase 1 remains OPEN (NO-GO).

## Dual-role navigation — 2026-11-01
- Owner clarified that their original merchant account was later separately authorized as platform owner. Both roles must be maintained without swapping tokens, account impersonation or granting permissions to ordinary merchants.
- Staging code now shows an `/admin` switch on merchant `/dashboard` **only if** the signed-in user has a separately enabled `platform_admins` role (`platform_owner` or `platform_operator`). Failure to verify access hides the switch. Platform `/admin` offers a `/dashboard` switch **only if** the same authenticated user has an existing merchant membership. Existing server-side route checks remain authoritative.
- Test suite: 96/96 passed, Next.js typecheck/build succeeded, Vercel preview `580de952` READY on Staging. `tests/dual-role-navigation.test.mjs` guards against link visibility widening into role mutation.
- Still requires actual user-browser verification of both switches with owner account, no `/admin` access with separate merchant account, signout/session refresh and mobile display. Phase 1 remains OPEN/NO-GO. No Production change or PR merge.

## Approved future customer QR lifecycle — 2026-11-01
- Owner approved **one Beger card hub across stores, cities and provinces**, optional for customer. Each unrelated business has isolated points, stamps, vouchers, paid memberships, history and marketing consent. The same business may elect to share its program with selected branches.
- Separate shop/table QR (public guest menu/order) from customer loyalty QR (customer-selected membership presented to authorized counter staff). The shop QR may offer optional join/claim; customer QR scan alone never credits purchases or redeems anything; server verifies qualifying purchase and one-time reward redemption.
- New merchant B must not see merchant A records even if both use Beger card hub. Device-only saved card may not survive reset; verified recovery is optional. Cross-city does not create pooled wallets.
- Source-of-truth `docs/BEGER-LOYALTY-CARD-NOTIFICATIONS-SPEC.md` includes precise cross-city acceptance scenarios and privacy/security requirements. **Phase 4 planning only**; Phase 1, 2 and 3 gates remain unchanged.
- Phase 1 pending: actual owner and merchant browser journeys, mobile responsive/RTL checks, signout/session behavior; user has two genuinely confirmed accounts. Do not claim actual browser E2E from SQL role impersonation alone.

## Approved table QR and anti-queue-theft flow — 2026-11-01
- Owner specifies **one distinct QR for every table**, scoped to business + branch + table. Guests scan and see a server-resolved table without typing or modifying a table number. A forged table field or QR from another branch cannot route an order to someone else's table.
- Static table QR is a public locator **not physical-presence proof**; future implementation must provide revocation/rotation, validated table session and configurable staff confirmation against photographed/offsite misuse.
- Order reference, pager sequence, customer loyalty card and table QR are **four separate identifiers**. Display numbers do not grant pickup/queue privileges. Use scoped tracking, one-time pickup proof/staff verification and idempotent transitions.
- Phase 2 acceptance now explicitly includes distinct tables with same display number across different branches, compromised QR rotation and no customer-editable table selection. Phase 3 acceptance includes concurrent orders on one table, queue integrity, no stolen pickup or replay.
- Canonical rationale and E2E scenarios in `docs/BEGER-CANONICAL-PLAN.md`. Product decision only; no live tables/order system created and **Phase 1 still OPEN/NO-GO**.

## Engineering agent team & reusable skills — 2026-11-01
- Added repository-root `AGENTS.md` with six **named work roles**: Orchestrator, Application Engineer, Tenant Security, Database Reviewer, Mobile/Accessibility QA, Release/Incident Reviewer. These are actionable instructions for AI coding tools, **not** proof of independent automated assistants running concurrently.
- Added 6 repository-local reusable skill files: `.agents/skills/project-audit/SKILL.md`, `.agents/skills/tenant-security/SKILL.md`, `.agents/skills/auth-access-qa/SKILL.md`, `.agents/skills/visual-mobile-qa/SKILL.md`, `.agents/skills/payment-loyalty-certification/SKILL.md`, `.agents/skills/release-gate/SKILL.md`.
- Added `tests/beger-agent-skills-contract.test.mjs` to verify skill paths, descriptions, gate contracts and orchestration safety. Actual CI test counts must be read from immutable Vercel deployment for the exact SHA; file additions are not a claim of executed agent reviews.
- Phase 1 remains OPEN/NO-GO pending **real** owner/merchant browser navigation, denied merchant /admin path, signout, mobile RTL/LTR and rollback acceptance. The payment/loyalty skill is future-phase documentation, not permission to build out-of-order.

## 2026-11-01 — Staging build recovery and current live security inventory
- Restored the original merchant signup behavior after an out-of-scope resend-confirmation edit. No signup/account workflow redesign is authorized by this repair.
- Repaired the `auth-access-qa` skill's explicit Phase 1 gate text to satisfy the existing agent-skills contract test. Latest Vercel Preview commit `c2e1080` **READY**: **98/98 Node tests passed**, Next.js compiled and generated 12/12 static pages; `verify:staging` reported `staging_preview_only`. Prior two preview deployments from the discarded change had ERROR. No Production write.
- Live read-only Supabase Staging inventory: **12 public tables**, zero public tables with RLS disabled, one enabled platform admin, zero live branch assignments. This inventory is not an independent cross-tenant browser session test.
- Security advisor warnings still open: 10 authenticated-callable `SECURITY DEFINER` RPCs (they need individual guard review, not blanket revoke), and disabled leaked-password protection. Three intentionally RLS-without-policy tables need individual justification in review. **Important distinction:** zero functions executable by the universal `PUBLIC` grant does not mean zero privileged RPCs callable by `authenticated`.
- Performance advisor flagged 5 unindexed FK cases (including branch assignments and retired QR tables) and 4 unused indexes. Do not drop indexes based solely on small Staging traffic; review migration/index implications before changes.
- **Phase 1 remains OPEN / NO-GO** pending real independent-account browser/device authorization tests, signout and refresh behavior, recovery, audited privileged RPC review, backup/rollback rehearsal and separate production approval.

## 2026-11-01 — Privileged RPC regression and recovery readiness
- Staging deployment commit `3b511ad` **READY**: **99/99 Node tests PASS**, Next.js compilation and staging-only gate passed. A committed read-only SQL drift gate checks all 10 authenticated-callable privileged RPC signatures by name, anon denial, fixed search paths, identity guards, platform authorization markers and public RLS. It passed live Staging execution; this is a structural contract check, not E2E permission proof.
- New safety runbook: `docs/PHASE1-STAGING-RECOVERY-RUNBOOK.md`. The live read-only baseline confirms **13 applied migrations; 12/12 public tables with RLS; 2 businesses, 2 branches, 2 memberships, 1 platform admin, 0 live branch assignments, 0 plans and 0 subscriptions**.
- No backup export, restoration, storage clone, production migration or data mutation occurred. **Restore rehearsal remains BLOCKED** pending approved isolated target and real restorable backup. Do not claim restore GO.
- Browser/mobile independent two-account acceptance, remaining Auth security advisors and true recovery rehearsal continue to block Phase 1 GO.
