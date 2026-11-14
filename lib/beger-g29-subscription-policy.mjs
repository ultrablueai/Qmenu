// G29 draft-only subscription lifecycle: deterministic, no DB writes or entitlement grants.
// Neither caller status nor a client-side payment success is proof of settled funds.
const DAY=86400000;
function timestamp(value,label){
 if(value==null)return null;
 if(typeof value!=="string")throw Error(`Invalid ${label}`);
 const t=Date.parse(value);
 if(!Number.isFinite(t)||!/(Z|[+-]\d\d:\d\d)$/.test(value))throw Error(`Invalid ${label}`);
 return t;
}
export function inspectBegerSubscription({
 status="not_configured",startsAt=null,endsAt=null,asOf,trialDays=14,graceDays=7,
 verifiedSettlement=false,commercialEnabled=false
}){
 const now=timestamp(asOf,"asOf");
 if(now==null)throw Error("asOf is required");
 if(!Number.isSafeInteger(trialDays)||trialDays!==14)throw Error("Unapproved trial policy");
 if(!Number.isSafeInteger(graceDays)||graceDays!==7)throw Error("Unapproved grace policy");
 if(!["not_configured","trial","active","past_due","expired","cancelled"].includes(status))throw Error("Unknown subscription state");
 const start=timestamp(startsAt,"startsAt");
 const end=timestamp(endsAt,"endsAt");
 if(status==="not_configured")return {state:"not_configured",billingLive:false,canCommerciallyOperate:false};
 if(start==null)throw Error("Subscription start required");
 if(end!=null&&end<=start)throw Error("Invalid subscription window");
 // A trial cannot be longer than the approved 14-day policy.
 if(status==="trial"){
  const trialEnd=Math.min(end??start+trialDays*DAY,start+trialDays*DAY);
  const state=now<start?"scheduled":now<trialEnd?"trial":"expired";
  return {state,billingLive:false,canCommerciallyOperate:false,endsAt:new Date(trialEnd).toISOString()};
 }
 let state;
 if(status==="cancelled")state="cancelled";
 else if(now<start)state="scheduled";
 else if(status==="expired" || (end!=null&&now>=end&&now>=(end+graceDays*DAY)))state="expired";
 else if(status==="past_due" || (end!=null&&now>=end))state="grace";
 else state=status==="active"?"active":"expired";
 // This is not an entitlement grant: no commercial operations until explicitly enabled and verified settled.
 return {state,billingLive:false,canCommerciallyOperate:Boolean(commercialEnabled&&verifiedSettlement&&state==="active")};
}
export function calculateFounderDiscountedCycle({cycleIndex,firstSettledAt,now,verifiedSettlement=false,slot=null}){
 if(!Number.isSafeInteger(cycleIndex)||cycleIndex<1)throw Error("Invalid billed cycle");
 const first=timestamp(firstSettledAt,"firstSettledAt");
 const instant=timestamp(now,"now");
 if(first==null||instant==null)throw Error("Missing settlement proof dates");
 if(slot==null||!Number.isInteger(slot)||slot<1||slot>30)throw Error("Verified founder slot required");
 if(!verifiedSettlement||instant<first)throw Error("Verified payment settlement required");
 return {grossMinor:cycleIndex<=6?79900:99900,founderDiscountApplies:cycleIndex<=6,billingEnabled:false};
}
