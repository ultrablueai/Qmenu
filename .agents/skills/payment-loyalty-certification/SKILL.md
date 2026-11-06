---
name: payment-loyalty-certification
description: Later-phase Beger reward, subscription and payment ledger certification; no deployment while earlier phases remain open.
---
# Beger Payment & Loyalty Certification

## Activation gate
ONLY after Phase 1–3 GO and explicit owner approval of Phase 4 commercial/legal/identity decisions. For now read-only future specification; no migrations or paid customer subscriptions.

## Identity and rewards
- Shop QR, table QR, optional customer loyalty QR, order/pager pickup proof all distinct and separately scoped.
- A single customer Beger hub across cities; per-business wallet, private history and consent. Same business may share across explicitly enrolled branches.
- Only server-confirmed qualifying order earns stamps/points; one append-only credit per order/rule, idempotency key, refunds/reversals, no double redemption, expiry and limits validated.
- Counter staff scans merchant-scoped customer ID; scanning is NOT reward issuance or redemption authority; require one-time challenge/independent authorization.
- Discount stacking, SKU eligibility, currency minor units, timezone and maximum benefit server-calculated.
- Customer paid membership is distinct from merchant's Beger subscription; purchased entitlements, refund, pause, expiry, spending limit and remaining balance audit required.

## Payments and consent
- Provider official API and marketplace/legal settlement certification separately per country; verified callbacks, idempotency, no client 'paid' trust.
- Marketing opt-in separate from order/transactional notices; revoke permission, support push feature detection, and platform wallet constraints.
- DO NOT use real charges, secrets or production providers during test.

## Required evidence
Positive earn/redeem/refund; replay/forgery; cross-merchant/branch; concurrent redemption; canceled order; expired subscription; entitlement overuse; payment callback failure; notification unsubscribe. Independent security review and release gate mandatory.
