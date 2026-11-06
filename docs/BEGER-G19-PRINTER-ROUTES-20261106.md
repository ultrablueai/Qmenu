# Beger G19 — Branch printer destinations (manual mode)
2026-11-06 · GitHub `ultrablueai/Qmenu` / `feat/g1-foundation` · Staging ONLY

## Built
- Added `g19_branch_print_routes`: one configured named destination for each of **kitchen**, **pickup**, and **summary** per branch. A single branch cannot overwrite another branch's profiles. Raw table permissions revoked, RLS enabled.
- `g19_branch_print_routes(branch)` shows defaults until configured, and explicitly reports `mode=browser_manual`, `device_connected=false`.
- `g19_update_print_route(branch,kind,destination)` validates authenticated `owner/manager` membership for the branch's business, valid job kind and destination name length/newlines.
- Added `app/dashboard/merchant-print-routes.tsx` and integrated with `merchant-print-queue.tsx`: merchant can label which station is meant to handle each ticket, view its destination in the queued ticket and save changes without changing paper formats.
- This is **naming and routing preparation**, not actual pairing or device selection. The chosen physical printer is still selected in the browser print dialogue. G17/G18 job confirmation/retry/audit remains unchanged; printed internal summary is NOT a tax invoice.

## Validation
- Applied `20261106010000_g19_branch_print_routes.sql` to Supabase Staging only. A parser issue in the first attempt was fixed by using `pg_catalog.strpos` for newline checking; second application succeeded.
- Ran a rollback-only authenticated SQL acceptance drill with a real owner/branch pair that does NOT belong to the selected foreign business: own settings read and update worked, foreign read/write denied (42501), invalid job kind and oversized name denied (22023), and the profile reported manual mode/disconnected status. The initial test fixture accidentally selected an owner with multiple business memberships; that valid access was correctly reclassified, and a truly foreign pair passed.
- Added source regression tests `tests/beger-g19-print-destinations.test.mjs`. Exact-HEAD CI and alias verification are required before this increment can be called deployed.

## Remaining for physical auto-print G19+
- Locally install and pair a trusted printing agent in each store, then authenticate the agent independently of ordinary owner browser sessions. Never embed a service_role key or long-term printer secret in public client code.
- Add **exclusive expiring leases** for job claim, signed/verified agent acknowledgements and retries, stale-lease recovery, device online heartbeat, and explicit tenant/branch/kind binding. Printing success cannot be inferred from claim or a queued job.
- Implement hardware drivers/printer profiles and fiscal integration separately; test 58 mm, 80 mm, USB/Ethernet, paper-out, offline behavior and order floods.
- Keep manual browser printing available as a fallback and do not double-print when hardware bridge eventually connects.

Commercial launch **NO-GO** until signed-JWT, multi-device, payment/fiscal/legal and backup/restore acceptance. No Production or unrelated merchant modified.
