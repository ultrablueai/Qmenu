# G1 Acceptance and evidence — 2026-10-30

**Decision: NO-GO. Do not merge or deploy to production.**

## Verified artifacts
- [x] Repository exists, PR #1 remains draft on `feat/g1-foundation`
- [x] Next.js/TypeScript scaffold and password login/logout routes committed
- [x] Six-table tenant schema and restrictive initial RLS migration committed **but not applied**
- [x] Static security tests and staging-only SQL tenant isolation test script committed

## Outstanding mandatory gates
- [ ] CI green: recent workflow run 41015012510 failed; job logs/steps unavailable through connector
- [ ] Reviewed lockfile committed and `npm ci` used; current npm install in CI is temporary
- [ ] Secure atomic tenant owner onboarding and admin authorization
- [ ] Separate Staging Supabase project accessible; initial migration applied and advisors clean
- [ ] Two distinct authenticated accounts complete real cross-tenant negative read/write tests
- [ ] Real login/session/logout on Android Chrome and iOS Safari
- [ ] Vercel Preview/Staging with environment variables and operational URL
- [ ] Rollback/backups verification; G1 evidence report with git SHA and tested URLs

## Evidence and instructions
- Last confirmed CI failure: https://github.com/ultrablueai/Qmenu/actions/runs/41015012510
- Staging tenant isolation probe: `supabase/tests/g1_tenant_isolation.psql` requires two staging Auth test user UUIDs; it rolls back.
- The connected Supabase accounts do NOT currently list Qmenu project `fstpxknegaxppjilbnke`. No production SQL has been executed.
- Do not mistake Supabase↔GitHub integration for ChatGPT↔Supabase project authorization.
- After Qmenu connection authorization, verify project inventory; isolate staging before changing database.
