"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {GuestLang} from "../lib/g2-public";
import {useBegerFeedback,type FeedbackKind} from "./beger-feedback";

type Status="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
type TrackedOrder={token:string;reference:string;status:Status;serviceMode:"takeaway"|"dine_in";table:string};
const trackedStatuses=new Set<Status>(["pending","accepted","preparing","ready","fulfilled","rejected"]);
const alertKind:Partial<Record<Status,FeedbackKind>>={accepted:"accepted",preparing:"preparing",ready:"ready",fulfilled:"fulfilled",rejected:"rejected"};

function statusLabel(status:Status,lang:GuestLang,mode:string){
 const labels={
  ar:{pending:"بانتظار موافقة المطعم",accepted:"تم قبول الطلب",preparing:"الطلب قيد التحضير",ready:mode==="takeaway"?"طلبك جاهز للاستلام":"طلبك جاهز",fulfilled:"تم تسليم الطلب",rejected:"تم رفض الطلب"},
  tr:{pending:"Restoran onayı bekleniyor",accepted:"Sipariş kabul edildi",preparing:"Sipariş hazırlanıyor",ready:mode==="takeaway"?"Siparişiniz teslim almaya hazır":"Siparişiniz hazır",fulfilled:"Sipariş teslim edildi",rejected:"Sipariş reddedildi"},
  en:{pending:"Waiting for approval",accepted:"Order accepted",preparing:"Order being prepared",ready:mode==="takeaway"?"Ready for pickup":"Order ready",fulfilled:"Order delivered",rejected:"Order declined"}
 };
 return labels[lang][status];
}
/** Lives at storefront level, outside the cart dialog and individual home/menu/rewards screens. */
export default function GuestOrderWatcher({branchId,tableToken,lang,openCart}:{branchId:string;tableToken?:string;lang:GuestLang;openCart:()=>void}){
 const feedback=useBegerFeedback();
 const [order,setOrder]=useState<TrackedOrder|null>(null);
 const [notice,setNotice]=useState("");
 const [openNotice,setOpenNotice]=useState(false);
 const lastStatus=useRef<Record<string,Status>>({});
 const storageKeys=["beger-g3-pickup-order:"+branchId,...(tableToken?["beger-g3-order:"+tableToken]:[])];
 const keys=storageKeys.join("|");
 const check=useCallback(async()=>{
  const active=storageKeys.flatMap(key=>{try{const token=sessionStorage.getItem(key);return token&&/^[0-9a-f-]{36}$/i.test(token)?[{key,token}]:[];}catch{return [];}});
  if(!active.length){setOrder(null);return;}
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!publishable)return;
  const db=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  for(const {key,token} of active){
   try{
    const {data,error}=await db.rpc("g3_public_order_status",{p_token:token});
    if(error||!data||!trackedStatuses.has(data.status as Status))continue;
    const status=data.status as Status;
    const mode=data.serviceMode==="takeaway"?"takeaway":"dine_in";
    const label=statusLabel(status,lang,mode);
    const previous=lastStatus.current[token];
    // A page reload retains the last observed state so unseen transitions can still be announced.
    const rememberedKey="beger-g3-notified:"+token;
    let remembered:Status|null=null;
    try{const stored=sessionStorage.getItem(rememberedKey);if(stored&&trackedStatuses.has(stored as Status))remembered=stored as Status;}catch{/* optional */}
    const last=previous??remembered;
    if(last&&last!==status){
     const display=(lang==="ar"?"تحديث الطلب":lang==="tr"?"Sipariş güncellendi":"Order update")+" #"+String(data.reference??"").slice(0,10)+" · "+label;
     setNotice(display);setOpenNotice(true);
     const kind=alertKind[status];if(kind)feedback.signal(kind,display);
    }
    lastStatus.current[token]=status;
    try{sessionStorage.setItem(rememberedKey,status);}catch{/* optional */}
    setOrder({token,reference:String(data.reference??"").slice(0,10),status,serviceMode:mode,table:String(data.table??"")});
    // Prefer the current table token; otherwise show the branch's takeaway order.
    if(key==="beger-g3-order:"+tableToken)break;
   }catch{/* transient failure: keep the last known order */}
  }
 },[keys,branchId,tableToken,lang,feedback.signal]);
 useEffect(()=>{
  void check();
  const tick=window.setInterval(()=>{void check();},7000);
  const onVisible=()=>{if(document.visibilityState==="visible")void check();};
  const onTrackingStart=()=>{void check();};
  document.addEventListener("visibilitychange",onVisible);
  window.addEventListener("beger-order-tracking-start",onTrackingStart);
  return()=>{window.clearInterval(tick);document.removeEventListener("visibilitychange",onVisible);window.removeEventListener("beger-order-tracking-start",onTrackingStart);};
 },[check]);
 if(!order)return null;
 const label=statusLabel(order.status,lang,order.serviceMode);
 const heading=lang==="ar"?"متابعة الطلب":lang==="tr"?"Sipariş takibi":"Track your order";
 return <aside className="beger-order-watcher" aria-label={heading} dir={lang==="ar"?"rtl":"ltr"}>
  {openNotice?<div className="beger-order-watcher-alert" role="alert">
   <span aria-hidden="true">🔔</span><strong>{notice}</strong>
   <button type="button" aria-label={lang==="ar"?"إغلاق التنبيه":lang==="tr"?"Bildirimi kapat":"Dismiss alert"} onClick={()=>setOpenNotice(false)}>✕</button>
  </div>:null}
  <button className="beger-order-watcher-chip" type="button" onClick={openCart}>
   <span aria-hidden="true">🔔</span>
   <span><strong>{order.reference?"#"+order.reference:heading}</strong><small>{label}</small></span>
   <span aria-hidden="true">⌃</span>
  </button>
 </aside>;
}
