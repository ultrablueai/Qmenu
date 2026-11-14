export const salonServices=[
 {id:"hair",ar:"قص شعر",tr:"Saç kesimi",en:"Haircut",duration:30,price:350,icon:"✂"},
 {id:"beard",ar:"تهذيب لحية",tr:"Sakal",en:"Beard trim",duration:20,price:200,icon:"♢"},
 {id:"combo",ar:"شعر ولحية",tr:"Saç + sakal",en:"Hair + beard",duration:50,price:500,icon:"✦"},
 {id:"kids",ar:"قص أطفال",tr:"Çocuk kesimi",en:"Kids haircut",duration:25,price:280,icon:"★"},
 {id:"care",ar:"غسيل وعناية",tr:"Yıkama & bakım",en:"Wash & care",duration:20,price:180,icon:"◉"}
];
export const salonBarbers=[
 {id:"omer",ar:"عمر",tr:"Ömer",en:"Omer",initial:"Ö"},
 {id:"ahmet",ar:"أحمد",tr:"Ahmet",en:"Ahmet",initial:"A"},
 {id:"mert",ar:"مرت",tr:"Mert",en:"Mert",initial:"M"}
];
export const salonChairs=["chair-1","chair-2","chair-3"];
export function mins(value){const [h,m]=value.split(":").map(Number);return h*60+m;}
export function timesOverlap(aStart,aDuration,bStart,bDuration){
 return mins(aStart)<mins(bStart)+bDuration && mins(bStart)<mins(aStart)+aDuration;
}
export function serviceBasket(serviceIds){
 if(!Array.isArray(serviceIds)||serviceIds.length===0||new Set(serviceIds).size!==serviceIds.length)throw Error("Invalid service basket");
 const items=serviceIds.map(id=>salonServices.find(s=>s.id===id));
 if(items.some(s=>!s))throw Error("Unknown service in basket");
 return {items,total:items.reduce((n,s)=>n+s.price,0),duration:items.reduce((n,s)=>n+s.duration,0)};
}
export function bookingServiceIds(booking){
 return Array.isArray(booking.serviceIds)&&booking.serviceIds.length?booking.serviceIds:[booking.serviceId];
}
export function slotFree(bookings,serviceIds,barberId,chairId,date,time,excludeId=null){
 let target;
 try{target=serviceBasket(Array.isArray(serviceIds)?serviceIds:[serviceIds]);}catch{return false;}
 if(!salonChairs.includes(chairId))return false;
 if(mins(time)<540||mins(time)+target.duration>1140)return false;
 return !bookings.some(b=>{
  if(b.id===excludeId||b.date!==date||b.status==="cancelled")return false;
  if(b.barberId!==barberId&&b.chairId!==chairId)return false;
  let existing;
  try{existing=serviceBasket(bookingServiceIds(b));}catch{return true;}
  return timesOverlap(time,target.duration,b.time,existing.duration);
 });
}
export function calculateSplit(price,model,percentage){
 if(!Number.isSafeInteger(price)||price<0)throw Error("Invalid amount");
 if(!Number.isFinite(percentage)||percentage<0||percentage>100)throw Error("Invalid commission");
 if(model==="commission"||model==="salary_plus_commission"){
  const barber=Math.round(price*percentage/100);
  return {barber,shop:price-barber};
 }
 if(model==="chair_rent")return {barber:price,shop:0};
 if(model==="owner")return {barber:0,shop:price};
 throw Error("Unknown settlement model");
}
export function calculateLedger(bookings,policies){
 const byBarber=Object.fromEntries(Object.keys(policies).map(id=>[id,{sales:0,barber:0,shop:0,services:0}]));
 for(const b of bookings){
  if(b.status!=="completed"||b.paid!==true)continue;
  const policy=policies[b.barberId],ledger=byBarber[b.barberId];
  if(!policy||!ledger)continue;
  let basket;
  try{basket=serviceBasket(bookingServiceIds(b));}catch{continue;}
  for(const service of basket.items){
   const split=calculateSplit(service.price,policy.model,policy.percent);
   ledger.sales+=service.price;ledger.barber+=split.barber;ledger.shop+=split.shop;ledger.services++;
  }
 }
 return byBarber;
}
