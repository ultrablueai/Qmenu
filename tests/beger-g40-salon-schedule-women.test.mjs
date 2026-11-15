import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {slotFree,salonServices,womensSalonServices,defaultSalonSchedule,effectiveCatalog,serviceBasket,calculateLedger,validateSchedule} from "../lib/beger-salon-demo-model.mjs";
const settings=()=>({...defaultSalonSchedule,closedDays:[],staffHours:{},staffBreaks:{},serviceDurations:{}});
test("owner decides shop hours and breaks; appointment buffer must fit",()=>{
 const s=settings();
 s.gapMinutes=15;
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","18:30",null,s,salonServices),false);
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","18:15",null,s,salonServices),true);
 assert.equal(slotFree([],["combo"],"omer","chair-1","2026-11-16","12:20",null,s,salonServices),false);
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","14:00",null,s,salonServices),true);
 s.closedDays=[1];
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","14:00",null,s,salonServices),false);
});
test("per-worker shift and individual break override general available time",()=>{
 const s=settings();
 s.staffHours.omer={start:"11:00",end:"17:00"};
 s.staffBreaks.omer={start:"15:00",end:"16:00"};
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","10:00",null,s,salonServices),false);
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","14:45",null,s,salonServices),false);
 assert.equal(slotFree([],["hair"],"omer","chair-1","2026-11-16","16:15",null,s,salonServices),true);
 assert.equal(slotFree([],["hair"],"ahmet","chair-2","2026-11-16","14:45",null,s,salonServices),true);
});
test("service-specific duration controls entire combined cart and existing booking collisions",()=>{
 const s=settings();
 s.serviceDurations.hair=60;
 s.gapMinutes=10;
 const catalog=effectiveCatalog(salonServices,s);
 assert.deepEqual({duration:serviceBasket(["hair","beard"],catalog).duration,total:serviceBasket(["hair","beard"],catalog).total},{duration:80,total:550});
 const b=[{id:1,serviceIds:["hair","beard"],serviceId:"hair",barberId:"omer",chairId:"chair-1",date:"2026-11-16",time:"10:00",status:"completed"}];
 assert.equal(slotFree(b,["hair"],"ahmet","chair-1","2026-11-16","11:15",null,s,catalog),false);
 assert.equal(slotFree(b,["hair"],"ahmet","chair-1","2026-11-16","11:30",null,s,catalog),true);
});
test("women's salon services use same booking and split engine but separate catalog",()=>{
 const s=settings();
 const women=effectiveCatalog(womensSalonServices,s);
 assert.equal(serviceBasket(["wcut","color"],women).duration,170);
 assert.equal(serviceBasket(["wcut","color"],women).total,2450);
 assert.equal(slotFree([],["wcut","color"],"omer","chair-1","2026-11-16","10:00",null,s,women),true);
 const ledger=calculateLedger([{barberId:"omer",serviceIds:["wcut","color"],status:"completed",paid:true}],{omer:{model:"commission",percent:60}},women);
 assert.deepEqual(ledger.omer,{sales:2450,barber:1470,shop:980,services:2});
});
test("schedule cannot silently accept invalid gaps, shifts, service durations",()=>{
 const s=settings();s.gapMinutes=-5;assert.throws(()=>validateSchedule(s));
 s.gapMinutes=15;s.serviceDurations.color=481;assert.throws(()=>effectiveCatalog(womensSalonServices,s));
 s.serviceDurations.color=120;s.staffHours.omer={start:"17:00",end:"10:00"};assert.throws(()=>validateSchedule(s));
});
test("demo exposes owner's schedule settings, women/men templates and all 3 languages",()=>{
 const c=readFileSync("app/demo/salon/salon-showcase.tsx","utf8");
 assert.match(c,/setSchedule/);
 assert.match(c,/staffBreaks/);
 assert.match(c,/gapMinutes/);
 assert.match(c,/serviceDurations/);
 assert.match(c,/womensSalonServices/);
 assert.match(c,/changeMode/);
 assert.match(c,/ar:"/);
 assert.match(c,/tr:"/);
 assert.match(c,/en:"/);
 assert.doesNotMatch(c,/browserSupabase|fetch\(|paymentProvider/);
});
