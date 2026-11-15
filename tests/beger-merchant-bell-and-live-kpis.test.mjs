import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-order-board.css","utf8");
const feedback=readFileSync("components/beger-feedback.tsx","utf8");
test("merchant branch notification bell has its own bounded SVG style independent of customer menu",()=>{
 assert.match(feedback,/className="beger-feedback-bell"/);
 assert.match(board,/import "\.\/merchant-order-board\.css"/);
 assert.match(css,/Merchant branch: local notification styles/);
 assert.match(css,/\.beger-order-board \.beger-feedback-summary>svg\.beger-feedback-bell/);
 assert.match(css,/max-width:20px!important;max-height:20px!important/);
 assert.match(css,/\.beger-order-board \.beger-feedback-panel/);
 assert.match(css,/width:min\(100%,390px\)!important/);
 assert.match(css,/\.beger-order-board \.beger-feedback-panel>\.beger-feedback-controls/);
});
test("merchant dashboard KPI cards are based on current scoped order rows, not invented metrics",()=>{
 assert.match(board,/className="beger-order-board-kpis"/);
 assert.match(board,/orders\.filter\(o=>o\.status==="pending"\)\.length/);
 assert.match(board,/orders\.filter\(o=>o\.status==="accepted"\|\|o\.status==="preparing"\)\.length/);
 assert.match(board,/orders\.filter\(o=>o\.status==="ready"\)\.length/);
 assert.match(board,/orders\.filter\(o=>o\.paymentStatus!=="paid"\)\.length/);
 assert.match(board,/\{loaded\?stat\.value:"—"\}/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/Data cards use actual live queue rows only/);
});
