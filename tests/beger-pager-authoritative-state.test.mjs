import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// The SQL RPC is the authority. Do not implement a parallel JS status engine.
const pager = readFileSync("supabase/migrations/20261104150000_g6_independent_pager.sql", "utf8");
const audit = readFileSync("supabase/migrations/20261104210000_g7_pager_audit_trail.sql", "utf8");
const transition = pager.split("create or replace function public.g6_pager_transition")[1]?.split("end $$;")[0];
if (!transition) throw Error("Authoritative Pager transition RPC missing");

test("Pager G6 lifecycle preserves only approved transitions", () => {
  assert.match(transition, /v_row.status='waiting' and p_next in \('preparing','ready','cancelled'\)/);
  assert.match(transition, /v_row.status='preparing' and p_next in \('ready','cancelled'\)/);
  assert.match(transition, /v_row.status='ready' and p_next='fulfilled'/);
  assert.doesNotMatch(transition, /v_row.status='ready' and p_next in \([^)]*cancelled/);
  assert.doesNotMatch(transition, /v_row\.version|expected_version/);
  assert.match(transition, /Invalid pager state transition/);
});
test("Pager G6 transitions require authorization and row locking", () => {
  assert.match(transition, /where id=p_ticket for update/);
  assert.match(transition, /not public\.g6_pager_branch_authorized\(v_row.branch_id\)/);
  assert.match(transition, /where id=p_ticket/);
});
test("G7 audit records only actual changed ticket states", () => {
  assert.match(audit, /after insert or update of status on public\.g6_pager_tickets/);
  assert.match(audit, /new\.status is distinct from old\.status/);
  assert.match(audit, /'status_changed',old\.status,new\.status/);
  assert.match(audit, /revoke all on public\.g7_pager_audit_events from public,anon,authenticated/);
});
