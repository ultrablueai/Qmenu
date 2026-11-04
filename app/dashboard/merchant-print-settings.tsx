"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-print-settings.css";

export type PaperSize="58mm"|"80mm"|"a4";
export type BranchPrintSettings={kitchen:PaperSize;pickup:PaperSize;summary:PaperSize};
export const DEFAULT_BRANCH_PRINT_SETTINGS:BranchPrintSettings={kitchen:"80mm",pickup:"58mm",summary:"a4"};
const valid=(v:unknown):v is PaperSize=>v==="58mm"||v==="80mm"||v==="a4";
function parseSettings(value:unknown):BranchPrintSettings{
 const x=value as Partial<BranchPrintSettings>|null;
 if(!x||!valid(x.kitchen)||!valid(x.pickup)||!valid(x.summary))throw Error("Invalid printer settings");
 return {kitchen:x.kitchen,pickup:x.pickup,summary:x.summary};
}
export default function MerchantPrintSettings({branchId,onSettings}:{branchId:string;onSettings:(next:BranchPrintSettings)=>void}){
 const [settings,setSettings]=useState<BranchPrintSettings>(DEFAULT_BRANCH_PRINT_SETTINGS);
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;setLoaded(false);setSettings(DEFAULT_BRANCH_PRINT_SETTINGS);setError("");setNotice("");
  onSettings(DEFAULT_BRANCH_PRINT_SETTINGS);
  Promise.resolve(browserSupabase().rpc("g7_print_settings",{p_branch:branchId}))
   .then(({data,error})=>{if(error)throw error;const next=parseSettings(data);
    if(active){setSettings(next);onSettings(next);setLoaded(true);}
   }).catch(()=>{if(active){setError("لم نتمكن من تحميل إعدادات الطباعة. سيبقى اختيار المقاس متاحاً داخل نافذة المعاينة.");setLoaded(false);}});
  return()=>{active=false};
 },[branchId,onSettings]);
 async function save(){
  if(!loaded||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g7_print_settings_update",{
    p_branch:branchId,p_kitchen:settings.kitchen,p_pickup:settings.pickup,p_summary:settings.summary
   });
   if(error)throw error;
   const saved=parseSettings(data);setSettings(saved);onSettings(saved);
   setNotice("تم حفظ مقاسات الطباعة لهذا الفرع. ستُستخدم عند فتح التذاكر القادمة.");
  }catch{setError("تعذّر حفظ إعدادات الطباعة. لم نغيّر إعدادات الفرع.");}
  finally{setBusy(false)}
 }
 const field=(key:keyof BranchPrintSettings,label:string,help:string)=><label key={key} className="beger-print-setting-field">
  <span><strong>{label}</strong><small>{help}</small></span>
  <select value={settings[key]} disabled={!loaded||busy} onChange={event=>setSettings(current=>({...current,[key]:event.target.value as PaperSize}))}>
   <option value="58mm">حراري 58 مم</option><option value="80mm">حراري 80 مم</option><option value="a4">A4</option>
  </select>
 </label>;
 return <details className="beger-print-settings" dir="rtl">
  <summary><span>إعدادات الطباعة للفرع</span><small>المطبخ · الاستلام · كشف الحساب</small></summary>
  <div className="beger-print-settings-body">
   <p>اختر قياس الورق الافتراضي مرة واحدة. سيظل بإمكانك تغييره قبل الطباعة، والطابعة الفعلية تُختار من نافذة المتصفح.</p>
   {field("kitchen","تذكرة المطبخ","الأصناف والإضافات")}
   {field("pickup","ملصق الاستلام","رقم الطلب على الكيس أو الصينية")}
   {field("summary","كشف الحساب الداخلي","ليس فاتورة ضريبية")}
   <button type="button" disabled={!loaded||busy} onClick={()=>void save()}>{busy?"جارٍ الحفظ…":loaded?"حفظ إعدادات الطباعة":"جارٍ التحميل…"}</button>
   {notice?<p role="status" className="beger-print-settings-success">{notice}</p>:null}
   {error?<p role="alert" className="beger-print-settings-error">{error}</p>:null}
   <p className="beger-print-settings-caveat">لا توجد طباعة تلقائية أو وصول مباشر لأجهزة USB والشبكة في هذه المرحلة. لا ترسل Beger مهام طباعة دون ضغط الموظف.</p>
  </div>
 </details>;
}
