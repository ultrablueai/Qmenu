# BEGER — Commercial closure audit, 2026-11-09

**Branch:** `feat/g1-foundation` (not `main`). **Environment:** Supabase `qandxrcuetwzenlqspez` (Staging), Vercel `qmenu-staging`. **Production:** no changes.

## Confirmed operational acceptance

The owner reports independently testing all core guest-order journeys and the real hardware (kitchen, cashier, printer and Pager) successfully. Treat this as owner-reported operational acceptance and do not needlessly re-open previously fixed journey issues. It is not a substitute for a recorded release SHA, restore drill, commercial billing tests or penetration/security review.

## Live, read-only Staging evidence

An aggregate SQL query was executed through the connected Staging database on 2026-11-09. It returned:

| Signal | Value |
| --- | ---: |
| Businesses | 3 |
| Branches | 3 |
| Existing orders | 15 |
| Plans / active plans | 0 / 0 |
| Subscriptions | 0 |
| Public tables without RLS | 0 |
| SECURITY DEFINER executable by anon | 16 |
| SECURITY DEFINER executable by authenticated | 83 |

The checked-in `scripts/commercial-readiness-audit.sql` reproduces these aggregate checks without exposing customer PII or writing to the database.

Supabase Security Advisor (2026-11-09) also returned:
- 30 **INFO** `rls_enabled_no_policy` notices: this is not an automatic exposure; inspect intent and direct grants.
- 16 **WARN** anonymous executable security-definer functions: inspect intent, guest QR semantics, input limits and privilege checks before changing grants.
- 83 **WARN** authenticated executable security-definer functions: systematically review role/tenant checks; count alone does not imply exploitable vulnerability.
- 1 **WARN** leaked-password-protection not enabled. Check Auth configuration and enable in the appropriate environment after reviewing behavior; no settings were changed here.

References:
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Latest independently examined preview evidence

Vercel `qmenu-staging` deployment `dpl_FCprekXoYutZ9UUFpJtmAkT6WHw3` reported `READY` for SHA `973300d406dcad5b6c95aa95101f331fd089753e` on 2026-11-08. This is **not the same SHA** as the documentation and audit-script commits on 2026-11-09. Those audit commits are not claimed to have been deployed or tested in Vercel.

## Closure gates — decision register

| Area | State (evidence as of 2026-11-09) | Next permitted action |
| --- | --- | --- |
| Customer and device functionality | Owner-reported PASS | Only regress on proven defects or consequential new changes |
| Tenant and public function security | OPEN | Review function grants and authenticated negative cross-tenant tests; no blanket revoke |
| Password breach protection | OPEN | Investigate applicable Auth setting and enable after validation |
| Paid subscriptions and invoices | BLOCKED — 0 plans, 0 subscriptions | Approve regional tariffs, currency, tax, billing periods, trial, grace/cancel/refund policies before implementing activation or invoicing |
| Merchant ↔ customer payments | Out of scope | Beger does not custody food-order funds or settle to merchants |
| Recovery and monitoring | OPEN | Perform isolated restore drill with a documented recovery result; confirm alerts and incident handling |
| Production rollout | NO-GO | Verified build, tested release SHA, security and recovery evidence, qualified legal/tax review, explicit owner approval |

## Commercial policy to approve before billing

Draft only, no prices or legal claims:
1. **Merchant subscription:** Beger bills each subscribing business for platform access; separate fees for any optional devices/services must be transparent.
2. **Customer transactions:** merchant retains their own payment provider and receives their customers' money directly; manual/cash records are merchant accounting events, not platform settlements.
3. **Plans:** define feature entitlements, branch/staff caps and trial behavior; publish actual amounts only after the owner approves currency, tax-inclusive/exclusive presentation and invoicing jurisdiction.
4. **Lifecycle:** explicitly define start, expiry, grace period, suspended/read-only rules, renewal, cancellation, refund/credit and audit trails; enforce entitlements server-side rather than by UI label.
5. **Pilot first:** no live checkout, real invoice issuance, subscription activation, `main` merge or Production migration without documented approval.

## Next engineering slice

Perform a per-function threat classification and test verified guest/customer/merchant/staff boundaries, then implement the smallest justified security fix on Staging. In parallel, prepare a restore rehearsal and a proposed billing state machine for sign-off. Re-run exact-head tests/build after any code changes. Document each verification, deployment SHA, remaining blocker and GO/NO-GO.

**This document is an execution record, not a claim that the commercial launch is completed.**

## 2026-11-09 — Follow-up security verification

- Added and **executed** read-only `scripts/security-public-functions-audit.sql` against the live isolated Staging database. Result: `anonymous_definer_count=16`, `unexpected_exposures=0`, `missing_expected_public_functions=0`, `unlocked_search_paths=0`, `public_function_baseline_pass=true`. This is **exposure drift verification**, not a complete vulnerability review. The allowlist reflects currently observed intended public endpoints and must be reviewed for semantic correctness.
- Added `supabase/tests/beger-public-invalid-token-smoke.sql`. An equivalent `BEGIN READ ONLY; SET LOCAL ROLE anon; ... ROLLBACK;` query executed successfully against Staging: four booleans `order_token_denied`, `pager_token_denied`, `display_token_denied`, `rating_token_denied` were all `true` for the reserved all-zero UUID.
- No keys, personal order data, private tokens or user-created test records were read into a report. No grants revoked, migrations applied or production data changed.
- **Open:** valid-token least-data/authorization checks, signed-in JWT cross-tenant negative cases, meaningful abuse/load testing of public mutation endpoints, reviews of the 83 authenticated-executable definer functions, actual encrypted restore on isolated disposable target, approved billing rules and legal/regulatory sign-off.
- Security Advisor references: [anonymous definer lint](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer lint](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The current baseline pass does **not** resolve those warning categories by itself.
