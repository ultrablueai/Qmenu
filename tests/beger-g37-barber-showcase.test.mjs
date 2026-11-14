import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calculateSplit,calculateLedger,slotFree,timesOverlap} from "../lib/beger-salon-demo-model.mjs";
test("overlapping same-chair bookings cannot be reserved by different barbers",()=>{
 const bookings=[{id:1,serviceId:"combo",barberId:"omer",chairId:"chair-1",date:"2026-11-14",time:"10:00",status:"confirmed",paid:false}];
 assert.equal(slotFree(bookings,"hair","ahmet","chair-1","2026-11-14","10:30"),false);
 assert.equal(slotFree(bookings,"hair","omer","chair-2","2026-11-14","10:30"),false);
 assert.equal(slotFree(bookings,"hair","ahmet","chair-2","2026-11-14","10:30"),true);
 assert.equal(slotFree(bookings,"hair","ahmet","chair-1","2026-11-14","11:00"),true);
 assert.equal(timesOverlap("10:00",30,"10:30",30),false);
});
test("closed slots and invalid service/chair cannot be booked",()=>{
 assert.equal(slotFree([],"hair","omer","chair-1","2026-11-14","18:30"),false);
 assert.equal(slotFree([],"hair","omer","chair-1","2026-11-14","18:00"),true);
 assert.equal(slotFree([],"missing","omer","chair-1","2026-11-14","12:00"),false);
 assert.equal(slotFree([],"hair","omer","missing","2026-11-14","12:00"),false);
});
test("commission, independent renter and owner are accounted separately",()=>{
 assert.deepEqual(calculateSplit(400,"commission",60),{barber:240,shop:160});
 assert.deepEqual(calculateSplit(400,"salary_plus_commission",25),{barber:100,shop:300});
 assert.deepEqual(calculateSplit(400,"chair_rent",0),{barber:400,shop:0});
 assert.deepEqual(calculateSplit(400,"owner",0),{barber:0,shop:400});
 assert.throws(()=>calculateSplit(400,"commission",120));
 assert.throws(()=>calculateSplit(-1,"commission",50));
});
test("only paid completed services affect split, not bookings, cancelled/no show",()=>{
 const policies={omer:{model:"commission",percent:60},ahmet:{model:"chair_rent",percent:0}};
 const bookings=[
 {id:1,barberId:"omer",serviceId:"hair",status:"completed",paid:true},
 {id:2,barberId:"omer",serviceId:"combo",status:"completed",paid:false},
 {id:3,barberId:"ahmet",serviceId:"hair",status:"completed",paid:true},
 {id:4,barberId:"omer",serviceId:"beard",status:"cancelled",paid:true}
 ];
 const result=calculateLedger(bookings,policies);
 assert.deepEqual(result.omer,{sales:350,barber:210,shop:140,services:1});
 assert.deepEqual(result.ahmet,{sales:350,barber:350,shop:0,services:1});
});
test("public barber demo has isolated in-memory flows, not live billing or external messages",()=>{
 const page=readFileSync("app/demo/salon/salon-showcase.tsx","utf8");
 const route=readFileSync("app/demo/salon/page.tsx","utf8");
 assert.match(page,/setBookings/);
 assert.match(page,/setPolicies/);
 assert.match(page,/slotFree/);
 assert.match(page,/calculateLedger/);
 assert.match(page,/lang==="ar"/);
 assert.match(page,/status==="completed"/);
 assert.match(route,/robots:\{index:false,follow:false\}/);
 assert.doesNotMatch(page,/browserSupabase|fetch\(|localStorage|paymentProvider|sendSMS/);
});
