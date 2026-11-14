# Beger Salon G43–G47: Global-quality online discovery and booking

## Verified external references (checked 2026-11-14)
- Fresha client booking journey: services (multi-item), practitioner, schedule, direct link, Facebook/Instagram booking, Reserve with Google: https://www.fresha.com/help-center/knowledge-base/online-presence/102398-learn-how-clients-book-appointments-online
- Booksy public QR/link sharing, staff-specific codes: https://support.booksy.com/hc/en-gb/articles/16536355817234-How-can-I-find-my-Booksy-profile-link-or-QR-code-to-share-with-clients
- Square printed QR signs/card/receipts: https://squareup.com/us/en/appointments/features/qr-code-booking
- SQUIRE walk-in check-in and waitlist: https://www.getsquire.com/business-edge/barbershop-operations/barbershop-walk-in-management
- Square waitlists: https://js.squareup.com/help/us/en/article/7923-waitlist-with-square-appointments

## Product decision
One tenant-owned, stable customer booking URL per business, e.g. `https://.../s/<public_slug>` (proposal only, not created).
Optional `?staff=<public_staff_slug>` deep link and channel tags (`?source=instagram|facebook|google|whatsapp|door|receipt`), validated server-side. Keep a separate check-in token and QR from public booking QR. Customer booking must not require app installation; installable PWA later is optional.

### Service journey
1. Scan public QR/visit Instagram bio/Google profile/WhatsApp booking link.
2. Salon-branded mobile page: photo, location, service list, multiple services, clear duration and cost.
3. Choose staff or 'first available', calendar, branch; confirm one booking with itemized services and price.
4. Customer receives booking status and signed private tracking link; barber approves only assigned pending bookings.
5. Reminder job 24h/2h before appointment (opt-in channels), with easy cancel/reschedule.
6. At salon: verify short-lived signed check-in QR plus salon terminal scan/confirmation and store staff authorization. An open publicly printable check-in QR alone is not proof of physical presence.
7. Barber starts, finishes, POS marks collection, records commission only on completed paid services; customer may leave verified review and optionally rebook.

### Owner control
Staff schedules, breaks, service duration, gap after/between appointments, bookable advance window, no-show/cancellation rules, chairs/resources, staff commission/rent model, reviews and reporting, separate women's/men's catalog. Staff-only member scopes enforced in DB RLS. Staff has their own short-link profile if owner enables it.

## Backend release gates (not yet implemented)
- Tenant-scoped tables salon_business_settings, salon_staff, salon_services, salon_chairs, salon_staff_chair_shifts, salon_appointments, salon_appointment_services, salon_status_events, salon_waitlist, salon_notifications and notification_consents. Schema must align with existing public.businesses / memberships and not touch restaurant order tables.
- Signed authenticated server RPCs for creating booking, approvals, cancel/reschedule and check-in. Atomic concurrency prevention for conflicting staff and chair time ranges, including multi-service processing & aftercare gap.
- Auth policy: owner all own-business data; assigned barber own bookings only; customer only own signed track. Customer contact info minimized. Separate public catalog view; never expose all bookings, revenue, phone lists.
- Transactional outbox for event notifications; retries, deduplication, quiet hours, consent, logs, opt-outs; device push via service worker and optional paid SMS/WhatsApp, never claim backend push from local Notification API.
- Real commercial salon booking URL, share kit, QR codes generated privately from public links, staff code rotation and redirect strategy, print assets.
- Automated acceptance using two real devices and two distinct identities, double-book attempts, denied cross-tenant access, check-in replay prevention, notification delivery tests, recovery, i18n and accessibility.
- Reserve with Google / Instagram native Book Now requires eligible partner/channel permissions; basic link sharing can go live before partner approval.

## What G43 actually ships
Static QR (project-hosted SVG) resolves the **Staging** customer demo URL. `/demo/salon/share` is the printable poster and social link-sharing kit. URLs tagged by source are *not* yet recorded in analytics. Booking demo persists only in local browser storage; staff/owner views are not server authenticated. No paid billing, production operations, guaranteed multidevice sync, authentic check-in or out-of-browser push. Do not install a public sticker at a live shop as a real booking channel until backend release gates pass.
