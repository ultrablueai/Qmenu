"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type SalonStaff={id:string;display_name:string;kind:string;branch_id:string;accepts_bookings:boolean;start_local:string|null;end_local:string|null};
type SalonLine={service_id:string;staff_id:string;chair_id:string|null;line_number:number;duration_minutes:number;price_minor:number};
type SalonBooking={id:string;branch_id:string;customer_name:string;status:string;starts_at:string;ends_at:string;total_minor:number|null;collected_minor:number|null;currency:string;service_lines:SalonLine[];source:string|null};
export type SalonWorkspaceData={business_id:string;scope:"whole_business"|"assigned_staff";role:"owner"|"manager"|"staff";staff:SalonStaff[];bookings:SalonBooking[];summary:{assigned_bookings:number;pending_bookings:number;completed_bookings:number;settled_service_minor:number};billing_enabled:false;demo_api:true;limited_results:number};
const statusText:Record<string,string>={pending:"بانتظار موافقة المعلم",confirmed:"مؤكد",arrived:"وصل الزبون",in_service:"قيد الخدمة",completed:"مكتمل",cancelled:"ملغى",no_show:"لم يحضر"};
const money=(minor:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(minor/100);
const boxStyle={background:"#fff",border:"1px solid #e0e9e1",borderRadius:15,padding:19};
export default function SalonVerifiedWorkspace({businessId,initial}:{businessId:string;initial:SalonWorkspaceData}){
 const router=useRouter();
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [filter,setFilter]=useState("all");
 const [search,setSearch]=useState("");
 const valid=initial?.business_id===businessId&&["whole_business","assigned_staff"].includes(initial.scope)&&initial.billing_enabled===false;
 if(!valid)return <p role="alert">تعذّر التحقق من نطاق بيانات الصالون. تم إيقاف العرض.</p>;
 const owner=initial.scope==="whole_business";
 const filtered=initial.bookings.filter(b=>(filter==="all"||b.status===filter)&&
  (b.customer_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())||b.id.toLowerCase().includes(search.toLowerCase())));
 async function approve(id:string){
  if(busy)return;
  if(!window.confirm("تأكيد هذا الحجز؟ سيتم تحديث حالة الحجز وتسجيل الموافقة في سجل الصالون، دون إرسال إشعار خارجي."))return;
  setBusy(id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g47_approve_salon_booking",{p_business:businessId,p_booking:id});
   if(rpcError||data?.status!=="confirmed"||data?.audit_recorded!==true)throw Error("Could not verify approval");
   setNotice("تم تأكيد الحجز وتسجيل الموافقة على الخادم. التحديث ظاهر عند إعادة تحميل اللوحة.");
   router.refresh();
  }catch{
   setError("تعذّر تأكيد الحجز. قد يكون تغيّر، أو أُسند لمعلم آخر، أو انتهت صلاحية الجلسة.");
  }finally{setBusy(null);}
 }
 const stats=[
  {label:owner?"الحجوزات المسجلة":"حجوزاتي المسندة",value:initial.summary.assigned_bookings},
  {label:"بانتظار التأكيد",value:initial.summary.pending_bookings},
  {label:"الخدمات المكتملة",value:initial.summary.completed_bookings},
  {label:owner?"الخدمات المحصّلة":"خدماتي المحصّلة",value:money(initial.summary.settled_service_minor)}
 ];
 return <div style={{display:"grid",gap:17}}>
  <section style={{...boxStyle,background:"#e8f4eb",borderColor:"#cee2d1",display:"flex",alignItems:"center",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}>
   <div><strong style={{fontSize:19}}>{owner?"إدارة كل الصالون":"مساحة المعلم الخاصة"}</strong><p style={{fontSize:12,color:"#55715e",margin:"6px 0 0"}}>{owner?"يمكنك مراجعة فريقك وجميع حجوزات النشاط.":"لا تظهر إلا الحجوزات المسندة إليك؛ ولا يمكنك تأكيد حجوزات زملائك."}</p></div>
   <span style={{fontSize:12,fontWeight:900,color:"#276948",background:"#fff",borderRadius:22,padding:"9px 12px"}}>{initial.role==="owner"?"مالك":initial.role==="manager"?"مدير":"معلم"}</span>
  </section>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12}}>{stats.map(s=><section key={s.label} style={boxStyle}><small style={{color:"#6b826f"}}>{s.label}</small><div style={{fontSize:24,fontWeight:900,marginTop:12,color:"#226145"}}>{s.value}</div></section>)}</div>
  <section style={boxStyle}><h2 style={{fontSize:19,marginTop:0}}>{owner?"المعلمين المسجلين":"ملفي المهني"}</h2>
    {initial.staff.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:10}}>{initial.staff.map(s=><div key={s.id} style={{border:"1px solid #e3ece4",borderRadius:10,padding:12}}><strong>{s.display_name}</strong><p style={{margin:"7px 0",fontSize:12,color:"#647d6d"}}>{s.kind==="barber"?"حلاق":s.kind==="stylist"?"مصفف":"اختصاصي"} · {s.accepts_bookings?"يستقبل حجوزات":"الحجوزات متوقفة"}</p><small>{s.start_local&&s.end_local?s.start_local+" — "+s.end_local:"دوام غير محدد"}</small></div>)}</div>:<p style={{fontSize:13,color:"#8a7364"}}>لم يتم إضافة معلمين بعد. الإعداد الأولي قيد التجهيز.</p>}
  </section>
  <section style={boxStyle}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><h2 style={{fontSize:19,margin:0}}>{owner?"جميع الحجوزات":"حجوزاتي"}</h2><span style={{fontSize:12,color:"#68816d"}}>آخر {initial.limited_results} حجز كحد أقصى</span></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:10,margin:"16px 0"}}>
     <input aria-label="بحث عن اسم أو رقم حجز" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث عن زبون أو رقم الحجز" style={{minWidth:180,flex:1,border:"1px solid #d8e7d9",borderRadius:10,padding:11}}/>
     <select aria-label="تصفية حسب الحالة" value={filter} onChange={e=>setFilter(e.target.value)} style={{border:"1px solid #d8e7d9",borderRadius:10,padding:11}}><option value="all">كل الحالات</option>{Object.entries(statusText).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    </div>
    {error?<p role="alert" style={{color:"#9b4339"}}>{error}</p>:null}
    {notice?<p role="status" style={{color:"#216b49"}}>{notice}</p>:null}
    <div style={{display:"grid",gap:9}}>
     {filtered.map(b=><article key={b.id} style={{border:"1px solid #e0e8e0",borderRadius:12,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:13,flexWrap:"wrap"}}>
      <div style={{display:"grid",gap:5,minWidth:180,flex:1}}><strong>{b.customer_name}</strong><small style={{color:"#627a69"}}>{new Date(b.starts_at).toLocaleString("ar",{timeZone:"Europe/Istanbul",dateStyle:"medium",timeStyle:"short"})}</small><small>{b.service_lines.length} خدمات · {statusText[b.status]??b.status}</small>{owner&&b.total_minor!==null?<small>إجمالي الفاتورة: {money(b.total_minor)}</small>:null}</div>
      {b.status==="pending"?<button type="button" disabled={Boolean(busy)} onClick={()=>void approve(b.id)} style={{border:0,borderRadius:10,padding:"11px 15px",background:"#1b7653",color:"#fff",fontWeight:800,cursor:"pointer"}}>{busy===b.id?"جارٍ التأكيد…":"تأكيد الحجز"}</button>:null}
     </article>)}
     {!filtered.length?<p style={{color:"#718274",fontSize:13}}>لا يوجد حجز مطابق. عند بدء استقبال الحجوزات الحقيقية ستظهر هنا بعد التحقق من الصلاحيات.</p>:null}
    </div>
  </section>
  <p style={{fontSize:12,color:"#7c887f",margin:0}}>تعمل هذه اللوحة من خلال وظائف Supabase المحمية. استقبال الحجز العام من QR والتنبيهات الحقيقية لم يكتمل بعد، ولا يتم تحصيل الأموال هنا.</p>
 </div>;
}
