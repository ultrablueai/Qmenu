import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static regression contracts for the *existing* G9/G10 SQL. They complement,
// but never replace, live authenticated cross-tenant and device E2E testing.
const kitchen = readFileSync("supabase/migrations/20261104194500_g9_kitchen_staff_workstation.sql", "utf8");
const cashier = readFileSync("supabase/migrations/20261104231500_g10_branch_cashier.sql", "utf8");

function rpc(sql, name) {
  const body = sql.split("create or replace function public." + name)[1]?.split("end $$;")[0];
  assert.ok(body, "missing RPC: " + name);
  return body;
}

test("G9 and G10 deny anonymous EXECUTE and retain grant isolation", () => {
  for (const [sql, names] of [
    [kitchen, ["g9_kitchen_allowed", "g9_kitchen_assign", "g9_kitchen_roster", "g9_my_kitchen_branches", "g9_kitchen_queue", "g9_kitchen_advance"]],
    [cashier, ["g10_cashier_allowed", "g10_cashier_assign", "g10_cashier_roster", "g10_my_cashier_branches", "g10_cashier_queue", "g10_cashier_order_action", "g10_cashier_mark_collected"]],
  ]) {
    for (const name of names) {
      assert.match(sql, new RegExp("revoke all on function public\\." + name + "\\([^;]*?from public,anon,authenticated;"));
    }
  }
  assert.doesNotMatch(kitchen, /grant execute on function public\.g9_kitchen_allowed/);
  assert.doesNotMatch(cashier, /grant execute on function public\.g10_cashier_allowed/);
});

test("kitchen reads only scoped operational items, never payments or customer secrets", () => {
  const query = rpc(kitchen, "g9_kitchen_queue");
  assert.match(query, /g9_kitchen_allowed\(p_branch\)/);
  assert.match(query, /branch_id=p_branch and business_id=v_business/);
  assert.doesNotMatch(query, /payment_method|payment_status|total_minor|paid_at|public_token|secret_token/);
});

test("kitchen transitions are locked and limited to accepted/preparing -> preparing/ready", () => {
  const action = rpc(kitchen, "g9_kitchen_advance");
  assert.match(action, /where id=p_order for update/);
  assert.match(action, /g9_kitchen_allowed\(v_order.branch_id\)/);
  assert.match(action, /v_order.status='accepted' and p_next='preparing'/);
  assert.match(action, /v_order.status='preparing' and p_next='ready'/);
  assert.doesNotMatch(action, /payment_status='paid'|insert into public\.g3_payment_events/);
});

test("cashier queue is tenant/branch restricted and excludes guest secrets", () => {
  const query = rpc(cashier, "g10_cashier_queue");
  assert.match(query, /g10_cashier_allowed\(p_branch\)/);
  assert.match(query, /branch_id=p_branch and business_id=v_business/);
  assert.doesNotMatch(query, /public_token|secret_token|auth\.users/);
});

test("cashier cannot prepare or reject and payment events are idempotent", () => {
  const action = rpc(cashier, "g10_cashier_order_action");
  const collection = rpc(cashier, "g10_cashier_mark_collected");
  assert.match(action, /where id=p_order for update/);
  assert.match(action, /g10_cashier_allowed\(v_order.branch_id\)/);
  assert.match(action, /v_order.status='pending' and p_next='accepted'/);
  assert.match(action, /v_order.status='ready' and p_next='fulfilled'/);
  assert.doesNotMatch(action, /p_next='preparing'|p_next='rejected'/);
  assert.match(collection, /where id=p_order for update/);
  assert.match(collection, /g10_cashier_allowed\(v_order.branch_id\)/);
  assert.match(collection, /if v_order.payment_status='paid' then/);
  assert.match(collection, /Already collected using another method/);
  assert.match(collection, /insert into public\.g3_payment_events/);
});
