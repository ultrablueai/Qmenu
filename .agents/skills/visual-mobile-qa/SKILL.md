---
name: visual-mobile-qa
description: Verify Beger role dashboards and later guest workflows on small phones, RTL/LTR, accessibility and real interactive states.
---
# Beger Visual & Mobile QA
## Current-phase constraint
Only validate screens which exist in the OPEN phase. Guest menu, QR tables, loyalty pass, notification permission panels are NOT shipped until their later phases.

## Review matrix
- 320/360/390/768/1280px and keyboard zoom: no horizontal clipping, blocked buttons or overlay across nav; focus visible and controls have touch area.
- Arabic RTL and Turkish LTR: document dir/lang, icons, numbers, labels, type size, safe-area insets, no forced reversed email.
- Main users: owner admin /admin, merchant /dashboard, branch /dashboard/branches/[branchId], eventual guest/loyalty.
- Correct loading/empty/permission/expired-session states; no invented KPIs, dummy balances, inert CTA or unsupported status.
- Reduced motion, semantic headings, table labels, keyboard navigation, contrast, accessible alert announcements.
- Physical Android Chrome and iOS Safari/PWA when available. Responsive CSS tests are NOT substitutes for real devices.

## Output
Return screenshots or reproducible device-specific steps; severity; source commit; independent reviewer verdict. Fix smallest regression and retest. No UI-only mock accepted as a working feature.
## Pass
Current-phase major workflows and access boundaries visually and functionally usable on phone and desktop.
