import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261115000600_g54_salon_manual_accounting.sql","utf8");
const fix=readFileSync("supabase/migrations/20261115000700_g54_finance_empty_staff_fix.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g54-manual-salon-finance-rollback.sql","utf8");
const page=readFileSync("app/salon/workspace/page.tsx","utf8");
const finance=readFileSync("app/salon/workspace/salon-finance-dashboard.tsx","utf8");
const panel=readFileSync("app/salon/workspace/salon-verified-workspace.tsx","utf8");
test("G54 only salon owner writes contracts, employees cannot rewrite their own commission",()=>{
 assert.match(sql,/m\.role='owner'/);
 assert.match(sql,/m\.user_id=v_actor/);
 assert.match(sql,/p_model not in \('owner','commission','chair_rent','salary_plus_commission'\)/);
 assert.match(sql,/p_commission_bps not between 0 and 10000/);
 assert.match(sql,/effective_from/);
 assert.match(sql,/revoke all on function public\.beger_g54_set_staff_agreement/);
});
test("G54 manual receipt requires completed, unpaid, fully contracted booking and role authority",()=>{
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/v_b\.status<>'completed'/);
 assert.match(sql,/v_b\.collected_minor<>0/);
 assert.match(sql,/v_unconfigured>0/);
 assert.match(sql,/collected_minor=v_b\.total_minor/);
 assert.match(sql,/insert into public\.salon_booking_events/);
 assert.match(sql,/'payment_provider_charged',false/);
 assert.match(sql,/'payout_executed',false/);
});
test("G54 finance only sees own work for staff and never claims external payouts",()=>{
 assert.match(sql,/v_role='staff' and not exists/);
 assert.match(sql,/st\.user_id=v_actor and st\.active/);
 assert.match(sql,/'scope',case when v_role='staff' then 'own_only' else 'whole_business' end/);
 assert.match(sql,/'external_payouts_enabled',false/);
 assert.match(sql,/'chair_rent_billed',false/);
 assert.match(sql,/'salaries_included',false/);
 assert.match(fix,/s\.price_minor is not null and s\.model is null/);
});
test("G54 finance UI differentiates private earnings from whole salon and manual cash",()=>{
 assert.match(page,/beger_g54_staff_finance/);
 assert.match(page,/SalonFinanceDashboard businessId=\{selected\.business_id\}/);
 assert.match(finance,/data\.scope!==state\?\.scope/);
 assert.match(finance,/beger_g54_set_staff_agreement/);
 assert.match(finance,/p_commission_bps:Math\.round\(percent\*100\)/);
 assert.match(finance,/لا تتضمن الرواتب أو الضرائب/);
 assert.match(panel,/beger_g54_record_manual_collection/);
 assert.match(panel,/data\?\.payment_provider_charged!==false/);
 assert.match(panel,/owner&&b\.status==="completed"/);
});
test("G54 rollback verifies owner vs staff rights, splits and idempotency",()=>{
 assert.match(smoke,/^begin;/m);
 assert.match(smoke,/^rollback;/m);
 assert.match(smoke,/SECURITY worker changed own financial agreement/);
 assert.match(smoke,/SECURITY worker closed payment/);
 assert.match(smoke,/SECURITY duplicate receipt accepted/);
 assert.match(smoke,/entry->>'worker_minor'/);
 assert.match(smoke,/entry->>'shop_minor'/);
 assert.match(smoke,/own_only/);
});
