import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("supabase/migrations/202611010007_platform_owner_merchant_trial.sql","utf8");
const admin=readFileSync("app/admin/page.tsx","utf8");
const ui=readFileSync("app/admin/trial-manager.tsx","utf8");

test("trial creation is owner-only and rejects another trial or existing subscription",()=>{
 assert.match(migration,/create function public\.platform_owner_start_trial/);
 assert.match(migration,/pa\.role='platform_owner'/);
 assert.match(migration,/if exists \(select 1 from public\.subscriptions s where s\.business_id=p_business\)/);
 assert.match(migration,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(migration,/revoke all on function public\.platform_owner_start_trial\(uuid,uuid,integer\) from public,anon,authenticated/);
 assert.match(migration,/grant execute on function public\.platform_owner_start_trial\(uuid,uuid,integer\) to authenticated/);
});
test("trial is bounded and does not claim payment or renew automatically",()=>{
 assert.match(migration,/p_days not in \(7,14,30\)/);
 assert.match(migration,/where id=p_plan and active=true/);
 assert.match(migration,/values\(p_business,p_plan,'trial',now\(\),now\(\)\+pg_catalog\.make_interval/);
 assert.doesNotMatch(migration,/payment_intent|charge_customer|auto_renew|status='active'/);
 assert.match(migration,/merchant_trial_started/);
});
test("effective expiry does not trust stale trial status",()=>{
 assert.match(migration,/s\.ends_at<=now\(\)/);
 assert.match(migration,/then 'expired' else s\.status end/);
 assert.match(migration,/platform_admin_trial_overview/);
 assert.match(migration,/platform_admin_business_directory/);
});
test("owner panel uses real trial RPCs and fail closed loading",()=>{
 assert.match(admin,/\.rpc\("platform_admin_trial_overview"\)/);
 assert.match(admin,/directoryResult\.error \|\| trialsResult\.error/);
 assert.match(admin,/<TrialManager businesses=\{directory\} plans=\{plans\} trials=\{trials\} canManage=\{owner\}/);
 assert.match(ui,/\.rpc\("platform_owner_start_trial"/);
 assert.match(ui,/router\.refresh\(\)/);
 assert.match(ui,/لا توجد مدفوعات أو تجديد تلقائي/);
 assert.doesNotMatch(ui,/service_role|SECRET_KEY|delete\(\)|stripe|iyzico/);
});
