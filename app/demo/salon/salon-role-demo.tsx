"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {salonServices,serviceBasket} from "../../../lib/beger-salon-demo-model.mjs";
import "./salon.css";
type Role="customer"|"barber"|"owner";
type State="pending"|"confirmed"|"arrived"|"in_service"|"completed"|"cancelled";
type Appt={id:string;token:string;name:string;serviceIds:string[];barberId:string;time:string;state:State;paid:boolean;events:{state:State;at:string}[]};
const STORAGE="beger:salon:role-demo:v1";
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
 const [origin,setOrigin]=useState("");
 useEffect(()=>{setOrigin(window.location.origin);setRows(read());setHydrated(true);const handler=()=>setRows(read());window.addEventListener("storage",handler);window.addEventListener("beger-salon-change",handler);return()=>{window.removeEventListener("storage",handler);window.removeEventListener("beger-salon-change",handler)}},[]);
 const basket=useMemo(()=>serviceBasket(selected),[selected]);
 const mine=rows.find(x=>x.id===myId)||rows[rows.length-1];
 function commit(updated:Appt[]){write(updated);setRows(updated);}
 function book(){
  if(!name.trim()||!selected.length)return setMessage("أدخل اسم الزبون واختر خدمة واحدة على الأقل");
  const id="B-"+Math.random().toString(36).slice(2,8).toUpperCase();
  const token=crypto.randomUUID();
  const b:Appt={id,token,name:name.trim().slice(0,70),barberId:barber,time,serviceIds:[...selected],state:"pending",paid:false,events:[{state:"pending",at:new Date().toISOString()}]};
  commit([...rows,b]);setMyId(id);setMessage("تم إنشاء الحجز التجريبي، بانتظار تأكيد الصالون");
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
 const title=role==="customer"?"صفحة الزبون":role==="barber"?"واجهة المعلم":"إدارة الصالون";
 return <main className="bs-page" lang="ar" dir="rtl"><div className="bs-wrap">
 <header className="bs-role-head"><div><span className="bs-eyebrow">BEGER · SALON EXPERIENCE</span><h1>{title}</h1><p>نسخة تجربة محلية داخل المتصفح فقط، لا تدير مواعيد أو تنبيهات حقيقية بين أجهزة مختلفة.</p></div><Link href="/demo/salon">العودة لعرض الصالون</Link></header>
 <nav className="bs-role-nav" aria-label="تبديل صفحات المعاينة"><Link href="/demo/salon/customer" aria-current={role==="customer"?"page":undefined}>الزبون</Link><Link href="/demo/salon/barber" aria-current={role==="barber"?"page":undefined}>المعلم</Link><Link href="/demo/salon/owner" aria-current={role==="owner"?"page":undefined}>صاحب المحل</Link></nav>
 {message?<p role="status" className="bs-notice">{message}</p>:null}
 {!hydrated?<p>جارٍ تحميل بيانات العرض…</p>:null}
 {role==="customer"&&hydrated?<div className="bs-layout"><section className="bs-panel">
 <h2>احجز موعداً</h2><p className="bs-fine">اختر خدمات متعددة. السعر والمدة الإجمالية تظهر قبل التأكيد.</p>
 <div className="bs-services">{salonServices.map(s=><button type="button" key={s.id} className={"bs-service "+(selected.includes(s.id)?"chosen":"")} aria-pressed={selected.includes(s.id)} onClick={()=>setSelected(prev=>prev.includes(s.id)?prev.length===1?prev:prev.filter(x=>x!==s.id):[...prev,s.id])}><strong>{s.ar}</strong><small>{s.duration} دقيقة</small><b>{money(s.price)}</b></button>)}</div>
 <div className="bs-schedule-fields" style={{marginTop:18}}><label>المعلم<select value={barber} onChange={e=>setBarber(e.target.value)}>{staff.map(b=><option key={b.id} value={b.id}>{b.name} · كرسي {b.chair}</option>)}</select></label><label>الوقت<select value={time} onChange={e=>setTime(e.target.value)}>{times.map(t=><option key={t}>{t}</option>)}</select></label><label>اسم الزبون<input maxLength={70} value={name} onChange={e=>setName(e.target.value)} placeholder="اسم للتجربة"/></label></div>
 <p><strong>{basket.duration} دقيقة · {money(basket.total)}</strong></p><button className="bs-primary" onClick={book}>إرسال طلب الحجز</button>
 </section><aside className="bs-panel"><h2>متابعة موعدك</h2>{mine?<><strong>#{mine.id}</strong><p>{mine.name} · {mine.time}</p><span className={"bs-status bs-"+mine.state}>{statuses[mine.state]}</span>
 <ol className="bs-role-timeline">{mine.events.map((e,i)=><li key={i}>{statuses[e.state]} <small>{new Date(e.at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</small></li>)}</ol>
 <p className="bs-fine">رابط الحضور خاص بحجز العرض، ولا يمنح صلاحية دخول إلى حساب الصالون.</p>
 {mine.state==="confirmed"?<><Link className="bs-checkin-link" href={"/demo/salon/checkin?token="+encodeURIComponent(mine.token)}>فتح رابط تسجيل الوصول</Link><button className="bs-primary" onClick={()=>checkIn(mine)}>تأكيد الوصول من نفس الجهاز</button></>:null}
 </>:<p>أرسل حجزاً لتظهر تفاصيل المتابعة.</p>}</aside></div>:null}
 {role==="owner"&&hydrated?<div className="bs-panel"><h2>الحجوزات والموظفون</h2><p className="bs-fine">في التطبيق الفعلي، هذه الواجهة تحتاج حساب مالك الصالون وصلاحيات الخادم. هنا العرض مفتوح للتجربة فقط.</p><div className="bs-rows">{rows.map(b=><article key={b.id} className="bs-appointment"><div className="bs-book-number">{b.id}</div><div className="bs-appointment-body"><strong>{b.name}</strong><p>{b.serviceIds.map(id=>salonServices.find(s=>s.id===id)?.ar).join(" + ")} · {b.time} · {staff.find(s=>s.id===b.barberId)?.name}</p><span className={"bs-status bs-"+b.state}>{statuses[b.state]}</span></div><div className="bs-appointment-actions">{b.state==="pending"?<button onClick={()=>advance(b,"confirmed")}>تأكيد الموعد</button>:null}{b.state==="confirmed"?<button onClick={()=>advance(b,"arrived")}>تأكيد الحضور يدوياً</button>:null}{["pending","confirmed","arrived"].includes(b.state)?<button className="bs-muted" onClick={()=>advance(b,"cancelled")}>إلغاء</button>:null}{b.state==="completed"?<button disabled={b.paid} onClick={()=>{commit(rows.map(x=>x.id===b.id?{...x,paid:true}:x));setMessage("تحصيل تجريبي فقط")}}>{b.paid?"محصّل":"تسجيل التحصيل"}</button>:null}</div></article>)}</div>{!rows.length?<p>لا توجد حجوزات في هذه الجلسة.</p>:null}</div>:null}
 {role==="barber"&&hydrated?<div className="bs-panel"><h2>لوحة المعلم</h2><label className="bs-field">المعلم<select value={barber} onChange={e=>setBarber(e.target.value)}>{staff.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><div className="bs-rows" style={{marginTop:16}}>{rows.filter(b=>b.barberId===barber&&b.state!=="cancelled").map(b=><article className="bs-appointment" key={b.id}><div className="bs-book-number">{b.time}</div><div className="bs-appointment-body"><strong>{b.name}</strong><p>{b.serviceIds.map(id=>salonServices.find(s=>s.id===id)?.ar).join(" + ")}</p><span className={"bs-status bs-"+b.state}>{statuses[b.state]}</span></div><div className="bs-appointment-actions">{b.state==="arrived"?<button onClick={()=>advance(b,"in_service")}>بدء الخدمة</button>:null}{b.state==="in_service"?<button onClick={()=>advance(b,"completed")}>إنهاء الخدمة</button>:null}</div></article>)}</div></div>:null}
 <p className="bs-fine" style={{marginTop:22}}>الحجوزات المشتركة بهذه المعاينة تعمل فقط بين صفحات نفس المتصفح/الجهاز. رمز الوصول هنا للتجربة وليس إثبات هوية آمناً. الإشعارات الحقيقية تحتاج حسابات وصلاحيات وRealtime/Push من الخادم.</p>
 </div></main>;
}
