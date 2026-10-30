# Qmenu G1 — Auth and tenant safety

## Verified on isolated Supabase Staging
- Project: `qandxrcuetwzenlqspez`. Main/production is `fstpxknegaxppjilbnke` and MUST NOT be targeted by staging environment variables.
- Four foundation/security migrations and FK indexes are applied to staging.
- `create_first_business` is explicitly granted to `authenticated`, revoked from `anon`, and validates `auth.uid()` inside an atomic SECURITY DEFINER transaction.
- G1 test transactions simulated two authenticated identities and confirmed cross-tenant read/write denial and rejected privilege escalation. Fixtures rolled back.

## Current app flows (not browser certified)
- Signup: Supabase email/password with verification callback, then login.
- Login: `signInWithPassword` and redirect to dashboard.
- Dashboard and onboarding use `getUser()` server-side; a membership query prevents repeat onboarding.
- Sign-out: POST route.
- Client uses publishable key only. Never include `service_role` or Supabase secret key in `NEXT_PUBLIC_*`.

## Deployment boundaries
- Never copy production credentials into staging. Start from the versioned `.env.example`, which points at staging only.
- Read actual publishable key from the **staging** project settings. Store it in Vercel preview environment variables, never Git.
- Whitelist the exact staging deployment origin and `/auth/callback` as a Supabase Auth redirect URL before email-verification testing.
- Do not deploy or merge to production until the G1 acceptance gates in `docs/G1-ACCEPTANCE.md` pass.
- Browser E2E (signup/confirm/login/tenant creation/logout), lockfile/`npm ci`, `next build`, and operational preview are still **NOT VERIFIED**.
- Do not claim browser authentication is certified based on SQL role-simulation tests alone.
