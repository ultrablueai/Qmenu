"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserSupabase} from "../../../lib/supabase/browser";
const field={display:"grid",gap:6,fontSize:12,color:"#506c59",fontWeight:750 as const};
const control={border:"1px solid #d6e5da",borderRadius:9,padding:12,minHeight:44,width:"100%",color:"#234d37",background:"#fff"};
export default function SalonPilotSetup({businessId,currentUserId}:{businessId:string;currentUserId:string}){
 const router=useRouter();
 const [branch,setBranch]=useState("فرع تجريبي");
 const [worker,setWorker]=useState("معلم الحلاقة");
 const [workerUser,setWorkerUser]=useState(currentUserId);
 const [chair,setChair]=useState("كرسي 1");
 const [service,setService]=useState("قص شعر");
 const [duration,setDuration]=useState(30);
 const [price,setPrice]=useState(350);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 async function create(){
  if(busy||!businessId||!workerUser)return;
  if(!window.confirm("إنشاء فرع وملف معلم وكرسي وخدمة ومواعيد افتراضية على Staging؟ ستبقى الحجوزات العامة والتنبيهات معطلة."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g49_setup_salon_pilot",{
    p_business:businessId,p_branch_name:branch,p_worker_user:workerUser,
    p_worker_name:worker,p_chair_label:chair,p_service_name:service,
    p_duration:duration,p_price_minor:Math.round(price*100)
   });
   if(rpcError||data?.status!=="pilot_ready"||data?.public_booking_enabled!==false)throw Error("Pilot setup failed");
   setMessage("نجح تجهيز الفرع والمعلم والكرسي والخدمة على Staging. افتح قسم إنشاء الحجز بعد تحديث الصفحة.");
   router.refresh();
  }catch{setError("لم يكتمل تجهيز الصالون. تحقق من صلاحية المالك، عضوية المعلم بالصالون والبيانات المدخلة.");}
  finally{setBusy(false)}
 }
 return <section aria-label="إعداد الصالون التجريبي" style={{border:"1px solid #d7e5da",borderRadius:16,padding:20,background:"#fff",display:"grid",gap:16}}>
  <div><h2 style={{fontSize:20,margin:"0 0 8px"}}>تجهيز الصالون للتجربة</h2><p style={{fontSize:12,color:"#68816f",lineHeight:1.8}}>مالك الصالون فقط: جهّز فرعاً ومعلمًا وكرسياً وخدمة كبداية. الدوام الافتراضي 09:00–19:00، الاستراحة 13:00–14:00، والفاصل 10 دقائق. بدون تفعيل QR للحجوزات العامة.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,195px),1fr))",gap:12}}>
   <label style={field}>اسم الفرع<input style={control} maxLength={80} value={branch} onChange={e=>setBranch(e.target.value)}/></label>
   <label style={field}>اسم المعلم<input style={control} maxLength={80} value={worker} onChange={e=>setWorker(e.target.value)}/></label>
   <label style={field}>حساب المعلم (UUID)<input style={control} value={workerUser} onChange={e=>setWorkerUser(e.target.value)} placeholder="معرّف حساب مسجّل بالنشاط"/></label>
   <label style={field}>الكرسي<input style={control} maxLength={50} value={chair} onChange={e=>setChair(e.target.value)}/></label>
   <label style={field}>الخدمة<input style={control} maxLength={100} value={service} onChange={e=>setService(e.target.value)}/></label>
   <label style={field}>مدة الخدمة بالدقائق<input style={control} type="number" min={5} max={480} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>
   <label style={field}>سعر الخدمة بالليرة التركية<input style={control} type="number" min={0} max={1000000} step={1} value={price} onChange={e=>setPrice(Number(e.target.value))}/></label>
  </div>
  <p style={{fontSize:12,color:"#6d7e70",margin:0}}>الافتراضي: حساب المالك نفسه يعمل كمعلم تجريبي. لا يمكن ربط حساب شخص آخر إلا إذا كان عضواً مسجلاً بهذا النشاط. استخدم أسماء تجريبية فقط.</p>
  <div><button type="button" disabled={busy||!workerUser||!branch.trim()||!worker.trim()||!chair.trim()||!service.trim()||duration<5||duration>480||price<0} onClick={()=>void create()} style={{background:"#1f7554",color:"#fff",border:0,borderRadius:10,padding:"12px 20px",fontWeight:900,cursor:"pointer"}}>{busy?"جارٍ التأسيس…":"إنشاء إعدادات الصالون"}</button></div>
  {message?<p role="status" style={{color:"#1f704c"}}>{message}</p>:null}
  {error?<p role="alert" style={{color:"#a4483b"}}>{error}</p>:null}
 </section>;
}
