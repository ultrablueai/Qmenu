"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {salonServices,serviceBasket,slotFree,defaultSalonSchedule} from "../../../lib/beger-salon-demo-model.mjs";
import "./salon.css";
import {SalonMetrics,SalonServiceMix} from "./salon-role-metrics";
import SalonStaffOperations from "./salon-staff-operations";
import {staffProfiles,canStaffOffer,type StaffProfile} from "../../../lib/beger-salon-staff-operations.mjs";
type Role="customer"|"barber"|"owner";
type State="pending"|"confirmed"|"arrived"|"in_service"|"completed"|"cancelled";
type Appt={id:string;token:string;name:string;serviceIds:string[];barberId:string;time:string;state:State;paid:boolean;events:{state:State;at:string}[]};
const STORAGE="beger:salon:role-demo:v1";
const STAFF_STORAGE="beger:salon:staff-profiles:v1";
const staff=[{id:"omer",name:"Ömer",chair:"1"},{id:"ahmet",name:"Ahmet",chair:"2"},{id:"mert",name:"Mert",chair:"3"}];
const statuses:Record<State,string>={pending:"بانتظار التأكيد",confirmed:"الموعد مؤكد",arrived:"وصل الزبون",in_service:"الخدمة جارية",completed:"الخدمة انتهت",cancelled:"ملغى"};
const times=["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
const demoDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function read():Appt[]{try{const v=JSON.parse(localStorage.getItem(STORAGE)??"[]");return Array.isArray(v)?v.filter((b:Appt)=>b&&typeof b.id==="string"&&Array.isArray(b.serviceIds)&&typeof b.token==="string"):[]}catch{return []}}
function write(rows:Appt[]){localStorage.setItem(STORAGE,JSON.stringify(rows));window.dispatchEvent(new Event("beger-salon-change"));}
const money=(v:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v);
const permitted:Record<State,State[]>={pending:["confirmed","cancelled"],confirmed:["arrived","cancelled"],arrived:["in_service","cancelled"],in_service:["completed"],completed:[],cancelled:[]};
export default function SalonRoleDemo({role}:{role:Role}){
 const [rows,setRows]=useState<Appt[]>([]),[hydrated,setHydrated]=useState(false);
 const [name,setName]=useState(""),[selected,setSelected]=useState(["hair"]),[barber,setBarber]=useState("omer"),[time,setTime]=useState("14:00");
 const [message,setMessage]=useState(""),[myId,setMyId]=useState<string|null>(null);
 const previous=useRef<Record<string,State>>({});
 const [browserAlerts,setBrowserAlerts]=useState(false);
 const [appointmentFilter,setAppointmentFilter]=useState<"all"|State>("all");
 const [search,setSearch]=useState("");
 const [profiles,setProfiles]=useState<Record<string,StaffProfile>>(staffProfiles);
 const [managementTab,setManagementTab]=useState<"appointments"|"staff">("appointments");
 useEffect(()=>{
  const first=read();previous.current=Object.fromEntries(first.map(b=>[b.id,b.state]));setRows(first);setMyId(sessionStorage.getItem("beger:salon:my-booking"));setHydrated(true);
  try{
   const saved=JSON.parse(localStorage.getItem(STAFF_STORAGE)||"null");
   if(saved&&typeof saved==="object"&&Object.keys(staffProfiles).every(id=>saved[id]&&typeof saved[id].takingBookings==="boolean"&&Array.isArray(saved[id].serviceIds)))setProfiles(saved);
  }catch{/* use safe demo defaults */}

  if(role==="customer"){const requested=new URLSearchParams(window.location.search).get("barber");if(staff.some(s=>s.id===requested))setBarber(requested!);}
  setBrowserAlerts(typeof Notification!=="undefined"&&Notification.permission==="granted");
  const onProfiles=()=>{try{const saved=JSON.parse(localStorage.getItem(STAFF_STORAGE)||"null");if(saved)setProfiles(saved)}catch{/* keep local state */}};
  const handler=()=>{
   const updated=read();const changed=updated.find(b=>previous.current[b.id]&&previous.current[b.id]!==b.state);
   if(changed){
    const alert="الموعد #"+changed.id+": "+statuses[changed.state];setMessage(alert);
    if(typeof Notification!=="undefined"&&Notification.permission==="granted")new Notification("Beger Salon — تحديث الموعد",{body:alert});
   }
   previous.current=Object.fromEntries(updated.map(b=>[b.id,b.state]));setRows(updated);
  };
  window.addEventListener("storage",handler);window.addEventListener("beger-salon-change",handler);
  window.addEventListener("beger-salon-staff-change",onProfiles);
  return()=>{window.removeEventListener("storage",handler);window.removeEventListener("beger-salon-change",handler);window.removeEventListener("beger-salon-staff-change",onProfiles)};
 },[]);
 async function enableAlerts(){
  if(typeof Notification==="undefined"){setMessage("المتصفح لا يدعم إشعارات الجهاز");return;}
  const permission=await Notification.requestPermission();
  setBrowserAlerts(permission==="granted");
  setMessage(permission==="granted"?"تم تفعيل تنبيهات هذا المتصفح فقط":"استخدم خط سير الموعد داخل الصفحة لمتابعة التغييرات");
 }
 const basket=useMemo(()=>serviceBasket(selected),[selected]);
 function changeProfile(id:string,changes:Partial<StaffProfile>){
  if(role==="customer"||!profiles[id]||(role==="barber"&&id!==barber))return;
  if(role==="barber"&&["model","percent","rent","rentPeriod","chair"].some(k=>k in changes))return;
  const updated={...profiles,[id]:{...profiles[id],...changes}};
  setProfiles(updated);localStorage.setItem(STAFF_STORAGE,JSON.stringify(updated));window.dispatchEvent(new Event("beger-salon-staff-change"));
 }
 const currentProfile=profiles[barber];
 const staffCanTakeSelected=canStaffOffer(profiles,barber,selected);
 const canUseTime=(candidate:string)=>staffCanTakeSelected&&slotFree(rows.map((b,i)=>({
  id:i+1,customer:b.name,walkin:false,paid:b.paid,serviceIds:b.serviceIds,serviceId:b.serviceIds[0],barberId:b.barberId,
  chairId:staff.find(s=>s.id===b.barberId)?.chair==="1"?"chair-1":staff.find(s=>s.id===b.barberId)?.chair==="2"?"chair-2":"chair-3",
  date:demoDate(),time:b.time,status:b.state==="cancelled"?"cancelled":b.state
 })),selected,barber,barber==="omer"?"chair-1":barber==="ahmet"?"chair-2":"chair-3",demoDate(),candidate,null,
 {...defaultSalonSchedule,open:currentProfile.open,close:currentProfile.close,breakStart:currentProfile.pauseStart,breakEnd:currentProfile.pauseEnd});

 const mine=rows.find(x=>x.id===myId);
 function commit(updated:Appt[]){write(updated);setRows(updated);}
 function book(){
  if(!name.trim()||!selected.length)return setMessage("أدخل اسم الزبون واختر خدمة واحدة على الأقل");
  if(!staffCanTakeSelected)return setMessage("المعلم المختار غير متاح أو لا يقدم جميع الخدمات المختارة");
  if(!canUseTime(time))return setMessage("الموعد مشغول أو ضمن استراحة؛ اختَر وقتاً متاحاً");
  const id="B-"+Math.random().toString(36).slice(2,8).toUpperCase();
  const token=crypto.randomUUID();
  const b:Appt={id,token,name:name.trim().slice(0,70),barberId:barber,time,serviceIds:[...selected],state:"pending",paid:false,events:[{state:"pending",at:new Date().toISOString()}]};
  commit([...rows,b]);setMyId(id);sessionStorage.setItem("beger:salon:my-booking",id);setMessage("تم إنشاء الحجز التجريبي، بانتظار تأكيد المعلم");
 }
 function advance(b:Appt,to:State){
  if(!permitted[b.state].includes(to))return;
  commit(rows.map(x=>x.id===b.id?{...x,state:to,events:[...x.events,{state:to,at:new Date().toISOString()}]}:x));
  setMessage("تحديث المرحلة: "+statuses[to]);
 }
 function checkIn(b:Appt){
  if(b.state!=="confirmed")return setMessage("يجب تأكيد الحجز أولاً");
  advance(b,"arrived");
 }
 const ownerRows=rows.filter(b=>(appointmentFilter==="all"||b.state===appointmentFilter)&&(b.name.toLowerCase().includes(search.toLowerCase())||b.id.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>a.time.localeCompare(b.time));
 const barberRows=rows.filter(b=>b.barberId===barber&&b.state!=="cancelled").sort((a,b)=>a.time.localeCompare(b.time));
 function approveAssigned(b:Appt){
  if(role!=="barber"||b.barberId!==barber||b.state!=="pending"){
   setMessage("هذا الحجز ليس بانتظار موافقة المعلم المحدد");return;
  }
  advance(b,"confirmed");
 }
 function loadShowcaseBookings(){
  if(role!=="owner")return;
  const now=new Date().toISOString();
  const samples:Appt[]=[
   {id:"DEMO-101",token:crypto.randomUUID(),name:"زبون جديد — سامر",serviceIds:["hair","beard"],barberId:"omer",time:"10:00",state:"pending",paid:false,events:[{state:"pending",at:now}]},
   {id:"DEMO-102",token:crypto.randomUUID(),name:"زبون وصل — مراد",serviceIds:["combo"],barberId:"ahmet",time:"11:00",state:"arrived",paid:false,events:[{state:"pending",at:now},{state:"confirmed",at:now},{state:"arrived",at:now}]},
   {id:"DEMO-103",token:crypto.randomUUID(),name:"زبون مكتمل — كريم",serviceIds:["hair","care"],barberId:"mert",time:"15:00",state:"completed",paid:true,events:[{state:"pending",at:now},{state:"confirmed",at:now},{state:"arrived",at:now},{state:"in_service",at:now},{state:"completed",at:now}]}
  ];
  commit([...rows.filter(b=>!b.id.startsWith("DEMO-")),...samples]);
  setMessage("تم تجهيز 3 حجوزات تجريبية: جديد، وصل، ومكتمل ومحصّل. افتح لوحة المعلم لتجربة التأكيد.");
 }
 const title=role==="customer"?"صفحة الزبون":role==="barber"?"لوحة المعلم":"لوحة صاحب الصالون";
 return <main className="bs-page" lang="ar" dir="rtl"><div className="bs-wrap">
 <header className="bs-role-head"><div><span className="bs-eyebrow">BEGER · SALON EXPERIENCE</span><h1>{title}</h1><p>نسخة تجربة محلية داخل المتصفح فقط، لا تدير مواعيد أو تنبيهات حقيقية بين أجهزة مختلفة.</p></div><Link href="/demo/salon">العودة لعرض الصالون</Link></header>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",margin:"12px 0"}}><span className="bs-demo">الإشعارات هنا تجريبية ومحلية، وليست Push من الخادم</span><button type="button" className="bs-checkin-link" onClick={()=>void enableAlerts()}>{browserAlerts?"إشعارات هذا المتصفح مفعلة":"تفعيل إشعارات المتصفح"}</button></div>
 <nav className="bs-role-nav" aria-label="تبديل صفحات المعاينة"><Link href="/demo/salon/share">QR ومشاركة الحجز</Link><Link href="/demo/salon/customer" aria-current={role==="customer"?"page":undefined}>الزبون</Link><Link href="/demo/salon/barber" aria-current={role==="barber"?"page":undefined}>المعلم</Link><Link href="/demo/salon/owner" aria-current={role==="owner"?"page":undefined}>صاحب المحل</Link></nav>
 {message?<p role="status" className="bs-notice">{message}</p>:null}
 {!hydrated?<p>جارٍ تحميل بيانات العرض…</p>:null}
 {role==="customer"&&hydrated?<div className="bs-layout"><section className="bs-panel">
 <h2>احجز موعداً</h2><p className="bs-fine">اختر خدمات متعددة. السعر والمدة الإجمالية تظهر قبل التأكيد.</p>
 <div className="bs-services">{salonServices.map(s=><button type="button" key={s.id} className={"bs-service "+(selected.includes(s.id)?"chosen":"")} aria-pressed={selected.includes(s.id)} onClick={()=>setSelected(prev=>prev.includes(s.id)?prev.length===1?prev:prev.filter(x=>x!==s.id):[...prev,s.id])}><strong>{s.ar}</strong><small>{s.duration} دقيقة</small><b>{money(s.price)}</b></button>)}</div>
 <div className="bs-schedule-fields" style={{marginTop:18}}><label>المعلم<select value={barber} onChange={e=>setBarber(e.target.value)}>{staff.map(b=><option key={b.id} value={b.id}>{b.name} · كرسي {b.chair}</option>)}</select></label><label>الوقت<select value={time} onChange={e=>setTime(e.target.value)}>{times.map(t=><option key={t} disabled={!canUseTime(t)}>{t}</option>)}</select></label><label>اسم الزبون<input maxLength={70} value={name} onChange={e=>setName(e.target.value)} placeholder="اسم للتجربة"/></label></div>
 <p><strong>{basket.duration} دقيقة · {money(basket.total)}</strong></p><button className="bs-primary" disabled={!canUseTime(time)} onClick={book}>إرسال طلب الحجز</button>
 </section><aside className="bs-panel"><h2>متابعة موعدك</h2>{mine?<><strong>#{mine.id}</strong><p>{mine.name} · {mine.time}</p><span className={"bs-status bs-"+mine.state}>{statuses[mine.state]}</span>
 <ol className="bs-role-timeline">{mine.events.map((e,i)=><li key={i}>{statuses[e.state]} <small>{new Date(e.at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</small></li>)}</ol>
 <p className="bs-fine">رابط الحضور خاص بحجز العرض، ولا يمنح صلاحية دخول إلى حساب الصالون.</p>
 {mine.state==="confirmed"?<><Link className="bs-checkin-link" href={"/demo/salon/checkin?token="+encodeURIComponent(mine.token)}>فتح رابط تسجيل الوصول</Link><button className="bs-primary" onClick={()=>checkIn(mine)}>تأكيد الوصول من نفس الجهاز</button></>:null}
 </>:<p>أرسل حجزاً لتظهر تفاصيل المتابعة.</p>}</aside></div>:null}
 {role==="owner"&&hydrated?<div className="bs-role-dashboard">
 <header className="bs-dashboard-title"><div><span className="bs-eyebrow">SALON OVERVIEW</span><h2>لوحة تحكم الصالون</h2><p className="bs-fine">المواعيد، الحضور، التحصيل التجريبي ونشاط المعلمين من مكان واحد.</p></div><div className="bs-owner-demo-actions"><button type="button" onClick={loadShowcaseBookings}>تجهيز بيانات العرض بضغطة</button><span className="bs-demo">عرض بيانات هذا المتصفح فقط</span></div></header>
 <SalonMetrics bookings={rows}/>
 <div className="bs-role-switch"><button type="button" aria-pressed={managementTab==="appointments"} onClick={()=>setManagementTab("appointments")}>العمليات والحجوزات</button><button type="button" aria-pressed={managementTab==="staff"} onClick={()=>setManagementTab("staff")}>المعلمين والكراسي والمحاسبة</button></div>
 {managementTab==="staff"?<SalonStaffOperations role="owner" activeBarber={barber} profiles={profiles} bookings={rows} onProfile={changeProfile}/>:null}
 {managementTab==="appointments"?<>
 <div className="bs-dashboard-cols"><div className="bs-panel"><h2>نشاط المعلمين</h2><div className="bs-service-mix">{staff.map(person=>{const theirs=rows.filter(b=>b.barberId===person.id);return <div key={person.id}><span><b>{person.name}</b> · كرسي {person.chair} · {theirs.length} حجز</span><strong>{theirs.filter(b=>b.state==="pending").length} جديد</strong></div>})}</div></div><SalonServiceMix bookings={rows}/></div>
 <div className="bs-panel"><h2>الحجوزات والموظفون</h2>
 <div className="bs-owner-filters"><label>بحث عن زبون أو رقم حجز<input aria-label="بحث عن زبون أو رقم حجز" value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم الزبون أو رقم الحجز"/></label><label>الحالة<select aria-label="تصفية الحجوزات" value={appointmentFilter} onChange={e=>setAppointmentFilter(e.target.value as "all"|State)}><option value="all">كل الحالات</option>{(Object.keys(statuses) as State[]).map(s=><option value={s} key={s}>{statuses[s]}</option>)}</select></label></div><p className="bs-fine">في التطبيق الفعلي، هذه الواجهة تحتاج حساب مالك الصالون وصلاحيات الخادم. هنا العرض مفتوح للتجربة فقط.</p><div className="bs-rows">{ownerRows.map(b=><article key={b.id} className="bs-appointment"><div className="bs-book-number">{b.id}</div><div className="bs-appointment-body"><strong>{b.name}</strong><p>{b.serviceIds.map(id=>salonServices.find(s=>s.id===id)?.ar).join(" + ")} · {b.time} · {staff.find(s=>s.id===b.barberId)?.name}</p><span className={"bs-status bs-"+b.state}>{statuses[b.state]}</span></div><div className="bs-appointment-actions">{b.state==="pending"?<button onClick={()=>advance(b,"confirmed")}>تأكيد الموعد</button>:null}{b.state==="confirmed"?<button onClick={()=>advance(b,"arrived")}>تأكيد الحضور يدوياً</button>:null}{["pending","confirmed","arrived"].includes(b.state)?<button className="bs-muted" onClick={()=>advance(b,"cancelled")}>إلغاء</button>:null}{b.state==="completed"?<button disabled={b.paid} onClick={()=>{commit(rows.map(x=>x.id===b.id?{...x,paid:true}:x));setMessage("تحصيل تجريبي فقط")}}>{b.paid?"محصّل":"تسجيل التحصيل"}</button>:null}</div></article>)}</div>{!ownerRows.length?<p>لا توجد حجوزات مطابقة للفلاتر.</p>:null}</div></>:null}</div>:null}
 {role==="barber"&&hydrated?<div className="bs-role-dashboard"><header className="bs-dashboard-title"><div><span className="bs-eyebrow">MY APPOINTMENTS</span><h2>مواعيدي اليوم</h2><p className="bs-fine">تأكيد الحجز الخاص بك، متابعة وصول الزبون، بدء الخدمة وإنهاؤها.</p></div><span className="bs-demo">تبديل المعلم لأغراض العرض فقط</span></header><label className="bs-field" style={{maxWidth:260,marginBottom:16}}>المعلم<select value={barber} onChange={e=>setBarber(e.target.value)}>{staff.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><SalonMetrics bookings={rows} barberId={barber}/>
 <div className="bs-role-switch"><button type="button" aria-pressed={managementTab==="appointments"} onClick={()=>setManagementTab("appointments")}>حجوزاتي وزبائني</button><button type="button" aria-pressed={managementTab==="staff"} onClick={()=>setManagementTab("staff")}>دوامي وخدماتي وحسابي</button></div>
 {managementTab==="staff"?<SalonStaffOperations role="barber" activeBarber={barber} profiles={profiles} bookings={rows} onProfile={changeProfile}/>:null}
 {managementTab==="appointments"?<><div className="bs-panel" style={{marginTop:16}}><h2>قائمة زبائني</h2><div className="bs-rows" style={{marginTop:16}}>{barberRows.map(b=><article className="bs-appointment" key={b.id}><div className="bs-book-number">{b.time}</div><div className="bs-appointment-body"><strong>{b.name}</strong><p>{b.serviceIds.map(id=>salonServices.find(s=>s.id===id)?.ar).join(" + ")}</p><span className={"bs-status bs-"+b.state}>{statuses[b.state]}</span></div><div className="bs-appointment-actions">{b.state==="pending"?<button className="bs-approve" type="button" onClick={()=>approveAssigned(b)}>تأكيد حجز زبوني</button>:null}{b.state==="arrived"?<button onClick={()=>advance(b,"in_service")}>بدء الخدمة</button>:null}{b.state==="in_service"?<button onClick={()=>advance(b,"completed")}>إنهاء الخدمة</button>:null}</div></article>)}</div></div></>:null}</div>:null}
 <p className="bs-fine" style={{marginTop:22}}>الحجوزات المشتركة بهذه المعاينة تعمل فقط بين صفحات نفس المتصفح/الجهاز. رمز الوصول هنا للتجربة وليس إثبات هوية آمناً. الإشعارات الحقيقية تحتاج حسابات وصلاحيات وRealtime/Push من الخادم.</p>
 </div></main>;
}
