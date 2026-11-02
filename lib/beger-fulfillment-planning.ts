/**
 * Beger G3+/fulfillment planning primitives.
 * Pure, server-side-ready calculations. No browser prices, account creation, map calls,
 * checkout activation or DB writes are authorized by this module.
 *
 * All amounts use integer minor units. Route distance MUST be supplied by a trusted
 * road-routing provider through a server endpoint; a client GPS position or a
 * straight-line estimate is not a billable source.
 */
export type ServiceMode="dine_in"|"pickup"|"delivery";
export type DeliveryProvider="merchant"|"platform"|"external";
export type PackagingPolicy="included"|"free"|"charged";
export type RouteEvidence={provider:string;distanceMeters:number;durationSeconds:number;routeId:string;quotedAt:string};
export type DeliveryFeePolicy={
 baseMinor:number;
 perKmMinor:number;
 maxDistanceMeters:number;
 minimumOrderMinor:number;
 freeDeliveryFromMinor?:number;
 minFeeMinor?:number;
 maxFeeMinor?:number;
};
export type DeliveryQuote={
 eligible:boolean;
 reason?:"out_of_range"|"below_minimum"|"invalid_route";
 distanceMeters:number;
 estimatedDurationSeconds:number;
 feeMinor:number|null;
 freeDelivery:boolean;
};
export type PackagingCartItem={productId:string;quantity:number};
export type PackagingRule={
 id:string;
 productId?:string;
 unitPriceMinor:number;
 quantityPerProduct:number;
 policy:PackagingPolicy;
 scope:"item"|"order";
};
export type PackagingCharge={ruleId:string;units:number;totalMinor:number;policy:PackagingPolicy};
export type PickupSlotPolicy={openingMinute:number;closingMinute:number;slotIntervalMinutes:number;preparationMinutes:number;minimumNoticeMinutes:number};
export type PickupSlot={minuteOfDay:number;available:boolean};
export type OrderContactRequirements={loginRequired:boolean;verifiedContactRequired:boolean;addressRequired:boolean;tableRequired:boolean;pickupSlotRequired:boolean};

function natural(value:number,name:string,allowZero=true):number{
 if(!Number.isSafeInteger(value)||value<0||(!allowZero&&value===0))throw new Error("Invalid "+name);
 return value;
}
function addSafe(a:number,b:number):number{
 const result=a+b;if(!Number.isSafeInteger(result))throw new Error("Amount overflow");
 return result;
}
function multiplySafe(a:number,b:number):number{
 const result=a*b;if(!Number.isSafeInteger(result))throw new Error("Amount overflow");
 return result;
}
/** Lightweight passwordless phone-OTP login for remote pickup/delivery; table ordering stays anonymous. */
export function contactRequirements(mode:ServiceMode):OrderContactRequirements{
 if(mode==="dine_in")return {loginRequired:false,verifiedContactRequired:false,addressRequired:false,tableRequired:true,pickupSlotRequired:false};
 if(mode==="pickup")return {loginRequired:true,verifiedContactRequired:true,addressRequired:false,tableRequired:false,pickupSlotRequired:true};
 if(mode==="delivery")return {loginRequired:true,verifiedContactRequired:true,addressRequired:true,tableRequired:false,pickupSlotRequired:false};
 throw new Error("Unknown service mode");
}
/** Quotes are provisional and must be confirmed in an authenticated backend checkout transaction. */
export function quoteDeliveryFromVerifiedRoute(route:RouteEvidence,policy:DeliveryFeePolicy,subtotalMinor:number):DeliveryQuote{
 natural(subtotalMinor,"subtotal");
 natural(route.distanceMeters,"route distance");natural(route.durationSeconds,"route duration");
 if(!route.provider||!route.routeId||!route.quotedAt||!Number.isFinite(Date.parse(route.quotedAt)))return {eligible:false,reason:"invalid_route",distanceMeters:route.distanceMeters,estimatedDurationSeconds:route.durationSeconds,feeMinor:null,freeDelivery:false};
 natural(policy.baseMinor,"base fee");natural(policy.perKmMinor,"per kilometer fee");natural(policy.maxDistanceMeters,"service radius",false);natural(policy.minimumOrderMinor,"minimum order");
 if(policy.freeDeliveryFromMinor!==undefined)natural(policy.freeDeliveryFromMinor,"free delivery threshold");
 if(policy.minFeeMinor!==undefined)natural(policy.minFeeMinor,"minimum delivery fee");
 if(policy.maxFeeMinor!==undefined)natural(policy.maxFeeMinor,"maximum delivery fee");
 const common={distanceMeters:route.distanceMeters,estimatedDurationSeconds:route.durationSeconds,freeDelivery:false};
 if(route.distanceMeters>policy.maxDistanceMeters)return {...common,eligible:false as const,reason:"out_of_range" as const,feeMinor:null};
 if(subtotalMinor<policy.minimumOrderMinor)return {...common,eligible:false as const,reason:"below_minimum" as const,feeMinor:null};
 if(policy.freeDeliveryFromMinor!==undefined&&subtotalMinor>=policy.freeDeliveryFromMinor)return {...common,eligible:true as const,feeMinor:0,freeDelivery:true};
 // Integer arithmetic: round up the partial-kilometer proportion in minor units.
 const distanceCharge=Math.ceil(multiplySafe(route.distanceMeters,policy.perKmMinor)/1000);
 let fee=addSafe(policy.baseMinor,distanceCharge);
 if(policy.minFeeMinor!==undefined)fee=Math.max(fee,policy.minFeeMinor);
 if(policy.maxFeeMinor!==undefined)fee=Math.min(fee,policy.maxFeeMinor);
 return {...common,eligible:true as const,feeMinor:fee};
}
/** Per-order packaging rules are charged ONCE; per-item rules follow the quantity ordered. */
export function calculatePackaging(rules:PackagingRule[],items:PackagingCartItem[]):{lines:PackagingCharge[];totalMinor:number}{
 if(items.length===0)throw new Error("Packaging requires an order");
 const quantities=new Map<string,number>();
 for(const item of items){
  if(!item.productId)throw new Error("Missing product ID");
  natural(item.quantity,"item quantity",false);
  quantities.set(item.productId,addSafe(quantities.get(item.productId)??0,item.quantity));
 }
 let totalMinor=0;
 const seenRules=new Set<string>();
 const lines=rules.map(rule=>{
  if(!rule.id||seenRules.has(rule.id))throw new Error("Missing or duplicate packaging ID");
  seenRules.add(rule.id);
  natural(rule.quantityPerProduct,"packaging units");
  natural(rule.unitPriceMinor,"packaging price");
  if(rule.scope!=="item"&&rule.scope!=="order")throw new Error("Unknown packaging scope");
  if(rule.policy!=="charged"&&rule.policy!=="free"&&rule.policy!=="included")throw new Error("Unknown packaging policy");
  if(rule.scope==="item"&&!rule.productId)throw new Error("Item packaging must reference a product");
  // Per-order packaging is evaluated once for the entire basket, even if the
  // same item appears in multiple lines with different modifiers.
  const units=rule.scope==="order"?rule.quantityPerProduct:multiplySafe(rule.quantityPerProduct,quantities.get(rule.productId!)??0);
  const total=rule.policy==="charged"?multiplySafe(units,rule.unitPriceMinor):0;
  totalMinor=addSafe(totalMinor,total);
  return {ruleId:rule.id,units,totalMinor:total,policy:rule.policy};
 });
 return {lines,totalMinor};
}
/** 1-day branch-local pickup slots; the branch timezone and current minute are resolved on the server. */
export function availablePickupSlots(policy:PickupSlotPolicy,currentMinuteOfDay:number,latestReadyMinute:number):PickupSlot[]{
 for(const [name,value] of Object.entries(policy))natural(value,name);
 natural(currentMinuteOfDay,"current minute");natural(latestReadyMinute,"ready minute");
 if(policy.slotIntervalMinutes<5||policy.slotIntervalMinutes>120||policy.closingMinute>1440||policy.openingMinute>=policy.closingMinute)return [];
 const earliest=Math.max(currentMinuteOfDay+policy.minimumNoticeMinutes+policy.preparationMinutes,latestReadyMinute);
 const start=Math.ceil(Math.max(earliest,policy.openingMinute)/policy.slotIntervalMinutes)*policy.slotIntervalMinutes;
 const output:PickupSlot[]=[];
 for(let minute=start;minute<policy.closingMinute;minute+=policy.slotIntervalMinutes)output.push({minuteOfDay:minute,available:true});
 return output;
}
