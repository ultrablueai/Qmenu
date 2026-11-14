import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {staffProfiles,canStaffOffer,staffBusinessSummary} from "../lib/beger-salon-staff-operations.mjs";
const ui=readFileSync("app/demo/salon/salon-role-demo.tsx","utf8");
const ops=readFileSync("app/demo/salon/salon-staff-operations.tsx","utf8");
test("G45 barber can pause incoming bookings or narrow offered services",()=>{
 const profiles=structuredClone(staffProfiles);
 assert.equal(canStaffOffer(profiles,"omer",["hair","beard"]),true);
 profiles.omer.takingBookings=false;
 assert.equal(canStaffOffer(profiles,"omer",["hair"]),false);
 profiles.omer.takingBookings=true;
 profiles.omer.serviceIds=["hair"];
 assert.equal(canStaffOffer(profiles,"omer",["hair","beard"]),false);
 assert.equal(canStaffOffer(profiles,"other",["hair"]),false);
 assert.equal(canStaffOffer(profiles,"omer",[]),false);
});
test("G45 proprietor sees whole business and barber is only shown own settled work",()=>{
 const bookings=[
  {barberId:"omer",state:"completed",serviceIds:["hair","beard"],paid:true},
  {barberId:"omer",state:"completed",serviceIds:["care"],paid:false},
  {barberId:"ahmet",state:"completed",serviceIds:["combo"],paid:true},
  {barberId:"mert",state:"pending",serviceIds:["hair"],paid:false}
 ];
 const r=staffBusinessSummary(bookings);
 assert.deepEqual({sales:r.details.omer.serviceRevenue,barber:r.details.omer.barberShare,shop:r.details.omer.shopShare},{sales:550,barber:330,shop:220});
 assert.equal(r.details.omer.completed,2);
 assert.equal(r.details.omer.paidBookings,1);
 assert.equal(r.details.ahmet.serviceRevenue,500);
 assert.equal(r.details.ahmet.shopShare,0);
 assert.equal(r.details.ahmet.chairRent,2500);
 assert.equal(r.details.mert.pending,1);
 assert.equal(r.totals.serviceRevenue,1050);
 assert.equal(r.totals.shopShare,220);
});
test("G45 barber can edit only personal schedule/services, not commission or other staff",()=>{
 assert.match(ui,/role==="barber"&&id!==barber/);
 assert.match(ui,/\["model","percent","rent","rentPeriod","chair"\]\.some/);
 assert.match(ui,/STAFF_STORAGE/);
 assert.match(ui,/canStaffOffer\(profiles,barber,selected\)/);
 assert.match(ui,/setProfiles\(updated\)/);
 assert.match(ops,/role==="owner"\?Object\.keys\(profiles\):\[activeBarber\]/);
 assert.match(ops,/role==="owner"\?<[\s\S]*?كشف الصالون المالي الكامل/);
 assert.match(ops,/تحددهم صاحب المحل|يحددهم صاحب المحل/);
});
test("G45 displays staff private metrics and owner-wide summary; one-click demo fixtures",()=>{
 assert.match(ui,/SalonStaffOperations role="owner"/);
 assert.match(ui,/SalonStaffOperations role="barber"/);
 assert.match(ui,/loadShowcaseBookings\(\)/);
 assert.match(ui,/تجهيز بيانات العرض بضغطة/);
 assert.match(ui,/DEMO-101/);
 assert.match(ui,/DEMO-102/);
 assert.match(ui,/DEMO-103/);
 assert.match(ops,/staffBusinessSummary\(bookings,profiles\)/);
 assert.match(ops,/حصة المحل قبل المصروف/);
});
