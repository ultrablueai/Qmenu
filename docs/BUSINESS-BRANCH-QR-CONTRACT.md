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
- **Decision adopted: one QR per customer × business, reusable at every branch of that business.** The opaque 256-bit token has no business/customer/branch identifiers or personal data. It is hashed using SHA-256 at rest. A branch scan resolves it only **within the business of the authorized scanner's branch**, then records the specific branch, authenticated scanner and time. Rotation invalidates the previous code; deactivation blocks future scans.
- QR is not automatic login or proof of identity. Redemption/actions such as points, offers or payment require server-side rate limits, action-specific authorization and replay prevention.
- For public menu and table orders, **branch/table QR** is a different type of code from a **customer QR**, and must never be conflated.
- Staging has a first-pass issuance/rotation/deactivation implementation and locally rendered QR card. The QR token is shown **only at issue/rotation** to hand to the customer, not stored or recovered in plaintext; screenshots/copies should be shared only with that customer. Scanner records an attendance event only, not an automatic reward, payment or authentication. No real customers created by automated checks.

## Open product decisions (before QR issuance)
1. Customer QR lifecycle: permanent loyalty card per customer per branch, or expiring token per visit?
2. Customer enrollment: self-registration (phone/email/consent) or merchant-assisted creation, with deletion/export under KVKK.
3. **Resolved:** one card per customer within a business, usable at all its branches; separate businesses on Qmenu cannot read/redeem it.

## Implementation and remaining limits
- Schema: `business_customers` (merchant-owned card, consent, hash), `customer_qr_scans` (branch attribution), `customer_qr_scan_attempts` (rate-limit metadata), with RLS and no anonymous access. SQL RPCs provide issue, rotate, deactivate and branch scan.
- Company dashboard can issue/rotate/deactivate cards; branch dashboard uses camera where supported or manual pasted code and shows recent branch scans. Camera requires browser permission; not yet certified on Android/iOS devices.
- Merchant-assisted enrollment currently relies on an affirmative consent checkbox, **not yet independently verified customer consent**; do not enroll real end users commercially until consent/export/delete lifecycle and KVKK review are implemented.
- A single `business_customers` row has one active card; a name-only enrollment **does not yet deduplicate one human entered multiple times**. Add customer self-service identity verification before commercial launch. Customer cannot retrieve a forgotten card; owner can rotate it.
- Token is a reusable bearer identifier; treat it as confidential, not identity proof. Rate limit: 15 scan attempts/minute/merchant actor. De-duplicate same customer/branch scans inside 30 seconds. Stolen/photographed tokens are still a risk; sensitive clinic use, points or payouts require stronger verification.
- Existing first-pass scanner grants business owners and managers only; branch staff needs vetted branch memberships. `customer_qr_scans` currently lists recent visits on the branch page without medical or sensitive context.

## Release checkpoints
- Verify merchant branch navigation in actual authenticated mobile browser.
- Run two-business, two-branch authorization E2E (owner/manager allowed, staff and foreign-tenant denied), including forged URL attempts.
- Implement QR issuance/redemption only after consent, branch assignments, abuse controls and cancellation design are specified.
- Staging-only; no production changes, no PR merge until signed-off.
