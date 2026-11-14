import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const g33=readFileSync("supabase/migrations/20261110000700_g33_entitlements_shadow_preview.sql","utf8");
const g33fix=readFileSync("supabase/migrations/20261110000800_g33_fix_trial_boundary_expressions.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-entitlement-preview.tsx","utf8");
const screen=readFileSync("app/dashboard/merchant-subscription-status.tsx","utf8");
const page=readFileSync("app/dashboard/page.tsx","utf8");
test("G33 only owner or manager can read current tenant's shadow capabilities",()=>{
 assert.match(g33,/m\.user_id=v_actor and m\.business_id=p_business and m\.role in \('owner','manager'\)/);
 assert.match(g33,/b\.id=p_business and b\.country_code='TR'/);
 assert.match(g33,/revoke all on function public\.beger_g33_merchant_entitlements_preview\(uuid\) from public,anon,authenticated/);
 assert.match(g33,/grant execute on function public\.beger_g33_merchant_entitlements_preview\(uuid\) to authenticated/);
 assert.match(g33,/security definer set search_path=''/);
});
test("G33 trial cap and feature sets are preview-only and paid access cannot be inferred",()=>{
 assert.match(g33fix,/v_trial_end:=least\(/);
 assert.doesNotMatch(g33fix,/pg_catalog\.least\(/);
 assert.match(g33,/v_trial_eligible := now\(\)>=v_start and now\(\)<v_trial_end/);
 assert.match(g33,/'enforcement_enabled',false/);
 assert.match(g33,/'paid_entitlements_verified',false/);
 assert.match(g33,/'billing_enabled',false/);
 assert.match(g33,/v_effective:='unverified_paid'/);
 assert.match(g33,/'data_retained',true/);
 assert.doesNotMatch(g33,/(update|delete)\s+public\.(orders|products|branches|subscriptions)/i);
});
test("G33 always separates Start menu from Pro operational tools and Business reports",()=>{
 assert.match(g33,/'table_orders',v_trial_eligible and v_plan in \('pro','business'\)/);
 assert.match(g33,/'pager',v_trial_eligible and v_plan in \('pro','business'\)/);
 assert.match(g33,/'advanced_reporting',v_trial_eligible and v_plan='business'/);
 assert.match(g33,/v_plan='business' then 2 else 1/);
});
test("Merchant can view shadow preview but cannot enable paid features from the UI",()=>{
 assert.match(page,/beger_g33_merchant_entitlements_preview/);
 assert.match(screen,/MerchantEntitlementPreview/);
 assert.match(ui,/معاينة G33/);
 assert.match(ui,/لن يوقف أي ميزة أو طلب/);
 assert.doesNotMatch(ui,/(payNow|enableFeature|activateSubscription)\(/);
});
