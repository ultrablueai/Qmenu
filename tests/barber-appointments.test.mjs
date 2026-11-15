import test from "node:test";
import assert from "node:assert/strict";
import { STATUS, ensureSlot, changeStatus, reschedule, earlyOffer, publicPrice } from "../lib/barber-appointments.mjs";
const appt = { id:"a",tenantId:"t1",staffId:"s1",startAt:"2026-11-16T10:00:00+03:00",endAt:"2026-11-16T10:30:00+03:00",status:STATUS.REQUESTED };
test("staff confirms; customer cannot self-confirm", () => {
  assert.throws(() => changeStatus(appt,STATUS.CONFIRMED,"customer"),/staff_approval_required/);
  assert.equal(changeStatus(appt,STATUS.CONFIRMED,"staff").status,STATUS.CONFIRMED);
});
test("blocked overlapping reservation for same tenant/staff", () => {
  assert.throws(()=>ensureSlot({...appt,id:"b",startAt:"2026-11-16T10:15:00+03:00",endAt:"2026-11-16T10:45:00+03:00"},[appt]),/slot_conflict/);
  assert.doesNotThrow(()=>ensureSlot({...appt,id:"b",staffId:"s2"},[appt]));
});
test("reschedule returns to approval and checks slot", () => {
  const confirmed=changeStatus(appt,STATUS.CONFIRMED,"owner");
  const changed=reschedule(confirmed,"2026-11-16T11:00:00+03:00","2026-11-16T11:30:00+03:00",[],"staff");
  assert.equal(changed.status,STATUS.REQUESTED);
});
test("early offer does not change confirmed original booking", () => {
  const confirmed=changeStatus(appt,STATUS.CONFIRMED,"owner");
  const offer=earlyOffer(confirmed,"2026-11-16T09:30:00+03:00","2026-11-16T09:00:00+03:00",[],30);
  assert.equal(offer.status,"pending_acceptance");
  assert.equal(confirmed.startAt,appt.startAt);
});
test("hidden prices stay hidden in customer payload",()=> {
  assert.deepEqual(publicPrice({id:"c",name:"Cut",basePrice:300},{showPrices:false}),{id:"c",name:"Cut"});
});
test("terminal status cannot reactivate",()=> {
  assert.throws(()=>changeStatus({...appt,status:STATUS.COMPLETED},STATUS.CONFIRMED,"owner"),/invalid_transition/);
});
