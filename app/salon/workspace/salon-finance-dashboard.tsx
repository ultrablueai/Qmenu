"use client";
import {useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
type Row={staff_id:string;name:string;bookings:number;sales_minor:number;worker_minor:number;shop_minor:number;unconfigured_lines:number};
export type FinanceData={business_id:string;scope:"own_only"|"whole_business";staff:Row[];collected_only:true;external_payouts_enabled:false;chair_rent_billed:false;salaries_included:false;tax_invoice_issued:false};
const money=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n/100);
const input={padding:11,minHeight:42,border:"1px solid #d6e5d8",borderRadius:10,background:"#fff",color:"#24583a",width:"100%"};
export default function SalonFinanceDashboard({businessId,initial}:{businessId:string;initial:FinanceData|null}){
 const [state,setState]=useState<FinanceData|null>(initial);
 const [staff,setStaff]=useState(initial?.staff[0]?.staff_id??"");
 const [model,setModel]=useState("commission");
 const [percent,setPercent]=useState(50);
 const [rent,setRent]=useState(0);
 const [period,setPeriod]=useState("week");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const valid=state?.business_id===businessId&&state.external_payouts_enabled===false&&
  (state.scope==="own_only"||state.scope==="whole_business")&&Array.isArray(state.staff);
 async function refresh(){
  setError("");
  const {data,error:e}=await browserSupabase().rpc("beger_g54_staff_finance",{p_business:businessId});
  if(e||!data||data.business_id!==businessId||data.scope!==state?.scope||data.external_payouts_enabled!==false||!Array.isArray(data.staff)){
   setError("تعذّر تحديث التقرير، أو تغيّرت صلاحيات حسابك.");return;
  }
  setState(data as FinanceData);
 }
 async function saveContract(){
  if(!valid||state?.scope!=="whole_business"||busy||!staff)return;
  if(!window.confirm("اعتماد اتفاق الحساب الجديد للمعلم؟ سيبدأ سريانه من الغد بتوقيت تركيا. لا يتم تنفيذ أي دفعة مالية."))return;
  setBusy(true);setNotice("");setError("");
  try{
   const {data,error:e}=await browserSupabase().rpc("beger_g54_set_staff_agreement",{
    p_business:businessId,p_staff:staff,p_model:model,p_commission_bps:Math.round(percent*100),
    p_chair_rent_minor:Math.round(rent*100),p_rent_period:model==="chair_rent"?period:null
   });
   if(e||!data?.agreement_id||data.payouts_enabled!==false)throw new Error("Contract rejected");
   setNotice("تم حفظ الاتفاق. يبدأ سريانه "+String(data.effective_from)+". لم تُرسل أي دفعة.");
   await refresh();
  }catch{setError("تعذّر حفظ اتفاق المعلم. راجع القيم وصلاحية المالك.")}
  finally{setBusy(false)}
 }
 if(!valid)return <section style={{background:"#fff",padding:18,borderRadius:15}}>البيانات المالية غير متاحة لهذا الحساب.</section>;
 const owner=state!.scope==="whole_business";
 const total=state!.staff.reduce((x,row)=>({sales:x.sales+row.sales_minor,worker:x.worker+row.worker_minor,shop:x.shop+row.shop_minor}),{sales:0,worker:0,shop:0});
 return <section style={{background:"#fff",border:"1px solid #dce8df",borderRadius:16,padding:20,display:"grid",gap:17}}>
   <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <div><span style={{color:"#338359",fontWeight:850,fontSize:12}}>BEGER · SALON FINANCE</span><h2 style={{fontSize:21,margin:"7px 0"}}>{owner?"مالية الصالون والمعلمين":"إيراداتي وحصتي من الخدمات"}</h2></div>
    <button onClick={()=>void refresh()} style={{padding:11,border:"1px solid #d4e6d8",borderRadius:9,background:"#f5faf5",color:"#276a49"}}>تحديث الحساب</button>
   </header>
   <p style={{fontSize:12,color:"#768575",margin:0}}>الأرقام للخدمات المكتملة والمحصّلة المسجلة يدوياً على Staging فقط. لا تتضمن الرواتب أو الضرائب أو إيجارات الكراسي المستحقة أو الإكراميات.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{[
    ["المبيعات المسجلة",total.sales],["حصة المعلمين",total.worker],["حصة المحل قبل المصاريف",total.shop]
   ].map(([label,value])=><div key={String(label)} style={{border:"1px solid #e4eee5",borderRadius:12,padding:15,display:"grid",gap:12}}><span style={{fontSize:12,color:"#667b6b"}}>{label}</span><strong style={{fontSize:21,color:"#176b4b"}}>{money(value as number)}</strong></div>)}</div>
   <div style={{display:"grid",gap:8}}>{state!.staff.map(x=><div key={x.staff_id} style={{background:"#f7faf8",padding:14,borderRadius:11,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
     <div><strong>{x.name}</strong><p style={{fontSize:12,margin:"5px 0",color:"#718276"}}>{x.bookings} حجوزات محصلة · مبيعات {money(x.sales_minor)}</p>{x.unconfigured_lines>0?<small style={{color:"#a15e40"}}>توجد خدمات بلا اتفاق محسوب</small>:null}</div>
     <div style={{textAlign:"end"}}><b style={{color:"#1c704d"}}>حصة المعلم {money(x.worker_minor)}</b>{owner?<p style={{fontSize:12,margin:3}}>حصة المحل {money(x.shop_minor)}</p>:null}</div>
   </div>)}</div>
   {owner?<div style={{borderTop:"1px solid #e2eae3",paddingTop:16,display:"grid",gap:12}}>
     <h3 style={{margin:0,fontSize:17}}>اعتماد اتفاق جديد لمعلم</h3>
     <p style={{fontSize:12,color:"#798b7a",margin:0}}>لا تعدّل الاتفاقات السابقة ولا تغيّر الأرباح التاريخية. لتوثيق عقد مستقبلي، اختر المعلم والنظام والنسبة المطلوبة صراحةً.</p>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:12}}>
      <label style={{fontSize:12}}>المعلم<select style={input} value={staff} onChange={e=>setStaff(e.target.value)}>{state!.staff.map(x=><option value={x.staff_id} key={x.staff_id}>{x.name}</option>)}</select></label>
      <label style={{fontSize:12}}>نظام الحساب<select style={input} value={model} onChange={e=>setModel(e.target.value)}><option value="commission">نسبة</option><option value="chair_rent">إيجار كرسي</option><option value="salary_plus_commission">راتب ونسبة</option><option value="owner">صاحب المحل</option></select></label>
      {["commission","salary_plus_commission"].includes(model)?<label style={{fontSize:12}}>نسبة المعلم %<input style={input} type="number" min={0} max={100} value={percent} onChange={e=>setPercent(Number(e.target.value))}/></label>:null}
      {model==="chair_rent"?<><label style={{fontSize:12}}>إيجار الكرسي ₺<input style={input} type="number" min={0} value={rent} onChange={e=>setRent(Number(e.target.value))}/></label><label style={{fontSize:12}}>دورة الإيجار<select style={input} value={period} onChange={e=>setPeriod(e.target.value)}><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></label></>:null}
     </div>
     <button disabled={busy||!staff||!Number.isFinite(percent)||percent<0||percent>100||rent<0} onClick={()=>void saveContract()} style={{border:0,borderRadius:10,padding:"12px 16px",fontWeight:900,background:"#206f4e",color:"#fff",justifySelf:"start"}}>{busy?"جارٍ الحفظ…":"حفظ اتفاق المعلم"}</button>
   </div>:null}
   {notice?<p role="status" style={{color:"#206c4a",fontSize:13}}>{notice}</p>:null}{error?<p role="alert" style={{color:"#9f4035",fontSize:13}}>{error}</p>:null}
 </section>;
}
