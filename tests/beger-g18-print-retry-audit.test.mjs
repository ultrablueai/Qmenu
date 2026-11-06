import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261106004500_g18_print_failure_audit.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-print-queue.tsx","utf8");

test("G18 print failures and retry reasons preserve original accepted-order uniqueness",()=>{
 assert.match(sql,/add constraint g17_order_print_jobs_state_check\s+check\(state in \('queued','previewed','failed','confirmed'\)\)/);
 assert.match(sql,/add constraint g18_print_failure_note_length/);
 assert.match(sql,/create table public\.g18_print_job_events/);
 assert.match(sql,/action text not null check\(action in \('preview','confirm','fail','retry'\)\)/);
 assert.match(sql,/alter table public\.g18_print_job_events enable row level security/);
 assert.match(sql,/revoke all on public\.g18_print_job_events from public,anon,authenticated/);
});
test("G18 role checks guard every job mutation including legacy G17 callers",()=>{
 assert.match(sql,/m\.business_id=v_job\.business_id and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/where id=p_job for update/);
 assert.match(sql,/insert into public\.g18_print_job_events/);
 assert.match(sql,/select public\.g18_print_job_action\(p_job,p_action,null\)/);
 for(const x of ["g18_print_job_action(uuid,text,text)","g17_print_job_action(uuid,text)","g18_branch_print_events(uuid)","g17_branch_print_jobs(uuid)"]){
  assert.ok(sql.includes("revoke all on function public."+x+" from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+x+" to authenticated;"));
 }
});
test("G18 confirmed reprints need a reason; failed prints can be retried",()=>{
 assert.match(sql,/p_action='fail' and v_job\.state in \('queued','previewed'\) and v_note is not null/);
 assert.match(sql,/p_action='retry' and v_job\.state in \('failed','previewed'\)/);
 assert.match(sql,/p_action='retry' and v_job\.state='confirmed' and v_note is not null/);
 assert.match(sql,/p_action='confirm' and v_job\.state='previewed'/);
 assert.match(sql,/when p_action='preview' then 1 else 0/);
 assert.match(sql,/char_length\(v_note\)>200/);
});
test("G18 print dashboard visibly distinguishes failed/confirmed and exposes audit history",()=>{
 assert.match(ui,/type State="queued"\|"previewed"\|"failed"\|"confirmed"/);
 assert.match(ui,/g18_branch_print_events/);
 assert.match(ui,/g18_print_job_action/);
 assert.match(ui,/failureNote/);
 assert.match(ui,/p_note:note/);
 assert.match(ui,/تسجيل فشل/);
 assert.match(ui,/إعادة طباعة موثّقة/);
 assert.match(ui,/سجل إجراءات الطباعة/);
 assert.match(ui,/هل تأكدت من خروج الورقة من الطابعة/);
 assert.match(ui,/filter==="all"\?jobs:queued/);
});
