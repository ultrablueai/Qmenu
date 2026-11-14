-- INTENTIONALLY RETIRED / NO-OP (2026-11-01).
-- The earlier customer-self-registration draft conflicts with the approved project plan:
-- guest menu/order must work before optional customer loyalty identity is developed.
-- This migration was NEVER applied on Staging or Production.
-- Original draft remains visible in Git history, but must not be applied automatically.
-- Phase 1 closes the premature merchant-assisted customer QR RPCs in:
--   202611010003_disable_premature_customer_qr.sql
-- Any future loyalty/account schema needs explicit separate approval in Phase 4.
select 1;
