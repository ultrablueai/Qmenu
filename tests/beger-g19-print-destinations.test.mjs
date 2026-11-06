import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync("supabase/migrations/20261106010000_g19_branch_print_routes.sql","utf8");
const editor=readFileSync("app/dashboard/merchant-print-routes.tsx","utf8");
const queue=readFileSync("app/dashboard/merchant-print-queue.tsx","utf8");

test("G19 routing is branch/tenant scoped and denies raw data access",()=>{
 assert.match(migration,/primary key\(branch_id,kind\)/);
 assert.match(migration,/alter table public\.g19_branch_print_routes enable row level security/);
 assert.match(migration,/revoke all on public\.g19_branch_print_routes from public,anon,authenticated/);
 assert.match(migration,/m\.business_id=b\.business_id/);
 assert.match(migration,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
 assert.match(migration,/m\.role in \('owner','manager'\)/);
 for(const fn of ["g19_branch_print_routes(uuid)","g19_update_print_route(uuid,text,text)"]){
  assert.ok(migration.includes("revoke all on function public."+fn+" from public,anon,authenticated;"));
  assert.ok(migration.includes("grant execute on function public."+fn+" to authenticated;"));
 }
});
test("G19 printer names validated, mode remains manual and no secret/device spoofing introduced",()=>{
 assert.match(migration,/p_kind not in \('kitchen','pickup','summary'\)/);
 assert.match(migration,/char_length\(v_name\)>80/);
 assert.match(migration,/pg_catalog\.strpos\(v_name,chr\(10\)\)/);
 assert.match(migration,/paper_mode text not null default 'browser_manual' check\(paper_mode='browser_manual'\)/);
 assert.match(migration,/'device_connected',false/);
 assert.doesNotMatch(migration,/auth\.admin|service_role|https?:\/\/|device_secret|api_key|printRaw|create policy/i);
});
test("G19 merchant routes editor offers tenant-checked persisted destinations and honest hardware state",()=>{
 assert.match(editor,/g19_branch_print_routes/);
 assert.match(editor,/g19_update_print_route/);
 assert.match(editor,/p_branch:branchId,p_kind:kind,p_destination:destination/);
 assert.match(editor,/device_connected===false/);
 assert.match(editor,/لا توجد طباعة صامتة أو اتصال USB\/شبكة/);
 assert.match(queue,/<MerchantPrintRoutes branchId=\{branchId\} onRoutes=\{setRoutes\}\/>/);
 assert.match(queue,/المحطة: \{routes\[job\.kind\]\}/);
});
