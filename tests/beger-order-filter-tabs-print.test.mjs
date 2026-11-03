import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-order-board.css","utf8");
const printer=readFileSync("lib/beger-print-order-list.ts","utf8");

test("merchant live orders and historical records are mutually exclusive workspace tabs",()=>{
 assert.match(board,/activeView,setActiveView/);
 assert.match(board,/setActiveView\("history"\)/);
 assert.match(board,/setActiveView\("live"\)/);
 assert.match(board,/\{activeView==="live"\?<><div className="beger-order-board-controls">/);
 assert.match(board,/\{activeView==="history"\?<section className="beger-order-history"/);
 assert.match(board,/aria-current=\{activeView==="live"\?"page":undefined\}/);
 assert.match(board,/aria-current=\{activeView==="history"\?"page":undefined\}/);
});
test("filtering handles service channel, paid state, order status and order/table search without altering server order data",()=>{
 assert.match(board,/serviceFilter,setServiceFilter/);
 assert.match(board,/paymentFilter,setPaymentFilter/);
 assert.match(board,/statusFilter,setStatusFilter/);
 assert.match(board,/searchQuery,setSearchQuery/);
 assert.match(board,/const filteredLive=orders\.filter\(filterOrder\)/);
 assert.match(board,/const filteredHistory=closedOrders\.filter\(filterOrder\)/);
 assert.match(board,/orderReference\(order\.id\)\.toLowerCase\(\)\.includes/);
 assert.match(board,/order\.table\.toLowerCase\(\)\.includes/);
 assert.match(board,/setSearchQuery\(""\)/);
 assert.match(board,/setStatusFilter\("all"\)/);
 assert.match(board,/filteredLive\.filter\(o=>o\.status===stage\)/);
 assert.match(board,/filteredHistory\.map\(o=><article/);
});
test("filtered print runs on a real user click and uses only currently displayed rows",()=>{
 assert.match(board,/printFilteredOrderList\(activeView==="live"\?filteredLive:filteredHistory,branchName,activeView\)/);
 assert.match(board,/طباعة النتائج المفلترة/);
 assert.match(printer,/window\.open\("","_blank"/);
 assert.match(printer,/node\.textContent=value|n\.textContent=text/);
 assert.doesNotMatch(printer,/innerHTML\s*=|document\.write\(/);
 assert.match(printer,/ليس فاتورة ضريبية/);
 assert.match(printer,/@page\{size:A4;margin:11mm\}/);
 assert.match(printer,/thead\{display:table-header-group\}/);
 assert.match(css,/Separate live orders and archive as tabs/);
 assert.match(css,/@media\(max-width:520px\)/);
});
