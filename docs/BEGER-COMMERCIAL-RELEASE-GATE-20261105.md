# Beger — Commercial release gate (2026-11-05)
**Status: NO-GO for paid/general public launch.** Limited isolated Staging pilot only.
**Immutable base:** `feat/g1-foundation`; single preview URL `https://qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app`.
**No production schema, payment, domain or `main` modification without explicit owner sign-off.**

## Proven / not proven
| Item | Observed evidence | Gate |
|---|---|---|
| G1–G11 code + Staging migrations | GitHub + live Supabase Staging; G11 pending employee invitations are in place | Source and schema present; not an external-user acceptance |
| CI / Next build | Record deployment SHA, exact automated test totals, typecheck and READY after each change | Must pass on same SHA |
| Independent cashier / kitchen / pager | Branch-scoped SQL RPC and static regression contracts | **OPEN:** real separated accounts, different browsers/devices, negative access attempts |
| Customer QR → accepted → preparing → ready → delivered | G3 order + G9/G10 + guest watcher code | **OPEN:** two-device phone tests, table correctness, cart/add-on math, repeat clicks, restart |
| Pager public token and announce | G6/G7 exists with sound/vibration user setting | **OPEN:** physical device, background/page switch, public board and ticket privacy |
| Staff onboarding | G11 invite / verified-email acceptance, now simpler single join URL | **OPEN:** employee signup email confirmation, owner invite, accept, revoke and expired invite on real accounts; no outbound invite email integration |
| Billing / merchant subscription | Staging `plans` count=0 and `subscriptions` count=0 on 2026-11-05 | **BLOCKER:** approved price/tax/currency policies, trial expiry, signed subscription activation, invoices, reminders, cancellations and receivables |
| Merchant-collected payments | Cash/external collection events and G8 close code | **BLOCKER for financial certification:** reconcile cash and external receipts, returns/reversals, duplicate control, receipt/tax review |
| Operational reliability | Staging Next build runs | **BLOCKER:** incident alerts, error reporting, backup **restore** drill, staging/production config separation, rate limits and abuse guards |
| Security and privacy | RLS on inspected tables and SQL checks | **BLOCKER:** independent authenticated tenant isolation tests, data retention/privacy notice, least-privilege audit |
| UX / accessibility | Responsive components and static contracts | **OPEN:** Arabic RTL, Turkish/English LTR, 320px mobile, print, QR camera, real device visual signoff |
| Regulatory readiness | Scope notes in `docs/BEGER-COMMERCIAL-PAYMENTS-SCOPE-20261103.md` | **BLOCKER:** local legal/accounting review for customer disclosures, receipts/tax and subscription service terms |

## Sequenced closure (no duplicate feature rewrite)
1. **Pilot acceptance:** owner + 3 independently registered roles, 1 guest phone, 2 branches, 2 businesses; execute real end-to-end flows with evidence. Fix verified bugs only. No fake claims from static regex assertions.
2. **Subscription MVP:** *first* approve trial and regional price/currency/tax policies. Implement tenant-scoped subscription state, activation/expiration, billing records and operator reconciliation. Beger bills the merchant; never takes consumer food-payment settlements.
3. **Transaction reliability:** verify counter collections, reverse/refund events, overlapping close denial and printer-specific receipts with devices. Avoid legal fiscal certification claims until external review.
4. **Commercial support & recovery:** monitoring, encrypted backup/restore test, secure access grants, support audit, terms/privacy and incident runbooks.
5. **Visual QA & pilot GO:** screenshots on actual Android/iOS + desktop, approval of the same Staging SHA, signed release checklist, then owner-approved Production rollout with rollback plan.

## Per-release handoff template
- GitHub branch + commit: ______
- Changed files / migrations: ______
- Executed tests / failures / build: ______
- Multi-user/mobile/manual evidence: ______
- Known defects / blockers: ______
- Staging deployment ID and stable-alias mapping: ______
- Production approval: **not granted** until explicitly recorded

## 2026-11-05 verified database snapshot
At read-only inspection: 3 businesses; 0 plans; 0 subscriptions; 2 pager tickets; 0 ratings; 1 staff invitation. Counts may change with real pilot activity and do not indicate feature completeness. Never automatically purge existing demo/test records.

## 2026-11-05 Staging CI request
The current document-only commit requests exact-HEAD Staging validation through the protected `[beger-deploy]` gate for the staff UX simplification and release baseline. Do not mark the build or pilot READY until Vercel log evidence is observed.

## 2026-11-05 — G12 subscription visibility, NOT billing activation
- Existing `plans` and `subscriptions` tables remain unchanged, with **no prices seeded and no subscription activated**. Existing operator trial RPCs remain intact.
- Added `supabase/migrations/20261105190000_g12_merchant_subscription_status.sql` in Staging only: a read-only SECURITY DEFINER RPC scoped to the verified merchant owner/manager; anonymous EXECUTE revoked. Returns explicit `not_configured`, dates and plan name from stored rows, not guessed "paid" state. Staging database permissions inspected successfully.
- Added `app/dashboard/merchant-subscription-status.tsx` plus a `subscription` merchant workspace route and `tests/beger-g12-merchant-subscription-status.test.mjs`. No checkout or tenant-to-merchant fund settlement.
- Paid commercial launch still NO-GO: approved regional tariffs, VAT/tax treatment, invoicing, cancellation, expiry enforcement, billing authorization, reconciliation and cross-tenant authenticated pilot remain outstanding.
- Next commit requests validation via `[beger-deploy]` on **the established Staging branch alias**. Do not treat SQL/static tests alone as real merchant billing certification.

- G12 initial CI build failed 1/361 static tests: an older merchant-workspaces test expected a fixed five-tab array. Updated its assertion to cover the new sixth subscription tab, retaining permission checks. Re-running tests and build on a new exact-HEAD staging commit; no production changes.
