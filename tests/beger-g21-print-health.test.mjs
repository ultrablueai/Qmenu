import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261108010000_g21_branch_print_health.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-print-health.tsx","utf8");
const board=readFileSync("app/dashboard/merchant-print-queue.tsx","utf8");

test("G21 read-only status denies unrelated tenants and anonymous users",()=>{
 assert.match(sql,/auth\.uid\(\) is null/);
 assert.match(sql,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/revoke all on function public\.g21_branch_print_health\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g21_branch_print_health\(uuid\) to authenticated/);
 assert.match(sql,/language plpgsql stable security definer set search_path=''/);
 assert.doesNotMatch(sql,/\b(?:update|delete from|insert into|alter table|drop table|grant select)\b/i);
});
test("G21 distinguishes quiet branches from delayed and failed jobs with time thresholds",()=>{
 assert.match(sql,/j\.state='failed'/);
 assert.match(sql,/j\.created_at<=now\(\)-interval '5 minutes'/);
 assert.match(sql,/j\.updated_at<=now\(\)-interval '10 minutes'/);
 for(const status of ["needs_attention","delayed","no_jobs","normal"])assert.ok(sql.includes("'"+status+"'"));
 assert.match(sql,/j\.branch_id=p_branch and j\.business_id=v_business/);
 assert.match(sql,/d\.business_id=v_business and d\.branch_id=p_branch/);
 assert.match(sql,/'manual_print_only',true/);
 assert.match(sql,/'hardware_connected',false/);
});
test("G21 merchant display refreshes, shows actionable monitoring and never claims live printer telemetry",()=>{
 assert.match(ui,/g21_branch_print_health/);
 assert.match(ui,/window\.setInterval\(update,15000\)/);
 assert.match(ui,/توجد مهام طباعة فاشلة/);
 assert.match(ui,/لا توجد مهام طباعة حالياً/);
 assert.match(ui,/ليست مراقبة لطابعة فعلية/);
 assert.match(ui,/لا يوجد جهاز طباعة متصل بالنظام/);
 assert.match(ui,/expired_simulated_leases/);
 assert.match(board,/<MerchantPrintHealth branchId=\{branchId\}\/>/);
});