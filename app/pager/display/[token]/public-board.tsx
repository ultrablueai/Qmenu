"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import "./public-board.css";
type Display={branchName:string;ready:number[];waitingCount:number;preparingCount:number};
function client(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("Missing public Supabase configuration");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export default function PublicPagerBoard({token}:{token:string}){
 const [display,setDisplay]=useState<Display|null>(null);
 const [error,setError]=useState("");
 const [updated,setUpdated]=useState("");
 const refresh=useCallback(async()=>{
  try{
   const {data,error}=await client().rpc("g6_pager_display_status",{p_token:token});
   if(error||!data||!Array.isArray(data.ready))throw Error("Display unavailable");
   setDisplay(data as Display);setError("");setUpdated(new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}));
  }catch{setError("هذه الشاشة غير مفعّلة أو تعذّر الاتصال. اطلب من إدارة الفرع التحقق من رابط العرض.");}
 },[token]);
 useEffect(()=>{
  void refresh();
  const interval=window.setInterval(()=>{void refresh()},7000);
  const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",onVisible)};
 },[refresh]);
 return <main className="beger-public-board" dir="rtl">
  <header className="beger-public-board-header">
   <div><small>BEGER · PAGER DISPLAY</small><h1>{display?.branchName??"شاشة النداء"}</h1></div>
   <div className="beger-public-board-brand">Beger <span>Pager</span></div>
  </header>
  <div className="beger-public-board-content">
   <section className="beger-public-board-ready" aria-label="الأرقام الجاهزة للاستلام">
    <h2><span aria-hidden="true">●</span> جاهز للاستلام</h2>
    {display?.ready.length?<div className="beger-public-board-numbers">{display.ready.map(n=><div className="beger-public-board-number" key={n}>{n}</div>)}</div>:
     <p className="beger-public-board-empty">بانتظار الطلبات الجاهزة للاستلام</p>}
   </section>
   <aside className="beger-public-board-side" aria-label="ملخص العمل">
    <div><span>بانتظار التحضير</span><strong>{display?.waitingCount??"—"}</strong></div>
    <div><span>قيد التحضير</span><strong>{display?.preparingCount??"—"}</strong></div>
    <p>عند ظهور رقمك على الشاشة، توجّه إلى نقطة الاستلام.</p>
   </aside>
  </div>
  {error?<p role="alert" className="beger-public-board-error">{error}</p>:null}
  <footer><span>الأرقام فقط · دون أسماء أو بيانات شخصية</span><span>آخر تحديث: {updated||"—"}</span></footer>
 </main>;
}
