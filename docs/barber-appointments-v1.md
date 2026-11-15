# Barber / salon scheduling — V1 implementation boundary

## Agreed scope (2026-11-15)
Merchant chooses whether to show prices. Individual customer prices stay private to authorized merchant/cashier. Support subscriptions, promotions and optional banner campaigns. Barber confirms, rejects, or proposes another time. Late arrival: barber can mark no-show or reschedule, free a slot and take a walk-in. Customers may opt into an early-slot offer; no unilateral earlier appointment. Alert customer on confirmation, changed time, cancellation and ready/early slot, subject to consent.

## Domain states
requested → confirmed → arrived → in_service → completed.
Cancellation possible before service. confirmed → no_show. Rescheduling puts a booking back into requested for explicit approval. Walk-in: create with source=walk_in and staff authorization; start service after check-in.

## Integration requirements (NOT yet implemented)
- SQL schema: tenant-scoped services, staff working hours, appointments, customer offers, pricing visibility, customer memberships, promotions, notification outbox.
- RLS on every tenant table; service-role actions server-only; staff scope must be validated per action.
- Postgres transaction / exclusion constraint must prevent overlapping slots and race conditions. The pure helper is not enough.
- Dedicated notification queue and idempotency keys; app push permission and device-dependent ringing/vibration (cannot guarantee phone-call-equivalent ring on locked devices).
- Early offers must expire and be accepted by customer atomically before changing the appointment.
- Personal customer prices never exposed in public API; do not trust user-supplied actor argument in integration.
- UI: customer book/accept early offer, barber agenda + confirm/change/cancel/walk-in, owner controls, notification settings.
- Automatable reminder policy: 24h and 1h prior configurable; quiet hours and explicit consent.

## First code delivered
lib/barber-appointments.mjs: pure scheduling and price-visibility helpers.
tests/barber-appointments.test.mjs: six node:test cases.

## Acceptance checklist
[ ] Database migrations + constraints + RLS reviewed
[ ] APIs and authoritative auth
[ ] Full UI customer/staff/owner
[ ] Transactional conflict tests including simultaneous booking
[ ] Notifications on real mobile/lock screen
[ ] No-show and walk-in full journey
[ ] QA, staging, release gate
