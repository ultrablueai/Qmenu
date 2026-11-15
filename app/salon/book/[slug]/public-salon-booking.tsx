"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {browserSupabase} from "../../../../lib/supabase/browser";
type Catalog={salon_name:string;slug:string;public_booking_enabled:boolean;timezone:string;
 branches:{id:string;name:string}[];staff:{id:string;name:string;branch_id:string}[];
 chairs:{id:string;label:string;branch_id:string}[];services:{id:string;name:string;duration_minutes:number;price_minor:number|null;currency:string;price_mode:"exact_price"|"starting_at"|"quote_required";price_is_final:boolean}[];
 offers:{staff_id:string;service_id:string}[]};
type Track={id:string;status:string;starts_at:string;ends_at:string;total_minor:number;currency:string;last_update:string};
type EarlyOffer={offer_id?:string;status:string;proposed_start?:string;original_start?:string;expires_at?:string;requires_response?:boolean};
function ringPhone(ctx:AudioContext){
 if(ctx.state==="suspended")void ctx.resume();
 const start=ctx.currentTime+0.05;
 // Original two-tone phone-like signal; three distinct bursts, not a system ringtone.
 for(let i=0;i<3;i++){
  const begin=start+i*1.15;
  for(const frequency of [425,480]){
   const tone=ctx.createOscillator(),gain=ctx.createGain();
   tone.type="sine";tone.frequency.value=frequency;
   gain.gain.setValueAtTime(0.0001,begin);
   gain.gain.linearRampToValueAtTime(0.09,begin+0.04);
   gain.gain.setValueAtTime(0.09,begin+0.57);
   gain.gain.exponentialRampToValueAtTime(0.0001,begin+0.66);
   tone.connect(gain);gain.connect(ctx.destination);tone.start(begin);tone.stop(begin+0.7);
  }
 }
}
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
 const [early,setEarly]=useState<EarlyOffer|null>(null);
 const [earlyBusy,setEarlyBusy]=useState(false),[earlyNotice,setEarlyNotice]=useState("");
 const [ringEnabled,setRingEnabled]=useState(false);
 const [pushEnabled,setPushEnabled]=useState(false),[pushBusy,setPushBusy]=useState(false);
 const [pushMessage,setPushMessage]=useState("");
 const ringContext=useRef<AudioContext|null>(null),lastRang=useRef("");
 const [clock,setClock]=useState(Date.now());
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
 const subtotal=basket.reduce((n,s)=>n+(s.price_mode==="exact_price"?(s.price_minor??0):0),0);
 const requiresQuote=basket.some(s=>s.price_mode!=="exact_price");
 useEffect(()=>{setWorker(workers[0]?.id??"");setChair(chairs[0]?.id??"");setServices([]);},[branch,catalog]); 
 useEffect(()=>{setServices([])},[worker]);
 useEffect(()=>{
  if(!token)return;
  let alive=true;
  const load=async()=>{try{
   const [tracked,offered]=await Promise.all([
    browserSupabase().rpc("beger_g51_public_track",{p_token:token}),
    browserSupabase().rpc("beger_g56_customer_early_offer",{p_token:token})
   ]);
   if(!tracked.error&&tracked.data&&alive)setTrack(tracked.data as Track);
   if(!offered.error&&offered.data&&alive)setEarly(offered.data as EarlyOffer);
  }catch{/* keep previous displayed status */}};
  void load();const timer=window.setInterval(()=>{setClock(Date.now());if(document.visibilityState==="visible")void load()},5000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[token]);
 async function submit(){
  if(busy||!catalog?.public_booking_enabled||!branch||!worker||!chair||!services.length||requiresQuote||name.trim().length<2||!when)return;
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
 async function enablePush(){
  if(!token||pushBusy)return;
  setPushBusy(true);setPushMessage("");
  try{
   if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))
    throw Error("unsupported");
   const standalone=window.matchMedia("(display-mode: standalone)").matches||
    (navigator as Navigator&{standalone?:boolean}).standalone===true;
   if(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!standalone)
    throw Error("ios_install_first");
   const permission=await Notification.requestPermission();
   if(permission!=="granted")throw Error("permission");
   const config=await fetch("/api/salon/push",{cache:"no-store"}).then(r=>r.json());
   if(!config.enabled||typeof config.publicKey!=="string")throw Error("server_unavailable");
   const raw=atob(config.publicKey.replace(/-/g,"+").replace(/_/g,"/"));
   const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
   const worker=await navigator.serviceWorker.register("/salon-booking-sw.js",{scope:"/salon/book/"});
   const subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   const json=subscription.toJSON(),keys=json.keys;
   if(!json.endpoint||!keys?.p256dh||!keys?.auth)throw Error("subscription_missing");
   const {data,error:e}=await browserSupabase().rpc("beger_g57_register_push",{
    p_token:token,p_endpoint:json.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth
   });
   if(e||data?.subscribed!==true)throw Error("registration_refused");
   setPushEnabled(true);
   setPushMessage("تم تفعيل إشعارات الهاتف لهذا الحجز. بتقدر تلغيها بأي وقت. صوت الإشعار يحدده جهازك.");
  }catch(e){
   const code=e instanceof Error?e.message:"";
   setPushMessage(code==="ios_install_first"?"على iPhone: من Safari اضغط مشاركة ← إضافة إلى الشاشة الرئيسية، وبعد فتح التطبيق من أيقونته اضغط تفعيل إشعارات الهاتف.":
    code==="permission"?"ما تم السماح بالإشعارات من إعدادات المتصفح.":"ما اكتمل اشتراك Push على هذا الجهاز. استخدم الرنّة داخل الصفحة أو جرّب من متصفح يدعم الإشعارات.");
  }finally{setPushBusy(false)}
 }
 async function disablePush(){
  if(!token||pushBusy||!("serviceWorker" in navigator))return;
  setPushBusy(true);setPushMessage("");
  try{
   const worker=await navigator.serviceWorker.ready;
   const sub=await worker.pushManager.getSubscription();
   if(sub){
    const {error:e}=await browserSupabase().rpc("beger_g57_unregister_push",{
     p_token:token,p_endpoint:sub.endpoint
    });
    if(e)throw new Error("unsubscribe_denied");
    await sub.unsubscribe();
   }
   setPushEnabled(false);setPushMessage("تم إيقاف الإشعارات لهذا الهاتف.");
  }catch{setPushMessage("ما قدرنا نوقف الاشتراك من الخادم. جرّب مرة ثانية أو أوقف إذن الإشعارات من إعدادات الجهاز.");}
  finally{setPushBusy(false)}
 }
 useEffect(()=>{
  if(!token||!("serviceWorker" in navigator))return;
  let alive=true;
  void navigator.serviceWorker.getRegistration("/salon/book/").then(reg=>reg?.pushManager.getSubscription())
   .then(sub=>{if(alive)setPushEnabled(Boolean(sub))}).catch(()=>{});
  return()=>{alive=false};
 },[token]);
 async function enableRing(){
  try{
   const ctx=ringContext.current??new AudioContext();
   ringContext.current=ctx;await ctx.resume();setRingEnabled(true);
   setEarlyNotice("الرنّة مفعّلة لهذه الصفحة. رح تسمع ثلاث رنّات عند وصول عرض جديد وهي مفتوحة.");
  }catch{setEarlyNotice("الجهاز أو المتصفح منع الصوت. افتح الصفحة واضغط تفعيل الرنّة بعد منح إذن الصوت.");}
 }
 useEffect(()=>{
  if(!ringEnabled||!ringContext.current||!early?.offer_id||early.status!=="pending"||
    !early.expires_at||new Date(early.expires_at).getTime()<=Date.now()||
    lastRang.current===early.offer_id)return;
  lastRang.current=early.offer_id;
  if(document.visibilityState==="visible")ringPhone(ringContext.current);
 },[ringEnabled,early]);
 useEffect(()=>()=>{void ringContext.current?.close()},[]);
 async function answerEarly(accept:boolean){
  if(!token||!early?.offer_id||earlyBusy)return;
  setEarlyBusy(true);setEarlyNotice("");
  try{
   const {data,error:e}=await browserSupabase().rpc("beger_g56_respond_early_offer",{
    p_token:token,p_offer:early.offer_id,p_accept:accept
   });
   if(e||!["accepted","declined","expired"].includes(String(data?.status)))throw new Error("Offer unavailable");
   const status=String(data.status);
   setEarly(p=>p?{...p,status,requires_response:false}:p);
   setEarlyNotice(status==="accepted"?"تم تقديم موعدك بموافقتك! راجع وقت الحجز الجديد.":
    status==="declined"?"تم رفض العرض، وموعدك الأصلي باقي كما هو.":"انتهت مهلة العرض؛ موعدك الأصلي محفوظ.");
   const current=await browserSupabase().rpc("beger_g51_public_track",{p_token:token});
   if(!current.error&&current.data)setTrack(current.data as Track);
  }catch{setEarlyNotice("تعذّر تأكيد القرار. ربما انتهت المهلة أو صار الوقت غير متاح؛ موعدك الأصلي محفوظ.");}
  finally{setEarlyBusy(false)}
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
 const valid=Boolean(catalog?.public_booking_enabled&&branch&&worker&&chair&&services.length&&services.length<=6&&!requiresQuote&&name.trim().length>=2&&when&&!busy);
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
    {track?.status==="confirmed"?<div style={{border:"1px solid #b9ddc7",background:"#f0f9f2",borderRadius:12,padding:14,display:"grid",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
       <strong style={{color:"#176548"}}>فرصة موعد أبكر <span aria-hidden="true">🔔</span></strong>
       <button type="button" disabled={ringEnabled} onClick={()=>void enableRing()} style={{border:"1px solid #c2dbc8",borderRadius:9,padding:10,background:"#fff",color:"#266746",fontWeight:800}}>{ringEnabled?"الرنّة مفعّلة":"تفعيل رنّة الهاتف"}</button>
       <button type="button" disabled={pushBusy} onClick={()=>void (pushEnabled?disablePush():enablePush())}
        style={{border:"1px solid #c2dbc8",borderRadius:9,padding:10,background:"#fff",color:"#266746",fontWeight:800}}>
        {pushBusy?"جارٍ الإعداد…":pushEnabled?"إيقاف إشعارات الهاتف":"تفعيل إشعارات الهاتف بالخلفية"}
       </button>
      </div>
      {early?.status==="pending"&&early.expires_at&&new Date(early.expires_at).getTime()>clock?<>
       <p style={{margin:0,fontSize:13}}>المعلم متاح قبل موعدك! فيك تجي الساعة <strong>{new Date(early.proposed_start??"").toLocaleTimeString("ar",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"})}</strong> بدل وقتك الأصلي.</p>
       <p style={{margin:0,fontSize:12,color:"#647967"}}>الوقت المتبقي للرد: <strong>{Math.max(0,Math.ceil((new Date(early.expires_at).getTime()-clock)/1000))} ثانية</strong>. بدون رد بيبقى موعدك القديم.</p>
       <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button type="button" disabled={earlyBusy} onClick={()=>void answerEarly(true)} style={{flex:1,minWidth:120,border:0,borderRadius:10,padding:13,background:"#1b7550",color:"#fff",fontWeight:900}}>بوافق، بجي أبكر</button>
        <button type="button" disabled={earlyBusy} onClick={()=>void answerEarly(false)} style={{flex:1,minWidth:120,border:"1px solid #d1dfd4",borderRadius:10,padding:13,background:"#fff",color:"#2c6248",fontWeight:850}}>لا، بخلي موعدي</button>
       </div>
      </>:early?.status==="declined"?<small>رفضت العرض، وموعدك الأصلي ثابت.</small>:
       early?.status==="accepted"?<small>وافقت على الموعد الأبكر، وتم تحديث الحجز.</small>:
       early?.status==="pending"?<small>انتهت مهلة العرض، وموعدك الأصلي ثابت.</small>:
       <small>إذا صار المعلم متاح أبكر، بيظهر العرض هون وبيرن الجهاز بعد تفعيل الرنّة طالما الصفحة مفتوحة ونشطة.</small>}
      {earlyNotice?<p role="status" style={{margin:0,fontSize:12,color:"#256c49"}}>{earlyNotice}</p>:null}
      {pushMessage?<p role="status" style={{margin:0,fontSize:12,color:"#256c49"}}>{pushMessage}</p>:null}
      <small style={{color:"#708475"}}>الرنّة داخل الصفحة المفتوحة فقط؛ يمكن تفعيل Web Push للهاتف المتوافق بعد الموافقة، لكن صوت شاشة القفل ومدته يحددهما النظام. لا تُرسل SMS.</small>
     </div>:null}
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
       <span style={{display:"flex",gap:10,alignItems:"center"}}><input type="checkbox" checked={services.includes(s.id)} disabled={!services.includes(s.id)&&services.length>=6} onChange={e=>setServices(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))}/><span>{s.name} · {s.duration_minutes} دقيقة</span></span><b>{s.price_mode==="quote_required"?"حسب التسعيرة":s.price_mode==="starting_at"?"تبدأ من "+money(s.price_minor??0):money(s.price_minor??0)}</b>
      </label>)}
      {!available.length?<small>هذا المعلم لا يقدم خدمات منشورة حالياً.</small>:null}
    </div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:13}}>
     <label style={{fontSize:13,display:"grid",gap:7}}>اسم الزبون<input style={cStyle} maxLength={70} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="اسم للحجز التجريبي"/></label>
     <label style={{fontSize:13,display:"grid",gap:7}}>تاريخ ووقت الحجز (بتوقيت هاتفك)<input style={cStyle} type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><strong>{requiresQuote?"يجب الاتفاق على التسعيرة أولاً — المجموع غير نهائي":"المجموع "+money(subtotal)} · {basket.reduce((n,s)=>n+s.duration_minutes,0)} دقيقة قبل الفواصل</strong>
     <button type="button" disabled={!valid} onClick={()=>void submit()} style={{border:0,borderRadius:11,padding:"13px 18px",background:"#1e7352",color:"#fff",fontWeight:900,opacity:valid?1:.5}}> {busy?"جارٍ إرسال الحجز…":"إرسال طلب الحجز"} </button>
    </div>
    {requiresQuote?<p role="status" style={{background:"#fff7ea",borderRadius:9,padding:12,color:"#895f2e",fontSize:13}}>الخدمة المختارة تحتاج تحديد السعر النهائي قبل تأكيد الحجز. الحجز المباشر غير متاح لها حالياً حتى تكتمل موافقة الزبون على عرض السعر.</p>:null}
    {notice?<p role="status" style={{color:"#246f4d"}}>{notice}</p>:null}
    <small style={{color:"#77877c"}}>هذه تجربة Staging. اختيار الوقت مبدئي ويُراجَع الخادم لمنع تداخل المواعيد. لا تستخدم معلومات أشخاص حقيقيين في الاختبار.</small>
   </section>:null}
  </div>
 </main>;
}
