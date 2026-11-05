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

## Deployment validation handoff
The following exact-HEAD staging deployment will verify the corrected G14 test contract, the compiled app and the fixed Vercel alias. The commit includes the mandatory `[beger-deploy]` tag. Do not infer success until READY and test totals are recorded.

## Verified hardening implementation and security drill
- **CI G14 closure:** deployment `dpl_8aXwJNVmewYqWWdX8yU1XGJk49XE` reached Vercel `READY` from commit `4ddea904`; `375/375` tests passed, 0 failed, Next compiled, 14/14 pages generated. Vercel alias lookup confirmed the immutable stable branch hostname pointed to this deployment at verification. Prior G14 failures resolved.
- **Core FK performance:** applied migration `20261105225500_core_fk_index_hardening.sql` in Staging. Created 14 explicit idempotent B-tree indexes for the key foreign keys in G3 orders/items/events, G6 Pager, G9 kitchen, G10 cashier, G11 invitations and G7 Pager staff. Re-ran Supabase Performance Advisor: `unindexed_foreign_keys` reduced from **42 to 28**. `unused_index` advisory increased from 14 to 28 because this low-traffic environment has not used the newly-created indexes; do **not** infer they are useless or delete them solely based on the test snapshot. Additional coverage requires query-plan/use evidence.
- **RLS classification:** independently verified all 23 RLS-without-policy tables had `anon_select=false`, `auth_select=false`, `auth_insert=false` and `auth_update=false`. They are intentionally direct-access-denied; this advisor category is **not an observed data exposure**. Keep underlying SECURITY DEFINER RPC reviews open.
- **Authenticated helper review:** eight G6/G9/G10 RPCs without inline `auth.uid()` invoke `g10_cashier_allowed`, `g9_kitchen_allowed`, `g7_pager_operator_allowed` or `g6_pager_branch_authorized`. Inspected their live SQL: each explicitly checks `auth.uid()` and verifies tenant membership and station branch scope. Not an unauthenticated privilege grant on the sampled code paths.
- **Database negative-path drill (not E2E):** executed a `BEGIN; SET LOCAL ROLE authenticated; request.jwt.claim.sub = dummy UUID` transaction with explicit expected-denial checks on G14 launch preflight, G13 platform queue, G13 merchant requests, G9 kitchen queue and G10 cashier queue. All five checks rejected the unrelated identity with SQLSTATE `42501`; transaction rolled back. **This does not replace browser/session or independent-user JWT testing.**
- **Remaining 16 anonymous definer RPCs:** G3 public order functions use per-table/branch enablement, input/item bounds, request-ID idempotence and recent order volume limits; they support intentional guest QR flows. These and other public menu/status/ratings/Pager endpoints require real abuse/privacy tests before commercial approval. Do not globally revoke public access.
- **Automated contract:** `tests/beger-core-fk-index-hardening.test.mjs` checks the 14 indexes and prohibition of data, role, grant or table mutations in the migration.
- A final exact-HEAD guarded `[beger-deploy]` run is required after the index migration and audit update. No Production changes performed.

## Reclassified follow-ups
- **CLOSED:** obsolete G14 CI regression, stable-alias deployment at `4ddea904`, direct-read RLS advisor finding as non-exposure, critical 14 FK index findings.
- **OPEN / CONDITIONAL:** remaining 28 FK performance advisories, anonymous RPC abuse/security testing, real cross-business accounts/devices, commercial prices/taxes/checkout/invoices, backup restoration and external legal sign-off. These cannot be declared closed solely from source checks or synthetic DB-role tests.

## Final verified Staging release — 2026-11-05
- Deploy SHA: `b2c8594ddec7121770a28d4be6f253013aa4da40`.
- Vercel ID: `dpl_F7wMVYruPokcZJAUeevDWtkcyfGH`, state `READY`.
- `npm test`: **376 total / 376 pass / 0 fail**.
- Next.js 15.5.28 compiled successfully; server type checks passed; prerendered pages **14/14**; build completed.
- Verified live stable alias `qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app` points to this exact deployment ID.
- This handoff note is docs-only and does not change the deployed code. The G14 UI and fourteen-index migration are now included in the active Staging release.
- **Release decision remains NO-GO for paid/general public launch**, with real-device and real-account acceptance, payment/tax/legal policies, production recovery and the remaining advisor triage still open. Do not call those closed.

## 2026-11-06 — Catalog and tenant-composite index hardening
- Added and applied **eight** idempotent Staging-only composite indexes in `supabase/migrations/20261106001000_catalog_branch_fk_indexes.sql`. Targeted branch assignments, branch-product publications, modifier groups/options, product ingredients, and dining table branch/business FK paths. Consulted existing indexes first; none of the new indexes changes data, privileges or payment logic.
- Re-ran live Supabase Performance Advisor: unindexed FK warnings reduced from **28 to 20**. Newly-added indexes initially appear as unused in low-activity Staging, taking unused-index advisory count from 28 to 36; this is expected without workload and **not proof of performance improvement** or reason to drop them.
- Added `tests/beger-catalog-branch-fk-indexes.test.mjs` to verify exact composite definitions, idempotency and non-mutation. This is a source-contract test, not query latency proof.
- Deliberately did **not** change public QR order rate limits (currently a fifth order within one minute is rejected per table/takeaway branch). No safe throughput benchmark or alternate anti-abuse control is yet evidenced. Load-testing remains a release gate.
- This commit requests staging-only `[beger-deploy]` validation; verify exact SHA, test count, build and alias assignment. Commercial NO-GO until real E2E and financial/legal acceptance are complete.
