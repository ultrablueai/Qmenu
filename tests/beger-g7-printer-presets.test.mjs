import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104180000_g7_branch_print_settings.sql","utf8");
const ui=readFileSync("app/dashboard/merchant-print-settings.tsx","utf8");
const printer=readFileSync("lib/beger-print-ticket.ts","utf8");
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
test("branch printer presets are isolated by business membership, with RLS and safe defaults",()=>{
 assert.match(sql,/branch_id uuid primary key references public.branches/);
 assert.match(sql,/alter table public.g7_branch_print_settings enable row level security/);
 assert.match(sql,/revoke all on public.g7_branch_print_settings from public,anon,authenticated/);
 assert.match(sql,/m.business_id=v_business and m.user_id=auth.uid\(\) and m.role in \('owner','manager'\)/);
 assert.match(sql,/p_kitchen not in \('58mm','80mm','a4'\)/);
 assert.match(sql,/p_pickup not in \('58mm','80mm','a4'\)/);
 assert.match(sql,/p_summary not in \('58mm','80mm','a4'\)/);
 assert.match(sql,/grant execute on function public.g7_print_settings\(uuid\) to authenticated/);
 assert.match(sql,/grant execute on function public.g7_print_settings_update\(uuid,text,text,text\) to authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public.g7_print_settings.* to anon/);
});
test("merchant can configure kitchen pickup and internal report without new crowded navigation panel",()=>{
 assert.match(ui,/DEFAULT_BRANCH_PRINT_SETTINGS:BranchPrintSettings=\{kitchen:"80mm",pickup:"58mm",summary:"a4"\}/);
 assert.match(ui,/g7_print_settings_update/);
 assert.match(ui,/g7_print_settings"/);
 assert.match(ui,/<details className="beger-print-settings"/);
 assert.match(ui,/field\("kitchen"/);
 assert.match(ui,/field\("pickup"/);
 assert.match(ui,/field\("summary"/);
 assert.match(ui,/onSettings\(saved\)/);
 assert.match(board,/MerchantPrintSettings branchId=\{branchId\} onSettings=\{setPrintSettings\}/);
});
test("every existing print order button keeps its behavior but picks selected branch paper",()=>{
 assert.match(board,/printOrderTicketBase\(order,branch,kind,printSettings\)/);
 assert.match(printer,/preferredPaper\?:Record<TicketKind,Paper>/);
 assert.match(printer,/preferredPaper\?\.\[kind\]/);
 assert.match(printer,/selector.addEventListener\("change"/);
 assert.match(printer,/updatePaper\(defaultPaper\)/);
 assert.match(ui,/الطابعة الفعلية تُختار من نافذة المتصفح/);
 assert.doesNotMatch(ui,/navigator.usb|navigator.bluetooth|sendBeacon|paymentIntent/);
});
