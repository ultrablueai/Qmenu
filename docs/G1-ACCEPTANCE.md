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
- Vercel preview of G1 commit `2407ed3` achieved READY with successful Next.js compile, TypeScript verification and route generation. Subsequent failed previews belong to unrelated skill-only branch `feat/codex-engineering-skills` (NEXT_NO_VERSION), not G1.
- Vercel uses a branch-scoped build ignore rule and `npm test && npm run build`.
- New `scripts/verify-staging.mjs` safety gate is invoked by `npm run build`; rejects Vercel production target, wrong branch, wrong Supabase project, or missing publishable key. Seven negative/positive tests added; newest Vercel Preview build logged **36/36 Node tests passing** and `Qmenu staging deployment gate: staging_preview_only`.
- Latest Vercel build also warned about missing Next.js SWC entries in the generated lockfile; no reviewed project `package-lock.json` is committed yet. Do not claim reproducible `npm ci` certification.

## Mandatory remaining gates
- [ ] Lockfile committed and reproducible `npm ci`; real TypeScript and production build previously PASS on Vercel without lockfile. This is not reproducible CI yet.
- [ ] Browser E2E auth: signup, confirmation, login, onboarding, logout; mobile checks.
- [ ] Cross-tenant tests using two real Supabase Auth sessions and Data API rather than only SQL role simulation.
- [x] Staging app built and published on Vercel (`2407ed3`, READY) with separate staging env keys; health and browser/API diagnostics are still pending.
- [ ] Security review: `public.create_first_business` is an intentionally callable SECURITY DEFINER RPC restricted to authenticated users, but requires independent review/rate-limit considerations before production. Supabase advisory flags it.
- [ ] Staging Auth leaked-password protection advisor reviewed/configured as supported.
- [ ] Rollback and backup processes independently rehearsed before release.

## Boundaries
- Qmenu primary/production project `fstpxknegaxppjilbnke` was **not modified**.
- Do not merge to main, promote to production, or treat successful SQL simulation as browser E2E certification.
