import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104231500_g10_branch_cashier.sql","utf8");
const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
const route=readFileSync("app/staff/cashier/page.tsx","utf8");
const access=readFileSync("app/dashboard/merchant-cashier-access.tsx","utf8");
const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
test("cashier assignment is owner-only, branch-restricted and revocable",()=>{
 assert.match(sql,/alter table public.g10_cashier_staff_branches enable row level security/);
 assert.match(sql,/revoke all on public.g10_cashier_staff_branches from public,anon,authenticated/);
 assert.match(sql,/m.user_id=auth.uid\(\) and m.role='owner'/);
 assert.match(sql,/m.role='staff' and exists/);
 assert.match(sql,/c.branch_id=b.id and c.business_id=b.business_id and c.user_id=auth.uid\(\)/);
 assert.match(sql,/v_role is not null and v_role<>'staff'/);
 assert.match(access,/g10_cashier_assign/);
 assert.match(access,/g10_cashier_roster/);
 assert.match(staff,/MerchantCashierAccess key=/);
});
test("cashier sees operational orders only, no guest link or private merchant secrets",()=>{
 const q=sql.slice(sql.indexOf('create or replace function public.g10_cashier_queue'),sql.indexOf('-- Cashier can only accept'));
 assert.match(q,/public.g10_cashier_allowed\(p_branch\)/);
 assert.match(q,/branch_id=p_branch and business_id=v_business/);
 assert.match(q,/created_at>=now\(\)-interval '24 hours'/);
 for(const privateField of ["public_token","email","phone","secret_token","auth.users"])assert.doesNotMatch(q,new RegExp(privateField));
 assert.match(route,/g10_my_cashier_branches/);
 assert.match(route,/db.auth.getUser\(\)/);
 assert.match(cashier,/g10_cashier_queue/);
});
test("cashier status transitions and manual payment recording are constrained server-side",()=>{
 const actions=sql.slice(sql.indexOf('-- Cashier can only accept'));
 assert.match(actions,/v_order.status='pending' and p_next='accepted'/);
 assert.match(actions,/v_order.status='ready' and p_next='fulfilled'/);
 assert.match(actions,/for update/);
 assert.match(actions,/g10_cashier_allowed\(v_order.branch_id\)/);
 assert.match(actions,/p_method not in \('cash','external_card','external_transfer'\)/);
 assert.match(actions,/insert into public.g3_payment_events/);
 assert.match(actions,/payment_status='paid'/);
 assert.doesNotMatch(actions,/g8_collection_close|delete from public.g3_orders/);
 assert.match(cashier,/g10_cashier_order_action/);
 assert.match(cashier,/g10_cashier_mark_collected/);
 assert.match(cashier,/window\.confirm/);
});
test("cashier management can be invoked only by signed-in roles, not anonymous visitors",()=>{
 assert.match(sql,/grant execute on function public.g10_cashier_queue\(uuid\) to authenticated/);
 assert.match(sql,/grant execute on function public.g10_cashier_order_action\(uuid,text\) to authenticated/);
 assert.match(sql,/grant execute on function public.g10_cashier_mark_collected\(uuid,text\) to authenticated/);
 assert.match(sql,/revoke all on function public.g10_cashier_assign\(uuid,text,boolean\) from public,anon,authenticated/);
});
