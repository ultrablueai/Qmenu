import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261111000100_g35_trial_plan_change.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g35-trial-plan-switch-rollback.sql","utf8");
const admin=readFileSync("app/admin/subscription-service-requests.tsx","utf8");
test("G35 approves only owner-verified pending trial plan reviews",()=>{
 assert.match(sql,/a\.role='platform_owner'/);
 assert.match(sql,/v_kind<>'plan_review' or v_status<>'pending'/);
 assert.match(sql,/v_period not in \('monthly','yearly'\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/where s\.business_id=v_business and s\.status='trial'/);
 assert.match(sql,/v_end<=now\(\)/);
 assert.match(sql,/v_end>v_start\+interval '14 days'/);
 assert.match(sql,/Another subscription supersedes this trial/);
 assert.match(sql,/Trial already uses selected plan/);
 assert.match(sql,/revoke all on function public\.beger_g35_approve_trial_plan_change\(uuid\) from public,anon,authenticated/);
});
test("G35 never extends, charges or erases current merchant subscription",()=>{
 assert.match(sql,/update public\.subscriptions set plan_id=v_new_plan where id=v_sub_id and status='trial'/);
 assert.match(sql,/'trial_end_unchanged',true/);
 assert.match(sql,/'billing_enabled',false/);
 assert.match(sql,/'paid_subscription_modified',false/);
 assert.doesNotMatch(sql,/update public\.subscriptions set (status|ends_at|starts_at)/);
 assert.doesNotMatch(sql,/delete from public\./i);
 assert.doesNotMatch(sql,/insert into public\.(invoices|payments|payment_events)/);
});
test("G35 approval UI is explicitly separated from generic acknowledgment",()=>{
 assert.match(admin,/beger_g35_approve_trial_plan_change/);
 assert.match(admin,/request\.kind==="plan_review"&&request\.planCode&&request\.period/);
 assert.match(admin,/trial_extended!==false/);
 assert.match(admin,/paid_subscription_modified!==false/);
});
test("G35 database smoke uses rollback and asserts no double approval",()=>{
 assert.match(smoke,/^begin;/m);
 assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/sqlstate '42501'/);
 assert.match(smoke,/sqlstate '22023'/);
 assert.match(smoke,/s\.ends_at=f\.original_end/);
});
