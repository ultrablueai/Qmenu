"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
type PriceMode="exact_price"|"starting_at"|"quote_required";
type Svc={id:string;name:string;price_minor:number;currency:string;mode:PriceMode;start_minor:number|null};
type Setup={business_id:string;services:Svc[];quote_booking_enabled:false;public_base_price_default:"exact_price"};
const money=(value:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(value/100);
export default function SalonPriceManager({businessId}:{businessId:string}){
 const [data,setData]=useState<Setup|null>(null);
 const [status,setStatus]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState<string|null>(null);
 async function reload(){
  const {data:response,error:e}=await browserSupabase().rpc("beger_g58_owner_price_setup",{p_business:businessId});
  if(e||response?.business_id!==businessId||!Array.isArray(response.services))throw new Error("Unavailable");
  setData(response as Setup);
 }
 useEffect(()=>{let live=true;
  void browserSupabase().rpc("beger_g58_owner_price_setup",{p_business:businessId}).then(({data:r,error:e})=>{
   if(live){if(e||r?.business_id!==businessId||!Array.isArray(r.services))setError("لم نتمكن من تحميل إعدادات التسعير.");else setData(r as Setup);}
  });
  return()=>{live=false};
 },[businessId]);
 async function save(service:Svc,mode:PriceMode,start:number|null){
  if(busy)return;
  if(!window.confirm("تطبيق سياسة عرض السعر على خدمة "+service.name+"؟ لن نغير أسعار الحجوزات السابقة."))return;
  setBusy(service.id);setStatus("");setError("");
  try{
   const {data:result,error:e}=await browserSupabase().rpc("beger_g58_owner_set_price",{
    p_business:businessId,p_service:service.id,p_mode:mode,p_start_minor:mode==="starting_at"?start:null
   });
   if(e||result?.mode!==mode)throw Error("Rejected");
   await reload();
   setStatus(mode==="exact_price"?"تم إظهار سعر الخدمة، والحجز متاح.":"تم تغيير عرض السعر. الحجز المباشر لهذه الخدمة متوقف حتى إصدار سعر نهائي مؤكد.");
  }catch{setError("تعذر حفظ السعر. تحقق من صلاحية المالك والحد الأدنى للسعر.");}
  finally{setBusy(null)}
 }
 return <section style={{background:"#fff",border:"1px solid #d5e6dc",borderRadius:16,padding:20,display:"grid",gap:13}}>
  <div><h2 style={{fontSize:21,margin:"0 0 8px"}}>الأسعار وكيف يشوفها الزبون</h2>
   <p style={{fontSize:12,color:"#65816d",margin:0,lineHeight:1.9}}>صاحب المحل يختار لكل خدمة: السعر الكامل، تبدأ من، أو طلب تسعيرة. السعر الداخلي محفوظ للمحاسبة. الأسعار المتغيرة لا تتحول لحجز مباشر بسعر غير متفق عليه.</p></div>
  <div style={{display:"grid",gap:10}}>
   {(data?.services??[]).map(s=><PriceRow key={s.id} service={s} busy={busy===s.id} onSave={(mode,start)=>void save(s,mode,start)}/>)}
   {data?.services.length===0?<small>ما في خدمات فعّالة بعد. جهز خدمات الصالون أولاً.</small>:null}
   {!data&&!error?<small>جارٍ تحميل إعدادات الأسعار…</small>:null}
  </div>
  <p style={{fontSize:12,color:"#816b45",margin:0}}>إخفاء السعر عن صفحة الحجز ليس إعفاءً من عرض تعرفة الخدمات المطلوبة نظامياً في المحل. لا يُحصّل أي مبلغ غير متفق عليه مع الزبون.</p>
  {status?<p role="status" style={{color:"#217451",fontSize:12}}>{status}</p>:null}
  {error?<p role="alert" style={{color:"#ae4638",fontSize:12}}>{error}</p>:null}
 </section>;
}
function PriceRow({service,busy,onSave}:{service:Svc;busy:boolean;onSave:(mode:PriceMode,start:number|null)=>void}){
 const [mode,setMode]=useState<PriceMode>(service.mode),[start,setStart]=useState((service.start_minor??service.price_minor)/100);
 useEffect(()=>{setMode(service.mode);setStart((service.start_minor??service.price_minor)/100)},[service.mode,service.start_minor,service.price_minor]);
 return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10,alignItems:"end",background:"#f7faf8",borderRadius:10,padding:13}}>
   <div><strong style={{fontSize:14}}>{service.name}</strong><div style={{color:"#657d6b",fontSize:12}}>السعر الداخلي {money(service.price_minor)}</div></div>
   <label style={{display:"grid",gap:6,fontSize:12}}>عرض السعر<select style={{padding:11,borderRadius:9,border:"1px solid #d1e3d6"}} value={mode} onChange={e=>setMode(e.target.value as PriceMode)}>
    <option value="exact_price">السعر واضح</option><option value="starting_at">تبدأ من</option><option value="quote_required">بدون سعر على الموقع — طلب تسعيرة</option>
   </select></label>
   {mode==="starting_at"?<label style={{display:"grid",gap:6,fontSize:12}}>السعر الابتدائي ₺<input type="number" value={start} min={0} max={service.price_minor/100} onChange={e=>setStart(Number(e.target.value))} style={{padding:10,borderRadius:9,border:"1px solid #d1e3d6"}}/></label>:null}
   <button type="button" disabled={busy||start<0||!Number.isFinite(start)||mode==="starting_at"&&start>service.price_minor/100}
    onClick={()=>onSave(mode,mode==="starting_at"?Math.round(start*100):null)}
    style={{border:0,borderRadius:9,padding:12,background:"#1d704e",color:"#fff",fontWeight:800,opacity:busy?.5:1}}>{busy?"جارٍ الحفظ…":"حفظ سياسة السعر"}</button>
  </div>;
}
