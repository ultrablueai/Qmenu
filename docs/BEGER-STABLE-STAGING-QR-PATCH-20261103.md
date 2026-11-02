# Beger stable Staging — table QR direct-menu fix

- Branch: feat/g1-foundation, deployed through the existing Vercel branch alias. Do not change Production or main.
- Table `/t/{token}` resolves a verified table label through Supabase, and now initializes the customer experience at the **menu**, not the shop welcome page.
- Shop `/b/{branchId}` still opens welcome; table QR retains real table ID and table ordering.
- Independent same-table order approvals and ticket references are in the commit sequence.
- QA gates: Vercel Node.js tests, TypeScript compile and READY; live phone scan and merchant review still require manual verification.
- Note: the stable alias does not avoid Vercel build usage. It keeps the customer-facing address unchanged across releases.
