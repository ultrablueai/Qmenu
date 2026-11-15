export const salonServices=[
 {id:"hair",ar:"قص شعر",tr:"Saç kesimi",en:"Haircut",duration:30,price:350,icon:"✂"},
 {id:"beard",ar:"تهذيب لحية",tr:"Sakal",en:"Beard trim",duration:20,price:200,icon:"♢"},
 {id:"combo",ar:"شعر ولحية",tr:"Saç + sakal",en:"Hair + beard",duration:50,price:500,icon:"✦"},
 {id:"kids",ar:"قص أطفال",tr:"Çocuk kesimi",en:"Kids haircut",duration:25,price:280,icon:"★"},
 {id:"care",ar:"غسيل وعناية",tr:"Yıkama & bakım",en:"Wash & care",duration:20,price:180,icon:"◉"}
];

export const womensSalonServices=[
 {id:"wcut",ar:"قص وتصفيف",tr:"Kadın saç kesimi",en:"Women's haircut",duration:50,price:650,icon:"✂"},
 {id:"color",ar:"صبغة شعر",tr:"Saç boyama",en:"Hair coloring",duration:120,price:1800,icon:"◈"},
 {id:"blow",ar:"سشوار",tr:"Fön",en:"Blow-dry",duration:35,price:350,icon:"✦"},
 {id:"nails",ar:"مانيكير",tr:"Manikür",en:"Manicure",duration:45,price:450,icon:"◉"},
 {id:"brows",ar:"حواجب",tr:"Kaş tasarımı",en:"Brow shaping",duration:20,price:250,icon:"♧"},
 {id:"carew",ar:"عناية بالشعر",tr:"Saç bakımı",en:"Hair treatment",duration:60,price:800,icon:"♡"}
];
export const defaultSalonSchedule={open:"09:00",close:"19:00",gapMinutes:10,
 breakStart:"13:00",breakEnd:"13:30",closedDays:[],
 staffHours:{},staffBreaks:{},serviceDurations:{}};
export function validateSchedule(schedule){
 if(!schedule||!Number.isInteger(schedule.gapMinutes)||schedule.gapMinutes<0||schedule.gapMinutes>120)throw Error("Invalid gap");
 if(!(mins(schedule.open)<mins(schedule.close)))throw Error("Invalid shop hours");
 if(!Array.isArray(schedule.closedDays)||schedule.closedDays.some(x=>!Number.isInteger(x)||x<0||x>6))throw Error("Invalid closed days");
 if(schedule.breakStart&&schedule.breakEnd&&mins(schedule.breakStart)>=mins(schedule.breakEnd))throw Error("Invalid break");
 for(const [staff,hours] of Object.entries(schedule.staffHours||{})){
  if(!staff||!hours||!(mins(hours.start)<mins(hours.end)))throw Error("Invalid staff hours");
 }
 for(const [staff,range] of Object.entries(schedule.staffBreaks||{})){
  if(!staff||!range||!(mins(range.start)<mins(range.end)))throw Error("Invalid staff break");
 }
 for(const duration of Object.values(schedule.serviceDurations||{})){
  if(!Number.isInteger(duration)||duration<5||duration>480)throw Error("Invalid service duration");
 }
 return true;
}
export function effectiveCatalog(catalog,schedule){
 validateSchedule(schedule);
 return catalog.map(s=>({...s,duration:schedule.serviceDurations[s.id]??s.duration}));
}
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
export function serviceBasket(serviceIds,catalog=salonServices){
 if(!Array.isArray(serviceIds)||serviceIds.length===0||new Set(serviceIds).size!==serviceIds.length)throw Error("Invalid service basket");
 const items=serviceIds.map(id=>catalog.find(s=>s.id===id));
 if(items.some(s=>!s))throw Error("Unknown service in basket");
 return {items,total:items.reduce((n,s)=>n+s.price,0),duration:items.reduce((n,s)=>n+s.duration,0)};
}
export function bookingServiceIds(booking){
 return Array.isArray(booking.serviceIds)&&booking.serviceIds.length?booking.serviceIds:[booking.serviceId];
}
export function slotFree(bookings,serviceIds,barberId,chairId,date,time,excludeId=null,settings=null,catalog=salonServices){
 let target;
 try{target=serviceBasket(Array.isArray(serviceIds)?serviceIds:[serviceIds],catalog);}catch{return false;}
 if(!salonChairs.includes(chairId))return false;
 if(settings){
  try{validateSchedule(settings);}catch{return false;}
  const weekday=new Date(date+"T12:00:00Z").getUTCDay();
  if(Number.isNaN(weekday)||settings.closedDays.includes(weekday))return false;
  const hours=settings.staffHours?.[barberId];
  const start=Math.max(mins(settings.open),hours?mins(hours.start):0);
  const end=Math.min(mins(settings.close),hours?mins(hours.end):1440);
  const proposedEnd=mins(time)+target.duration+settings.gapMinutes;
  if(mins(time)<start||proposedEnd>end)return false;
  const breaks=[
   ...(settings.breakStart&&settings.breakEnd?[{start:settings.breakStart,end:settings.breakEnd}]:[]),
   ...(settings.staffBreaks?.[barberId]?[settings.staffBreaks[barberId]]:[])
  ];
  if(breaks.some(b=>mins(time)<mins(b.end)&&proposedEnd>mins(b.start)))return false;
 }else if(mins(time)<540||mins(time)+target.duration>1140)return false;
 return !bookings.some(b=>{
  if(b.id===excludeId||b.date!==date||b.status==="cancelled")return false;
  if(b.barberId!==barberId&&b.chairId!==chairId)return false;
  let existing;
  try{existing=serviceBasket(bookingServiceIds(b),catalog);}catch{return true;}
  return timesOverlap(time,target.duration+(settings?.gapMinutes??0),b.time,existing.duration+(settings?.gapMinutes??0));
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
export function calculateLedger(bookings,policies,catalog=salonServices){
 const byBarber=Object.fromEntries(Object.keys(policies).map(id=>[id,{sales:0,barber:0,shop:0,services:0}]));
 for(const b of bookings){
  if(b.status!=="completed"||b.paid!==true)continue;
  const policy=policies[b.barberId],ledger=byBarber[b.barberId];
  if(!policy||!ledger)continue;
  let basket;
  try{basket=serviceBasket(bookingServiceIds(b),catalog);}catch{continue;}
  for(const service of basket.items){
   const split=calculateSplit(service.price,policy.model,policy.percent);
   ledger.sales+=service.price;ledger.barber+=split.barber;ledger.shop+=split.shop;ledger.services++;
  }
 }
 return byBarber;
}
