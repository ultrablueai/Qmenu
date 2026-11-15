import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const archive=readFileSync("supabase/migrations/20261104070000_g4_recent_closed_orders.sql","utf8");
const css=readFileSync("app/dashboard/merchant-order-board.css","utf8");
const print=readFileSync("lib/beger-print-ticket.ts","utf8");
const g4=readFileSync("supabase/migrations/20261104003000_g4_manual_collection_and_tickets.sql","utf8");

test("all customer, merchant and print order references are the same ten digits",()=>{
 assert.match(board,/function orderReference\(id:string\)\{return id\.replace\(\/\-\/g,""\)\.slice\(0,10\)\.toUpperCase\(\);\}/);
 assert.match(print,/slice\(0,10\)\.toUpperCase\(\)/);
 assert.match(g4,/upper\(substr\(replace\(o\.id::text,'-',''\),1,10\)\)/);
});
test("completed order history is tenant scoped, limited, read only and protected by RLS-compatible RPC grants",()=>{
 assert.match(archive,/g4_recent_closed_orders\(p_branch uuid\)/);
 assert.match(archive,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
 assert.match(archive,/m\.role in \('owner','manager'\)/);
 assert.match(archive,/status in \('fulfilled','rejected'\)/);
 assert.match(archive,/created_at >= now\(\)-interval '7 days'/);
 assert.match(archive,/limit 50/);
 assert.match(archive,/revoke all on function public\.g4_recent_closed_orders\(uuid\) from public,anon/);
 assert.match(archive,/grant execute on function public\.g4_recent_closed_orders\(uuid\) to authenticated/);
 assert.doesNotMatch(archive,/insert into public\.g3_orders|update public\.g3_orders/);
});
test("merchant can view and refresh closed orders without mixing them into new-order sound feed",()=>{
 assert.match(board,/g4_recent_closed_orders/);
 assert.match(board,/historyOpen,setHistoryOpen/);
 assert.match(board,/closedOrders,setClosedOrders/);
 assert.match(board,/historyBusy,setHistoryBusy/);
 assert.match(board,/setHistoryOpen\(true\)/);
 assert.match(board,/سجل الطلبات السابقة/);
 assert.match(board,/تحديث السجل/);
 const stationAlerts=readFileSync("lib/beger-station-alerts.ts","utf8");
 assert.match(board,/stationAlerts\.observe\(fresh\)/);
 assert.match(stationAlerts,/merchant:\{pending:"طلب جديد ينتظر الموافقة"\}/);
 assert.match(stationAlerts,/if\(previous!==null&&label&&prior!==order\.status\)/);
 assert.doesNotMatch(board.slice(board.indexOf("async function loadHistory"),board.indexOf("async function",board.indexOf("async function loadHistory")+1)),/stationAlerts\.observe\(/);
 assert.match(css,/G4: compact, separate seven-day closed-order history/);
 assert.match(css,/@media\(max-width:700px\)/);
});
test("closed tickets support non-fiscal reprints and explicit collection for fulfilled orders only",()=>{
 assert.match(board,/o\.status==="fulfilled"&&o\.paymentStatus!=="paid"/);
 assert.match(board,/if\(busy\|\|order\.paymentStatus==="paid"\)return/);
 assert.match(board,/if\(historyOpen\)await loadHistory\(\)/);
 assert.match(board,/setClosedOrders\(current=>current\.map/);
 assert.match(board,/printOrderTicket\(o,branchName,"kitchen"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"pickup"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"summary"\)/);
 assert.match(print,/ليست فاتورة ضريبية/);
});
