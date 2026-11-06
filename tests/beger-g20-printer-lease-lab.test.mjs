import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261107010000_g20_test_printer_leases.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-printer-lease-lab.tsx","utf8");
const board=readFileSync("app/dashboard/merchant-print-queue.tsx","utf8");

test("G20 lab uses private tenant-scoped devices and leases, not a public hardware API",()=>{
 for(const table of ["g20_print_test_devices","g20_print_test_leases"]){
  assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
  assert.match(sql,new RegExp("revoke all on public\\."+table+" from public,anon,authenticated"));
 }
 assert.match(sql,/m\.business_id=d\.business_id and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/j\.business_id=d\.business_id and j\.branch_id=d\.branch_id/);
 assert.match(sql,/j\.kind=d\.kind and j\.state='queued'/);
 for(const fn of ["g20_register_test_printer(uuid,text,text)","g20_claim_test_print(uuid)","g20_release_test_print(uuid,uuid,uuid)","g20_test_printer_status(uuid)"]){
  assert.ok(sql.includes("revoke all on function public."+fn+" from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+fn+" to authenticated;"));
 }
});
test("G20 exclusive claim is locked and short-lived; release checks token and owner",()=>{
 assert.match(sql,/for update of j skip locked limit 1/);
 assert.match(sql,/lease\.expires_at<=now\(\)/);
 assert.match(sql,/v_expires:=now\(\)\+interval '90 seconds'/);
 assert.match(sql,/where public\.g20_print_test_leases\.expires_at<=now\(\)/);
 assert.match(sql,/l\.lease_token=p_token and l\.acquired_by=auth\.uid\(\)/);
 assert.match(sql,/primary key references public\.g17_order_print_jobs/);
 const executable=sql.replace(/^--.*$/gm,"");
 assert.doesNotMatch(executable,/update public\.g17_order_print_jobs|insert into public\.g18_print_job_events|service_role|device_secret/i);
});
test("G20 merchant controls clearly restrict operations to dry-run; never claim printing success",()=>{
 for(const rpc of ["g20_test_printer_status","g20_register_test_printer","g20_claim_test_print","g20_release_test_print"])
  assert.ok(ui.includes(rpc));
 assert.match(ui,/لا يطبع ولا يشغّل USB ولا يؤكد خروج ورقة/);
 assert.match(ui,/تم حجز مهمة للاختبار لمدة 90 ثانية فقط/);
 assert.match(ui,/مهمة الطباعة بقيت في حالتها الأصلية/);
 assert.match(board,/<MerchantPrinterLeaseLab branchId=\{branchId\}\/>/);
});
