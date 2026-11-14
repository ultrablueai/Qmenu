import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const g31=readFileSync("supabase/migrations/20261110000500_g31_merchant_plan_selection.sql","utf8");
const g32=readFileSync("supabase/migrations/20261110000600_g32_trial_request_approval.sql","utf8");
const merchant=readFileSync("app/dashboard/merchant-plan-selector.tsx","utf8");
const panel=readFileSync("app/dashboard/merchant-subscription-status.tsx","utf8");
const admin=readFileSync("app/admin/subscription-service-requests.tsx","utf8");
const smoke=readFileSync("supabase/tests/beger-g32-merchant-choice-trial-rollback.sql","utf8");
test("G31 offer catalog and request are tenant-checked and payment-free",()=>{
 assert.match(g31,/m\.user_id=\(select auth\.uid\(\)\) and m\.role in \('owner','manager'\)/);
 assert.match(g31,/m\.user_id=v_actor and m\.business_id=p_business and m\.role='owner'/);
 assert.match(g31,/b\.country_code='TR'/);
 assert.match(g31,/pg_advisory_xact_lock/);
 assert.match(g31,/Pending review already exists/);
 assert.match(g31,/request.*?subscription_activated',false/s);
 assert.doesNotMatch(g31,/insert into public\.(payments|invoices|payment_events)/);
});
test("G32 only platform owner can approve 14-day free trial and cannot double activate",()=>{
 assert.match(g32,/a\.role='platform_owner'/);
 assert.match(g32,/where r\.id=p_request and r\.business_id=v_business for update/);
 assert.match(g32,/v_kind<>'trial' or v_status<>'pending'/);
 assert.match(g32,/Merchant already has subscription history/);
 assert.match(g32,/now\(\)\+interval '14 days'/);
 assert.match(g32,/billing_enabled',false/);
 assert.match(g32,/paid_entitlements_enabled',false/);
 assert.match(g32,/automatically_renews',false/);
 assert.match(g32,/merchant_trial_14d_approved/);
});
test("Merchant can select offer and period, but request never implies activation",()=>{
 assert.match(merchant,/beger_g31_merchant_offer_catalog/);
 assert.match(merchant,/beger_g31_request_plan/);
 assert.match(merchant,/pending\|\|error/);
 assert.match(merchant,/subscription_activated!==false/);
 assert.match(merchant,/countryCode!=="TR"/);
 assert.match(panel,/MerchantPlanSelector/);
});
test("Platform admin has an explicit human approval step",()=>{
 assert.match(admin,/beger_g32_approve_trial_request/);
 assert.match(admin,/request\.kind==="trial"&&request\.planCode/);
 assert.match(admin,/data\?\.billing_enabled!==false/);
 assert.match(smoke,/begin;/);
 assert.match(smoke,/rollback;/);
 assert.match(smoke,/Duplicate trial incorrectly allowed/);
});
