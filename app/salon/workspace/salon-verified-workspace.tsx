"use client";
import {useRouter} from "next/navigation";
import {useCallback,useEffect,useRef,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
type SalonStaff={id:string;display_name:string;kind:string;branch_id:string;accepts_bookings:boolean;start_local:string|null;end_local:string|null};
type SalonLine={service_id:string;staff_id:string;chair_id:string|null;line_number:number;duration_minutes:number;price_minor:number};
type SalonBooking={id:string;branch_id:string;customer_name:string;status:string;starts_at:string;ends_at:string;total_minor:number|null;collected_minor:number|null;currency:string;service_lines:SalonLine[];source:string|null;arrival_requested_at:string|null};
export type SalonWorkspaceData={business_id:string;scope:"whole_business"|"assigned_staff";role:"owner"|"manager"|"staff";staff:SalonStaff[];bookings:SalonBooking[];summary:{assigned_bookings:number;pending_bookings:number;completed_bookings:number;settled_service_minor:number};billing_enabled:false;demo_api:true;limited_results:number};
const statusText:Record<string,string>={pending:"بانتظار موافقة المعلم",confirmed:"مؤكد",arrived:"وصل الزبون",in_service:"قيد الخدمة",completed:"مكتمل",cancelled:"ملغى",no_show:"لم يحضر"};
const money=(minor:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(minor/100);
const boxStyle={background:"#fff",border:"1px solid #e0e9e1",borderRadius:15,padding:19};
export default function SalonVerifiedWorkspace({businessId,initial}:{businessId:string;initial:SalonWorkspaceData}){
 const router=useRouter();
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [snapshot,setSnapshot]=useState<SalonWorkspaceData>(initial);
 const [syncState,setSyncState]=useState<"syncing"|"live"|"offline">("live");
 const [lastSynced,setLastSynced]=useState("");
 const [alertsAllowed,setAlertsAllowed]=useState(false);
 const [latestChange,setLatestChange]=useState("");
 const viewRef=useRef<SalonWorkspaceData>(initial);
 const runningRef=useRef(false);
 const aliveRef=useRef(true);
 const [filter,setFilter]=useState("all");
 const [search,setSearch]=useState("");
 const valid=initial?.business_id===businessId&&["whole_business","assigned_staff"].includes(initial.scope)&&initial.billing_enabled===false;
 const refresh=useCallback(async()=>{
  if(!valid||runningRef.current||!aliveRef.current)return;
  runningRef.current=true;
  setSyncState("syncing");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g47_salon_workspace",{p_business:businessId});
   if(rpcError||!data||data.business_id!==businessId||
      data.role!==initial.role||data.scope!==initial.scope||
      data.billing_enabled!==false||!Array.isArray(data.bookings)||!Array.isArray(data.staff)){
    throw new Error("Invalid authenticated workspace");
   }
   if(!aliveRef.current)return;
   const next=data as SalonWorkspaceData;
   const previous=new Map(viewRef.current.bookings.map(b=>[b.id,b.status]));
   const added=next.bookings.filter(b=>!previous.has(b.id)&&b.status==="pending");
   const updated=next.bookings.filter(b=>previous.has(b.id)&&previous.get(b.id)!==b.status);
   if(added.length||updated.length){
    const changed=added[0]??updated[0];
    const text=added.length?`وصل حجز جديد: ${changed.customer_name}`:
      `تغيّرت حالة موعد ${changed.customer_name}: ${statusText[changed.status]??changed.status}`;
    setLatestChange(text);
    if(typeof Notification!=="undefined"&&Notification.permission==="granted"&&document.visibilityState==="visible"){
     new Notification("Beger Salon — تحديث الحجوزات",{body:text});
    }
   }
   viewRef.current=next;setSnapshot(next);setSyncState("live");
   setLastSynced(new Date().toLocaleTimeString("ar",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"}));
  }catch{if(aliveRef.current)setSyncState("offline");}
  finally{runningRef.current=false;}
 },[businessId,initial.role,initial.scope,valid]);
 useEffect(()=>{
  aliveRef.current=true;viewRef.current=initial;setSnapshot(initial);
  setAlertsAllowed(typeof Notification!=="undefined"&&Notification.permission==="granted");
  const run=()=>{if(document.visibilityState==="visible")void refresh()};
  const timer=window.setInterval(run,15000);
  window.addEventListener("focus",run);
  document.addEventListener("visibilitychange",run);
  return()=>{aliveRef.current=false;window.clearInterval(timer);window.removeEventListener("focus",run);document.removeEventListener("visibilitychange",run)};
 },[initial,refresh]);
 async function allowAlerts(){
  if(typeof Notification==="undefined"){setNotice("المتصفح الحالي لا يدعم إشعارات سطح المكتب");return;}
  try{const p=await Notification.requestPermission();setAlertsAllowed(p==="granted");
   if(p!=="granted")setNotice("ما تم تفعيل إشعارات المتصفح. تحديث الحجوزات داخل اللوحة ما زال يعمل.");
  }catch{setNotice("تعذّر تفعيل إشعارات المتصفح");}
 }
 if(!valid)return <p role="alert">تعذّر التحقق من نطاق بيانات الصالون. تم إيقاف العرض.</p>;
 const owner=snapshot.scope==="whole_business";
 const filtered=snapshot.bookings.filter(b=>(filter==="all"||b.status===filter)&&
  (b.customer_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())||b.id.toLowerCase().includes(search.toLowerCase())));
 async function approve(id:string){
  if(busy)return;
  if(!window.confirm("تأكيد هذا الحجز؟ سيتم تحديث حالة الحجز وتسجيل الموافقة في سجل الصالون، دون إرسال إشعار خارجي."))return;
  setBusy(id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g47_approve_salon_booking",{p_business:businessId,p_booking:id});
   if(rpcError||data?.status!=="confirmed"||data?.audit_recorded!==true)throw Error("Could not verify approval");
   setNotice("تم تأكيد الحجز على الخادم وتسجيل الموافقة.");
   await refresh();
   router.refresh();
  }catch{
   setError("تعذّر تأكيد الحجز. قد يكون تغيّر، أو أُسند لمعلم آخر، أو انتهت صلاحية الجلسة.");
  }finally{setBusy(null);}
 }
 async function stage(id:string,next:"arrived"|"in_service"|"completed"|"cancelled"|"no_show"){
  if(busy)return;
  const names={arrived:"تأكيد وصول الزبون",in_service:"بدء الخدمة",completed:"إنهاء الخدمة",cancelled:"إلغاء الحجز",no_show:"تسجيل عدم الحضور"};
  if(!window.confirm(names[next]+"؟ سيتم تسجيل هذا الإجراء باسم حسابك."))return;
  setBusy(id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g52_salon_booking_stage",
    {p_business:businessId,p_booking:id,p_next:next});
   if(rpcError||data?.status!==next||data?.event_recorded!==true)throw new Error("Invalid transition result");
   setNotice("تم تحديث الموعد: "+names[next]);
   await refresh();
   router.refresh();
  }catch{setError("تعذّر تحديث الحالة. تحقق من مرحلة الموعد وصلاحياتك وجلسة حسابك.");}
  finally{setBusy(null)}
 }
 async function recordManualCollection(id:string){
  if(busy||!owner)return;
  if(!window.confirm("تسجيل تحصيل نقدي/خارجي تم استلامه بالفعل؟ هذا توثيق يدوي فقط، ولن يخصم النظام أموالاً أو يحوّل مستحقات."))return;
  setBusy(id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g54_record_manual_collection",
    {p_business:businessId,p_booking:id});
   if(rpcError||data?.status!=="recorded_manual_collection"||
      data?.audit_recorded!==true||data?.payment_provider_charged!==false)throw new Error("collection rejected");
   setNotice("تم توثيق التحصيل اليدوي. لم تُجرَ معاملة مع مزوّد دفع.");
   await refresh();router.refresh();
  }catch{setError("تعذّر تسجيل التحصيل. يلزم إكمال الخدمة واتفاق معلم ساري وحساب إداري مخوّل.")}
  finally{setBusy(null)}
 }
 const stats=[
  {label:owner?"الحجوزات المسجلة":"حجوزاتي المسندة",value:snapshot.summary.assigned_bookings},
  {label:"بانتظار التأكيد",value:snapshot.summary.pending_bookings},
  {label:"الخدمات المكتملة",value:snapshot.summary.completed_bookings},
  {label:owner?"الخدمات المحصّلة":"خدماتي المحصّلة",value:money(snapshot.summary.settled_service_minor)}
 ];
 return <div style={{display:"grid",gap:17}}>
  <section style={{...boxStyle,background:"#e8f4eb",borderColor:"#cee2d1",display:"flex",alignItems:"center",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}>
   <div><strong style={{fontSize:19}}>{owner?"إدارة كل الصالون":"مساحة المعلم الخاصة"}</strong><p style={{fontSize:12,color:"#55715e",margin:"6px 0 0"}}>{owner?"يمكنك مراجعة فريقك وجميع حجوزات النشاط.":"لا تظهر إلا الحجوزات المسندة إليك؛ ولا يمكنك تأكيد حجوزات زملائك."}</p></div>
   <span style={{fontSize:12,fontWeight:900,color:"#276948",background:"#fff",borderRadius:22,padding:"9px 12px"}}>{initial.role==="owner"?"مالك":initial.role==="manager"?"مدير":"معلم"}</span>
  </section>
  <section style={{...boxStyle,padding:13,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
    <div style={{display:"grid",gap:5}}><strong style={{fontSize:12,color:syncState==="offline"?"#a2553b":"#28654a"}}>
      {syncState==="live"?"تحديث تلقائي مفعّل":syncState==="syncing"?"جارٍ جلب التغييرات…":"تعذّر التحديث — ستُعاد المحاولة"}
     </strong><small style={{fontSize:11,color:"#6e7e71"}}>مزامنة آمنة كل 15 ثانية أثناء فتح الصفحة {lastSynced?"· آخر فحص "+lastSynced:""}</small></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button type="button" onClick={()=>void refresh()} style={{border:"1px solid #d1e2d4",background:"#f3faf4",borderRadius:9,padding:"9px 12px",color:"#215f44",cursor:"pointer"}}>تحديث الآن</button>
      <button type="button" onClick={()=>void allowAlerts()} disabled={alertsAllowed} style={{border:"1px solid #d1e2d4",background:"#f3faf4",borderRadius:9,padding:"9px 12px",color:"#215f44",cursor:"pointer"}}>{alertsAllowed?"تنبيهات المتصفح مفعلة":"تفعيل تنبيهات المتصفح"}</button>
    </div>
   </section>
  {latestChange?<p role="status" style={{margin:0,color:"#1d7050",fontSize:13,fontWeight:750}}>{latestChange}</p>:null}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12}}>{stats.map(s=><section key={s.label} style={boxStyle}><small style={{color:"#6b826f"}}>{s.label}</small><div style={{fontSize:24,fontWeight:900,marginTop:12,color:"#226145"}}>{s.value}</div></section>)}</div>
  <section style={boxStyle}><h2 style={{fontSize:19,marginTop:0}}>{owner?"المعلمين المسجلين":"ملفي المهني"}</h2>
    {snapshot.staff.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:10}}>{snapshot.staff.map(s=><div key={s.id} style={{border:"1px solid #e3ece4",borderRadius:10,padding:12}}><strong>{s.display_name}</strong><p style={{margin:"7px 0",fontSize:12,color:"#647d6d"}}>{s.kind==="barber"?"حلاق":s.kind==="stylist"?"مصفف":"اختصاصي"} · {s.accepts_bookings?"يستقبل حجوزات":"الحجوزات متوقفة"}</p><small>{s.start_local&&s.end_local?s.start_local+" — "+s.end_local:"دوام غير محدد"}</small></div>)}</div>:<p style={{fontSize:13,color:"#8a7364"}}>لم يتم إضافة معلمين بعد. الإعداد الأولي قيد التجهيز.</p>}
  </section>
  <section style={boxStyle}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><h2 style={{fontSize:19,margin:0}}>{owner?"جميع الحجوزات":"حجوزاتي"}</h2><span style={{fontSize:12,color:"#68816d"}}>آخر {snapshot.limited_results} حجز كحد أقصى</span></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:10,margin:"16px 0"}}>
     <input aria-label="بحث عن اسم أو رقم حجز" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث عن زبون أو رقم الحجز" style={{minWidth:180,flex:1,border:"1px solid #d8e7d9",borderRadius:10,padding:11}}/>
     <select aria-label="تصفية حسب الحالة" value={filter} onChange={e=>setFilter(e.target.value)} style={{border:"1px solid #d8e7d9",borderRadius:10,padding:11}}><option value="all">كل الحالات</option>{Object.entries(statusText).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    </div>
    {error?<p role="alert" style={{color:"#9b4339"}}>{error}</p>:null}
    {notice?<p role="status" style={{color:"#216b49"}}>{notice}</p>:null}
    <div style={{display:"grid",gap:9}}>
     {filtered.map(b=><article key={b.id} style={{border:"1px solid #e0e8e0",borderRadius:12,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:13,flexWrap:"wrap"}}>
      <div style={{display:"grid",gap:5,minWidth:180,flex:1}}><strong>{b.customer_name}</strong><small style={{color:"#627a69"}}>{new Date(b.starts_at).toLocaleString("ar",{timeZone:"Europe/Istanbul",dateStyle:"medium",timeStyle:"short"})}</small><small>{b.service_lines.length} خدمات · {statusText[b.status]??b.status}</small>{b.status==="confirmed"&&b.arrival_requested_at?<small style={{fontWeight:900,color:"#176f4c"}}>الزبون أرسل طلب وصول — تحقق من حضوره ثم اضغط تأكيد الوصول</small>:null}{owner&&b.total_minor!==null?<small>إجمالي الفاتورة: {money(b.total_minor)}</small>:null}</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {b.status==="confirmed"?<button type="button" disabled={Boolean(busy)} onClick={()=>void stage(b.id,"arrived")} style={{border:0,borderRadius:9,padding:10,background:"#246f53",color:"#fff"}}>تأكيد وصول الزبون</button>:null}
      {b.status==="arrived"?<button type="button" disabled={Boolean(busy)} onClick={()=>void stage(b.id,"in_service")} style={{border:0,borderRadius:9,padding:10,background:"#246f53",color:"#fff"}}>بدء الخدمة</button>:null}
      {b.status==="in_service"?<button type="button" disabled={Boolean(busy)} onClick={()=>void stage(b.id,"completed")} style={{border:0,borderRadius:9,padding:10,background:"#246f53",color:"#fff"}}>إنهاء الخدمة</button>:null}
      {["pending","confirmed","arrived"].includes(b.status)?<button type="button" disabled={Boolean(busy)} onClick={()=>void stage(b.id,"cancelled")} style={{border:"1px solid #edcdc7",borderRadius:9,padding:10,background:"#fff5f1",color:"#8d4840"}}>إلغاء</button>:null}
      {b.status==="confirmed"?<button type="button" disabled={Boolean(busy)} onClick={()=>void stage(b.id,"no_show")} style={{border:"1px solid #e4d5bd",borderRadius:9,padding:10,background:"#fffaf1",color:"#8a6934"}}>لم يحضر</button>:null}
      </div>
      {owner&&b.status==="completed"&&b.total_minor!==null&&b.total_minor>0&&b.collected_minor===0?
       <button type="button" disabled={Boolean(busy)} onClick={()=>void recordManualCollection(b.id)} style={{border:0,borderRadius:9,padding:10,background:"#256e55",color:"#fff"}}>تسجيل تحصيل يدوي</button>:null}
      {b.status==="pending"?<button type="button" disabled={Boolean(busy)} onClick={()=>void approve(b.id)} style={{border:0,borderRadius:10,padding:"11px 15px",background:"#1b7653",color:"#fff",fontWeight:800,cursor:"pointer"}}>{busy===b.id?"جارٍ التأكيد…":"تأكيد الحجز"}</button>:null}
     </article>)}
     {!filtered.length?<p style={{color:"#718274",fontSize:13}}>لا يوجد حجز مطابق. عند بدء استقبال الحجوزات الحقيقية ستظهر هنا بعد التحقق من الصلاحيات.</p>:null}
    </div>
  </section>
  <p style={{fontSize:12,color:"#7c887f",margin:0}}>تعمل هذه اللوحة من خلال وظائف Supabase المحمية. تحديث هذه اللوحة يعمل دورياً بين الأجهزة المسجّلة. إشعارات الخلفية وQR للحجز العام لم يكتمل تفعيلهما بعد، ولا يتم تحصيل الأموال هنا.</p>
 </div>;
}
