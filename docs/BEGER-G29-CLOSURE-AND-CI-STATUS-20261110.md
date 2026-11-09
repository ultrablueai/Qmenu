# Beger — staged release closure and G29 status (2026-11-10)

## Scope
- Repository `ultrablueai/Qmenu`, branch `feat/g1-foundation`.
- Supabase isolated Staging `qandxrcuetwzenlqspez`; stable Vercel preview alias unchanged.
- No Production changes, paid checkout, activation, invoice issuance, or `main` merge.

## Phase 1: release CI gate — BLOCKED, not closed
- Updated `.github/workflows/ci.yml` so pushes on `feat/g1-foundation` trigger npm tests, TypeScript checks and Next build under Node 22. Existing `main` and PR checks retained.
- Commit `e6a4a3a74aefffa82be078f4f3d24bb1bdcb63fe` triggered GitHub Actions run `42707438211`. All three jobs were recorded as `failure`, but job steps and logs are **null/empty** and log downloads returned BlobNotFound. No basis to call this a source-code/test assertion failure; diagnose GitHub Actions runner/billing or workflow execution state before attributing cause.
- This is a stop-ship issue: cannot label new G27/G28 dashboard READY or relink stable alias until exact-HEAD tests/build/deployment have independently verifiable evidence.

## G29 implementation slice (Staging, noncommercial)
- Added `lib/beger-g29-subscription-policy.mjs`: pure deterministic policy helper for 14-day trial, 7-day grace, cancelled/expired/scheduled states and first six founder discount cycles. This is **not** the billing source of truth or authorization layer and has no DB writes. Caller-supplied `verifiedSettlement` is a simulation input, never a real settlement verification.
- Added `tests/beger-g29-subscription-policy.test.mjs`: unit checks for trial boundary, expiry, grace, cancelled state, discount cycles and missing settlement, not yet confirmed by remote CI.
- Added and **applied** `supabase/migrations/20261110000300_g29_subscription_policy_preview.sql`: tenant-authorized read-only merchant RPC `beger_g29_merchant_subscription_preview(uuid)`. It never grants commercial entitlements or starts billing; response always contains `billing_live=false` and `entitlements_enabled=false`.
- Staging checks: merchant owner own-business call returned `not_configured`, 14 trial days, 7 grace days and both financial/entitlement flags false. A foreign-tenant call was rejected with SQLSTATE `42501`. Reusable read-only smoke in `supabase/tests/beger-g29-subscription-preview-smoke.sql`, executed successfully. These tests simulate JWT claims and do not prove independent browser sessions.
- Existing G27 internal drafts and G28 simulated founder slots remain isolated and not commercial checkout.

## Remaining gates by dependency
1. **CI / UI staging deployment:** determine failed jobs' cause, obtain logs, rerun passing Node/TS/Next build on exact HEAD, deploy staging and validate stable alias.
2. **Subscription engine:** authoritative server-controlled trial start, paid activation only on verified provider settlement, immutable entitlement ledger and transactional first-30 paid-slot allocation, six billed periods and notices; tests for cancellation/reversal and renewal. G29 currently provides a policy preview, not the engine.
3. **Security:** authentic cross-tenant JWT tests and public abuse guard review.
4. **Recovery:** encrypted backup + actual isolated restore test and rollback rehearsal.
5. **Commercial:** Turkish invoicing/tax entity, PSP contract, KVKK/ETBIS review and explicit release signoff.

**Commercial GO: false. Do not report stages closed unless their evidence gates have passed.**
