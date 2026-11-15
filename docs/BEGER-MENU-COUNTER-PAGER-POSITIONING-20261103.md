# Beger — Core business clarification: menu, counter order and digital pager
Date: 2026-11-03. Owner discussion captured, Staging development scope only.

## Product positioning
Beger is **merchant SaaS for simplifying and organizing service**, not a delivery marketplace. Merchant subscriptions are the primary intended Beger revenue stream. Avoid default order commissions, courier commissions, advertisements or other revenue claims without a separate explicit commercial decision.

## Merchant-selectable service workflows
1. **Menu only:** a table/shop QR is informational, customer orders and pays at the cashier. No misleading order button or customer account required.
2. **Table QR orders:** merchant opts in; QR identifies a real table, customer chooses items and extras, each individual submitted order appears in authorized branch KDS and must be accepted independently. Payment may be in-person until independently verified payment integration is approved.
3. **Counter-order with digital pager:** cashier records order from the merchant's catalog and confirms payment status through an authorized and auditable cashier action. System issues an unambiguous **pickup reference / optional printed QR receipt**, with optional physical pager handout for customers without phones. Customer can check readiness by scanning printed QR or opening unique order-status link; merchant marks preparing -> ready; digital status changes. When supported and explicitly enabled after gesture, in-page sound/vibration can supplement visible message, but a closed or locked phone **requires separately approved, consented Web Push** and cannot be promised by a simple status page.
4. **Scheduled pickup from anywhere:** choose branch, menu, packaging and offered ready slot before arriving; verify contact as needed; merchant accepts; server-controlled slot and prepared time; payment at counter first, online payment only with provider verification and compliance.
5. Delivery, courier fleet, maps and marketplace commission remain **deferred**.

## Why cashier-mode is a separate essential journey
- QR-only menus do not replace queue handling; users may prefer to speak to cashier.
- Unambiguous guest order tokens avoid confusing lookalike short numbers during peak hours.
- Merchant controls whether counter checkout, table ordering or both are enabled per branch.
- Digital pager is additive: do not require app installation, personal account or notification permission simply to follow order; QR receipt and visible status always available.
- Physical pager devices may still be used by merchants when guests do not own compatible phones; no promise of eliminating hardware for all users.

## Payments / money flows
(a) Customer's food and drink payment to merchant at counter or merchant-contracted gateway; pending/paid/refunded must come from authorized, verified sources.
(b) Merchant subscription to Beger; merchant billing plans, invoices, paid status, renewal, failed payments and audit trail. **No default commission on merchant orders**, no assumption Beger collects restaurant GMV.
No integration, Production changes, migrations or payment certification in this decision note.

## Implementation order
- Close G2 table/shop QR navigation and customer/menu quality; validate real devices.
- Stabilize existing G3 table-order -> KDS -> ready -> guest status.
- Add cashier order entry and order-specific digital-pager token tied to true order ID, status URL, collision-safe display code; secure token access and audited cashier state.
- Add scheduled pickup and packaging server pricing with slot limits.
- Integrate legal payment collection for merchant subscriptions; optional merchant online food gateway is later and independently gated.
- Keep three-language AR/TR/EN and opt-in accessible alerts, reduced-motion preferences, merchant role/tenant isolation.
