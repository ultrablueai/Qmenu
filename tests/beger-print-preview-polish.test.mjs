import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync("lib/beger-print-ticket.ts","utf8");

test("printer preview is a centered receipt card rather than unbounded text on a blank page",()=>{
 assert.match(src,/\.preview-stage\{display:flex;justify-content:center/);
 assert.match(src,/\.receipt\{width:80mm;max-width:100%;background:#fff/);
 assert.match(src,/body\[data-paper="a4"\] \.receipt/);
 assert.match(src,/\.print-toolbar\{position:sticky/);
 assert.match(src,/\.reference-box\{text-align:center/);
 assert.match(src,/\.summary-row\{display:flex/);
});
test("print paper size is user-selectable and print-only layout hides toolbar",()=>{
 assert.match(src,/type Paper="80mm"\|"58mm"\|"a4"/);
 assert.match(src,/paperStyle\.textContent=paper==="a4"\?"@page\{size:A4;margin:12mm\}"/);
 assert.match(src,/paper==="58mm"\?"@page\{size:58mm auto;margin:3mm\}"/);
 assert.match(src,/selector\.addEventListener\("change"/);
 assert.match(src,/printButton\.addEventListener\("click",\(\)=>popup\.print\(\)\)/);
 assert.match(src,/\.print-toolbar,\.print-help\{display:none!important\}/);
 assert.doesNotMatch(src,/popup\.setTimeout\(\(\)=>popup\.print\(\)/);
});
test("three ticket variants keep matching order number and fiscal distinctions",()=>{
 assert.match(src,/const orderNumber=\(id:string\)=>id\.replace\(\/\-\/g,""\)\.slice\(0,10\)\.toUpperCase\(\)/);
 assert.match(src,/kitchen:\{title:"تذكرة تجهيز المطبخ"/);
 assert.match(src,/pickup:\{title:"بطاقة استلام الطلب"/);
 assert.match(src,/summary:\{title:"كشف حساب داخلي"/);
 assert.match(src,/ليست فاتورة ضريبية/);
 assert.match(src,/ليست إيصالاً ضريبياً/);
 assert.match(src,/التحصيل غير مسجّل/);
 assert.match(src,/طابق رقم الاستلام مع الطلب قبل التسليم/);
});
test("user generated order, branch, modifiers and omissions are inserted as plain text",()=>{
 assert.match(src,/node\.textContent=value/);
 assert.match(src,/item\.selections\?\.removedIngredients/);
 assert.match(src,/item\.selections\?\.options/);
 assert.doesNotMatch(src,/\.innerHTML\s*=|document\.write\(/);
 assert.match(src,/Line-item amounts, taxes, and discounts are intentionally absent until server snapshots exist/);
 assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
});
