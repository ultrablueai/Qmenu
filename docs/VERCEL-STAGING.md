# Qmenu — isolated Vercel staging (2026-10-31)

## Vercel project
- Team: `ultrablueais-projects` (Hobby plan).
- Project: `qmenu-staging` (`prj_SaZLoeo6Vulas9E4IJR1BrxcXY9T`), linked to `ultrablueai/Qmenu`.
- Framework: Next.js; Node.js: 22.x.
- Preview deployments protected by Vercel authentication.
- Preview/development env vars: `NEXT_PUBLIC_SUPABASE_URL` points to `https://qandxrcuetwzenlqspez.supabase.co`; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the key of the same staging project.
- No Supabase production credentials were configured.

## Important deployment safety evidence
An initial Git-source deployment requested with `target=preview` was **returned by Vercel as target=production**. It was canceled before completing, with state `CANCELED`. This is NOT a successful production or preview deployment. Do not repeat a manual first-deployment request without inspecting the resolved target.

Use **automatically created Preview deployments from the feature branch/PR** or another verified method that resolves to `target=preview`. Check the API's resolved `target` field before accepting a deployment. Do not configure production credentials or promote until G1 receives approval.

## Outstanding
- Successful Preview deployment and `npm run build` evidence.
- Commit reproducible package lockfile and verify `npm ci`.
- Confirm Supabase Auth redirect URL for the exact verified Preview host.
- Perform browser signup, confirmation, login, owner onboarding and logout.
- Do not merge the draft PR to `main` until acceptance gates are met.
