"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserSupabase} from "../../../lib/supabase/browser";
export type SalonSetup={
 business_id:string;role:"owner"|"manager"|"staff";
 branches:{id:string;name:string}[];
 staff:{id:string;branch_id:string;name:string}[];
 chairs:{id:string;branch_id:string;label:string}[];
 services:{id:string;name:string;duration_minutes:number;price_minor:number;currency:string}[];
 public_booking_enabled:false;
 limit_horizon_days:number;
};
const fmt=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n/100);
export default function SalonPilotBooking({businessId,setup}:{businessId:string;setup:SalonSetup|null}){
 const router=useRouter();
 const [branch,setBranch]=useState(setup?.branches[0]?.id??"");
 const [staff,setStaff]=useState(setup?.staff.find(s=>s.branch_id===setup?.branches[0]?.id)?.id??"");
 const [chair,setChair]=useState(setup?.chairs.find(s=>s.branch_id===setup?.branches[0]?.id)?.id??"");
 const [services,setServices]=useState<string[]>([]);
 const [customer,setCustomer]=useState("");
 const [when,setWhen]=useState("");
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState("");
 const [error,setError]=useState("");
 if(!setup||setup.business_id!==businessId||setup.public_booking_enabled!==false){
  return <section style={{padding:18,border:"1px solid #e7d5cf",borderRadius:12,background:"#fff"}}>إعداد الحجز التجريبي غير متاح لهذا النشاط أو الحساب حالياً.</section>;
 }
 const staffOptions=setup.staff.filter(s=>s.branch_id===branch);
 const chairOptions=setup.chairs.filter(s=>s.branch_id===branch);
 const selected=setup.services.filter(s=>services.includes(s.id));
 const valid=Boolean(branch&&staff&&chair&&customer.trim().length>=2&&when&&services.length&&services.length<=8&&!busy);
 async function submit(){
  if(!valid)return;
  if(!window.confirm("إنشاء حجز تجريبي فعلي على Staging؟ لن يُرسل إشعار أو تُحصّل أموال."))return;
  setBusy(true);setError("");setResult("");
  try{
   const datetime=new Date(when);
   if(Number.isNaN(datetime.getTime()))throw Error("invalid datetime");
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g48_create_salon_booking",{
    p_business:businessId,p_branch:branch,p_customer_name:customer.trim(),p_staff:staff,
    p_chair:chair,p_services:services,p_starts_at:datetime.toISOString()
   });
   if(rpcError||data?.state!=="pending"||data?.public_booking_enabled!==false)throw new Error("booking rejected");
   setResult("تم تسجيل حجز على Staging برقم "+String(data.booking_id).slice(0,8)+
    " — بانتظار موافقة المعلم. عدد الخدمات "+String(data.service_count));
   setCustomer("");setServices([]);router.refresh();
  }catch{
   setError("تعذّر إنشاء الحجز. تحقق من ساعات الدوام، إعداد المعلم والخدمات، والكرسي أو تضارب الموعد. قد تكون الجلسة انتهت.");
  }finally{setBusy(false);}
 }
 const fStyle={display:"grid",gap:6,fontSize:12,fontWeight:700 as const,color:"#54705a"};
 const inputStyle={minHeight:43,padding:"10px 12px",background:"#fff",border:"1px solid #d7e5da",borderRadius:9,width:"100%",color:"#204d37"};
 return <section style={{padding:20,border:"1px solid #d8e7db",borderRadius:15,background:"#fff",display:"grid",gap:15}}>
  <div><h2 style={{fontSize:20,margin:"0 0 5px"}}>إنشاء حجز تجريبي آمن</h2><p style={{fontSize:12,color:"#688071",margin:0}}>المعلم أو الإدارة فقط — الحجز محفوظ في Staging، والتأكيد من لوحة المعلم. لا يمكن للزبائن العموميين استعمال العملية.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:12}}>
   <label style={fStyle}>الفرع<select style={inputStyle} value={branch} onChange={e=>{const b=e.target.value;setBranch(b);setStaff(setup.staff.find(s=>s.branch_id===b)?.id??"");setChair(setup.chairs.find(c=>c.branch_id===b)?.id??"")}}>{setup.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
   <label style={fStyle}>المعلم<select style={inputStyle} value={staff} onChange={e=>setStaff(e.target.value)}>{staffOptions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label style={fStyle}>الكرسي<select style={inputStyle} value={chair} onChange={e=>setChair(e.target.value)}>{chairOptions.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label style={fStyle}>اسم الزبون للتجربة<input style={inputStyle} value={customer} maxLength={100} onChange={e=>setCustomer(e.target.value)} placeholder="اسم وهمي فقط"/></label>
   <label style={fStyle}>التاريخ والوقت (بحسب توقيت جهازك)<input style={inputStyle} type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label>
  </div>
  <div style={{border:"1px solid #e6ede7",padding:12,borderRadius:11}}>
   <strong style={{fontSize:13}}>سلة الخدمات — اختر حتى 8 خدمات</strong>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:9,marginTop:11}}>{setup.services.map(s=><label key={s.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
    <input type="checkbox" checked={services.includes(s.id)} disabled={!services.includes(s.id)&&services.length>=8} onChange={e=>setServices(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>
    <span>{s.name} · {s.duration_minutes} دقيقة · {fmt(s.price_minor)}</span>
   </label>)}</div>
   {!setup.services.length?<p style={{color:"#9b6655",fontSize:12}}>لا توجد خدمات مفعّلة بعد. جهّز خدمات الصالون أولاً.</p>:null}
  </div>
  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",alignItems:"center",gap:12}}>
   <span style={{fontSize:13,color:"#2b6848",fontWeight:800}}>المجموع التقريبي: {fmt(selected.reduce((sum,s)=>sum+s.price_minor,0))} · {selected.reduce((sum,s)=>sum+s.duration_minutes,0)} دقيقة قبل الفواصل</span>
   <button type="button" disabled={!valid} onClick={()=>void submit()} style={{background:"#216f51",color:"#fff",border:0,borderRadius:10,padding:"12px 17px",fontWeight:850,cursor:valid?"pointer":"not-allowed",opacity:valid?1:.5}}>{busy?"جارٍ التحقق من الموعد…":"إرسال الحجز التجريبي"}</button>
  </div>
  {result?<p role="status" style={{color:"#1e7050",fontSize:13}}>{result}</p>:null}
  {error?<p role="alert" style={{color:"#ad483c",fontSize:13}}>{error}</p>:null}
  <p style={{color:"#738476",fontSize:11,margin:0}}>الحجز الأولي قيد الاعتماد ولا يضمن الإشعار تلقائياً. يحسم الخادم التداخل وساعات العمل والاستراحات عند الإرسال. لا تستخدم أسماء أو أرقام زبائن حقيقيين في Staging.</p>
 </section>;
}
