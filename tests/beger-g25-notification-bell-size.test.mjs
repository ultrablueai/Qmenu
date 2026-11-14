import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const shared=readFileSync("components/beger-feedback.tsx","utf8");
const kitchen=readFileSync("app/dashboard/merchant-kitchen.tsx","utf8");
const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
const merchant=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");

test("notification bell has intrinsic 20px SVG dimensions across all stations",()=>{
 assert.match(shared,/className="beger-feedback-bell" aria-hidden="true" width="20" height="20"/);
 assert.match(shared,/minWidth:20,minHeight:20,maxWidth:20,maxHeight:20,flex:"0 0 20px"/);
 assert.match(shared,/className="beger-feedback-panel" style=\{\{width:"100%",maxWidth:390,minWidth:0/);
 assert.match(shared,/className="beger-feedback-summary" aria-label=\{heading\} style=\{\{display:"flex",alignItems:"center"/);
});
test("all merchant, kitchen and cashier feedback settings share the bounded bell",()=>{
 for(const station of [merchant,kitchen,cashier]){
  assert.match(station,/BegerFeedbackControls/);
  assert.match(station,/useBegerFeedback/);
 }
});
