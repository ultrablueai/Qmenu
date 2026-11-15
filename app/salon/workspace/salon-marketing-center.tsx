"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
type Plan={id:string;name:string;description:string;price_minor:number;cycle_months:number;included_visits:number;published:boolean};
type Banner={id:string;title:string;description:string;starts_at:string;ends_at:string;published:boolean};
type State={business_id:string;plans:Plan[];banners:Banner[];membership_checkout_enabled:false;outbound_marketing_enabled:false};
const input={padding:11,border:"1px solid #d1e5d6",borderRadius:9,width:"100%",minHeight:44,background:"#fff",color:"#214d36"};
const money=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n/100);
export default function SalonMarketingCenter({businessId}:{businessId:string}){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [planName,setPlanName]=useState("عضوية الشهر"),[desc,setDesc]=useState("قصتان خلال الشهر"),[price,setPrice]=useState(650),[visits,setVisits]=useState(2),[cycle,setCycle]=useState(1);
 const [title,setTitle]=useState("عرض ساعات الصباح"),[bannerDesc,setBannerDesc]=useState("اسأل عن عروض الخدمات الصباحية");
 const [start,setStart]=useState(""),[end,setEnd]=useState("");
 async function load(){
  const {data,error:e}=await browserSupabase().rpc("beger_g59_g60_owner_marketing",{p_business:businessId});
  if(e||data?.business_id!==businessId||!Array.isArray(data.plans)||!Array.isArray(data.banners))throw Error("Denied");
  setState(data as State);
 }
 useEffect(()=>{let live=true;
  void browserSupabase().rpc("beger_g59_g60_owner_marketing",{p_business:businessId}).then(({data,error:e})=>{
   if(!live)return;if(e||data?.business_id!==businessId)setError("تعذر الوصول لمركز العروض والعضويات.");else setState(data as State);
  });return()=>{live=false};
 },[businessId]);
 async function invoke(label:string,rpc:string,args:Record<string,unknown>){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:e}=await browserSupabase().rpc(rpc,args);
   if(e||!data)throw Error("Invalid");
   await load();setNotice("تم "+label+" في Staging.");
  }catch{setError("ما اكتمل "+label+". تأكد من بيانات العرض وصلاحية مالك الصالون.");}
  finally{setBusy(false)}
 }
 return <section style={{background:"#fff",borderRadius:16,border:"1px solid #d5e5d9",padding:20,display:"grid",gap:18}}>
  <div><h2 style={{fontSize:21,margin:"0 0 6px"}}>العضويات والعروض والبنرات</h2>
   <p style={{fontSize:12,color:"#6d7f70",margin:0,lineHeight:1.9}}>المالك ينشئ باقات العضوية ويعرضها على الموقع، وينشر بنر يظهر ضمن تاريخ محدد. شراء الباقة وإرسال إعلانات مباشرة للهاتف غير مفعّلين بعد.</p></div>
  <div style={{display:"grid",gap:10,borderTop:"1px solid #e3ece5",paddingTop:16}}>
   <h3 style={{fontSize:16,margin:0}}>باقات العضوية الشهرية</h3>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10}}>
    <label style={{fontSize:12,display:"grid",gap:5}}>اسم الباقة<input style={input} maxLength={90} value={planName} onChange={e=>setPlanName(e.target.value)}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>وصف المزايا<input style={input} maxLength={350} value={desc} onChange={e=>setDesc(e.target.value)}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>السعر بالليرة التركية<input style={input} type="number" min={0} value={price} onChange={e=>setPrice(Number(e.target.value))}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>عدد الخدمات<input style={input} type="number" min={1} max={40} value={visits} onChange={e=>setVisits(Number(e.target.value))}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>مدة الباقة<select style={input} value={cycle} onChange={e=>setCycle(Number(e.target.value))}><option value={1}>شهر</option><option value={3}>3 أشهر</option><option value={6}>6 أشهر</option><option value={12}>سنة</option></select></label>
   </div>
   <button disabled={busy||planName.trim().length<2||visits<1||visits>40||price<0} onClick={()=>void invoke("إنشاء باقة منشورة","beger_g59_upsert_membership_plan",{
    p_business:businessId,p_plan:null,p_name:planName,p_description:desc,p_price_minor:Math.round(price*100),
    p_cycle_months:cycle,p_included_visits:visits,p_published:true
   })} style={{border:0,background:"#216c4e",color:"#fff",padding:12,borderRadius:9,fontWeight:800,justifySelf:"start"}}>نشر باقة تجريبية</button>
   {state?.plans.map(p=><div key={p.id} style={{border:"1px solid #e1ebe3",padding:12,borderRadius:10,display:"flex",gap:12,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
    <div><strong>{p.name} · {money(p.price_minor)}</strong><p style={{fontSize:12,margin:"5px 0",color:"#67816d"}}>{p.included_visits} خدمات / {p.cycle_months} أشهر — {p.published?"منشورة":"غير منشورة"}</p></div>
    <button type="button" disabled={busy} onClick={()=>void invoke(p.published?"إيقاف نشر الباقة":"نشر الباقة","beger_g59_upsert_membership_plan",{
     p_business:businessId,p_plan:p.id,p_name:p.name,p_description:p.description,p_price_minor:p.price_minor,
     p_cycle_months:p.cycle_months,p_included_visits:p.included_visits,p_published:!p.published
    })} style={{padding:9,border:"1px solid #d0e4d5",borderRadius:9,background:"#fff"}}>{p.published?"إخفاء":"نشر"}</button>
   </div>)}
  </div>
  <div style={{display:"grid",gap:10,borderTop:"1px solid #e3ece5",paddingTop:16}}>
   <h3 style={{fontSize:16,margin:0}}>بنر عرض على موقع الصالون</h3>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10}}>
    <label style={{fontSize:12,display:"grid",gap:5}}>عنوان العرض<input style={input} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>شرح العرض<input style={input} maxLength={350} value={bannerDesc} onChange={e=>setBannerDesc(e.target.value)}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>بداية العرض<input style={input} type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label style={{fontSize:12,display:"grid",gap:5}}>انتهاء العرض<input style={input} type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   </div>
   <button disabled={busy||!start||!end||title.trim().length<4} onClick={()=>void invoke("نشر بنر","beger_g60_upsert_banner",{
    p_business:businessId,p_banner:null,p_title:title,p_description:bannerDesc,p_starts_at:new Date(start).toISOString(),
    p_ends_at:new Date(end).toISOString(),p_published:true
   })} style={{border:0,background:"#216c4e",color:"#fff",padding:12,borderRadius:9,fontWeight:800,justifySelf:"start"}}>نشر البنر ضمن المدة</button>
   {state?.banners.map(b=><div key={b.id} style={{border:"1px solid #e1ebe3",padding:12,borderRadius:10,display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
    <div><strong>{b.title}</strong><p style={{fontSize:12,margin:"5px 0",color:"#67816d"}}>{b.published?"منشور ضمن موعده":"غير منشور"} · {b.description}</p></div>
    <button type="button" disabled={busy} onClick={()=>void invoke(b.published?"إيقاف البنر":"نشر البنر","beger_g60_upsert_banner",{
     p_business:businessId,p_banner:b.id,p_title:b.title,p_description:b.description,
     p_starts_at:b.starts_at,p_ends_at:b.ends_at,p_published:!b.published
    })} style={{padding:9,border:"1px solid #d0e4d5",borderRadius:9,background:"#fff"}}>{b.published?"إخفاء":"نشر"}</button>
   </div>)}
  </div>
  <p style={{fontSize:11,color:"#777f75",margin:0}}>هذه عضويات معروضة فقط، ليست اشتراكاً مدفوعاً قابلاً للاستخدام بعد. البنرات العامة لا تُرسل رسائل تسويقية دون إذن.</p>
  {notice?<p role="status" style={{fontSize:12,color:"#216e4b"}}>{notice}</p>:null}{error?<p role="alert" style={{fontSize:12,color:"#a54439"}}>{error}</p>:null}
 </section>;
}
