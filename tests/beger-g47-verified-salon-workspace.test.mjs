import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261114000200_g47_salon_staff_workspace_approval.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g47-salon-role-approval-rollback.sql","utf8");
const page=readFileSync("app/salon/workspace/page.tsx","utf8");
const panel=readFileSync("app/salon/workspace/salon-verified-workspace.tsx","utf8");
const middleware=readFileSync("middleware.ts","utf8");
test("G47 verifies business membership and active staff identity on server before reading",()=>{
 assert.match(sql,/v_actor uuid := \(select auth\.uid\(\)\)/);
 assert.match(sql,/m\.business_id=p_business and m\.user_id=v_actor/);
 assert.match(sql,/s\.business_id=p_business and s\.user_id=v_actor and s\.active/);
 assert.match(sql,/v_role='staff' and pg_catalog\.cardinality\(v_staff_ids\)=0/);
 assert.match(sql,/sl\.staff_id=any\(v_staff_ids\)/);
 assert.match(sql,/case when v_role in \('owner','manager'\) then e\.total_minor else null end/);
 assert.match(sql,/revoke all on function public\.beger_g47_salon_workspace\(uuid\) from public,anon,authenticated/);
});
test("G47 approves only pending bookings and blocks unauthorized cross-worker cases",()=>{
 assert.match(sql,/b\.id=p_booking and b\.business_id=p_business for update/);
 assert.match(sql,/v_booking\.status<>'pending'/);
 assert.match(sql,/if v_items=0 then/);
 assert.match(sql,/v_role='staff' and v_other_items>0/);
 assert.match(sql,/where id=p_booking and business_id=p_business and status='pending'/);
 assert.match(sql,/insert into public\.salon_booking_events/);
 assert.match(sql,/'notifications_queued',false/);
 assert.doesNotMatch(sql,/grant (?:select|update|insert|delete) on public\.salon_/i);
});
test("G47 rollback acceptance tests staff scope, cross tenant, mixed booking, duplicate approval",()=>{
 assert.match(smoke,/^begin;/m);assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/Other customer/);
 assert.match(smoke,/foreign_business_id/);
 assert.match(smoke,/booking_other/);
 assert.match(smoke,/booking_mixed/);
 assert.match(smoke,/sqlstate '42501'/);
 assert.match(smoke,/sqlstate '22023'/);
 assert.match(smoke,/approval_events/);
});
test("G47 real workspace requires authenticated user and server-confirmed membership",()=>{
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(page,/redirect\("\/login"\)/);
 assert.match(page,/\.eq\("user_id",user\.id\)/);
 assert.match(page,/beger_g47_salon_workspace/);
 assert.match(page,/memberships\?\.find\(m=>m\.business_id===params\.business\)/);
 assert.match(middleware,/\/salon\/workspace\/:path\*/);
 assert.match(panel,/beger_g47_approve_salon_booking/);
 assert.match(panel,/data\?\.status!=="confirmed"/);
 assert.match(panel,/initial\.business_id===businessId/);
 assert.match(panel,/initial\.scope==="whole_business"/);
});
