import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261115161000_g38_station_order_event_ledger.sql","utf8");

for(const fn of ["g9_kitchen_advance","g10_cashier_order_action"]){
 test(fn+" records the canonical order event atomically with the status transition",()=>{
  const start=sql.indexOf("create or replace function public."+fn+"(");
  assert.ok(start>=0,"function must be replaced");
  const end=sql.indexOf("end $$;",start);
  assert.ok(end>start,"complete PL/pgSQL function required");
  const body=sql.slice(start,end);
  assert.match(body,/select \* into v_order from public\.g3_orders where id=p_order for update/);
  assert.match(body,/update public\.g3_orders set status=p_next,updated_at=now\(\)/);
  assert.match(body,/insert into public\.g3_order_events\(order_id,old_status,new_status,actor_id\)/);
  assert.match(body,/values\(v_order\.id,v_order\.status,p_next,auth\.uid\(\)\)/);
  assert.ok(body.indexOf("insert into public.g3_order_events")>body.indexOf("update public.g3_orders"));
 });
}
test("station-specific permissions and kitchen audit remain intact",()=>{
 assert.match(sql,/public\.g9_kitchen_allowed\(v_order\.branch_id\)/);
 assert.match(sql,/public\.g10_cashier_allowed\(v_order\.branch_id\)/);
 assert.match(sql,/insert into public\.g9_kitchen_events/);
 assert.doesNotMatch(sql,/grant execute|grant all|disable row level security/i);
});
