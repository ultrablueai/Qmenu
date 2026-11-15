import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const migration=readFileSync("supabase/migrations/20261110000900_g34_free_trial_cancellation.sql","utf8");
const status=readFileSync("supabase/migrations/20261110001000_g34_cancelled_status_priority.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g34-free-trial-cancellation-rollback.sql","utf8");
const admin=readFileSync("app/admin/subscription-service-requests.tsx","utf8");
test("G34 only permits platform owner to cancel a pending free trial request",()=>{
 assert.match(migration,/a\.role='platform_owner'/);
 assert.match(migration,/v_kind<>'cancellation' or v_request_status<>'pending'/);
 assert.match(migration,/v_sub_status<>'trial'/);
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/for update/);
 assert.match(migration,/where id=v_subscription and status='trial'/);
 assert.match(migration,/revoke all on function public\.beger_g34_approve_trial_cancellation\(uuid\) from public,anon,authenticated/);
 assert.doesNotMatch(migration,/delete from public\.(businesses|branches|orders|products|subscriptions)/i);
 assert.doesNotMatch(migration,/insert into public\.(payments|payment_events|invoices)/i);
});
test("Cancellation records audit, no billing, and merchant cancelled state",()=>{
 assert.match(migration,/merchant_trial_cancelled/);
 assert.match(migration,/'data_retained',true/);
 assert.match(migration,/'billing_enabled',false/);
 assert.match(status,/when v_current\.status='cancelled' then 'cancelled'/);
 assert.match(admin,/beger_g34_approve_trial_cancellation/);
 assert.match(admin,/request\.kind==="cancellation"/);
 assert.match(admin,/data\?\.billing_enabled!==false/);
});
test("G34 smoke covers both actors and rollback-only tenant fixture",()=>{
 assert.match(smoke,/^begin;/m);
 assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/g13_subscription_request/);
 assert.match(smoke,/sqlstate '42501'/);
 assert.match(smoke,/sqlstate '22023'/);
 assert.match(smoke,/g12_merchant_subscription_status/);
 assert.match(smoke,/beger_g33_merchant_entitlements_preview/);
});
