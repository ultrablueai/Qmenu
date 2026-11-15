# Beger Salon — G58–G62 Pricing, Memberships & Campaign Journey
Status: APPROVED PRODUCT DESIGN PROPOSAL ONLY — not implemented or released.
Project: ultrablueai/Qmenu, feat/g1-foundation. Applies only to Salon vertical. Keep cafes/restaurants isolated.
Baseline: G57 early-slot alerts and staged salon booking. No production writes or payment provider changes.

## Implementation log — 2026-11-15 (staging branch only)

- G58 implemented: `salon_price_policies` and owner-only RPCs, price modes exact/starting_at/quote_required; public catalog masks internal exact price for negotiable services; direct booking rejects negotiable services until a separate quote acceptance flow exists. Owner pricing controls shipped under `/salon/workspace`. SQL transaction rollback verified.
- G59 partially implemented: owner can create/publish/hide membership plan templates; public booking page displays available plans. **No purchase, enrollment, renewal, entitlement ledger or automatic benefits**. These remain deliberately disabled until verified.
- G60 partially implemented: owner can create/publish/hide time-limited **onsite banners**; public booking only displays published active campaigns. No coupon redemption, segment delivery, discount calculation or outbound marketing yet.
- G61 partially implemented: separately token-scoped promotional Push consent record, opt-in default false and revocation history; public UI controlled by customer. No outbound marketing campaigns, IYS provider integration, SMS or email yet. Booking notifications remain independent.
- G62 not implemented: still requires quote workflow, membership purchase/redemption, coupon ledger, compliant outbound marketing and full device/commercial review.
- Migrations:
  - `20261115001200_g58_salon_price_visibility.sql`
  - `20261115001300_g59_g60_membership_plans_campaign_banners.sql`
  - `20261115001400_g61_marketing_consent_event_ledger.sql`
- Security: default no public table grants, RLS enabled, business ownership checked by signed-in identity, anonymous public APIs expose only published items or token-owned consent and bookings. All changes are for staging branch, not production.
- Tests: `supabase/tests/beger-g58-price-visibility-rollback.sql`, `beger-g59-g60-membership-banner-rollback.sql`, `beger-g61-marketing-consent-rollback.sql`, plus Node regression tests.
- Legal gate: in Türkiye, hiding a price in the app cannot be treated as avoiding statutory service-price tariff disclosure at the physical premises. No customer checkout until a clearly accepted final amount.

## Product decisions
1. Owner chooses consumer price display mode PER SERVICE: exact_price, from_price, quote_required. "Hidden" means absent from public booking UI only; it does not bypass legal price-tariff posting rules in the operating jurisdiction. All additional charges and final prices are disclosed to customer before accepting service. Private negotiated prices are visible in quote / confirmed purchase receipt, not public.
2. Customer may book at displayed service price, request quote for flexible service, accept negotiated estimate, redeem eligible membership entitlements, or claim campaign discount. Customer may opt out of marketing. Owner may enable marketing after consent workflow.
3. Separate BEGER SaaS subscription paid by merchant from MERCHANT membership sold by salon to consumer. No platform custody/settlement. The salon selects and uses its own permitted payment provider; during staging use recorded_external_payment/manual only with explicit status.
4. Marketing consent separate from transactional booking notices. Channel-specific proof, timestamp, source, revocation. Turkey IYS/KVKK integration and local tariff verification are commercial release gates.
5. Pricing visible to authorized roles, private customer quotes tenant-scoped, staff edit capped by role; changes audit logged and never retroactively alter confirmed appointment quotes or membership ledger.
6. No silent reschedule, no double redemption, no surprise charge, no stacking discounts unless explicitly enabled and capped.

## Workflow map
OWNER SETUP -> category/service/pricing mode -> membership plans & packs -> campaign create/schedule -> publish banner -> consent-aware channels -> CUSTOMER discovers service -> selects staff/time -> price shown OR quote workflow -> customer accepts final quote -> booking pending -> staff accept/change/reject -> customer accepts changes -> confirmed -> optional early-slot offers -> check in -> service -> checkout and membership usage -> receipt/history/loyalty -> post-visit consent-based reengagement.

## Owner workspace
Price mode: exact_price / starts_from / quote_required; default exact_price. Price-internal always retained as unit integer minor currency ISO-4217. Owner can choose per-service display; enforce applicable legal tariffs.
Membership authoring: name, cycle (monthly 1/3/6 months), price, included services/credits, renewal policy, rolling visits, expiration, hold/pause, cancellation/refund policy, overage, staff eligibility, branch availability, usage caps and allowed concurrent appointments. Copy snapshot terms to each purchased subscription.
Campaign authoring: localized title, content, image/banner, coupon, service and branch segment, eligible customer cohort (new/returning/VIP/inactive), valid window, budget caps, per-customer redemption cap, max redemptions, combinability toggle, quiet hours, publish state, consent/channel restrictions.
Quote review: for quote_required services, staff/owner creates draft estimate with validity; customer must accept final estimate BEFORE confirmation/commencing; alternative request with no estimate is not a final appointment.
Price adjustments: customer-specific agreed rate stored only in tenant-scoped record; owner authorization and audit reason; optional bounded staff override. No automatically inferred individual price discrimination based on perceived willingness to pay.

## Customer journey
A. Public price: banner shown -> book -> itemized price/discount/membership credit preview -> confirm booking -> staff approval -> booked total snapshot.
B. Quote-required: show "Ask for quote" -> intake without unnecessary sensitive data -> quote delivered -> customer accept/reject/expire -> booking confirmed only after consent to final charge; tariff compliance as applicable.
C. Member: plan page with benefits/terms -> subscribe with merchant's connected provider or manually recorded valid sale -> entitlement wallet -> book -> reserve (not consume) entitlement -> consume on completed checkout, release on cancellation/no-show per terms.
D. Marketing: no consent = on-site generic banner only; granted consent = chosen channel eligible. Trigger message -> link to campaign -> reservation -> redemption. No hidden forced opt-in.

## Schema boundaries (proposal)
- salon_price_policies(business_id, service_id, visibility, currency, base_minor, from_minor, effective_from)
- salon_customer_profiles(business_id, id, contact, preferred_staff, consent_flags)
- salon_customer_prices(business_id, customer_id, service_id, agreed_price_minor, valid_from/to, approved_by, reason)
- salon_membership_plans(business_id, plan_id, cycle, price, status, limits, terms_snapshot)
- salon_memberships(business_id, customer_id, plan_snapshot, starts/ends/renews, payment_reference_external, status)
- salon_membership_ledger(business_id, membership_id, appointment_id, service_id, reserved/consumed/released, idempotency_key)
- salon_quotes + quote_lines (final accepted price snapshot)
- salon_campaigns + campaign_targets + campaign_redemptions
- salon_marketing_consents (channel, purpose, notice_version, source, consented_at, revoked_at, iys_state)
- salon_notification_outbox (dedupe key, delivery status, transport, next_retry_at).
All exposed tables have tenant composite keys/RLS fail-closed. Only scoped RPC writes. No direct anon private reads.

## Invariants / tests
- Business A never reads/writes B.
- Staff may read only assigned appointments and authorized quote details; owner has complete scope.
- Owner price-hiding setting cannot hide statutory disclosures or final accepted quote.
- Member service cannot be redeemed twice concurrently; lock reservation and ledger, unique idempotency key; refund/release correctly.
- Coupon cap and non-stack rules transactionally enforced.
- Campaign sends only with active, purpose/channel-specific marketing permission and unsubscription.
- Push is best effort; SMS/email require provider credentials, rate limiting, quiet hours, and approved templates.
- Price snapshot preserved after later owner price changes.
- Subscription automatic renewal only after compliant merchant payment integration and customer terms acceptance.
- Three-device E2E pilot before G62 release gate; stage-only data and testing.

## Delivery priority
G58 price policy + service visibility + quote workflow + owner UI.
G59 memberships/packs and ledger (manual pilot, without automated merchant charges).
G60 campaign banners, coupons and audience segmentation.
G61 consent ledger, IYS implementation assessment, staged notification outbox (no outbound marketing until compliant).
G62 full journey and concurrency/finance/privacy/end-device QA.
Do not mark any G58–G62 implemented until code, staging SQL smoke, test suite and Vercel READY confirmed.

Sources researched 2026-11-15:
https://www.fresha.com/help-center/knowledge-base/memberships-packages-and-gift-cards/101270-memberships-overview
https://www.fresha.com/help-center/knowledge-base/memberships-packages-and-gift-cards/100670-packages-overview
https://www.fresha.com/for-business/features
https://www.lexpera.com.tr/mevzuat/yonetmelikler/esnaf-ve-sanatkarlarca-uretilen-mal-ve-hizmetlerin-fiyat-tarifeleri-hakkinda-yonetmelik
https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/ileti-yonetim-sistemi-iys
