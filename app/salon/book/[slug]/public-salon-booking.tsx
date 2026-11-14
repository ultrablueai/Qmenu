"use client";
import {useEffect,useMemo,useState} from "react";
import {browserSupabase} from "../../../../lib/supabase/browser";
type Catalog={salon_name:string;slug:string;public_booking_enabled:boolean;timezone:string;
 branches:{id:string;name:string}[];staff:{id:string;name:string;branch_id:string}[];
 chairs:{id:string;label:string;branch_id:string}[];services:{id:string;name:string;duration_minutes:number;price_minor:number;currency:string}[];
 offers:{staff_id:string;service_id:string}[]};
type Track={id:string;status:string;starts_at:string;ends_at:string;total_minor:number;currency:string;last_update:string};
const statuses:Record<string,string>={pending:"بانتظار تأكيد المعلم",confirmed:"تم تأكيد الحجز",arrived:"تم تسجيل وصولك",in_service:"الخدمة جارية",completed:"تم إنهاء الخدمة",cancelled:"الحجز ملغى",no_show:"لم يتم الحضور"};
const cStyle={minHeight:44,border:"1px solid #dae7db",background:"#fff",borderRadius:10,padding:"10px 12px",width:"100%"};
const money=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n/100);
export default function PublicSalonBooking({slug}:{slug:string}){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [branch,setBranch]=useState(""),[worker,setWorker]=useState(""),[chair,setChair]=useState("");
 const [services,setServices]=useState<string[]>([]),[name,setName]=useState(""),[when,setWhen]=useState("");
 const [busy,setBusy]=useState(false),[token,setToken]=useState(""),[track,setTrack]=useState<Track|null>(null);
 const [arrivalMode,setArrivalMode]=useState(false),[arrivalBusy,setArrivalBusy]=useState(false),[arrivalNotice,setArrivalNotice]=useState("");
 useEffect(()=>{let alive=true;
  const raw=window.location.hash.slice(1);
  const t=new URLSearchParams(raw).get("t");
  const isArrival=new URLSearchParams(window.location.search).get("arrive")==="1";
  setArrivalMode(isArrival);
  const stored=localStorage.getItem("beger-salon-booking:"+slug);
  const found=t&&/^[a-f0-9]{64}$/.test(t)?t:stored&&/^[a-f0-9]{64}$/.test(stored)?stored:"";
  if(found)setToken(found);
  void browserSupabase().rpc("beger_g51_public_salon_catalog",{p_slug:slug}).then(({data,error:e})=>{
   if(!alive)return;
   if(e||!data||!Array.isArray(data.services)||!Array.isArray(data.staff)){setError("رابط الصالون غير منشور أو غير متاح");}
   else {const d=data as Catalog;setCatalog(d);setBranch(d.branches[0]?.id??"");}
   setLoading(false);
  });
  return()=>{alive=false};
 },[slug]);
 const workers=(catalog?.staff??[]).filter(x=>x.branch_id===branch);
 const chairs=(catalog?.chairs??[]).filter(x=>x.branch_id===branch);
 const offered=new Set((catalog?.offers??[]).filter(o=>o.staff_id===worker).map(o=>o.service_id));
 const available=(catalog?.services??[]).filter(s=>offered.has(s.id));
 const basket=useMemo(()=>available.filter(s=>services.includes(s.id)),[available,services]);
 const subtotal=basket.reduce((n,s)=>n+s.price_minor,0);
 useEffect(()=>{setWorker(workers[0]?.id??"");setChair(chairs[0]?.id??"");setServices([]);},[branch,catalog]); 
 useEffect(()=>{setServices([])},[worker]);
 useEffect(()=>{
  if(!token)return;
  let alive=true;
  const load=async()=>{try{
   const {data,error:e}=await browserSupabase().rpc("beger_g51_public_track",{p_token:token});
   if(e||!data)return;
   if(alive)setTrack(data as Track);
  }catch{/* keep previous displayed status */}};
  void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load()},15000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[token]);
 async function submit(){
  if(busy||!catalog?.public_booking_enabled||!branch||!worker||!chair||!services.length||name.trim().length<2||!when)return;
  if(!window.confirm("إرسال طلب الحجز إلى الصالون؟ سيتم حفظ اسمك وخدماتك وموعدك على Staging لأغراض الاختبار."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const date=new Date(when);if(Number.isNaN(date.getTime()))throw new Error("time");
   const {data,error:e}=await browserSupabase().rpc("beger_g51_public_book",{
    p_slug:slug,p_name:name.trim(),p_branch:branch,p_staff:worker,p_chair:chair,p_services:services,p_start:date.toISOString()
   });
   if(e||!data?.access_token||data.status!=="pending")throw new Error("request rejected");
   const t=String(data.access_token);
   if(!/^[a-f0-9]{64}$/.test(t))throw new Error("token invalid");
   setToken(t);
   localStorage.setItem("beger-salon-booking:"+slug,t);
   window.location.hash="t="+t;
   setNotice("تم إنشاء الطلب! احتفظ برابط هذه الصفحة لتتابع تأكيد المعلم.");
  }catch{setError("تعذّر إرسال الحجز. ربما الوقت مشغول أو خارج الدوام، أو الخدمة لا يقدمها المعلم، أو بلغ الصالون حد الحجوزات التجريبية. جرّب وقتاً آخر.");}
  finally{setBusy(false)}
 }
 async function requestArrival(){
  if(!token||arrivalBusy)return;
  if(!window.confirm("إرسال إشعار وصولك؟ سيتحقق الموظف من وجودك داخل الصالون قبل تأكيد الحضور."))return;
  setArrivalBusy(true);setArrivalNotice("");
  try{
   const {data,error:e}=await browserSupabase().rpc("beger_g53_request_arrival",{p_token:token});
   if(e||data?.status!=="awaiting_staff_verification"||data?.physical_presence_verified!==false)throw new Error("Not eligible");
   setArrivalNotice("تم إرسال طلب وصولك. المعلم أو الاستقبال يؤكد حضورك بعد التحقق منك داخل الصالون.");
  }catch{setArrivalNotice("لم نتمكن من إرسال طلب الوصول. يلزم موعد مؤكد وقريب من وقت الحجز.");}
  finally{setArrivalBusy(false);}
 }
 const valid=Boolean(catalog?.public_booking_enabled&&branch&&worker&&chair&&services.length&&services.length<=6&&name.trim().length>=2&&when&&!busy);
 return <main lang="ar" dir="rtl" style={{minHeight:"100vh",background:"#f6faf7",padding:"clamp(14px,4vw,30px)",fontFamily:"system-ui,Tahoma,sans-serif",color:"#204330"}}>
  <div style={{maxWidth:900,margin:"auto",display:"grid",gap:18}}>
   <header style={{borderRadius:22,background:"#1c6548",color:"#fff",padding:"27px 24px"}}>
    <span style={{fontSize:12,letterSpacing:2,color:"#bde4c7"}}>BEGER · SALON BOOKING</span>
    <h1 style={{fontSize:"clamp(25px,5vw,38px)",margin:"12px 0 8px"}}>{catalog?.salon_name??"حجز صالون Beger"}</h1>
    <p style={{fontSize:13,opacity:.86,margin:0}}>اختَر خدماتك، معلم الحلاقة، والموعد المناسب — بدون تنزيل تطبيق</p>
   </header>
   {loading?<p>جارٍ تحميل خدمات الصالون…</p>:null}
   {error?<p role="alert" style={{background:"#fff2ee",padding:15,borderRadius:10,color:"#a14a41"}}>{error}</p>:null}
   {token?<section style={{background:"#fff",border:"1px solid #dce9df",borderRadius:16,padding:22,display:"grid",gap:11}}>
    <h2 style={{fontSize:20,margin:0}}>متابعة حجزك</h2><p style={{fontSize:12,color:"#6e8073"}}>احتفظ بالرابط الحالي. رمز المتابعة خاص بك ولا تشاركه علناً.</p>
    {track?<><strong style={{color:"#22724e",fontSize:19}}>{statuses[track.status]??track.status}</strong><p style={{margin:0}}>وقت الموعد: {new Date(track.starts_at).toLocaleString("ar",{timeZone:"Europe/Istanbul",dateStyle:"full",timeStyle:"short"})}</p><p style={{margin:0}}>المجموع: {money(track.total_minor)}</p></>:<p>جارٍ التحقق من الحجز…</p>}
    {arrivalMode&&track?.status==="confirmed"?<div style={{display:"grid",gap:8}}>
    <button type="button" disabled={arrivalBusy} onClick={()=>void requestArrival()} style={{border:0,borderRadius:10,padding:14,background:"#216b4f",color:"#fff",fontWeight:800}}>{arrivalBusy?"جارٍ إرسال طلب الوصول…":"أنا وصلت — اطلب تأكيد حضوري"}</button>
    <small>مسح QR لا يثبت وجودك وحده. المعلم يؤكد حضورك من حسابه بعد التحقق.</small>
    {arrivalNotice?<p role="status" style={{color:"#246d4d",fontSize:13}}>{arrivalNotice}</p>:null}
   </div>:null}
    {arrivalMode&&!track?<small>افتح رابط حجزك على نفس الهاتف أولاً، أو أدخل من الرابط الخاص بموعدك.</small>:null}
    <small>تتحدّث حالة الموعد كل 15 ثانية أثناء فتح الصفحة. إشعارات الخلفية غير مفعّلة بعد.</small>
   </section>:null}
   {catalog&&!token?<section style={{background:"#fff",border:"1px solid #dce9df",borderRadius:16,padding:22,display:"grid",gap:17}}>
    <h2 style={{fontSize:21,margin:0}}>احجز موعدك</h2>
    {!catalog.public_booking_enabled?<p style={{background:"#fff6e6",padding:14,borderRadius:9,color:"#865e2a"}}>صفحة الصالون متاحة للعرض، لكن الحجوزات العامة لم يفعّلها المالك بعد.</p>:null}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:13}}>
     <label style={{fontSize:13,display:"grid",gap:7}}>الفرع<select style={cStyle} value={branch} onChange={e=>setBranch(e.target.value)}>{catalog.branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
     <label style={{fontSize:13,display:"grid",gap:7}}>المعلم<select style={cStyle} value={worker} onChange={e=>setWorker(e.target.value)}>{workers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
     <label style={{fontSize:13,display:"grid",gap:7}}>الكرسي<select style={cStyle} value={chair} onChange={e=>setChair(e.target.value)}>{chairs.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>
    </div>
    <div><strong>الخدمات (اختر خدمة أو أكثر)</strong><div style={{display:"grid",gap:9,marginTop:12}}>
      {available.map(s=><label key={s.id} style={{padding:12,border:"1px solid #dfe9e2",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
       <span style={{display:"flex",gap:10,alignItems:"center"}}><input type="checkbox" checked={services.includes(s.id)} disabled={!services.includes(s.id)&&services.length>=6} onChange={e=>setServices(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))}/><span>{s.name} · {s.duration_minutes} دقيقة</span></span><b>{money(s.price_minor)}</b>
      </label>)}
      {!available.length?<small>هذا المعلم لا يقدم خدمات منشورة حالياً.</small>:null}
    </div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:13}}>
     <label style={{fontSize:13,display:"grid",gap:7}}>اسم الزبون<input style={cStyle} maxLength={70} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="اسم للحجز التجريبي"/></label>
     <label style={{fontSize:13,display:"grid",gap:7}}>تاريخ ووقت الحجز (بتوقيت هاتفك)<input style={cStyle} type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><strong>المجموع {money(subtotal)} · {basket.reduce((n,s)=>n+s.duration_minutes,0)} دقيقة قبل الفواصل</strong>
     <button type="button" disabled={!valid} onClick={()=>void submit()} style={{border:0,borderRadius:11,padding:"13px 18px",background:"#1e7352",color:"#fff",fontWeight:900,opacity:valid?1:.5}}> {busy?"جارٍ إرسال الحجز…":"إرسال طلب الحجز"} </button>
    </div>
    {notice?<p role="status" style={{color:"#246f4d"}}>{notice}</p>:null}
    <small style={{color:"#77877c"}}>هذه تجربة Staging. اختيار الوقت مبدئي ويُراجَع الخادم لمنع تداخل المواعيد. لا تستخدم معلومات أشخاص حقيقيين في الاختبار.</small>
   </section>:null}
  </div>
 </main>;
}
