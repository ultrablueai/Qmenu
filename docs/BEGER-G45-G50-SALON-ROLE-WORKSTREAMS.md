# Beger Salon OS — roles, journeys and workstreams G45–G50
Date: 2026-11-14. Repo: ultrablueai/Qmenu, feat/g1-foundation.

## Authority model
- Platform owner: tenant plans, onboarding, subscription operations; cannot by default browse customers' personal booking data.
- Salon owner: all branches, chairs, staff, bookings, schedules, invoices, collected revenue, payouts, overrides and logs.
- Barber / stylist: ONLY assigned appointments, own services and calendar, own working hours, breaks, customer status, own collected-service earnings and contractual share. Can approve/reject own bookings. Cannot see coworkers' income or edit own pay contract. Owner can restrict staff autonomy at tenant configuration.
- Receptionist / cashier: delegated arrivals and charges, no staff salary or tenant plan controls.
- Customer: public salon services, own private booking status, cancel/reschedule subject to policy. No staff dashboard.

## Fully separated workflows
CUSTOMER: door QR / Instagram / WhatsApp -> tenant-branded mobile catalog -> multi-service cart -> preferred worker or first available -> slot respects total service duration, buffers, worker breaks, resource chairs -> pending -> worker approval -> alert -> verified salon check-in -> in service -> completed -> settled checkout -> rating and rebook.
WORKER: own dashboard -> review pending bookings -> approve/reject/propose change -> manage own shifts, breaks and offered services -> accept arrival -> service begin/finish -> per-service earnings/commission -> payout history. No company-wide finance.
OWNER: all workers and chair/resource capacities -> all bookings and calendar -> cashier, revenue, staff share, rental agreements, service mix, branch KPI and audit -> approve exceptions/overrides -> export settlements and tax reporting.
MULTI-SERVICE: one booking and invoice, distinct line items optionally assigned to different staff/resources, atomic collision prevention for whole reservation.

## Workstreams and exit gates
G45. PRESENTATION — separate dashboards, own/staff controls, owner financial aggregate, sample-data button. Done in source; verify final build and deploy.
G46. DATA — isolated tenant salon tables, branches/staff/chairs/resources, booking items, source channel attribution and service price snapshots. Not complete.
G47. AUTHORIZATION — logged-in worker and owner roles, RLS and server RPCs, cross-tenant and cross-worker negative tests, privacy. Not complete.
G48. LIVE FLOW — two-phone real-time bookings, queue check-in with expiring one-time token, collision-safe atomic scheduling. Not complete.
G49. NOTIFICATIONS & CHECKOUT — event outbox, consent, reliable push/SMS reminders, no-show rules, verified settlement and receipts. Not complete.
G50. PILOT — three independent phone users, repeatable end-to-end regression, restore drill, local privacy review, release signoff. Not complete.

## Demonstration now
Open the owner page and select 'تجهيز بيانات العرض بضغطة'. The owner sees all three workers and their services/paid commission summaries; a barber sees only own demo income and can change own schedule/services and stop receiving new bookings, but cannot change pay agreement. Booking remains same-browser localStorage only. The public QR opens the demo customer page. Owner and staff views are not access-restricted in the demo: do not market them as secure production accounts.

## Invariants
No changes to restaurant ordering flows. No production deployment or live merchant billing. Do not capture real customer/employee personal information in public demo. Role permissions must be enforced by database RLS and server before any real pilot.
