# BEGER — Customer Identity, Loyalty, Offers, Memberships & Notifications
Status: PRODUCT DESIGN BASELINE / NOT IMPLEMENTED. Captured 2026-11-01.
Project: Beger Smart Business OS only. No implementation authorization that overrides phase gates.

## Sources and authority
- Owner intent confirmed in project discussions: customer must access shop/table QR, menu, checkout/order, and digital pager without a mandatory app or traditional account. Customer may **choose** to save a persistent loyalty card for repeat visits, promotions and discounts, e.g. buy 5 eligible coffees, 6th free. Customer memberships/subscriptions and notifications should be supported by an extensible system. Modern, attractive, light designs across all roles.
- Current code and DB state, not aspirations, determine availability.
- Product recommendations **not yet separately approved as detailed financial/compliance policy** are labeled PROPOSED in this document, not shipped.
- Reference research: Apple Wallet loyalty https://developer.apple.com/wallet/loyalty-passes/ ; Google Wallet loyalty https://developers.google.com/wallet/retail/loyalty-cards ; Google Wallet generic https://developers.google.com/wallet/generic ; Web Push https://web.dev/articles/push-notifications-subscribing-a-user ; Apple iOS Web Push https://webkit.org/blog/13878/ .
- Wallet and Web Push support cannot be assumed for every device or user. API issuers, certificates, consents, platform support, and production validation are future gates.

## Never confuse the 3 QR types
1. **Shop/branch QR:** static public link to a specific branch; guest browsing and guest ordering supported.
2. **Table QR:** static public link containing branch/table context; not authorization and never trusted for prices/order statuses.
3. **Customer loyalty card QR:** optional persistent, per-customer identification/reward lookup; not a requirement for browsing, ordering or tracking order. NEVER use card QR as a bearer credential allowing unauthorized reward redemption, balance changes, or access to private details.

## Canonical flows
A. Guest: scan SHOP/TABLE QR -> public mobile menu -> validated cart -> server-submitted guest order -> branch/KDS -> ready -> on-screen digital pager -> collect. No install, account, marketing consent or phone number mandatory.
B. Optional card: after first eligible order or explicit choice -> opt into customer loyalty identity -> save card URL/shortcut or wallet pass if supported -> revisit -> view per-merchant progress and qualifying activity. No staff-issued customer accounts.
C. Recovery: browser/device-only storage may be lost. Optional verified email/phone binding provides recovery; never promise effortless cross-device recovery from an anonymous screenshot/link.
D. Reward: merchant rule defined -> qualifying server-confirmed order/event -> idempotent ledger credit -> reward available -> explicit authenticated/authorized redemption process with expiry/once-only token -> verified staff/server redemption -> consumed state. Refund/cancellation reverses qualifying credit. No double claim.
E. Paid customer memberships: proposed, after basic loyalty works. Business-defined allowances (e.g., up to 20 coffees/month), validity window, redemption cap, pause/cancel/refund and reconciliation. Activation only on verified payment or explicit audited complimentary entitlement; no payments until provider certification/approval.

## Architecture — PROPOSED, do not implement before Phase 4
- One lightweight customer-facing Beger card hub; separate business-scoped loyalty wallets. Card hub is for navigation, not a pooled financial/loyalty balance.
- Privacy-preserving opaque customer identity with explicit business-level joins/consent; **no silent cross-merchant customer tracking, cross-merchant analytics sharing or combined advertising audience**. Separate per-business ledgers and rules. Avoid exposing global customer ID in public QR.
- QR should encode only opaque public lookup ID or an expiring challenge. Sensitive actions require server-side verification; screenshots of a permanent QR must not be sufficient to redeem financial value.
- Tables (future design candidates): loyalty_programs, merchant_customer_profiles, customer_card_claims, loyalty_ledger (append only), earned_rewards, reward_redemptions, customer_membership_products, customer_membership_entitlements, verified_orders, notification_preferences, push_subscriptions, notification_outbox, delivery_attempts. Do not create now.
- Entitlement boundaries: business_id and branch_id via RLS plus server authorization; customer only own cards/history; staff only permitted branch; platform owner sees aggregates and necessary auditable support operations, not unrestricted PII.
- Card QR and order pager tracking tokens **must be separate**. Staged/customer-registration QR legacy functions are disabled, must not be revived.

## Programs, benefits and rules — approved capability, settings proposed
- Merchant configurable: digital stamps ('buy 5 eligible coffees, 6th free'), points, reward item, discount/coupon, birthday or first-order offer, time/day windows, limits, expiry, redemption branch restrictions. Offer stacking must be explicit and server-calculated.
- Separate merchant-created **customer subscription** from merchant's subscription to Beger. Different products, ledgers, payment and reporting.
- Reward earning should be based on *confirmed qualifying fulfillment/payment conditions*, never QR scan alone or client assertion. No rewards on canceled/reversed orders. Expiry, quantity, currency and eligible SKU must be versioned.
- First pilot: one understandable stamp rule per merchant, guest orders intact. Additional points, discount engine, and paid membership are subsequent vertical slices, not a single risky launch.

## Notifications — boundaries and fallbacks
- Real-time on-screen order/pager updates with reconnection/fallback/polling is the core and works without notification consent while the page is open.
- Web Push: detect support + request permission after a user action, securely store subscription with device and merchant/identity context; honor opt-out, token rotation and invalid endpoint cleanup. On iOS/iPadOS 16.4+, Web Push is for supported home-screen web apps; adding a simple bookmark is not sufficient.
- Optional Apple/Google Wallet: phase-gated integrations for pass issue, update, renewal/expiry and revoke. Saving a QR screenshot is not equivalent to a dynamic Wallet pass and doesn't push automatically.
- Transactional notifications (order ready, appointment/queue changes) **separate** from promotional marketing messages. Business/customer opt-in and frequency limits/quiet hours required for marketing; do not default opt-in.
- In-app notification center and event outbox: send once/idempotent, delivery status and retries, no sensitive clinical payloads, no unsupported promises of guaranteed delivery.
- PWA updates: versioned assets, user-safe refresh prompt when necessary; never disrupt an order in progress. Operator incident alerts only to permitted roles.

## Multi-vertical UX principles
- Common UI: responsive mobile-first, fast-loading minimal motion, Arabic RTL and Turkish LTR, high contrast and accessible touch targets, skeleton/error/empty states, no fake data or non-working CTA. Design system: restrained neutrals + configurable merchant accent, consistent 8px spacing grid, typographic hierarchy, compact cards and one main action per screen.
- Customer: card front shows merchant logo, accessible QR (only ID), progress **5/6**, 'next coffee free', relevant ready reward; details show history, terms, expiration, membership allowance. Wallet/add-home shortcuts as secondary. User can switch merchant wallet views without cross-merchant aggregation.
- Merchant owner: configure programs and campaigns; dashboard tracks real opt-ins, qualified redemptions, costs and active memberships; settings isolated to business.
- Branch staff: fast 'verify customer card' -> verify eligible offer/entitlement -> server-confirmed redemption with explicit outcome and idempotency; do not expose customer list unnecessarily.
- KDS/pager: large status and alert states, reorder minimized, sound opt-in and persistent visual accessibility fallback.
- Platform owner: aggregate subscriptions, tenant readiness, notification delivery failures, program adoption and audit; never impersonation or direct PII by default.
- Vertical specialization: barbers/salons use visit/service credits and appointment reminders; clinic uses queue/appointment notifications **without clinical personal data or cafe-style patient purchase leaderboard**; retail uses purchase/reward rules; cafe/restaurant uses order/stamp workflows. Sector toggles happen after food pilot proof.

## Design acceptance
- Screens to produce **later**, not prematurely: (1) guest menu, (2) guest order tracking, (3) customer loyalty card front and details, (4) merchant loyalty builder, (5) branch redemption scanner, (6) owner aggregate reporting, (7) notification preferences, (8) customer membership validity/allowances.
- Each screen must pass Arabic RTL, Turkish LTR, 320px small phone, Android Chrome and iOS Safari/PWA, accessible contrast/keyboard/screen-reader checks, privacy-negative paths and actual task success.
- Mobile card is a real web screen, not an image screenshot or QR image alone. Never mark a static mockup as usable production feature.

## Implementation gate and order
- PHASE 1 (CURRENT, OPEN/NO-GO): real independent two-account auth/browser + Android/iOS checks, admin access, merchant isolation, branch restrictions, UI/rollback evidence. No wallet/loyalty/push implementation in this phase.
- PHASE 2: public shop/table QR + merchant menu and availability; real guest mobile walkthrough.
- PHASE 3: verified guest order -> KDS -> live pager, no fake charge or duplicate.
- PHASE 4A: basic optional saved loyalty identity + one stamp program + audited server ledger, earn/redeem/reverse and recovery constraints.
- PHASE 4B: offers/discount rules + customer notification preference center, delivery queue and consent.
- PHASE 4C (optional after verified base): Apple/Google Wallet passes, personalized offers, membership subscriptions/allowances + audited verified payments.
- PHASE 5: evidence-based commercial pilot and GO/NO-GO.
- If subscription duration, cashback value, earning rule, personal-data processing purpose, paid price, country-specific tax/merchant payment provider or consent/legal policy is unspecified, mark OPEN DECISION and ask owner before enabling.

## OPEN DECISIONS (not permission to improvise)
- Confirm whether Beger customer card should be a single hub with separate merchant wallets (recommended), or separate-only merchant cards. Prior conversation supports interest, but no explicit user selection was recorded.
- Recovery method(s): no identity requested by default; explicit consent for phone/email if offered.
- Reward trigger (paid vs fulfilled), abuse-control strategy, maximum redemption period.
- Customer paid membership economics, refund, settlement, taxes by Türkiye/Syria, verified merchant payment provider.
- Marketing permission text, retention, revocation and compliance for Turkey KVKK and applicable Syrian rules.

## Handoff rules
Read `docs/BEGER-CANONICAL-PLAN.md`, this document and `docs/BEGER-EXECUTION-BOARD.md` before editing. Record every phase with evidence, no unapproved Production, no mixing independent projects, no old QR reactivation. Separate facts/implemented from approved product scope and proposed design.
