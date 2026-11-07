import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const kitchen=readFileSync("app/dashboard/merchant-kitchen.tsx","utf8");
const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
test("owner has directly accessible kitchen/cashier stations instead of dead-end accepted card",()=>{
 for(const station of ["kitchen","cashier"]) {
  assert.ok(hq.includes('id:"'+station+'"'));
  assert.ok(hq.includes('setWorkspace("'+station+'")'));
  assert.ok(hq.includes('workspace==="'+station+'"'));
 }
 assert.match(hq,/MerchantKitchen key=/);
 assert.match(hq,/MerchantCashier key=/);
 assert.match(hq,/onOpenStation=\{setWorkspace\}/);
 assert.match(board,/onOpenStation\?\("kitchen"\)/);
 assert.match(board,/onOpenStation\?\("cashier"\)/);
 assert.match(board,/✓ وصل للمطبخ · بانتظار أن يبدأ الموظف التحضير/);
});
test("accepted order reaches real kitchen queue; only kitchen starts preparing",()=>{
 assert.match(board,/transition\(o,"accepted"\)/);
 assert.doesNotMatch(board,/transition\(o,"preparing"\)/);
 assert.match(kitchen,/g9_kitchen_queue/);
 assert.match(kitchen,/g9_kitchen_advance/);
 assert.match(kitchen,/order\.status==="accepted"\?<button/);
 assert.match(kitchen,/advance\(order,"preparing"\)/);
 assert.match(kitchen,/advance\(order,"ready"\)/);
 assert.match(cashier,/advance|g10_cashier_order_action/);
});
test("normal order cards show one primary action and hide printing/cash details",()=>{
 assert.match(board,/beger-order-ticket-more/);
 assert.match(board,/<summary[^>]*>التحصيل والطباعة وإجراءات إضافية<\/summary>/);
 assert.match(board,/تذكرة المطبخ/);
 assert.match(board,/بطاقة الاستلام/);
 assert.match(board,/تسجيل المبلغ المستلم/);
 assert.match(board,/showAdvanced\?<div className="beger-order-advanced"/);
 assert.match(board,/بحث وتصفية متقدمة/);
 assert.match(hq,/بقية الخدمات والإعدادات/);
 assert.match(board,/serviceFilter==="all"/);
});
