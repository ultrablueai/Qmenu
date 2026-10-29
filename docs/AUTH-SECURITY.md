# Authentication / onboarding security gates

- Login uses Supabase password authentication. Supabase Auth users are not created from the public client here.
- The dashboard uses server-side `getUser()`, not trusted client state.
- Membership SELECT policies check `auth.uid()` and business scoping.
- **No tenant onboarding API** is enabled until a secure atomic owner-bootstrap design is implemented and independently tested. Never grant a public client write access to business, membership, subscription or audit tables.
- Middleware refreshes session for protected routes; authorization is independently enforced in the page and database RLS.
- Production use is blocked until real RLS negative tests and device login tests pass.
