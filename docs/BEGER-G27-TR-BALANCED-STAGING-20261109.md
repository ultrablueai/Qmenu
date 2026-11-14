# Beger G27 — Turkey Balanced subscription offer drafts (2026-11-09)

## Owner-approved provisional commercial direction
- Turkey TRY, advertised gross monthly amounts: Start 399 TRY, Pro 999 TRY, Business 1799 TRY.
- Annual gross: 3990 / 9990 / 17990 TRY. A ten-month equivalent (two months off).
- 14-day free trial; Start and Pro one included branch; Business two branches.
- Founder Pro proposal: 799 TRY gross **per month for six months**, limited to first 30 eligible merchants; price guarantee, usage allocation, renewal notice and actual promotion slot reservation are NOT implemented yet.
- A 20% general VAT/KDV assumption is recorded for drafting only. Tax classification, invoices and legal terms require Turkish accountant/legal review.
- Merchant ↔ customer food payments remain separate and never settle through Beger.

## Implemented (isolated Staging)
1. Migration `20261109200000_g27_tr_balanced_offer_drafts.sql` applied via connected Supabase staging project `qandxrcuetwzenlqspez`. The table contains exactly three internal offer drafts; `published=false` and `billing_enabled=false` are DB CHECK-enforced.
2. Database RLS denies access to ordinary merchants. Platform owner/operator may read. No direct insert/update/delete grant to `anon` or `authenticated`.
3. Admin `app/admin/page.tsx` loads the internal catalog and renders `app/admin/turkey-offer-drafts.tsx` in a dedicated light-theme section. No checkout or subscription write path.
4. Pure JS module `lib/beger-tr-balanced-offers.mjs` models gross-inclusive previews and refuses Pro introductory discount without verified capacity. No server-side atomic claim/reservation exists yet, and this preview must never be treated as a chargeable quote.
5. `tests/beger-g27-tr-balanced-offers.test.mjs` adds unit/source-contract coverage (test pass and Next build to be confirmed by exact-HEAD CI).

## Live Staging SQL evidence
- Offer catalog rows: 3. Invalid trial duration: 0. Live/published offers: 0. Correct promo row: 1. Plans/subscriptions: 0/0. Anonymous SELECT grant: false; anonymous RLS policies: 0.
- Read-only actor simulation using existing membership: ordinary merchant sees **0** drafts, platform owner sees **3** drafts. Transactions were rolled back. These are database role/JWT-claim simulations, not an independently authenticated browser test.
- Production and `main` untouched. No PSP, invoice, price activation, merchant entitlement or subscription mutation.

## Closure before commercial GO
- Exact-HEAD CI and Staging preview UI inspection.
- Atomic allocation for first 30 **eligible paid** Pro customers, no duplicate claims, immutable acquisition order, six consecutive billed periods, expiry/reversion and clear renewal price notification.
- Server-side subscription trial/active/expired entitlements, security cross-tenant tests, payment-provider settled confirmation, invoice issue/reversal, tax/legal review, verified backup restore, formal launch sign-off.
- Do NOT imply discounts automatically assigned to any existing merchant or deployed publicly.

## Staging build request
This documentation-only commit requests a guarded **Staging-only** pipeline for the exact HEAD of `feat/g1-foundation`; no production use or release approval.

[beger-deploy]
