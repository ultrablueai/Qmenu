import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-order-board.css","utf8");
const csv=readFileSync("lib/beger-order-csv.ts","utf8");

test("archive defaults to compact table with mutually exclusive list and card grid choices",()=>{
 assert.match(board,/archiveLayout,setArchiveLayout.*"table"/);
 assert.match(board,/archiveSort,setArchiveSort.*"newest"/);
 for(const layout of ["table","list","grid"])assert.match(board,new RegExp('aria-pressed=\\{archiveLayout==="'+layout+'"'));
 assert.match(board,/archiveLayout==="table"\?<div className="beger-archive-table-scroll"/);
 assert.match(board,/archiveLayout!=="table"\?<div className=\{"beger-archive-cards "/);
 assert.match(board,/Date\.parse\(b\.createdAt\)-Date\.parse\(a\.createdAt\)/);
 assert.match(css,/\.beger-archive-cards\.is-grid/);
 assert.match(css,/\.beger-archive-cards\.is-list/);
 assert.match(css,/\.beger-archive-table-scroll/);
});
test("table has compact expand-on-demand controls and still allows payment records and printing",()=>{
 assert.match(board,/className="beger-archive-row-detail"/);
 assert.match(board,/<summary>إجراءات الطلب<\/summary>/);
 assert.match(board,/o\.status==="fulfilled"&&o\.paymentStatus!=="paid"/);
 assert.match(board,/onClick=\{\(\)=>void recordPayment\(o\)\}/);
 assert.match(board,/printOrderTicket\(o,branchName,"summary"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"kitchen"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"pickup"\)/);
});
test("CSV exports only filtered orders without server access, quote escaping and spreadsheet injection risk",()=>{
 assert.match(board,/downloadOrderCsv\(activeView==="live"\?filteredLive:filteredHistory,activeView\)/);
 assert.match(board,/تصدير CSV/);
 assert.match(csv,/export function createOrderCsv/);
 assert.match(csv,/const escaped=\/\^\[\\s\\u0000-\\u001f\]\*\[=\+\\-@\]/);
 assert.match(csv,/escaped\.replace\(\/"\/g,'""'\)/);
 assert.match(csv,/order\.items\.map\(item=>item\.quantity/);
 assert.match(csv,/URL\.createObjectURL\(blob\)/);
 assert.match(csv,/URL\.revokeObjectURL\(uri\)/);
 assert.doesNotMatch(csv,/fetch\(|XMLHttpRequest|\.innerHTML\s*=/);
});
