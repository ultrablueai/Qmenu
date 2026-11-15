import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("core order, kitchen, pager and staff FK indexes are idempotent and do not change permissions or data",()=>{
 const sql=readFileSync("supabase/migrations/20261105225500_core_fk_index_hardening.sql","utf8");
 const expected=[
  "g3_order_events(order_id)","g3_order_items(order_id)","g3_order_items(product_id)",
  "g3_orders(business_id)","g6_pager_tickets(business_id)",
  "g9_kitchen_events(actor_id)","g9_kitchen_events(branch_id)","g9_kitchen_events(business_id)",
  "g11_staff_invitations(business_id)","g11_staff_invitations(accepted_by)",
  "g11_staff_invitations(invited_by)","g10_cashier_staff_branches(business_id)",
  "g9_kitchen_staff_branches(business_id)","g7_staff_branch_access(user_id)"
 ];
 for(const value of expected)assert.ok(sql.includes("on public."+value),"Missing indexed FK: "+value);
 assert.equal((sql.match(/create index if not exists/g)||[]).length,expected.length);
 assert.doesNotMatch(sql,/\b(drop|truncate|delete|update|insert|grant|revoke|alter table)\b/i);
});
