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

## 2026-11-02 — Headquarters-first UI refactor, first safe slice
- Implemented `app/dashboard/headquarters-catalog.tsx`: the merchant headquarters selects an existing branch and mounts the existing branch-scoped catalog/QR/table editor **on `/dashboard` only**. It is rendered server-side only for a verified business `owner` or `manager`, using the current business and its fetched branch IDs. A validated branch selector prevents accepting arbitrary client-supplied branch identifiers. The database RLS is still authoritative.
- Removed `MenuManager` import/mount from `/dashboard/branches/[branchId]`; this route now states that central catalog, pricing and table/QR configuration live in headquarters and offers an HQ link to owner/manager only. Staff remains limited to the existing branch-scoped operations placeholder; real order/pager flows belong to G3.
- Added static regression source test `tests/beger-central-branch-permissions.test.mjs` to lock the HQ-only UI rule and ensure staff never receives catalog administrative UI or DB write policies. Reviewed GitHub source and verified expected mounting paths, but **fresh npm test / Next.js build on latest code is not yet evidenced**.
- Staging read-only SQL verified `menu_categories`, `menu_items`, `dining_tables` each has three write policies (INSERT/UPDATE/DELETE), each using business membership checks and **none grants staff writes**. No new migration or Production changes.
- **Important remaining architectural work:** The current product/category definitions are still per branch, not a shared business-wide canonical catalog. The HQ selector is a centralized management interface over branch-local catalog data, **not** implementation of business-level catalog publication or bulk multi-branch pricing. Also the current dashboard primarily selects its first linked business; expanded multi-business switching is separate. Do not misrepresent this slice as full central-catalog completion.
- G2 hosted acceptance **remains NO-GO** until a validated Preview build/test and actual browser use (Vercel quota and SSO caveats previously documented). Do not begin G3 or touch Production based on this source-level progress alone.

## 2026-11-02 — Business-wide canonical catalog with explicit branch publishing
- Added and applied **Staging-only additive** migration `supabase/migrations/20261102053112_g2_hq_canonical_catalog.sql` (filename aligned to actual applied migration history): `catalog_categories`, `catalog_products`, `catalog_branch_publications`. All 3 have RLS; three manager-only FOR ALL policies; no anonymous raw table SELECT. Products are owned once by business. Branch publications reference the same business via composite foreign keys, with availability, active publication, and optional branch price override.
- Updated existing guest `public_branch_menu(uuid)` without changing its function signature. The public result combines legacy branch-local catalog with explicitly published central items; guest sees only active categories, active products and active+available publications. Existing legacy tables and QR routes remain unchanged. No destructive backfill/drop.
- HQ `/dashboard` now mounts `CentralCatalog` as the primary create-once/publish-to-selected-branch interface; centrally controlled base prices, branch price overrides and availability have editor controls. The older branch-specific editor remains collapsed under a transition-only `details` panel on HQ to protect any pre-existing items while cutover planning continues. Branch operations page still does not mount catalog management.
- Live SQL Staging transaction tests **PASS**: temporary canonical category/product publication rendered for anonymous public menu, unpublished second branch returned empty menu, override 1250 minor units superseded base price 1000 only for published branch, disabling publication hid product. Two-tenant role-simulated test denied foreign publication / price update (cross-tenant composite FK + RLS). Every fixture transaction rolled back.
- Post-test inventory: 3/3 new RLS tables, 3 policies, anon raw catalog SELECT denied, public menu function allowed; **0 canonical category rows, 0 canonical product rows, 0 publication rows** (no fictional commerce data). Added static source regression tests `tests/g2-central-catalog.test.mjs`.
- **G2 remains NO-GO for hosted acceptance:** latest Node/TypeScript/Next build has not been verified and real account/browser QR flow still not certified. Historical Vercel API deployment quota 402 and Preview SSO remain recorded. Do not mark production ready or begin G3 yet.
- Further polish before final GO: capability/delegation model more granular than baseline owner/manager; owner-side product detail editing and explicit migration of any legacy branch-local data (none currently in Staging); merchant/guest mobile E2E; remove external QR provider dependency as appropriate. No Production or main changes.
