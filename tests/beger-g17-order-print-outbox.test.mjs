import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261106003000_g17_transactional_print_outbox.sql","utf8");
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const queue=readFileSync("app/dashboard/merchant-print-queue.tsx","utf8");
test("G17 acceptance queues exactly one kitchen, pickup and internal summary job transactionally",()=>{
 assert.match(sql,/after insert or update of status on public\.g3_orders/);
 assert.match(sql,/new\.status='accepted'/);
 assert.match(sql,/old\.status is distinct from 'accepted'/);
 assert.match(sql,/unique\(order_id,kind\)/);
 assert.match(sql,/on conflict\(order_id,kind\) do nothing/);
 for(const kind of ["kitchen","pickup","summary"])assert.ok(sql.includes("new.branch_id,'"+kind+"'"),kind);
 assert.match(sql,/check \(kind in \('kitchen','pickup','summary'\)\)/);
});
test("G17 print jobs are private and privileged actions scoped to tenant owner/manager",()=>{
 assert.match(sql,/alter table public\.g17_order_print_jobs enable row level security/);
 assert.match(sql,/revoke all on public\.g17_order_print_jobs from public,anon,authenticated/);
 assert.match(sql,/m\.business_id=b\.business_id/);
 assert.match(sql,/m\.business_id=v_job\.business_id/);
 assert.equal((sql.match(/m\.role in \('owner','manager'\)/g)||[]).length,2);
 for(const fn of ["g17_branch_print_jobs(uuid)","g17_print_job_action(uuid,text)"]){
  assert.ok(sql.includes("revoke all on function public."+fn+" from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+fn+" to authenticated;"));
 }
});
test("G17 preview does not claim paper has printed, confirmation and retry are explicit",()=>{
 assert.match(sql,/p_action='preview' and v_job\.state in \('queued','previewed'\)/);
 assert.match(sql,/p_action='confirm' and v_job\.state='previewed'/);
 assert.match(sql,/p_action='retry' and v_job\.state in \('previewed','confirmed'\)/);
 assert.match(queue,/فتح المعاينة وحده لا يعني نجاح الطباعة/);
 assert.match(queue,/printOrderTicket\(job\.order,branchName,job\.kind,settings\)/);
 assert.match(queue,/g17_print_job_action/);
 assert.match(queue,/g17_branch_print_jobs/);
 assert.match(queue,/الطباعة الفعلية من المتصفح تتطلب ضغط الموظف/);
});
test("G17 order board has one cashier acceptance and defers actual preparation to kitchen",()=>{
 assert.match(board,/pending:\{value:"accepted",label:"قبول الطلب وإرساله تلقائياً للمطبخ"\}/);
 assert.doesNotMatch(board,/accepted:\{value:"preparing",label:"إرسال للمطبخ"\}/);
 assert.match(board,/MerchantPrintQueue branchId=\{branchId\} branchName=\{branchName\} settings=\{printSettings\}/);
 assert.match(board,/MerchantPrintSettings branchId=\{branchId\}/);
});
