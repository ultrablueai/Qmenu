import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261115000200_g49_owner_pilot_setup.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g49-owner-pilot-setup-rollback.sql","utf8");
const ui=readFileSync("app/salon/workspace/salon-pilot-setup.tsx","utf8");
const page=readFileSync("app/salon/workspace/page.tsx","utf8");
test("G49 requires signed in salon owner and registered staff membership",()=>{
 assert.match(sql,/v_actor uuid:=\(select auth\.uid\(\)\)/);
 assert.match(sql,/m\.business_id=p_business\s+and m\.user_id=v_actor and m\.role='owner'/);
 assert.match(sql,/m\.user_id=p_worker_user and m\.role in \('owner','manager','staff'\)/);
 assert.match(sql,/b\.country_code='TR'/);
 assert.match(sql,/revoke all on function public\.beger_g49_setup_salon_pilot/);
 assert.match(sql,/to authenticated;/);
 assert.doesNotMatch(sql,/grant execute.* to anon/);
});
test("G49 creates scoped staff, chair, service and seven staff working days",()=>{
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/insert into public\.branches/);
 assert.match(sql,/insert into public\.salon_staff\(/);
 assert.match(sql,/insert into public\.salon_chairs/);
 assert.match(sql,/insert into public\.salon_services/);
 assert.match(sql,/insert into public\.salon_staff_services/);
 assert.match(sql,/for v_day in 0\.\.6 loop/);
 assert.match(sql,/gap_minutes,break_start,break_end/);
 assert.match(sql,/'public_booking_enabled',false/);
 assert.match(sql,/'notifications_enabled',false/);
});
test("G49 staging rollback verifies denial and the G48 catalog can view the new profile",()=>{
 assert.match(smoke,/^begin;/m);assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/SECURITY staff setup unexpectedly allowed/);
 assert.match(smoke,/SECURITY non-member worker accepted/);
 assert.match(smoke,/beger_g48_salon_booking_setup/);
 assert.match(smoke,/shift_count/);
});
test("G49 visible only to actual owner and integrated into protected workspace",()=>{
 assert.match(page,/data\.role==="owner"\?<SalonPilotSetup/);
 assert.match(page,/currentUserId=\{user\.id\}/);
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(ui,/beger_g49_setup_salon_pilot/);
 assert.match(ui,/data\?\.public_booking_enabled!==false/);
 assert.match(ui,/router\.refresh\(\)/);
 assert.match(ui,/بدون تفعيل QR للحجوزات العامة/);
});
