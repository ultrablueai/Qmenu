import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sources = [
 ["merchant order board", "app/dashboard/merchant-order-board.tsx", "g3_branch_orders"],
 ["kitchen", "app/dashboard/merchant-kitchen.tsx", "g9_kitchen_queue"],
 ["cashier", "app/dashboard/merchant-cashier.tsx", "g10_cashier_queue"],
 ["print queue", "app/dashboard/merchant-print-queue.tsx", "g17_branch_print_jobs"],
];

for (const [name, file, endpoint] of sources) {
 test(name+" discards out-of-order responses and invalidates branch-scoped requests on unmount", () => {
  const src=readFileSync(file,"utf8");
  assert.match(src,/requestSequence=useRef\(0\)/);
  assert.match(src,/requestId=\+\+requestSequence\.current/);
  assert.match(src,/if\(requestId!==requestSequence\.current\)return/);
  assert.match(src,/return\(\)=>\{(?:live|active)=false;requestSequence\.current\+\+;/);
  assert.ok(src.includes('rpc("'+endpoint+'"'));
 });
}

test("merchant order board clears previous branch tickets and history before refetch", () => {
 const src=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
 assert.match(src,/useEffect\(\(\)=>\{let live=true;setLoaded\(false\);setOrders\(\[\]\);setClosedOrders\(\[\]\);/);
 assert.match(src,/setEnabled\(false\);setPickupEnabled\(false\);/);
});
