# Beger G12–G13 — Staging engineering handoff (2026-11-05)

**Gate:** STAGING IMPLEMENTED, commercial billing **NO-GO**. This page does not authorize Production changes or a release.

## Built and applied
- Existing G1 plan catalog, G1 trial activation, rate **drafts** and `subscriptions` database are reused — not duplicated.
- G12 `g12_merchant_subscription_status(uuid)` is a read-only scoped RPC for merchant owner/manager; `app/dashboard/merchant-subscription-status.tsx` presents real plan dates and state, or explicit `not_configured`.
- G13 `g13_subscription_requests`: one pending request per merchant, owner request for trial/plan-review/renewal/cancellation, owner withdrawal, merchant read-only history, platform owner acknowledgement/decline with audit log. Does **not** activate, cancel or bill subscriptions.
- Added branch-independent index coverage for business history, review queue, requester and reviewer.
- Merchant UI: `app/dashboard/merchant-subscription-requests.tsx` on `/dashboard?view=subscription`.
- Platform UI: `app/admin/subscription-service-requests.tsx` linked from the existing `/admin`.
- SQL applied only to Staging project `qandxrcuetwzenlqspez`. No fabricated plan rows, prices, checkout or sample transactions. No changes in Production `fstpxknegaxppjilbnke`.

## Executed verification
- Live Staging permission inspection: all five G13 functions have `anon_execute=false`, `authenticated_execute=true`; protected by explicit owner/platform membership checks. Table RLS true, direct grants revoked, no request rows created by assistant.
- Supabase advisors: after index migration, G13 no longer appears in unindexed-FK findings. Unused indexes reported due to no G13 activity yet; NOT evidence to remove the required indexes. Other existing tables retain warnings and must be assessed separately.
- Automated contracts `tests/beger-g12-merchant-subscription-status.test.mjs`, `tests/beger-g13-subscription-requests.test.mjs` are source checks, **not** authenticated two-account E2E. Test/build results must be recorded from the same exact deploy SHA.
- One prior G13 Staging deployment passed 366/366 tests and completed Next.js READY, but the index-only update must be validated again on a new exact HEAD.

## Manual acceptance before claiming pilot completion
1. Signed-in business A owner: create plan-review request; owner sees pending, second concurrent request denied; withdraw then create again.
2. Business A manager: can read, cannot submit/withdraw.
3. Business B owner: cannot see or change business A requests, including direct RPC calls with known UUID.
4. Anonymous: no RPC execution or direct table access.
5. Platform operator: can view queue but cannot resolve. Platform owner: review/decline an existing request; audit event recorded.
6. Merchant sees reviewed result. Neither merchant nor platform review mutates `subscriptions`, price drafts, `plans`, or payment records.
7. Trial request is denied with existing subscription history; cancellation/renewal request denied without history. Verify duplicate clicks and browser refresh.
8. Real 320px Android, Turkish/English LTR and Arabic RTL screenshots; accessibility focus order and button disabled state.

## Commercial GO blockers
- No approved TR/SY currency/tax/price policy or published price quote; no verified subscription checkout, invoice issuance/credit notes, refunds and payment reconciliation.
- No entitlement cut-off, trial expiration access policy or dunning/cancellation financial settlement approved.
- Real independent merchant, admin, staff and guest sessions; backup restore/alerts and legal privacy/fiscal sign-off are still missing.
- The actual commercial billing project remains **OPEN**. Do not treat an administrative acknowledgement as payment approval.
