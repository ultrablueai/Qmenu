# Beger G2 QR release evidence — 2026-11-02

## Deployment and scope
- GitHub: ultrablueai/Qmenu `feat/g1-foundation`, verified code SHA `fa6c5a7ebdd225c32db058fc900c393d86d47354`.
- Vercel: `qmenu-staging`, Preview deployment `dpl_EM4YA1zFbT72cZEUhgULQJssT68W`, status READY.
- Supabase Staging: `qandxrcuetwzenlqspez` (Qmenu-steging), ACTIVE_HEALTHY.
- Production project `fstpxknegaxppjilbnke`, GitHub main, and unrelated products untouched.

## Implemented and evidenced
1. Merchant branch QR is locally rendered from a first-party QR generator without a third-party image service.
2. Merchant HQ table manager uses real `dining_tables` rows, owner/manager RLS, create, enable/disable and QR rotation. Staging has the table schema and an existing table row.
3. Each active/published/available branch product gets its own QR opening `/b/:branchId?product=:productId`. Code reads details only through the pre-existing public published-product RPC.
4. Merchant shop/table/product QR can be saved individually as high-resolution printable SVG; per-branch product IDs are unique even for one product published across multiple branches.
5. Guest scanner requests camera access only after a click; native BarcodeDetector if available, bundled Apache-2.0 jsQR on-device fallback, optional gallery photo scan, or typed/pasted link.
6. QR redirect is constrained to shop/table UUID routes on the same origin or this Beger Preview project; scanned foreign destinations never execute a cross-site redirect.
7. No personal customer QR issuance, customer signup, loyalty, ordering or payment was activated. Those are separate future gates.
8. Tests: 160 pass, 0 fail. Includes encoding a shop QR, table QR, product QR and **decoding the resulting actual image pixels back to exactly the original links**; Supabase staging verification and Next.js build/typecheck succeeded.
9. Vercel deployment status READY on the exact code SHA; protected Preview share links remain time-limited.

## Outstanding physical acceptance gates — NO commercial GO
- Real Android and iPhone camera access with actual QR print/second screen; image import fallback must be checked on devices.
- Open QR on a second device with appropriate Vercel Preview access; without access, the staging protection screen can intercept QR before the guest page. Do not expose a permanent public link while Preview protection remains in force.
- Authenticated owner/manager E2E for create/rotate/deactivate table; unrelated tenant denied; confirm actual page copy/link and QR readability after physical printing.
- Independently verify branch and table identity on actual mobile devices, both RTL Arabic and TR/EN layouts.
- Separate G1 security/release blockers persist; don't mark the entire platform G2 release GO until owner acceptance.

## Security posture
- No data migrations or Production changes in this pass.
- Supabase security advisor finds intentional public display-only SECURITY DEFINER RPC warnings and a few INFO RLS tables with no external policies; this needs independent release review (do not silently suppress).
- Customer card RPCs remain revoked for public/authenticated, as required by the canonical plan; customer identity/consent/KVKK is Phase G4, not QR menu G2.

Decision: **QR software implementation is deployed on isolated Preview; commercial GO remains conditional on the physical multi-device and authenticated security acceptance above**.
