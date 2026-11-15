import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261115161000_g38_station_order_event_ledger.sql","utf8");

function bodyOf(name){
 const start=sql.indexOf("create or replace function public."+name+"(");
 assert.ok(start>=0,name+" must be replaced");
 const end=sql.indexOf("end $$;",start);
 assert.ok(end>start,name+" must contain a complete PL/pgSQL body");
 return sql.slice(start,end);
}

for(const fn of ["g9_kitchen_advance","g10_cashier_order_action"]){
 test(fn+" records the canonical order event atomically with the status transition",()=>{
  const body=bodyOf(fn);
  assert.match(body,/returns jsonb language plpgsql security definer set search_path = ''/i);
  assert.match(body,/select \* into v_order from public\.g3_orders where id=p_order for update/i);
  assert.match(body,/update public\.g3_orders set status=p_next,updated_at=now\(\)/i);
  assert.match(body,/insert into public\.g3_order_events\(order_id,old_status,new_status,actor_id\)/i);
  assert.match(body,/values\(v_order\.id,v_order\.status,p_next,auth\.uid\(\)\)/i);
  assert.ok(body.indexOf("insert into public.g3_order_events")>body.indexOf("update public.g3_orders"));
  assert.ok(body.includes(fn==="g9_kitchen_advance"?"public.g9_kitchen_allowed(v_order.branch_id)":"public.g10_cashier_allowed(v_order.branch_id)"));
 });
}

test("kitchen transition requires an authenticated actor and only permits forward station states",()=>{
 const body=bodyOf("g9_kitchen_advance");
 assert.match(body,/if auth\.uid\(\) is null then raise exception/i);
 assert.match(body,/v_order\.status='accepted' and p_next='preparing'/);
 assert.match(body,/v_order\.status='preparing' and p_next='ready'/);
 assert.match(body,/insert into public\.g9_kitchen_events\(business_id,branch_id,order_id,actor_id,from_status,to_status\)/);
});

test("cashier actions remain scoped by the server-side cashier authorization helper",()=>{
 const body=bodyOf("g10_cashier_order_action");
 assert.match(body,/public\.g10_cashier_allowed\(v_order\.branch_id\)/);
 assert.match(body,/v_order\.status='pending' and p_next='accepted'/);
 assert.match(body,/v_order\.status='ready' and p_next='fulfilled'/);
});

test("migration preserves existing RLS and function grants",()=>{
 assert.doesNotMatch(sql,/grant execute|grant all|disable row level security|drop policy/i);
});
