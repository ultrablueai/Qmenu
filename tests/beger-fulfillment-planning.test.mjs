import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=readFileSync("lib/beger-fulfillment-planning.ts","utf8");
const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,strict:true}}).outputText;
const model=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));
const route={provider:"test-router",routeId:"route-123",quotedAt:"2026-11-03T12:00:00Z",distanceMeters:3500,durationSeconds:600};
const policy={baseMinor:1000,perKmMinor:200,maxDistanceMeters:5000,minimumOrderMinor:5000};

test("table QR stays anonymous, remote pickup and delivery require passwordless verified customer",()=>{
 assert.deepEqual(model.contactRequirements("dine_in"),{loginRequired:false,verifiedContactRequired:false,addressRequired:false,tableRequired:true,pickupSlotRequired:false});
 assert.deepEqual(model.contactRequirements("pickup"),{loginRequired:true,verifiedContactRequired:true,addressRequired:false,tableRequired:false,pickupSlotRequired:true});
 assert.deepEqual(model.contactRequirements("delivery"),{loginRequired:true,verifiedContactRequired:true,addressRequired:true,tableRequired:false,pickupSlotRequired:false});
 assert.throws(()=>model.contactRequirements("invalid"));
});

test("delivery prices include integer road distance and never invent merchant pricing",()=>{
 const quote=model.quoteDeliveryFromVerifiedRoute(route,policy,8000);
 assert.equal(quote.eligible,true);
 assert.equal(quote.feeMinor,1700);
 assert.equal(quote.distanceMeters,3500);
 assert.equal(quote.estimatedDurationSeconds,600);
 assert.equal(quote.freeDelivery,false);
});

test("delivery rejects routes outside allowed zone and below merchant basket minimum",()=>{
 assert.deepEqual(model.quoteDeliveryFromVerifiedRoute({...route,distanceMeters:6000},policy,8000).reason,"out_of_range");
 assert.deepEqual(model.quoteDeliveryFromVerifiedRoute(route,policy,4000).reason,"below_minimum");
 assert.deepEqual(model.quoteDeliveryFromVerifiedRoute({...route,routeId:""},policy,8000).reason,"invalid_route");
});

test("delivery free threshold, fee floor and cap follow merchant policy, no borrowed global prices",()=>{
 assert.equal(model.quoteDeliveryFromVerifiedRoute(route,{...policy,freeDeliveryFromMinor:8000},8000).feeMinor,0);
 assert.equal(model.quoteDeliveryFromVerifiedRoute(route,{...policy,minFeeMinor:2000},8000).feeMinor,2000);
 assert.equal(model.quoteDeliveryFromVerifiedRoute(route,{...policy,maxFeeMinor:1200},8000).feeMinor,1200);
 assert.throws(()=>model.quoteDeliveryFromVerifiedRoute(route,{...policy,perKmMinor:-1},8000));
 assert.throws(()=>model.quoteDeliveryFromVerifiedRoute(route,policy,-1));
});

test("packaging charges charged per quantity but outer carrier bag only once",()=>{
 const rules=[
  {id:"cup-lid",unitPriceMinor:40,quantityPerProduct:1,policy:"charged",scope:"item"},
  {id:"outer-bag",unitPriceMinor:30,quantityPerProduct:1,policy:"charged",scope:"order"},
  {id:"napkin",unitPriceMinor:20,quantityPerProduct:1,policy:"included",scope:"item"}
 ];
 const result=model.calculatePackaging(rules,3);
 assert.deepEqual(result.lines.map(x=>x.units),[3,1,3]);
 assert.deepEqual(result.lines.map(x=>x.totalMinor),[120,30,0]);
 assert.equal(result.totalMinor,150);
 assert.throws(()=>model.calculatePackaging([{...rules[0],unitPriceMinor:-1}],1));
});

test("pickup slots never promise a time before both prep lead time and kitchen readiness",()=>{
 const policy={openingMinute:540,closingMinute:720,slotIntervalMinutes:15,preparationMinutes:20,minimumNoticeMinutes:10};
 const slots=model.availablePickupSlots(policy,560,615);
 assert.equal(slots[0].minuteOfDay,615);
 assert.ok(slots.every(x=>x.minuteOfDay>=615&&x.minuteOfDay<720));
 assert.deepEqual(model.availablePickupSlots({...policy,closingMinute:500},560,615),[]);
});
