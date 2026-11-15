import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261114000100_g46_salon_foundation_closed.sql","utf8");
const qr=readFileSync("public/demo/beger-salon-customer-qr.svg","utf8");
const share=readFileSync("app/demo/salon/share/salon-share-kit.tsx","utf8");
test("G46 salon data is deliberately closed to all app roles until RLS and RPCs",()=>{
 const tables=["salon_staff","salon_chairs","salon_services","salon_staff_services","salon_staff_schedules","salon_staff_contracts","salon_bookings","salon_booking_services","salon_booking_events"];
 for(const table of tables){
  assert.match(sql,new RegExp("create table if not exists public\\."+table+"\\b"));
  assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
 }
 assert.match(sql,/revoke all on public\.salon_staff/);
 assert.match(sql,/from public,anon,authenticated;/);
 assert.doesNotMatch(sql,/grant (?:all|select|insert|update|delete) on public\.salon_\w+ to (?:anon|authenticated)/i);
 assert.doesNotMatch(sql,/create policy/i);
});
test("G46 enforces tenant-composite foreign keys, nonnegative prices, and time ranges",()=>{
 assert.match(sql,/foreign key\(business_id,branch_id\) references public\.branches\(business_id,id\)/);
 assert.match(sql,/foreign key\(business_id,booking_id\) references public\.salon_bookings\(business_id,id\)/);
 assert.match(sql,/foreign key\(business_id,staff_id\) references public\.salon_staff\(business_id,id\)/);
 assert.match(sql,/foreign key\(business_id,service_id\) references public\.salon_services\(business_id,id\)/);
 assert.match(sql,/constraint salon_line_time check\(starts_at<ends_at\)/);
 assert.match(sql,/constraint salon_booking_collected check\(collected_minor<=total_minor\)/);
 assert.match(sql,/unique\(business_id,booking_id,line_number\)/);
});
test("G46 scannable QR has quiet zone and three finder patterns and routes to public customer",()=>{
 assert.match(qr,/viewBox="0 0 49 49"/);
 assert.match(qr,/<path fill="#172e25" d="/);
 const matches=[...qr.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
 assert.ok(matches.length>600);
 const black=new Set(matches.map(m=>m[1]+","+m[2]));
 const corner=(x,y)=>{
  for(let a=0;a<7;a++)for(let b=0;b<7;b++){
   const expected=a===0||b===0||a===6||b===6||(a>=2&&a<=4&&b>=2&&b<=4);
   assert.equal(black.has((x+a)+","+(y+b)),expected,"Finder cell "+(x+a)+","+(y+b));
  }
 };
 corner(4,4);corner(38,4);corner(4,38);
 assert.match(share,/\/demo\/salon\/customer/);
});
