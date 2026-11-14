"use client";
import {salonServices} from "../../../lib/beger-salon-demo-model.mjs";
import {staffBusinessSummary,type StaffProfile} from "../../../lib/beger-salon-staff-operations.mjs";
type Booking={barberId:string;state:string;paid:boolean;serviceIds:string[]};
type Props={role:"barber"|"owner";activeBarber:string;profiles:Record<string,StaffProfile>;bookings:Booking[];onProfile:(staffId:string,changes:Partial<StaffProfile>)=>void};
const currency=(v:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v);
export default function SalonStaffOperations({role,activeBarber,profiles,bookings,onProfile}:Props){
 const summary=staffBusinessSummary(bookings,profiles);
 const visibleIds=role==="owner"?Object.keys(profiles):[activeBarber];
 return <div className="bs-staff-ops">
  {role==="owner"?<section className="bs-panel">
   <h2>كشف الصالون المالي الكامل</h2>
   <p className="bs-fine">حصة المعلم وحصة المحل من الخدمات المكتملة والمحصّلة فقط. إيجار الكرسي التزام دوري منفصل، والرواتب والمصاريف والضرائب ليست محسوبة هنا.</p>
   <div className="bs-analytics">
    <article className="bs-analytic-card"><span>إيراد الخدمات المحصّل</span><strong>{currency(summary.totals.serviceRevenue)}</strong></article>
    <article className="bs-analytic-card"><span>حصص المعلمين</span><strong>{currency(summary.totals.barberShare)}</strong></article>
    <article className="bs-analytic-card"><span>حصة المحل قبل المصروف</span><strong>{currency(summary.totals.shopShare)}</strong></article>
   </div>
  </section>:null}
  <section className="bs-panel">
   <h2>{role==="owner"?"إدارة المعلمين والكراسي":"إدارة شغلي ومواعيدي"}</h2>
   <p className="bs-fine">{role==="barber"?"بهذه المعاينة بتقدر تحدد دوامك واستراحتك وخدماتك وتوقف استقبال الحجوزات. النسبة أو إيجار الكرسي يحددهم صاحب المحل.":"صاحب الصالون يشوف كل المعلمين ويحدد نسبة كل معلم أو بدل إيجار كرسيه."}</p>
   <div className="bs-staff-grid">{visibleIds.map(id=>{const profile=profiles[id];const ledger=summary.details[id];if(!profile||!ledger)return null;
    const change=(patch:Partial<StaffProfile>)=>onProfile(id,patch);
    return <article key={id} className="bs-staff-card">
     <header><div><strong>{profile.name}</strong><small>كرسي {profile.chair} · {profile.model==="chair_rent"?"إيجار كرسي":profile.model==="salary_plus_commission"?"راتب ونسبة":profile.model==="owner"?"صاحب المحل":"نسبة خدمات"}</small></div><span className={profile.takingBookings?"bs-staff-available":"bs-staff-paused"}>{profile.takingBookings?"يستقبل حجوزات":"الحجوزات موقوفة"}</span></header>
     <div className="bs-staff-numbers"><div><span>حجوزاتي</span><b>{ledger.bookings}</b></div><div><span>بانتظار تأكيدي</span><b>{ledger.pending}</b></div><div><span>إيراد خدماتي</span><b>{currency(ledger.serviceRevenue)}</b></div><div><span>حصتي</span><b>{currency(ledger.barberShare)}</b></div><div><span>حصة المحل</span><b>{currency(ledger.shopShare)}</b></div></div>
     <div className="bs-schedule-fields">
      <label>بداية الدوام<input type="time" value={profile.open} onChange={e=>{if(e.target.value<profile.close)change({open:e.target.value})}}/></label>
      <label>نهاية الدوام<input type="time" value={profile.close} onChange={e=>{if(e.target.value>profile.open)change({close:e.target.value})}}/></label>
      <label>بداية الاستراحة<input type="time" value={profile.pauseStart} onChange={e=>{if(e.target.value<profile.pauseEnd)change({pauseStart:e.target.value})}}/></label>
      <label>نهاية الاستراحة<input type="time" value={profile.pauseEnd} onChange={e=>{if(e.target.value>profile.pauseStart)change({pauseEnd:e.target.value})}}/></label>
     </div>
     <label className="bs-staff-toggle"><input type="checkbox" checked={profile.takingBookings} onChange={e=>change({takingBookings:e.target.checked})}/>استقبال حجوزات جديدة</label>
     <details className="bs-staff-services"><summary>الخدمات التي أقدّمها ({profile.serviceIds.length})</summary><div>{salonServices.map(s=><label key={s.id}><input type="checkbox" checked={profile.serviceIds.includes(s.id)} onChange={e=>{const next=e.target.checked?[...profile.serviceIds,s.id]:profile.serviceIds.filter(x=>x!==s.id);if(next.length)change({serviceIds:next})}}/>{s.ar}</label>)}</div></details>
     {role==="owner"?<div className="bs-schedule-fields">
      <label>نظام المحاسبة<select value={profile.model} onChange={e=>change({model:e.target.value as StaffProfile["model"]})}><option value="commission">نسبة</option><option value="chair_rent">إيجار كرسي</option><option value="salary_plus_commission">راتب + نسبة</option><option value="owner">صاحب المحل</option></select></label>
      {profile.model==="commission"||profile.model==="salary_plus_commission"?<label>نسبة المعلم %<input type="number" min={0} max={100} step={1} value={profile.percent} onChange={e=>change({percent:Math.min(100,Math.max(0,Math.floor(Number(e.target.value)||0)))})}/></label>:null}
      {profile.model==="chair_rent"?<><label>إيجار الكرسي ₺<input type="number" min={0} value={profile.rent} onChange={e=>change({rent:Math.max(0,Math.floor(Number(e.target.value)||0))})}/></label><label>دورة الإيجار<select value={profile.rentPeriod} onChange={e=>change({rentPeriod:e.target.value as StaffProfile["rentPeriod"]})}><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></label></>:null}
     </div>:<p className="bs-fine">اتفاق حسابي الحالي: {profile.model==="chair_rent"?currency(profile.rent)+" / "+profile.rentPeriod:profile.percent+"% من الخدمات المحصّلة"}. لا يمكنني تغيير الاتفاق من حساب المعلم.</p>}
    </article>})}</div>
  </section>
 </div>;
}
