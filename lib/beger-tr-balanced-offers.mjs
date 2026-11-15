// Beger G27 Turkey pricing proposals — not merchant billing, tax advice or entitlement grants.
// This module prepares display-only prices and cannot reserve promotional slots.
export const TR_BALANCED = Object.freeze({
 start:Object.freeze({monthlyGrossMinor:39900,annualGrossMinor:399000,branches:1}),
 pro:Object.freeze({monthlyGrossMinor:99900,annualGrossMinor:999000,branches:1}),
 business:Object.freeze({monthlyGrossMinor:179900,annualGrossMinor:1799000,branches:2})
});
export const TR_PROMO=Object.freeze({code:"pro",monthlyGrossMinor:79900,maxMerchants:30,months:6});
export const TR_TRIAL_DAYS=14;
/** A quote preview, not an approval or reservation. Server must atomically enforce cap. */
export function previewTurkeyOffer({plan,period="monthly",promo=false,claimedPromoMerchants=null}){
 const p=TR_BALANCED[plan];
 if(!p || !["monthly","yearly"].includes(period))throw Error("Unknown plan or billing period");
 if(promo){
  if(plan!=="pro" || period!=="monthly")throw Error("Promo only applies to monthly Pro");
  if(!Number.isSafeInteger(claimedPromoMerchants) || claimedPromoMerchants<0)throw Error("Promo capacity is unverified");
  if(claimedPromoMerchants>=TR_PROMO.maxMerchants)return {grossMinor:p.monthlyGrossMinor,offer:"regular",billingEnabled:false};
  return {grossMinor:TR_PROMO.monthlyGrossMinor,offer:"pro_founder_preview",promoMonths:TR_PROMO.months,billingEnabled:false};
 }
 return {grossMinor:period==="yearly"?p.annualGrossMinor:p.monthlyGrossMinor,offer:"regular",billingEnabled:false};
}
