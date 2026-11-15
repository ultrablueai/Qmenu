"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {useBegerFeedback} from "../../../components/beger-feedback";
import "./pager-customer.css";
type Status="waiting"|"preparing"|"ready"|"fulfilled"|"cancelled";
type Pager={number:number;status:Status;createdAt:string;readyAt:string|null;branchName:string};
const labels:Record<Status,string>={
 waiting:"بانتظار بدء التحضير",preparing:"جاري تجهيز طلبك",ready:"طلبك جاهز للاستلام!",
 fulfilled:"تم تسليم الطلب",cancelled:"تم إلغاء النداء"
};
export default function PagerCustomer({token}:{token:string}){
 const [pager,setPager]=useState<Pager|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [alerts,setAlerts]=useState(false);
 const [notice,setNotice]=useState("");
 const feedback=useBegerFeedback();
 useEffect(()=>{
  let active=true;let latest:Status|null=null;
  async function check(){
   try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)throw Error("Missing configuration");
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await client.rpc("g6_pager_public_status",{p_token:token});
    if(error||!data||!["waiting","preparing","ready","fulfilled","cancelled"].includes(data.status))throw Error("Unknown ticket");
    if(!active)return;
    const next=data.status as Status;
    if(latest&&latest!==next&&alerts){
     setNotice("تحديث النداء رقم "+data.number+" · "+labels[next]);
     feedback.signal(next==="ready"?"ready":next==="fulfilled"?"fulfilled":"preparing",labels[next]);
    }
    latest=next;setPager(data as Pager);setError("");
   }catch{if(active)setError("تعذّر متابعة النداء. تحقق من الرابط والاتصال.");}
   finally{if(active)setLoading(false)}
  }
  void check();
  const timer=window.setInterval(()=>{void check()},7000);
  const onVisible=()=>{if(document.visibilityState==="visible")void check()};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible)};
 },[token,alerts,feedback.signal]);
 return <main className="beger-pager-customer" dir="rtl">
  <header><strong>Beger <span>Pager</span></strong><p>بطاقة النداء الرقمية · بدون تطبيق</p></header>
  {loading?<p role="status">جارٍ تحميل بطاقة النداء…</p>:null}
  {error?<p role="alert" className="beger-pager-customer-error">{error}</p>:null}
  {pager?<article className={"beger-pager-customer-card is-"+pager.status}>
   <p>{pager.branchName}</p><small>رقم النداء</small>
   <strong className="beger-pager-customer-number">{pager.number}</strong>
   <h1 aria-live="polite">{labels[pager.status]}</h1>
   <div className="beger-pager-customer-steps">
    <span className={pager.status!=="waiting"?"is-current":""}>استلام الرقم</span>
    <span className={["preparing","ready","fulfilled"].includes(pager.status)?"is-current":""}>التحضير</span>
    <span className={["ready","fulfilled"].includes(pager.status)?"is-current":""}>الاستلام</span>
   </div>
   <button type="button" className="beger-pager-alert-toggle" aria-pressed={alerts} onClick={()=>{setAlerts(!alerts);setNotice(alerts?"التنبيه الصوتي مغلق":"تم تفعيل تنبيهات الصفحة عند تغيير الحالة");}}>
    {alerts?"🔔 التنبيه داخل الصفحة مفعّل":"🔕 تفعيل الصوت والاهتزاز"}
   </button>
   {notice?<p role="status">{notice}</p>:null}
   <p className="beger-pager-customer-hint">احتفظ بهذه الصفحة مفتوحة لتلقي التحديثات. إشعارات الهاتف خارج المتصفح غير مفعّلة بعد.</p>
  </article>:null}
 </main>;
}
