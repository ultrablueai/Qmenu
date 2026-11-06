# Beger G18 — Print failure and reprint audit
2026-11-06 · Staging only · Commercial release NO-GO

## Implemented
- SQL migration `20261106004500_g18_print_failure_audit.sql`: adds `failed` print state, validated failure reason (max 200 chars), private immutable action events and a 60-event branch history RPC.
- Scoped `g18_print_job_action(job,action,note)` enforces owner/manager authorization. Confirmation requires prior preview; a failed job requires reason; reprinting confirmed paper requires a documented reason. All changes are recorded in the same transaction.
- Legacy G17 action delegates to G18 so no unlogged action bypass remains. Queued jobs prioritize failures; the merchant dashboard exposes failure details, pending/all filters, reprint confirmation and event history.
- G17 acceptance still creates three unique tasks: kitchen, pickup and internal summary. None is a fiscal invoice. Pager independent service unchanged.

## Verified
- SQL Staging rollback test: preview → fail → retry → preview → confirm → documented reprint; six audit events, two preview attempts; undocumentated confirmed reprint rejected. Transaction rolled back; no permanent sample data.
- All four G17/G18 queue and action RPCs reject anonymous EXECUTE; raw event/job tables have no direct app-role grants and RLS is enabled.
- Regression tests at `tests/beger-g18-print-retry-audit.test.mjs`; final CI and stable-alias verification should follow this commit.

## Remaining
Hardware-connected silent USB/network printing is NOT implemented. It requires secure tenant-scoped device pairing, exclusive print leases, retry/acknowledgment protocol, printer profiles, offline alerts and actual paper-out testing. Manual staff print confirmation is not physical proof. True browser/JWT E2E, fiscal receipt compliance and commercial subscription billing remain separate open gates. Production untouched.
