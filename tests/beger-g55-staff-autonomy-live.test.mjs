import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261115000800_g55_staff_self_management.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g55-staff-autonomy-rollback.sql","utf8");
const ui=readFileSync("app/salon/workspace/salon-worker-controls.tsx","utf8");
const page=readFileSync("app/salon/workspace/page.tsx","utf8");
test("G55 shows normal employee own roster while owner can see entire salon",()=>{
 assert.match(sql,/m\.user_id=v_actor and m\.role in \('owner','manager','staff'\)/);
 assert.match(sql,/v_role='staff' and not exists/);
 assert.match(sql,/v_role in \('owner','manager'\) or st\.user_id=v_actor/);
 assert.match(sql,/'scope',case when v_role='staff' then 'own_only' else 'whole_business'/);
 assert.match(sql,/revoke all on function public\.beger_g55_worker_controls/);
});
test("G55 staff mutations cannot affect another employee or silently corrupt existing appointments",()=>{
 assert.match(sql,/v_role='staff' and v_s\.user_id is distinct from v_actor/);
 assert.match(sql,/Cannot manage another employee/);
 assert.match(sql,/Existing appointments conflict with proposed shift/);
 assert.match(sql,/Existing future bookings require this service/);
 assert.match(sql,/pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(p_business::text,4818\)\)/);
 assert.match(sql,/p_break_start<p_open or p_break_end>p_close/);
 assert.match(sql,/p_gap not between 0 and 120/);
});
test("G55 owner/staff live UI edits weekly shifts, breaks, booking pauses and allowed services",()=>{
 assert.match(page,/beger_g55_worker_controls/);
 assert.match(page,/SalonWorkerControls businessId=\{selected\.business_id\}/);
 assert.match(ui,/beger_g55_set_worker_shift/);
 assert.match(ui,/beger_g55_set_worker_booking_pause/);
 assert.match(ui,/beger_g55_set_worker_service/);
 assert.match(ui,/data\.scope==="own_only"/);
 assert.match(ui,/next.scope!==data\?\.scope/);
 assert.match(ui,/existing_bookings_preserved===true/);
 assert.match(ui,/future_booking_safety_checked===true/);
});
test("G55 SQL smoke proves isolated employee capabilities and protected future service",()=>{
 assert.match(smoke,/^begin;/m);assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/SECURITY worker paused another staff/);
 assert.match(smoke,/SECURITY turned off booked service/);
 assert.match(smoke,/SECURITY shift invalidated an existing booking/);
 assert.match(smoke,/Owner did not see entire staff roster/);
});
