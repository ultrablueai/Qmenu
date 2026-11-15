import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261115000100_g48_salon_atomic_booking_pilot.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g48-salon-booking-rollback.sql","utf8");
const ui=readFileSync("app/salon/workspace/salon-pilot-booking.tsx","utf8");
const page=readFileSync("app/salon/workspace/page.tsx","utf8");
test("G48 booking scoped to authenticated salon owner/manager/assigned worker",()=>{
 assert.match(sql,/select auth\.uid\(\)/);
 assert.match(sql,/m\.business_id=p_business and m\.user_id=v_actor/);
 assert.match(sql,/v_role='staff' and v_staff\.user_id is distinct from v_actor/);
 assert.match(sql,/revoke all on function public\.beger_g48_create_salon_booking/);
 assert.match(sql,/grant execute on function public\.beger_g48_create_salon_booking.* to authenticated/);
 assert.match(sql,/'public_booking_enabled',false/);
 assert.doesNotMatch(sql,/grant execute on function public\.beger_g48_create_salon_booking.* to anon/);
});
test("G48 server serializes appointment conflicts and protects shift, breaks and multi-services",()=>{
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/sl\.starts_at<v_finish and sl\.ends_at>v_cursor/);
 assert.match(sql,/sl\.staff_id=p_staff or sl\.chair_id=p_chair/);
 assert.match(sql,/not in \('cancelled','no_show'\)/);
 assert.match(sql,/v_service\.duration_minutes\+v_service\.buffer_minutes\+v_gap/);
 assert.match(sql,/v_local_finish::time>v_close/);
 assert.match(sql,/v_break_start is not null/);
 assert.match(sql,/pg_catalog\.cardinality\(p_services\)>8/);
 assert.match(sql,/insert into public\.salon_booking_events/);
 assert.match(sql,/v_total:=v_total\+v_service\.price_minor/);
});
test("G48 rollback smoke includes occupancy, break, scope and invoice checks",()=>{
 assert.match(smoke,/^begin;/m);assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/booking_id=booking/);
 assert.match(smoke,/exception when sqlstate '23P01'/);
 assert.match(smoke,/exception when sqlstate '42501'/);
 assert.match(smoke,/exception when sqlstate '22023'/);
 assert.match(smoke,/multibasket_count/);
});
test("G48 authenticated UI loads gated setup and submits booking to RPC",()=>{
 assert.match(page,/beger_g48_salon_booking_setup/);
 assert.match(page,/SalonPilotBooking/);
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(ui,/beger_g48_create_salon_booking/);
 assert.match(ui,/browserSupabase\(\)\.rpc/);
 assert.match(ui,/data\?\.public_booking_enabled!==false/);
 assert.match(ui,/serviceIds|p_services:services/);
 assert.match(ui,/router\.refresh\(\)/);
 assert.match(ui,/اسم وهمي فقط/);
});
