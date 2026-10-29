# G1 Acceptance Checklist

Status: **NO-GO** until a staging deployment and negative tests pass.

- [x] Repo initialized, branch-based work started
- [x] Initial tenant/branch/membership schema and restrictive RLS migration drafted
- [ ] Migration applied on isolated staging and verified
- [ ] Owner onboarding securely creates tenant and membership via server
- [ ] Authenticated merchant UI, staff role checks and logout
- [ ] Two independent merchant accounts: negative cross-tenant read/write E2E tests
- [ ] CI actual run green, locked dependencies
- [ ] Vercel staging URL and device smoke tests
- [ ] Backups and migration rollback evidence

**Important:** Supabase GitHub integration currently points at main/production. Do not merge or apply this migration to production before staging certification.
