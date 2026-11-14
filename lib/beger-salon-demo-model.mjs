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
export function slotFree(bookings,serviceId,barberId,chairId,date,time,excludeId=null){
 const target=salonServices.find(s=>s.id===serviceId);
 if(!target||!salonChairs.includes(chairId))return false;
 if(mins(time)<540||mins(time)+target.duration>1140)return false;
 return !bookings.some(b=>{
  if(b.id===excludeId||b.date!==date||b.status==="cancelled")return false;
  if(b.barberId!==barberId&&b.chairId!==chairId)return false;
  const existing=salonServices.find(s=>s.id===b.serviceId);
  return existing&&timesOverlap(time,target.duration,b.time,existing.duration);
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
  const service=salonServices.find(s=>s.id===b.serviceId);
  const policy=policies[b.barberId],ledger=byBarber[b.barberId];
  if(!service||!policy||!ledger)continue;
  const split=calculateSplit(service.price,policy.model,policy.percent);
  ledger.sales+=service.price;ledger.barber+=split.barber;ledger.shop+=split.shop;ledger.services++;
 }
 return byBarber;
}
