import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const guest=readFileSync("components/guest-order-submission.tsx","utf8");
const merchant=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");

test("guest and merchant refresh order status immediately on foreground return",()=>{
 for(const source of [guest,merchant]){
  assert.match(source,/document\.visibilityState==="visible"/);
  assert.match(source,/document\.addEventListener\("visibilitychange",onVisible\)/);
  assert.match(source,/document\.removeEventListener\("visibilitychange",onVisible\)/);
  assert.match(source,/window\.setInterval\(/);
  assert.match(source,/window\.clearInterval\(timer\)/);
 }
});
test("foreground refresh is scoped to the current order/table or business branch",()=>{
 assert.match(guest,/if\(!token\)return;void refresh\(\)/);
 assert.match(guest,/\},\[token\]\)/);
 assert.match(merchant,/\},\[branchId,businessId\]\)/);
 assert.match(merchant,/if\(live\)setError/);
});
