import {serviceBasket,calculateSplit} from "./beger-salon-demo-model.mjs";
export const staffProfiles={
 omer:{name:"Ömer",chair:"1",model:"commission",percent:60,rent:0,rentPeriod:"week",open:"09:00",close:"19:00",pauseStart:"13:00",pauseEnd:"13:30",takingBookings:true,serviceIds:["hair","beard","combo","kids","care"]},
 ahmet:{name:"Ahmet",chair:"2",model:"chair_rent",percent:0,rent:2500,rentPeriod:"week",open:"10:00",close:"19:00",pauseStart:"13:00",pauseEnd:"13:30",takingBookings:true,serviceIds:["hair","beard","combo","kids","care"]},
 mert:{name:"Mert",chair:"3",model:"salary_plus_commission",percent:25,rent:0,rentPeriod:"week",open:"09:00",close:"18:00",pauseStart:"13:00",pauseEnd:"13:30",takingBookings:true,serviceIds:["hair","beard","combo","kids","care"]}
};
export function staffBusinessSummary(bookings,profiles=staffProfiles){
 const details={};
 for(const [id,p] of Object.entries(profiles)){
  const mine=bookings.filter(b=>b.barberId===id);
  const ledger={bookings:mine.length,pending:0,completed:0,paidBookings:0,serviceCount:0,serviceRevenue:0,barberShare:0,shopShare:0,chairRent:p.model==="chair_rent"?p.rent:0,model:p.model,percent:p.percent};
  for(const b of mine){
   if(b.state==="pending")ledger.pending++;
   if(b.state==="completed")ledger.completed++;
   if(b.state!=="completed"||b.paid!==true)continue;
   let basket;try{basket=serviceBasket(b.serviceIds)}catch{continue}
   ledger.paidBookings++;
   for(const item of basket.items){
    const split=calculateSplit(item.price,p.model,p.percent);
    ledger.serviceRevenue+=item.price;ledger.barberShare+=split.barber;ledger.shopShare+=split.shop;ledger.serviceCount++;
   }
  }
  details[id]=ledger;
 }
 const totals=Object.values(details).reduce((a,b)=>({
  bookings:a.bookings+b.bookings,pending:a.pending+b.pending,completed:a.completed+b.completed,
  serviceRevenue:a.serviceRevenue+b.serviceRevenue,barberShare:a.barberShare+b.barberShare,
  shopShare:a.shopShare+b.shopShare
 }),{bookings:0,pending:0,completed:0,serviceRevenue:0,barberShare:0,shopShare:0});
 return {details,totals};
}
export function canStaffOffer(profiles,staffId,serviceIds){
 const p=profiles[staffId];
 return Boolean(p&&p.takingBookings&&Array.isArray(serviceIds)&&serviceIds.length&&serviceIds.every(id=>p.serviceIds.includes(id)));
}
