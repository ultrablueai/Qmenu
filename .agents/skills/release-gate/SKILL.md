---
name: release-gate
description: Independently verify Beger Staging build, tests, security, browser evidence and rollback before any phase GO or release.
---
# Beger Release Gate

## Inputs
AGENTS.md, canonical plan, execution board, current branch/commit SHA, migration manifest, Supabase Staging readouts, Vercel preview deployment and test logs.

## Gate procedure
1. Confirm environment and immutable SHA; ensure no Production target.
2. Run/install locked deps in sandbox; `npm test`, `npm run lint`, `npm run build` and GitHub/Vercel deployment logs where supported. Note warnings, failures and exact counts.
3. Verify staging migrations and RLS/role negative paths; record unchanged Production.
4. Verify real authenticated owner/merchant browsers, tablet/Android/iPhone where required; document device, URL and actual outcome. Do not promote simulated SQL tests to browser results.
5. Evaluate phase-specific E2E and rollback readiness; require independent Security + QA acceptance.
6. Gate decision: GO only when every mandatory item passes and owner explicitly permits any production-impacting action. Otherwise NO-GO and state exact blockers.

## Bans
No silent PR merge, no production deploy/DDL, no changing a test solely to hide a genuine behavior defect, no invented screenshots, no automatic purchase, and no continuing into next phase on a successful compile alone.

## Report template
Phase / SHA / Staging deployment state / automated pass-fail / real-device proof / security negative tests / rollback / remaining blockers / GO or NO-GO.
