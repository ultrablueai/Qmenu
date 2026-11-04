# G8 — Collection period close (staging)

Status: **Database migration applied on Beger Staging and merchant UI implemented. Awaiting final build gate and real signed-in merchant acceptance test.** This document does not claim production readiness.

## Implementation
- `supabase/migrations/20261104220000_g8_collection_close.sql` applied to the isolated Supabase staging project on 2026-11-04.
- Merchant reporting workspace embeds the collapsible `MerchantCollectionClose` panel.
- Owner/manager only: preview a chosen bounded period, inspect currency-separated merchant-recorded payments, confirm and save a non-overlapping snapshot, view 30 most recent closes.
- Snapshots cannot be changed/deleted via application-role access and a row trigger; the database serializes period creation per branch.
- No anonymous access to raw close records or the RPC. Live membership checks apply to the RPC.
- Only money recorded by merchants is included (by `paid_at`); no bank settlement, cash drawer counts, adjustments, refunds, tax/legal close or payment gateway.

## Pilot acceptance tests not yet signed off
- With a real owner/manager account, inspect preview and confirm one low-risk sample close using staging-only sample records.
- Verify duplicate and overlapping intervals fail cleanly; nonoverlapping consecutive intervals work.
- Verify a staff login and an unrelated business cannot preview, close, or read.
- Reopen the report and confirm persisted historical close matches the preview.
- Validate currency amount conversions for business currencies and explicit handling of refund events (future work).
- Confirm that the UTC-backed timestamps match local operating day boundaries.

## Remaining Beger platform closure scope
1. Staff invite and sign-up flows and kitchen/cashier roles with least privilege; test multiple actual accounts.
2. Cash adjustment/refund/reversal and cash drawer reconciliation workflow; fiscal and banking adapters intentionally separate.
3. Campaign configuration with start/end and safe discount price snapshots; full CRM consent and unsubscribe.
4. Verified device integration for thermal/network printers and opt-in Web Push on Android/iOS.
5. Full mobile visual QA, multi-tenant security and pilot acceptance across merchant, staff and guest devices.

**No Production modifications without user approval.**
