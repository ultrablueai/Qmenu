# Qmenu G1 acceptance — 2026-10-31

**Decision: NO-GO.** All work stays on draft PR #1; no production changes.

## Verified on independent Supabase Staging
- Project: `qandxrcuetwzenlqspez` (`Qmenu-steging`, EU West / Paris).
- Applied migrations: `g1_core_foundation`, `g1_first_owner_onboarding`, `g1_branch_management`, `g1_event_trigger_grants`, `g1_fk_indexes`.
- Six public tables exist and all six have RLS enabled.
- `anon` cannot execute `public.create_first_business`; authenticated users can.
- Neither `anon` nor `authenticated` can execute `public.rls_auto_enable()`.
- Successful transactional PostgreSQL integration scenario with two temporary test identities: owner onboarding for A and B, own-tenant SELECT only, denied cross-tenant branch UPDATE, duplicate owner onboarding denied. All test data rolled back.
- Second independent SQL RLS verification on Staging: direct foreign-tenant branch INSERT blocked, cross-tenant branch UPDATE blocked, direct membership/owner privilege escalation blocked, and tenant read isolation confirmed. The reusable scenario is committed in `supabase/tests/g1_tenant_isolation.psql`, with static contract coverage.
- After second test: 0 businesses, 0 branches, 0 memberships, 0 temporary test identities; anon cannot execute business onboarding.
- Post-test: zero businesses, branches, memberships, audit rows, and temporary test identities.
- Performance advisors: missing FK index warnings addressed. Unused-index notices are expected on empty staging and are not evidence to drop indexes.

## Code artifacts
- Repo: `ultrablueai/Qmenu`; draft [PR #1](https://github.com/ultrablueai/Qmenu/pull/1).
- Auth pages, membership-onboarding checks, migration files, static tests, and staging-only RLS probe committed.
- GitHub Actions currently blocked by the GitHub account's billing lock; no CI success claim.

## Mandatory remaining gates
- [ ] Lockfile committed and reproducible `npm ci`; real TypeScript and production build PASS.
- [ ] Browser E2E auth: signup, confirmation, login, onboarding, logout; mobile checks.
- [ ] Cross-tenant tests using two real Supabase Auth sessions and Data API rather than only SQL role simulation.
- [ ] Staging app deployment with verified environment variables; health and diagnostics.
- [ ] Security review: `public.create_first_business` is an intentionally callable SECURITY DEFINER RPC restricted to authenticated users, but requires independent review/rate-limit considerations before production. Supabase advisory flags it.
- [ ] Staging Auth leaked-password protection advisor reviewed/configured as supported.
- [ ] Rollback and backup processes independently rehearsed before release.

## Boundaries
- Qmenu primary/production project `fstpxknegaxppjilbnke` was **not modified**.
- Do not merge to main, promote to production, or treat successful SQL simulation as browser E2E certification.
