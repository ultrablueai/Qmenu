import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261105190000_g12_merchant_subscription_status.sql","utf8");
const dashboard=readFileSync("app/dashboard/page.tsx","utf8");
const panel=readFileSync("app/dashboard/merchant-subscription-status.tsx","utf8");

test("G12 status is read-only, owner or manager scoped to selected business and not anonymously executable",()=>{
 assert.match(sql,/m\.business_id=p_business and m\.user_id=auth\.uid\(\) and m\.role in \('owner','manager'\)/);
 assert.match(sql,/where s\.business_id=p_business/);
 assert.match(sql,/revoke all on function public\.g12_merchant_subscription_status\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g12_merchant_subscription_status\(uuid\) to authenticated/);
 assert.match(sql,/security definer set search_path=''/);
 assert.doesNotMatch(sql,/\b(?:insert into|update public\.|delete from)\b/i);
});
test("G12 no-subscription response never implies an active or paid plan",()=>{
 assert.match(sql,/'state','not_configured','has_subscription',false/);
 assert.match(sql,/when v_current\.ends_at is not null and v_current\.ends_at<=now\(\) then 'expired'/);
 assert.match(sql,/when v_current\.starts_at>now\(\) then 'scheduled'/);
 assert.match(panel,/لا توجد باقة مسجلة لهذا النشاط/);
 assert.match(panel,/لا تخصم أي مبالغ ولا تفعّل أو تجدّد الاشتراك/);
});
test("merchant dashboard loads subscription only when role, business and data check succeed",()=>{
 assert.match(dashboard,/workspaceView==="subscription"&&primary&&canManageBranches&&!loadError/);
 assert.match(dashboard,/\.rpc\("g12_merchant_subscription_status",\{p_business:primary\.id\}\)/);
 assert.match(dashboard,/workspaceView==="subscription"&&canManageBranches&&!loadError&&primary/);
 assert.match(dashboard,/subscriptionError=Boolean\(subscriptionResult\?\.error\)/);
 assert.match(panel,/role="alert"/);
});
test("merchant subscription workspace has a clear navigation entry, not paid checkout",()=>{
 assert.match(dashboard,/subscription:"اشتراك النشاط"/);
 assert.match(dashboard,/الاشتراك والباقة/);
 assert.match(dashboard,/MerchantSubscriptionStatusPanel/);
 assert.doesNotMatch(panel,/stripe|checkout|payment_intent|processPayment|chargeCard/i);
});
