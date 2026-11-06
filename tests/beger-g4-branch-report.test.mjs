import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104090000_g4_branch_financial_report.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-report.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-report.css","utf8");
const workspace=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");

test("merchant report only exposes tenant-authorized read-only data for bounded periods",()=>{
 assert.match(sql,/public\.g4_branch_report\(p_branch uuid,p_start timestamptz,p_end timestamptz\)/);
 assert.match(sql,/m\.business_id=v_business and m\.user_id=auth\.uid\(\) and m\.role in \('owner','manager'\)/);
 assert.match(sql,/p_end-p_start>interval '31 days'/);
 assert.match(sql,/p_end>now\(\)\+interval '1 day'/);
 assert.match(sql,/revoke all on function public\.g4_branch_report\(uuid,timestamptz,timestamptz\) from public,anon/);
 assert.match(sql,/grant execute on function public\.g4_branch_report\(uuid,timestamptz,timestamptz\) to authenticated/);
 assert.doesNotMatch(sql,/update public\.g3_orders|insert into public\.g3_orders|delete from public\.g3_orders/);
});
test("business report distinguishes order creation, outstanding debts and actually recorded collections",()=>{
 assert.match(sql,/o\.created_at>=p_start and o\.created_at<p_end/);
 assert.match(sql,/o\.paid_at>=p_start and o\.paid_at<p_end/);
 assert.match(sql,/o\.payment_status='paid'/);
 assert.match(sql,/o\.status<>'rejected'/);
 assert.match(sql,/o\.status<>'rejected' and o\.payment_status='unpaid'/);
 assert.match(sql,/o\.payment_method='cash'/);
 assert.match(sql,/o\.payment_method='external_card'/);
 assert.match(sql,/o\.payment_method='external_transfer'/);
 assert.match(sql,/group by o\.currency/);
 assert.match(sql,/orders_by_created_at_collections_by_paid_at/);
});
test("report filters and charts come only from authenticated branch RPC, never placeholder numbers",()=>{
 assert.match(ui,/g4_branch_report/);
 assert.match(ui,/p_branch:branchId,p_start:period\.start,p_end:period\.end/);
 assert.match(ui,/useState<Range>\("today"\)/);
 assert.match(ui,/id:"week",label:"آخر 7 أيام"/);
 assert.match(ui,/id:"month",label:"آخر 30 يوماً"/);
 assert.match(ui,/start\.setHours\(0,0,0,0\)/);
 assert.match(ui,/setReport\(null\)/);
 assert.match(ui,/label:"إجمالي الطلبات المنشأة",value:counts\?\.orders\?\?undefined/);
 assert.match(ui,/لا توجد طلبات لهذه الفترة/);
 assert.doesNotMatch(ui,/Math\.random\(|mockOrders|fakeRevenue|localStorage/);
});
test("report is a separate responsive merchant workspace and shows real collection methods",()=>{
 assert.match(workspace,/type Workspace=.*"orders".*"reports"/);
 assert.match(workspace,/workspace==="reports"\?<div id="merchant-reports"/);
 assert.match(workspace,/MerchantReport key=/);
 assert.match(ui,/row\.cashMinor/);
 assert.match(ui,/row\.cardMinor/);
 assert.match(ui,/row\.transferMinor/);
 assert.match(ui,/لا تُحتسب المدفوعات إلا بعد تسجيل التاجر لاستلامها/);
 assert.match(css,/\.beger-report-metrics\{display:grid/);
 assert.match(css,/@media\(max-width:480px\)/);
});
