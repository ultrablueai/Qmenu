# Beger G2 acceptance — 2026-11-02

**Status: Implemented on GitHub branch and Supabase Staging; hosted acceptance NO-GO pending deployment and real browser E2E.**

## Approved boundaries
- Repo: ultrablueai/Qmenu, branch feat/g1-foundation.
- Supabase Staging: qandxrcuetwzenlqspez; Vercel Preview: qmenu-staging.
- Production fstpxknegaxppjilbnke, main branch, customer QR loyalty, orders, payments and private clinical workflows: untouched and out of scope.

## Implemented
- Public shop page /b/[branchId] and revocable table page /t/[token], without merchant login. Arabic RTL and Turkish LTR with real merchant name and branch.
- Branch-owned categories and products; bilingual names, descriptions, optional HTTPS image, currency-aware integer pricing, active and available flags; merchant creation and editing from authorized branch dashboard.
- Table creation, rename, disable/enable, token rotation, QR image display and A4 printable QR sheet.
- Schema migration 20261101233523_g2_branch_catalog_tables.sql applied to Staging, plus previous G2A public identity migration. Tables menu_categories, menu_items, dining_tables.
- Public display-only functions public_branch_identity, public_branch_menu and public_table_locator. No ordering/loyalty invented.

## Verified on live Staging (transactional fixtures all rolled back)
- Three new tables have RLS enabled, 12 G2 policies in total.
- Anonymous role cannot SELECT from any of the three tables; anonymous execute of limited public menu and active table locator works via SQL.
- Role-simulated merchant sees own categories/items/tables only. Foreign merchant category INSERT, item/table UPDATE and table INSERT denied.
- An item cannot reference a category from another branch (composite FK).
- Table QR becomes invalid when disabled; rotation invalidates old token while new token works.
- Unknown branch returns an empty public menu.
- Post-test real row counts: 0 categories, 0 items, 0 dining tables; two original Staging branches unchanged.
- Repeatable read-only gate: tests/sql/staging-g2-readonly-gate.sql passed.

## Blocking before G2 GO
1. Vercel Preview quota exceeded (HTTP 402, code api-deployments-free-per-day, above 100/day; retry-after 86400). No authorized new deployment yet. The branch's fixed alias remains on an older READY deployment and does not certify the latest code.
2. One old G1 static test expected an obsolete Phase-2-coming-soon placeholder. First combined Preview build ended 104 pass / 1 fail out of 105. The test has been corrected in GitHub, but latest source has not completed a new full Node/TypeScript/Next build.
3. Real guest browser checks not completed: Android/iOS QR scan to populated live menu, table location, Arabic/Turkish, real user CRUD and cross-tenant two-session API negative assertions. No seeded fake merchant products may be represented as proof.
4. Preview SSO Protection is enabled, so a guest without a Vercel session may encounter a platform gate. A protected staging test is not an anonymous public launch test.
5. QR images currently use an external generator with public branch/table URLs only. Review or replace with self-hosted encoding for launch reliability/privacy.
6. Previous G1 commercial blockers remain separately tracked: real bearer-token API negative assertions, complete role restore, password protection policy.

**Decision: G2 code/backend substantially built; G2 release NO-GO until exact SHA READY, true user/guest browser tests and relevant security/privacy gates.** No main or Production changes. Consolidate the next Preview deploy instead of one build per file.

## Final schema/version and security hygiene
- Aligned both G2 migration filenames with the actual applied Staging migration history, not arbitrary source timestamps: 20261101232646_g2a_public_branch_identity.sql and 20261101233523_g2_branch_catalog_tables.sql. Removed duplicate later-version files. **No migration was re-applied** to the database.
- Supabase security advisors after G2: three intentionally anon-callable SECURITY DEFINER WARNs (public branch identity/menu/table locator), 13 authenticated-callable privileged function WARNs in total (10 prior + 3 public G2), three RLS-without-policy informational tables and one Free-tier leaked-password-screening WARN. All three public G2 functions verified STABLE, SECURITY DEFINER, search_path pinned to empty, with restricted output schemas and explicit anon/authenticated execute grants. These advisor notices are **reviewed, not eliminated**.
- To control future Vercel preview usage, updated only Staging project build-ignore command to require a deliberate [beger-deploy] marker in the git commit message on the approved feature branch. Normal code/docs commits should skip building. This setting is applied but has **not yet been exercised by a successful marker build** because of account quota; do not assume new revisions went live.
- Vercel branch alias still points to an older READY deployment, despite latest deployment metadata reflecting an earlier ERROR build. Fresh hosted proof remains mandatory.

## Approved central-management architecture change — 2026-11-02
Owner chose central headquarters management with limited branch operations. Binding spec: `docs/BEGER-CENTRAL-BRANCH-GOVERNANCE.md` (also linked from canonical plan). **Current G2 implementation is not fully aligned:** the merchant catalog editor is still mounted under `/dashboard/branches/[branchId]`; product/category/price/table administration must be moved to centralized `/dashboard` with branch selection and independent capability checks. Branch route must remain operational-only (temporary stock-out and QR print by scoped delegation; orders/KDS/pager later).
Do not claim compliant UI or phase GO until staged refactor, tests and hosted acceptance. Catalog migration to business-wide identity with branch publications is a separate additive step; do not drop current branch-scoped records or invent data. Vercel quota/SSO and previous G2 acceptance blockers remain unchanged. No Production changes.
