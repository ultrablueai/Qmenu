# Qmenu — Smart Business OS

Independent multi-tenant SaaS for cafés and restaurants, built to support further business verticals.

## Current status

G1 foundation is under construction. **Not deployed or production-certified.**

## Safety

- `main` is the production integration branch; keep untested work on feature branches.
- No credentials or service-role keys in Git.
- Supabase project `fstpxknegaxppjilbnke` is the currently identified project, but connector authorization remains unverified.
- Do not enable automatic production database deployments before migration review.

## First delivery gate (G1)

Tenant and branch schema; role-based staff membership; restrictive RLS; verified authentication; CI checks; and a working Staging deployment. G1 requires cross-tenant negative tests before approval.

## Staging release verification (2026-11-03)

- Release candidate branch: `feat/g1-foundation`; staging project: `qmenu-staging`.
- Run the full `npm test && npm run build` gate before considering the preview usable.
- Verify real QR > menu > cart > order > merchant > ready > pager flows, branch isolation, and role-specific access before pilot approval.
- Keep commercial production deployment and database migrations blocked until security, backup/restore, and acceptance evidence are recorded.
- Planned limited-pilot gate: 2026-11-16, conditional on evidence, not a promise of readiness.
