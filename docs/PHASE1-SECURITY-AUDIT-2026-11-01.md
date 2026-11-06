# BEGER Phase 1 — Security Containment & Admin Separation Audit
Date: 2026-11-01. Environment: Supabase Staging `qandxrcuetwzenlqspez`, Git branch `feat/g1-foundation`.
Reference: `docs/BEGER-CANONICAL-PLAN.md`.

## Completed
- Merchant dashboard stopped displaying merchant-assisted customer account / loyalty QR creation.
- Branch workspace stopped displaying unrelated customer card scanning & customer scan history. Both surfaces accurately flag **shop/table QR + catalog as not ready**.
- Non-destructive staging migration `disable_premature_customer_qr` **applied**. For each of issue, rotate, deactivate, scan customer QR RPCs: `has_function_privilege('authenticated', ..., 'EXECUTE') = false` and same for `anon`. Existing tables remain untouched; there are no customer or scan rows.
- Retired *unapplied* speculative `202611010002_customer_self_registration.sql` as no-op (original draft is retained in Git history). Do not implement mandatory customer registration in first customer journey.
- Separate platform administrator identity `platform_admins` table, RLS self-select, fail-closed aggregate-only `platform_admin_overview()` RPC, and guarded `/admin` route. No merchants have implicit platform privilege.
- Staging query tests: unprivileged merchant cannot fetch admin overview (error 42501). In a rolled-back transaction, temporary platform owner could retrieve actual aggregate counts (1 business, 1 branch, 1 membership). **No persistent platform admin was provisioned**; route currently denies all accounts until audited provisioning.
- Independent platform admin and merchant dashboards now have clearly separated navigation and permissions.

## Explicitly NOT completed — do not report Phase 1 as closed
- Real authenticated browser E2E for owner sign-in/sign-out/session expiry/recovery across mobile browsers, branch add/rename, cross-tenant authorization and newly isolated `/admin` route. No permanent platform admin account yet.
- Complete platform admin operational workflow (merchant approval, packages, staff access, billing) is not built.
- Branch-scoped staff assignments & negative RLS tests for two tenants and multiple branches need full acceptance. Existing staff remains denied access to branch operations by design.
- Supabase Auth redirect allowlist and callback URLs must be confirmed on staging across confirmation/recovery email flows.
- Customer-facing shop/table QR, catalog, cart, orders, kitchen and pager do not yet exist; these belong to later phases.
- Legacy client QR source files remain **unused** as historical staging code. No commercial use.
- Review `SELECT` privileges, logging and data retention, migration parity and operational security with an independent verifier before an owner-authorized release.

## Safety gate
Do not merge the draft PR or deploy to Production. No false commercial GO. Next work stays within Phase 1: admin provisioning approval + real-browser/accessibility/security E2E + branch-scoped staff membership design (not product feature expansion).
