import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104220000_g8_collection_close.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-collection-close.tsx","utf8");
const report=readFileSync("app/dashboard/merchant-report.tsx","utf8");
test("period closing is authenticated branch-scoped and cannot overlap",()=>{
 assert.match(sql,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/alter table public\.g8_collection_closes enable row level security/);
 assert.match(sql,/revoke all on public\.g8_collection_closes from public,anon,authenticated/);
 assert.match(sql,/p_end-p_start>interval '31 hours'/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/period_start<p_end and period_end>p_start/);
 assert.match(sql,/raise exception 'Collection period already closed or overlaps an existing close'/);
 assert.match(sql,/unique\(branch_id,period_start,period_end\)/);
});
test("recorded payments are grouped by paid_at, method and currency, never conflated with bank settlement",()=>{
 assert.match(sql,/o\.payment_status='paid'/);
 assert.match(sql,/o\.paid_at>=p_start and o\.paid_at<p_end/);
 assert.match(sql,/group by o\.currency/);
 for(const method of ["cash","external_card","external_transfer"])assert.match(sql,new RegExp("o\\.payment_method='"+method+"'"));
 assert.match(sql,/recorded_payments bigint/);
 assert.match(ui,/ليس جرداً نقدياً أو إغلاقاً ضريبياً/);
 assert.match(ui,/الاستردادات والتعديلات النقدية تتطلب دورة مستقلة/);
});
test("operational close snapshots are append-only and history bounded",()=>{
 assert.match(sql,/create trigger g8_collection_close_immutable before update or delete/);
 assert.match(sql,/raise exception 'Collection close snapshots cannot be modified or deleted'/);
 assert.match(sql,/order by closed_at desc limit 30/);
 assert.match(sql,/p_action not in \('preview','close','history'\)/);
 assert.match(sql,/p_note text default null/);
});
test("merchant previews exact bounded period before confirming and refreshes history",()=>{
 assert.match(ui,/g8_collection_close/);
 assert.match(ui,/p_action:"preview"/);
 assert.match(ui,/p_action:"close"/);
 assert.match(ui,/p_action:"history"/);
 assert.match(ui,/p\.start!==preview\.start\|\|p\.end!==preview\.end/);
 assert.match(ui,/preview\.overlaps/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/setPreview\(null\)/);
 assert.match(report,/MerchantCollectionClose key=\{"close-"\+branchId\} branchId=\{branchId\}/);
});
