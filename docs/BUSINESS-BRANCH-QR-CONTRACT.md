# Business → branch workspace and customer QR contract (design decision, 2026-11-01)

## Invariants
- A **business** has a primary owner/manager dashboard: `/dashboard`, with its branches, high-level business settings and eventually aggregated data. Never mix business data from different tenant IDs.
- Each **branch** has a separate dashboard: `/dashboard/branches/:branchId`, with only that branch's customers, queues, bookings and operations. The current branch page is a skeleton with real authorized business/branch names; no operational schema exists yet.
- Before implementing branch-assigned staff identities, branch dashboards are accessible only by owner/manager memberships of the **matching business**. Existing business-level staff members are not assumed to have access to all branches.
- Branch access is determined server-side through authenticated membership plus a business-scoped branch query; URL branch IDs alone convey no authority.
- When expanding to staff roles, use a dedicated `branch_memberships` relation keyed to authenticated user, business and branch, backed by branch-specific RLS. A business manager can grant/revoke branch staff assignments only within their business. Owner access across branches persists.
- Sensitive clinic client data requires separate purpose/role policies and cannot be introduced into generic café/customer QR metadata.

## Customer identity and QR
- Each customer needs a stable identity **within the business**, and branch visit/loyalty associations must be kept separate. The same customer visiting another branch must not accidentally become an unrelated customer, or leak visits between branches.
- A **unique customer × branch** QR credential can encode a short opaque high-entropy random token (no name/email/phone/customer ID in plaintext). Resolve token server-side to a particular business, branch and customer, after checking revocation and expiration policy. Hash tokens at rest; issue replacements on rotation. Never use a guessable sequential ID as a bearer credential.
- QR is not automatic login or proof of identity. Redemption/actions such as points, offers or payment require server-side rate limits, action-specific authorization and replay prevention.
- For public menu and table orders, **branch/table QR** is a different type of code from a **customer QR**, and must never be conflated.
- Merchant UI must never display a live/scannable QR before a reviewed issuance and redemption flow is implemented. This stage creates no customer tables, tokens or mock customer records.

## Open product decisions (before QR issuance)
1. Customer QR lifecycle: permanent loyalty card per customer per branch, or expiring token per visit?
2. Customer enrollment: self-registration (phone/email/consent) or merchant-assisted creation, with deletion/export under KVKK.
3. Whether customer sees one card usable across **all** branches, with backend branch attribution at scan, or a distinct code for each branch. The request currently suggests distinct per-branch codes; confirm before database migration.

## Release checkpoints
- Verify merchant branch navigation in actual authenticated mobile browser.
- Run two-business, two-branch authorization E2E (owner/manager allowed, staff and foreign-tenant denied), including forged URL attempts.
- Implement QR issuance/redemption only after consent, branch assignments, abuse controls and cancellation design are specified.
- Staging-only; no production changes, no PR merge until signed-off.
