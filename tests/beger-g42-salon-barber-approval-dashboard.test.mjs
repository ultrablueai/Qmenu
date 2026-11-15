import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("app/demo/salon/salon-role-demo.tsx","utf8");
const metrics=readFileSync("app/demo/salon/salon-role-metrics.tsx","utf8");
const css=readFileSync("app/demo/salon/salon.css","utf8");
test("G42 assigned barber can confirm own waiting customer booking and start only after arrival",()=>{
 assert.match(ui,/function approveAssigned\(b:Appt\)/);
 assert.match(ui,/role!=="barber"\|\|b\.barberId!==barber\|\|b\.state!=="pending"/);
 assert.match(ui,/advance\(b,"confirmed"\)/);
 assert.match(ui,/b\.state==="pending"\?<button className="bs-approve"/);
 assert.match(ui,/b\.state==="arrived"\?<button onClick=\{\(\)=>advance\(b,"in_service"\)\}/);
 assert.match(ui,/b\.state==="in_service"\?<button onClick=\{\(\)=>advance\(b,"completed"\)\}/);
 assert.match(ui,/confirmed:\["arrived","cancelled"\]/);
});
test("G42 owner has role-level KPIs, barber-scoped KPIs and owner search filters",()=>{
 assert.match(ui,/<SalonMetrics bookings=\{rows\}\/?>/);
 assert.match(ui,/<SalonMetrics bookings=\{rows\} barberId=\{barber\}\/?>/);
 assert.match(ui,/<SalonServiceMix bookings=\{rows\}\/?>/);
 assert.match(ui,/ownerRows=rows\.filter/);
 assert.match(ui,/barberRows=rows\.filter\(b=>b\.barberId===barber/);
 assert.match(ui,/setAppointmentFilter/);
 assert.match(ui,/setSearch/);
 assert.match(metrics,/pending:list\.filter/);
 assert.match(metrics,/arrived:list\.filter/);
 assert.match(metrics,/completed:list\.filter/);
 assert.match(metrics,/collected:list\.filter\(b=>b\.state==="completed"&&b\.paid\)/);
 assert.match(metrics,/outstanding:list\.filter\(b=>b\.state==="completed"&&!b\.paid\)/);
});
test("G42 dashboard is phone-responsive, demo-limited and has own customer booking tracking",()=>{
 assert.match(css,/\.bs-analytics/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(ui,/sessionStorage\.setItem\("beger:salon:my-booking"/);
 assert.match(ui,/rows\.find\(x=>x\.id===myId\)/);
 assert.doesNotMatch(ui,/mine=rows\.find\(x=>x\.id===myId\)\|\|rows\[rows\.length-1\]/);
 assert.match(ui,/تبديل المعلم لأغراض العرض فقط/);
 assert.match(ui,/نسخة تجربة محلية داخل المتصفح فقط/);
});
