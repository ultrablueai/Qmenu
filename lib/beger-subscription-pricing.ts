/** Beger subscription quoting is separate from customers' purchases and merchant settlement.
 * No money is collected here. Quotes require an operator-authorized price book, and
 * feature access must be granted by independent, verified subscription entitlements.
 */
import {capabilities,sanitizeCapabilities,type BusinessSector,type Capability} from "./beger-sector-catalog";
export type SubscriptionCountry="TR"|"SY";
export type BillingPeriod="monthly"|"yearly";
export type SubscriptionPriceBook={
 country:SubscriptionCountry;
 currency:"TRY"|"SYP";
 revision:string;
 published:boolean;
 period:BillingPeriod;
 baseMinor:number;
 perBranchMinor:number;
 featureMonthlyMinor:Partial<Record<Capability,number>>;
 yearlyDiscountBasisPoints?:number;
};
export type SubscriptionPreview={amountMinor:number|null;currency:"TRY"|"SYP"|null;period:BillingPeriod;requiresQuote:boolean;missingPrices:Capability[];features:Capability[];branchCount:number};
function validMinor(n:number){return Number.isSafeInteger(n)&&n>=0}
function add(a:number,b:number){const n=a+b;if(!Number.isSafeInteger(n))throw Error("Price overflow");return n}
function mul(a:number,b:number){const n=a*b;if(!Number.isSafeInteger(n))throw Error("Price overflow");return n}
/** Pricing has NO fallback to invented fees. Unpublished books never display purchase-ready quotes. */
export function calculateSubscriptionPreview({sector,country,features,branches,book}:{sector:BusinessSector;country:SubscriptionCountry;features:string[];branches:number;book?:SubscriptionPriceBook|null}):SubscriptionPreview{
 if(!Number.isInteger(branches)||branches<1||branches>1000)throw Error("Invalid branch count");
 const selected=sanitizeCapabilities(sector,features);
 const fallback={amountMinor:null,currency:null,period:book?.period??"monthly",requiresQuote:true,missingPrices:selected,features:selected,branchCount:branches} as const;
 if(!book||!book.published||!book.revision||book.country!==country||!validMinor(book.baseMinor)||!validMinor(book.perBranchMinor))return fallback;
 const missing=selected.filter(id=>!validMinor(book.featureMonthlyMinor[id] as number));
 if(missing.length||selected.some(id=>capabilities[id].availability==="planned"))return {...fallback,currency:book.currency,missingPrices:missing.length?missing:selected};
 let monthly=add(book.baseMinor,mul(book.perBranchMinor,branches-1));
 for(const id of selected)monthly=add(monthly,book.featureMonthlyMinor[id]!);
 if(book.period==="yearly"){
  const discount=book.yearlyDiscountBasisPoints??0;
  if(!Number.isSafeInteger(discount)||discount<0||discount>10000)throw Error("Invalid annual discount");
  const annual=mul(monthly,12);
  const amount=Math.floor(annual*(10000-discount)/10000);
  if(!Number.isSafeInteger(amount))throw Error("Price overflow");
  return {amountMinor:amount,currency:book.currency,period:"yearly",requiresQuote:false,missingPrices:[],features:selected,branchCount:branches};
 }
 return {amountMinor:monthly,currency:book.currency,period:"monthly",requiresQuote:false,missingPrices:[],features:selected,branchCount:branches};
}
