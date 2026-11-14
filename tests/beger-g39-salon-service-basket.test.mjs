import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {serviceBasket,bookingServiceIds,slotFree,calculateLedger} from "../lib/beger-salon-demo-model.mjs";
test("one booking can contain multiple distinct services and compute combined price and minutes",()=>{
 const basket=serviceBasket(["hair","beard","care"]);
 assert.equal(basket.total,730);
 assert.equal(basket.duration,70);
 assert.equal(basket.items.length,3);
 assert.throws(()=>serviceBasket([]));
 assert.throws(()=>serviceBasket(["hair","hair"]));
 assert.throws(()=>serviceBasket(["hair","unknown"]));
});
test("chair and barber are blocked across the entire combined appointment duration",()=>{
 const b=[{id:10,serviceId:"hair",serviceIds:["hair","beard","care"],barberId:"omer",chairId:"chair-1",date:"2026-11-14",time:"10:00",status:"confirmed"}];
 assert.equal(slotFree(b,["kids"],"ahmet","chair-1","2026-11-14","11:00"),false);
 assert.equal(slotFree(b,["kids"],"omer","chair-2","2026-11-14","11:00"),false);
 assert.equal(slotFree(b,["kids"],"ahmet","chair-2","2026-11-14","11:00"),true);
 assert.equal(slotFree(b,["hair","beard"],"ahmet","chair-1","2026-11-14","11:30"),true);
 assert.equal(slotFree([],"hair","omer","chair-1","2026-11-14","18:30"),true);
 assert.equal(slotFree([],["hair","beard"],"omer","chair-1","2026-11-14","18:30"),false);
});
test("multiple services are itemized in paid settlement and excluded while unpaid",()=>{
 const policies={omer:{model:"commission",percent:60},ahmet:{model:"chair_rent",percent:0}};
 const bookings=[
  {id:1,barberId:"omer",serviceIds:["hair","beard"],serviceId:"hair",status:"completed",paid:true},
  {id:2,barberId:"omer",serviceIds:["care"],serviceId:"care",status:"completed",paid:false},
  {id:3,barberId:"ahmet",serviceIds:["hair","care"],serviceId:"hair",status:"completed",paid:true}
 ];
 const ledger=calculateLedger(bookings,policies);
 assert.deepEqual(ledger.omer,{sales:550,barber:330,shop:220,services:2});
 assert.deepEqual(ledger.ahmet,{sales:530,barber:530,shop:0,services:2});
 assert.deepEqual(bookingServiceIds({serviceId:"hair"}),["hair"]);
});
test("salon interface uses a multi-select basket for appointments and walk-ins",()=>{
 const ui=readFileSync("app/demo/salon/salon-showcase.tsx","utf8");
 assert.match(ui,/setSelectedServices/);
 assert.match(ui,/aria-pressed=\{selectedServices\.includes\(s\.id\)\}/);
 assert.match(ui,/serviceBasket\(selectedServices\)/);
 assert.match(ui,/slotFree\(visibleBookings,selectedServices/);
 assert.match(ui,/serviceIds:\[\.\.\.selectedServices\]/);
 assert.match(ui,/services\.items\.map/);
 assert.match(ui,/money\(basket\.total\)/);
 assert.match(ui,/calculateLedger/);
});
