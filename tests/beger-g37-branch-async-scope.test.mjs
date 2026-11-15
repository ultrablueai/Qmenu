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
  assert.match(src,/if\(requestId!==requestSequence\.current\|\|activeScope\.current!==/);
  assert.match(src,/if\(activeScope\.current!==/);
  assert.match(src,/return\(\)=>\{(?:live|active)=false;scopeEpoch\.current\+\+;requestSequence\.current\+\+;/);
  assert.ok(src.includes('rpc("'+endpoint+'"'));
 });
}

test("merchant order board clears previous branch tickets and history before refetch", () => {
 const src=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
 assert.match(src,/useEffect\(\(\)=>\{let live=true;setLoaded\(false\);setOrders\(\[\]\);setClosedOrders\(\[\]\);/);
 assert.match(src,/setEnabled\(false\);setPickupEnabled\(false\);/);
});

// A callback retained from the previous branch must never invalidate a current-branch request.
test("all station refreshes reject retired scope before advancing the request epoch", () => {
 const files=[...sources.map(([,file])=>file),"components/beger-durable-station-notifications.tsx"];
 for(const file of files){
  const src=readFileSync(file,"utf8");
  const guard=src.indexOf("if(activeScope.current!==");
  const increment=src.indexOf("const requestId=++requestSequence.current;");
  assert.ok(guard>=0 && increment>guard,file+" must guard stale scope before epoch increment");
 }
});

test("late station mutations cannot update a retired branch session, including A-to-B-to-A switches",()=>{
 const files=[...sources.map(([,file])=>file),"app/dashboard/merchant-printer-lease-lab.tsx","components/beger-durable-station-notifications.tsx"];
 for(const file of files){
  const src=readFileSync(file,"utf8");
  assert.match(src,/const scopeEpoch=useRef\(0\)/,file);
  assert.match(src,/scopeEpoch\.current\+\+/,file);
  const actions=(src.match(/const actionScope=/g)||[]).length;
  const epochs=(src.match(/const actionEpoch=scopeEpoch\.current;/g)||[]).length;
  assert.equal(epochs,actions,file+" must capture an epoch for every async action");
  assert.match(src,/if\(activeScope\.current!==actionScope\|\|scopeEpoch\.current!==actionEpoch\)return;/,file);
  assert.match(src,/if\(activeScope\.current===actionScope&&scopeEpoch\.current===actionEpoch\)setBusy\(/,file);
 }
});

test("merchant order history requests are invalidated when the branch scope changes",()=>{
 const src=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
 assert.match(src,/const historySequence=useRef\(0\)/);
 assert.match(src,/const historyRequest=\+\+historySequence\.current/);
 assert.match(src,/historyRequest!==historySequence\.current/);
 assert.match(src,/historySequence\.current\+\+/);
});

test("branch change releases busy state for every order station and print inbox",()=>{
 for(const [,file] of sources){
  const src=readFileSync(file,"utf8");
  const effectStart=src.indexOf("useEffect(()=>{");
  assert.ok(effectStart>=0,file);
  const cleanup=src.indexOf("return()=>{",effectStart);
  const effect=src.slice(effectStart,cleanup);
  assert.match(effect,/setBusy\((?:false|"")\)/,file);
 }
 const inbox=readFileSync("components/beger-durable-station-notifications.tsx","utf8");
 assert.match(inbox,/setLoading\(true\);setError\(""\);setBusy\(""\)/);
});

test("print health and printer lease lab isolate branch-scoped refresh results",()=>{
 for(const file of ["app/dashboard/merchant-print-health.tsx","app/dashboard/merchant-printer-lease-lab.tsx"]){
  const src=readFileSync(file,"utf8");
  assert.match(src,/const activeScope=useRef\(branchId\)/,file);
  assert.match(src,/const requestId=\+\+requestSequence\.current/,file);
  assert.match(src,/requestId!==requestSequence\.current\|\|activeScope\.current!==branchId/,file);
  assert.match(src,/requestSequence\.current\+\+/,file);
 }
 const lab=readFileSync("app/dashboard/merchant-printer-lease-lab.tsx","utf8");
 for(const rpc of ["g20_register_test_printer","g20_claim_test_print","g20_release_test_print"]){
  assert.ok(lab.includes('rpc("'+rpc+'"'),rpc);
 }
 assert.match(lab,/if\(activeScope\.current!==actionScope\|\|scopeEpoch\.current!==actionEpoch\)return;/);
 assert.match(lab,/setLease\(null\);setBusy\(false\);/);
});
