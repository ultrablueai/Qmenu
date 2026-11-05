# BEGER — Release hardening review and closure register
**Audit date:** 2026-11-05 · **Scope:** GitHub `ultrablueai/Qmenu` branch `feat/g1-foundation`, Supabase Staging `qandxrcuetwzenlqspez`, Vercel `qmenu-staging`. Production not examined or modified.

## Source-of-truth observations
- Previous stable alias pointed to commit `fcf603a` / deployment `dpl_6J7fM2Y76uSHEbkUy7MHYGC8jx8D`, with 371/371 tests.
- The three failed G14 deployments at commit `5ffa606` each showed 374/375 passing; exact failing static regression: `tests/platform-admin-control-center.test.mjs` asserted the obsolete copy `لم تُطلق بعد`. That phrase had rightly been replaced because order, kitchen and Pager are already implemented on Staging. Corrected regression to verify the truthful staging copy and explicit commercial NO-GO.
- Staging currently has 3 businesses, 3 branches, 12 orders, 2 independent Pager tickets, 1 cashier station assignment, 0 kitchen station assignments, 0 active plan records, and 0 subscriptions. 1 staff invitation has been accepted; 1 merchant subscription-review request acknowledged. No user-generated data removed.
- G14 DB migration is applied in Staging; its RPC denies anonymous EXECUTE and requires enabled platform admin; **the G14 UI was not on the stable alias at the start of this audit**.
- Supabase Security Advisor flags 23 RLS-without-policy tables, 16 anonymous executable SECURITY DEFINER RPCs, 70 authenticated executable SECURITY DEFINER RPCs and leaked-password-protection setting disabled/not enabled. These are advisory findings, not 109 confirmed vulnerabilities. Every sensitive function must be verified for scoped authorization/guest capability; do **not** revoke guest QR/menu/order/public-status functions indiscriminately.
- Performance Advisor flags 42 missing FK-supporting indexes and 14 unused indexes. Index usefulness must be measured with usage/EXPLAIN and operational workload before broad DDL. Unused indexes in a low-traffic Staging database should not be deleted on that evidence alone.

## Status and closure boundary
| Finding | Status | Evidence | Remediation / acceptance |
|---|---|---|---|
| G14 release failed on obsolete assertion | FIXED IN CODE | Regression `tests/platform-admin-control-center.test.mjs` updated | Run exact-HEAD tests/Next build and verify stable alias READY |
| G14 platform preflight UI not on stable alias | DEPLOYMENT PENDING | G14 migration already applied | Guarded Vercel Staging publish + alias match |
| Tenant security and QR privileged functions | REVIEWED / INCOMPLETE | Public G3 order submit RPCs check branch/table enabled, UUID request idempotence, 1–20 line bounds and order frequency; public ratings require recent fulfilled order token | Real independent accounts + adversarial guest calls, rate-limit and forged-token tests |
| Database advisory warnings | NOT CLOSED | Advisor totals above | Prioritize privilege assessment and high-traffic FK index measurements; do not mass-grant RLS or disable guest functions |
| No commercial tariff or subscription | BLOCKER | `plans=0`, `subscriptions=0` | Price/region/currency/VAT decisions, billing events/invoices, refunds, trials, expiry entitlement enforcement |
| Real guest/staff lifecycle | BLOCKER | G3/G6/G9/G10 tests and Staging orders present, no cross-device acceptance | Android/desktop owner, independent staff, guest phone; run table/takeaway/order/print/audio journeys |
| Production recovery/reliability | BLOCKER | No restored backup proof in this audit | Restore drill, observability, backups, rollback rehearsal, operations SLA |
| Legal and fiscal sign-off | BLOCKER | Not assessed by qualified external reviewer | Terms, privacy, fiscal receipts, applicable law |

## High-priority operational caveat
The current G3 submit-table and submit-takeaway functions each reject a fifth order within one minute per table and per takeaway branch respectively. This is intentional anti-abuse but may reject legitimate peak volume. Test with load and design a configurable/edge rate limiter before commercial launch; never remove protection without replacement.

## Verification discipline
- `npm test` source/contract checks are not full browser E2E. Any new build must record test totals, TypeScript/Next build status, SHA and alias mapping.
- SQL simulations using `SET LOCAL ROLE` are DB-level and do not prove cross-account browser access.
- Only owner-approved production release can change this project's **NO-GO**. Even after G14 CI is green, this is a Staging engineering checkpoint, not paid launch.
- Do not create fake users or orders, delete existing records, force billing transactions, migrate Production, or promise live SMS/email sending.

## Next gate
1. Fix and publish G14 on the same fixed Staging alias.
2. Authenticated negative/positive RLS and function tests for two real independent businesses; exercise with ROLLBACK fixtures where supported.
3. Verify all critical guest order journeys and multi-role cash/kitchen/Pager flows on actual devices.
4. Complete commercial policy and certified billing/ops readiness; obtain explicit sign-off.
