# Qmenu / Beger — Connected platform register (2026-11-01)

One product, independent of Garfix, DIMASQ, Sovereign, SatışDesk and LearningOS. **Never reuse another project's credentials or infrastructure.**

## Canonical owners and identifiers

| Platform | Resource | Scope / purpose |
| --- | --- | --- |
| GitHub | [ultrablueai/Qmenu](https://github.com/ultrablueai/Qmenu) | Source of truth |
| GitHub branch | `feat/g1-foundation` — [draft PR #1](https://github.com/ultrablueai/Qmenu/pull/1) | **Only** G1 candidate; NO-GO until gates pass |
| GitHub main | `main` | Protected logically: **no merge without explicit owner approval** |
| Vercel | [qmenu-staging](https://vercel.com/ultrablueais-projects/qmenu-staging) | Project ID `prj_SaZLoeo6Vulas9E4IJR1BrxcXY9T`; team `ultrablueais-projects` (Hobby); Next.js, Node 22 |
| Vercel Preview | `feat/g1-foundation` | Vercel Authentication enabled; preview only, never production target |
| Supabase Staging | [Qmenu-steging](https://supabase.com/dashboard/project/qandxrcuetwzenlqspez) | Project `qandxrcuetwzenlqspez`, Paris `eu-west-3`, 5 applied migrations and tenant RLS |
| Supabase primary (DO NOT TOUCH) | [Qmenu](https://supabase.com/dashboard/project/fstpxknegaxppjilbnke) | Project `fstpxknegaxppjilbnke`; no G1 migrations authorized |
| Vercel env | `NEXT_PUBLIC_SUPABASE_URL` | `https://qandxrcuetwzenlqspez.supabase.co`; preview/development only |
| Vercel env | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public staging publishable key, stored on Vercel, **never copy key into Git** |

## Build and security policy

1. `npm ci --ignore-scripts --no-audit --no-fund` (from committed `package-lock.json`).
2. `npm test && npm run build`; build internally runs `verify:staging`.
3. Production Vercel target, wrong branch, wrong Supabase project and missing publishable key must fail closed.
4. Ignore Vercel builds of the unrelated `feat/codex-engineering-skills` branch; it does not contain the runnable Next.js app.
5. Keep GitHub PR in **draft**, branch-based and Staging-only. No production migrations or Vercel promotions.
6. Keep audit logs non-readable from client. Use real Auth sessions for final tenant isolation certification.
7. Never include service-role keys, passwords, or tokens in commits, browser source, logs, documentation or shared screenshots.

## Release gate and handoff

**Verified:** foundation schema migrations in staging; six protected tables; SQL role-simulation tenant isolation; clean Next.js preview build; 36 Node tests; npm-generated lockfile committed and a Vercel `npm ci` install completed.

**Not yet verified:** end-to-end confirmation email and PKCE callback in a real browser, sign-in and sign-out, first business creation with two real Auth sessions and Data API; native mobile checks; backups and restore, and security review.

**Known warnings:** Supabase `authenticated_security_definer_function_executable` (RPC requires review), leaked-password protection disabled, audit_logs intentionally no SELECT policy; Next.js warned of missing optional SWC entries in npm lockfile despite completed builds.

**Supabase Auth URL configuration:** The connected Supabase API does not expose Auth redirect-allowlist settings. Review the Staging dashboard `Authentication → URL Configuration`, set site URL to an actual *staging* host, and allow the exact current Preview origin `/auth/callback`. Avoid a broad wildcard if a stable Preview alias can be used. See [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). Preview SSO protection can prevent email confirmation from opening outside an authorized Vercel session. Never put a real production URL in this staging allowlist.

**Next human action:** Provide an authorized test mailbox (do not paste a password), or open the Vercel preview in an authenticated browser and complete email confirmation using the test account. Record results in `docs/G1-ACCEPTANCE.md` with real evidence. Until then, **NO-GO**.
