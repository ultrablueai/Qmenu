import {salonServices,serviceBasket} from "../../../lib/beger-salon-demo-model.mjs";
type State="pending"|"confirmed"|"arrived"|"in_service"|"completed"|"cancelled";
export type ApptSummary={barberId:string;serviceIds:string[];state:State;paid:boolean};
const getAmount=(b:ApptSummary)=>{try{return serviceBasket(b.serviceIds).total}catch{return 0}};
export function salonRoleMetrics(bookings:ApptSummary[],barberId?:string){
 const list=barberId?bookings.filter(b=>b.barberId===barberId):bookings;
 return {total:list.length,pending:list.filter(b=>b.state==="pending").length,
  confirmed:list.filter(b=>b.state==="confirmed").length,
  arrived:list.filter(b=>b.state==="arrived").length,
  inService:list.filter(b=>b.state==="in_service").length,
  completed:list.filter(b=>b.state==="completed").length,
  cancelled:list.filter(b=>b.state==="cancelled").length,
  collected:list.filter(b=>b.state==="completed"&&b.paid).reduce((n,b)=>n+getAmount(b),0),
  outstanding:list.filter(b=>b.state==="completed"&&!b.paid).reduce((n,b)=>n+getAmount(b),0)};
}
export function SalonMetrics({bookings,barberId}:{bookings:ApptSummary[];barberId?:string}){
 const data=salonRoleMetrics(bookings,barberId);
 const money=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n);
 const cards=[
  {label:"حجوزات اليوم",value:String(data.total)},
  {label:"بانتظار التأكيد",value:String(data.pending)},
  {label:"وصلوا / بالخدمة",value:String(data.arrived+data.inService)},
  {label:"الخدمات المكتملة",value:String(data.completed)},
  {label:"المحصّل التجريبي",value:money(data.collected)},
  {label:"غير المحصّل",value:money(data.outstanding)}
 ];
 return <section aria-label={barberId?"ملخص المعلم":"ملخص الصالون"} className="bs-analytics">
   {cards.map(item=><article key={item.label} className="bs-analytic-card"><span>{item.label}</span><strong>{item.value}</strong></article>)}
 </section>;
}
export function SalonServiceMix({bookings}:{bookings:ApptSummary[]}){
 const counter=new Map<string,number>();
 for(const b of bookings){if(b.state==="cancelled")continue;for(const id of b.serviceIds)counter.set(id,(counter.get(id)||0)+1);}
 const ranks=[...counter].sort((a,b)=>b[1]-a[1]);
 return <section className="bs-panel"><h2>الخدمات المطلوبة</h2>{ranks.length?
 <div className="bs-service-mix">{ranks.map(([id,count])=><div key={id}><span>{salonServices.find(x=>x.id===id)?.ar??id}</span><b>{count}</b></div>)}</div>:
 <p className="bs-fine">ما في خدمات محجوزة بعد.</p>}</section>;
}
