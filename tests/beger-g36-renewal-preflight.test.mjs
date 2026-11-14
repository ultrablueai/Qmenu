import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261111000200_g36_renewal_preflight.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g36-renewal-preflight-rollback.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-renewal-preflight.tsx","utf8");
const page=readFileSync("app/dashboard/page.tsx","utf8");
const panel=readFileSync("app/dashboard/merchant-subscription-status.tsx","utf8");
test("G36 checks tenant and explicitly disables billing and entitlement writes",()=>{
 assert.match(sql,/m\.business_id=p_business and m\.user_id=v_actor and m\.role in \('owner','manager'\)/);
 assert.match(sql,/b\.id=p_business and b\.country_code='TR'/);
 assert.match(sql,/revoke all on function public\.beger_g36_renewal_preflight\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/'billing_enabled',false/);
 assert.match(sql,/'auto_renewal_enabled',false/);
 assert.match(sql,/'settlement_verified',false/);
 assert.match(sql,/'price_published',false/);
 assert.match(sql,/'entitlements_changed',false/);
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(?:into\s+|from\s+)?public\.(?:subscriptions|orders|invoices|payments)/i);
});
test("G36 does not treat trial or grace as a settled payment",()=>{
 assert.match(sql,/when now\(\)<v_trial_end then 'trial' else 'expired'/);
 assert.match(sql,/v_status='past_due' or \(v_end is not null and now\(\)>=v_end\)/);
 assert.match(sql,/v_effective:='unverified_paid'/);
 assert.match(sql,/v_end\+interval '7 days'/);
 assert.match(sql,/'request_renewal_review'/);
});
test("Renewal UI stays informational with merchant-scoped server loading",()=>{
 assert.match(ui,/renewal_preflight_only/);
 assert.match(ui,/السعر المقترح/);
 assert.match(ui,/لا يحدث تلقائياً/);
 assert.match(ui,/price_published===false/);
 assert.match(page,/beger_g36_renewal_preflight/);
 assert.match(panel,/MerchantRenewalPreflight/);
});
test("Repeatable SQL smoke uses rollback and denies cross tenant reads",()=>{
 assert.match(smoke,/^begin;/m);
 assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/sqlstate '42501'/);
 assert.match(smoke,/state'<>'grace'/);
});
