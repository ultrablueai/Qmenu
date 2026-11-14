---
name: tenant-security
description: Audit Beger Supabase tenant isolation, role boundaries, QR authorization and unsafe privileged RPC exposure.
---
# Beger Tenant Security

## Scope and roles
Inspect public tables, policies, grants, app auth checks and SECURITY DEFINER functions under Supabase Staging only. Server-side business_id and branch_id are the isolation axes. Check owner platform_admin separately from merchant membership.

## Steps
1. Review latest Supabase skill/docs for auth, RLS, security-definer caveats.
2. Check RLS + API grants; privileged RPCs need explicit actor auth check, minimal grants, fixed search_path and no implicit EXECUTE PUBLIC.
3. Exercise TWO different real account IDs through reversible SQL role/JWT simulations, and record these as DB-level, NOT full browser tests.
4. Test: merchant A cannot read B, assigned staff cannot see unassigned branches, normal merchant cannot call platform owner RPCs, platform operator cannot mutate owner-only controls.
5. Future QR tests: SHOP/TABLE QR is public locator only; loyalty QR does not grant redemption; pager display number cannot claim pickup. Test forged IDs, screenshot replay, QR revoke and idempotency only in unlocked phases.
6. Read no more PII than necessary; use counts / redacted outcomes.

## Fail closed
No auth.user_metadata authorization, no service-role client, no access fallback on permission errors. No unsanctioned Production writes.
## Acceptance
Negative cases deny, positive cases are scoped, reversible SQL ends ROLLBACK, browser proof clearly distinguished from simulation.
