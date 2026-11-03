import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const path="lib/beger-service-workflows.ts";
const js=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const core=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));

test("the same platform has six explicit journeys but not one false universal food-order state",()=>{
 assert.deepEqual(Object.keys(core.serviceWorkflows),["table_order","counter_order","scheduled_pickup","walk_in","appointment","clinic_checkin"]);
 assert.equal(core.serviceWorkflows.table_order.kind,"order");
 assert.equal(core.serviceWorkflows.walk_in.kind,"queue");
 assert.equal(core.serviceWorkflows.appointment.kind,"appointment");
 assert.equal(core.serviceWorkflows.clinic_checkin.kind,"queue");
});
test("table orders retain server-compatible accepted/preparing/ready transitions",()=>{
 assert.equal(core.canTransition("table_order","pending","accepted"),true);
 assert.equal(core.canTransition("table_order","accepted","preparing"),true);
 assert.equal(core.canTransition("table_order","preparing","ready"),true);
 assert.equal(core.canTransition("table_order","ready","fulfilled"),true);
 assert.equal(core.canTransition("table_order","ready","accepted"),false);
 assert.equal(core.canTransition("table_order","rejected","accepted"),false);
 assert.equal(core.isTerminalStatus("table_order","fulfilled"),true);
 assert.equal(core.isTerminalStatus("table_order","bogus"),false);
});
test("salon appointment and walk-in queue are not accidental food orders",()=>{
 assert.equal(core.canTransition("appointment","requested","confirmed"),true);
 assert.equal(core.canTransition("appointment","confirmed","checked_in"),true);
 assert.equal(core.canTransition("appointment","checked_in","in_service"),true);
 assert.equal(core.canTransition("appointment","checked_in","preparing"),false);
 assert.equal(core.canTransition("walk_in","waiting","called"),true);
 assert.equal(core.canTransition("walk_in","called","serving"),true);
 assert.equal(core.canTransition("walk_in","called","missed"),true);
 assert.equal(core.canTransition("walk_in","waiting","ready"),false);
});
test("public pager maps each service status to a non-sensitive signal with Arabic Turkish English labels",()=>{
 assert.equal(core.publicServiceSignal("table_order","ready"),"ready");
 assert.equal(core.publicServiceSignal("walk_in","called"),"called");
 assert.equal(core.publicServiceSignal("appointment","confirmed"),"scheduled");
 assert.equal(core.publicServiceSignal("clinic_checkin","called"),"called");
 assert.equal(core.publicServiceSignal("clinic_checkin","diagnosis"),"none");
 assert.deepEqual(core.publicSignalLabels.called,{ar:"حان دورك",tr:"Sıra sizde",en:"It's your turn"});
 assert.equal(core.publicSignalLabels.none.en,"Status unavailable");
 assert.equal(core.isGuestVisibleSignal("none"),false);
});

test("existing G3 merchant order board uses the shared pager projection without taking over server authority",()=>{
 const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
 assert.match(board,/from "\.\.\/\.\.\/lib\/beger-service-workflows"/);
 assert.match(board,/publicServiceSignal\("table_order",o\.status\)/);
 assert.match(board,/publicSignalLabels\[publicServiceSignal/);
 assert.match(board,/rpc\("g3_transition_order",\{p_order:order\.id,p_next:status\}\)/);
 assert.doesNotMatch(board,/paymentProvider|paid=true|medicalHistory/);
});
