import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261105222000_g14_platform_launch_preflight.sql","utf8");
const page=readFileSync("app/admin/page.tsx","utf8");
const widget=readFileSync("app/admin/platform-launch-preflight.tsx","utf8");

test("G14 launch preflight only reads aggregate platform signals for enabled administrators",()=>{
 assert.match(sql,/a\.user_id=auth\.uid\(\) and a\.enabled=true/);
 assert.match(sql,/a\.role in \('platform_owner','platform_operator'\)/);
 assert.match(sql,/set search_path=''/);
 assert.match(sql,/security definer/);
 assert.match(sql,/revoke all on function public\.g14_platform_launch_preflight\(\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g14_platform_launch_preflight\(\) to authenticated/);
 assert.doesNotMatch(sql,/\b(?:insert into|delete from|update public\.|create table|drop table)\b/i);
});
test("G14 counts all explicitly qualified stages without exposing PII or invented revenue",()=>{
 for(const relation of ["plans","subscriptions","g13_subscription_requests","g11_staff_invitations","businesses","branches"]){
  assert.match(sql,new RegExp("public\\."+relation));
 }
 assert.match(sql,/s\.status='trial' and s\.starts_at<=now\(\) and s\.ends_at>now\(\)/);
 assert.match(sql,/i\.accepted_at is null/);
 assert.match(sql,/i\.revoked_at is null/);
 assert.match(sql,/'commercial_go',false/);
 assert.match(sql,/'billing_live',false/);
 assert.doesNotMatch(sql,/u\.email|phone|payment_amount|total_revenue/i);
});
test("platform dashboard fetches live preflight after platform auth instead of trusting client-side props",()=>{
 assert.match(page,/if\(permissionError \|\| !account\)/);
 assert.match(page,/supabase\.rpc\("g14_platform_launch_preflight"\)/);
 assert.match(page,/<PlatformLaunchPreflight snapshot=\{preflightSnapshot\} error=\{Boolean\(preflightResult\.error\)\}\/>/);
 assert.match(page,/href="#launch-readiness"/);
});
test("readiness panel fails closed and separates measured data from manual commercial gates",()=>{
 assert.match(widget,/error\|\|!snapshot/);
 assert.match(widget,/الإطلاق التجاري غير معتمد/);
 assert.match(widget,/لا تشمل موافقات الأسعار والضرائب/);
 assert.match(widget,/لا تمثل إيراداً/);
 assert.match(widget,/لا يؤكد تنفيذ تقييد الوصول/);
 assert.match(widget,/شروط يجب إغلاقها قبل البيع/);
 assert.match(widget,/router\.refresh\(\)/);
 assert.doesNotMatch(widget,/checkout|chargeCard|activateSubscription|deployProduction/);
});
