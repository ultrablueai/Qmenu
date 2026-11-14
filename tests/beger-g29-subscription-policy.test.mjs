import test from "node:test";
import assert from "node:assert/strict";
import {inspectBegerSubscription,calculateFounderDiscountedCycle} from "../lib/beger-g29-subscription-policy.mjs";
const t="2026-11-10T00:00:00Z";
test("G29 fails closed for missing records and unapproved trial durations",()=>{
 assert.deepEqual(inspectBegerSubscription({asOf:t}),{state:"not_configured",billingLive:false,canCommerciallyOperate:false});
 assert.throws(()=>inspectBegerSubscription({status:"active",asOf:t,startsAt:"2026-11-01T00:00:00Z",trialDays:30}),/Unapproved trial/);
 assert.throws(()=>inspectBegerSubscription({status:"active",asOf:"invalid"}),/Invalid asOf/);
});
test("14-day trial turns expired at exact boundary with no billing or privilege grant",()=>{
 const base={status:"trial",startsAt:"2026-11-01T00:00:00Z",commercialEnabled:true,verifiedSettlement:true};
 const before=inspectBegerSubscription({...base,asOf:"2026-11-14T23:59:59Z"});
 const after=inspectBegerSubscription({...base,asOf:"2026-11-15T00:00:00Z"});
 assert.equal(before.state,"trial");assert.equal(after.state,"expired");
 assert.equal(before.canCommerciallyOperate,false);
 assert.equal(after.billingLive,false);
});
test("seven-day grace and cancelled states prevent commercial access",()=>{
 const base={status:"active",startsAt:"2026-10-01T00:00:00Z",endsAt:"2026-11-01T00:00:00Z",commercialEnabled:true,verifiedSettlement:true};
 assert.equal(inspectBegerSubscription({...base,asOf:"2026-11-02T00:00:00Z"}).state,"grace");
 assert.equal(inspectBegerSubscription({...base,asOf:"2026-11-08T00:00:00Z"}).state,"expired");
 assert.equal(inspectBegerSubscription({...base,asOf:"2026-10-20T00:00:00Z",status:"cancelled"}).canCommerciallyOperate,false);
 assert.equal(inspectBegerSubscription({...base,asOf:"2026-10-20T00:00:00Z",verifiedSettlement:false}).canCommerciallyOperate,false);
});
test("founder preview requires verified settlement, quota slot and six eligible cycles",()=>{
 const base={firstSettledAt:"2026-11-10T00:00:00Z",now:t,verifiedSettlement:true,slot:30};
 assert.equal(calculateFounderDiscountedCycle({...base,cycleIndex:1}).grossMinor,79900);
 assert.equal(calculateFounderDiscountedCycle({...base,cycleIndex:6}).grossMinor,79900);
 assert.equal(calculateFounderDiscountedCycle({...base,cycleIndex:7}).grossMinor,99900);
 assert.equal(calculateFounderDiscountedCycle({...base,cycleIndex:6}).billingEnabled,false);
 assert.throws(()=>calculateFounderDiscountedCycle({...base,slot:31,cycleIndex:1}),/slot required/);
 assert.throws(()=>calculateFounderDiscountedCycle({...base,verifiedSettlement:false,cycleIndex:1}),/settlement required/);
});
