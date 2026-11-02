"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "../../lib/supabase/browser";
import styles from "./admin.module.css";

type Business = {business_id:string;business_name:string;subscription_status:string|null};
type Plan = {id:string;code:string;name:string;active:boolean};
type Trial = {business_id:string;plan_code:string;starts_at:string;ends_at:string|null;effective_status:string};

export default function TrialManager({businesses,plans,trials,canManage}: {
 businesses:Business[];plans:Plan[];trials:Trial[];canManage:boolean
}) {
 const router=useRouter();
 const [business,setBusiness]=useState("");
 const [plan,setPlan]=useState("");
 const [days,setDays]=useState(14);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const available=businesses.filter(b=>!b.subscription_status);
 const activePlans=plans.filter(p=>p.active);
 const selected=available.find(b=>b.business_id===business);

 async function start(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!canManage||busy||!selected||!activePlans.some(p=>p.id===plan)||![7,14,30].includes(days))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("platform_owner_start_trial",{
    p_business:business,p_plan:plan,p_days:days
   });
   if(rpcError||typeof data!=="string")throw new Error("Trial failed");
   setNotice("تم إنشاء اشتراك تجريبي فقط. لا توجد مدفوعات أو تجديد تلقائي.");
   setBusiness("");setPlan("");router.refresh();
  }catch{
   setError("تعذّر إنشاء التجربة. تحقق من الباقة وحالة التاجر، فقد يمتلك اشتراكاً سابقاً.");
  }finally{setBusy(false);}
 }
 return <section id="trials" className={styles.panel} aria-labelledby="trial-heading">
  <div className={styles.panelHead}>
   <div><h2 id="trial-heading" className={styles.panelTitle}>اشتراكات التجربة للتجار</h2>
    <p className={styles.panelDesc}>تجربة واحدة لكل تاجر بإحدى الباقات النشطة، دون تحصيل أو تجديد تلقائي. الأسعار والفوترة غير متاحة بعد.</p>
   </div><span className={styles.panelCount}>{trials.length} سجل</span>
  </div>
  {canManage&&<form onSubmit={start} style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",alignItems:"end",marginBottom:20}}>
   <label style={{fontSize:12,fontWeight:800,display:"grid",gap:7}} htmlFor="trial-business">النشاط
    <select id="trial-business" value={business} onChange={e=>setBusiness(e.target.value)} required disabled={busy||available.length===0}
     style={{font:"inherit",padding:11,borderRadius:10,border:"1px solid #d8e3e8",background:"white",minWidth:0}}>
     <option value="">اختر نشاطاً دون اشتراك</option>{available.map(b=><option key={b.business_id} value={b.business_id}>{b.business_name}</option>)}
    </select>
   </label>
   <label style={{fontSize:12,fontWeight:800,display:"grid",gap:7}} htmlFor="trial-plan">الباقة
    <select id="trial-plan" value={plan} onChange={e=>setPlan(e.target.value)} required disabled={busy||activePlans.length===0}
     style={{font:"inherit",padding:11,borderRadius:10,border:"1px solid #d8e3e8",background:"white",minWidth:0}}>
     <option value="">اختر باقة نشطة</option>{activePlans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
   </label>
   <label style={{fontSize:12,fontWeight:800,display:"grid",gap:7}} htmlFor="trial-duration">المدة
    <select id="trial-duration" value={days} onChange={e=>setDays(Number(e.target.value))} disabled={busy}
     style={{font:"inherit",padding:11,borderRadius:10,border:"1px solid #d8e3e8",background:"white"}}>
     <option value={7}>7 أيام</option><option value={14}>14 يوم</option><option value={30}>30 يوم</option>
    </select>
   </label>
   <button type="submit" disabled={busy||!selected||!plan} style={{background:"#17646b",color:"white",border:0,padding:12,borderRadius:10,fontWeight:800,cursor:"pointer",font:"inherit"}}>
    {busy?"جارٍ التفعيل...":"تفعيل تجربة"}
   </button>
  </form>}
  {canManage&&(!available.length||!activePlans.length)&&<p className={styles.panelDesc}>لتفعيل تجربة، يجب أن يتوفر نشاط بلا اشتراك وباقة نشطة واحدة على الأقل.</p>}
  {notice&&<p role="status" style={{color:"#206d55",fontSize:12}}>{notice}</p>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {trials.length===0?<div className={styles.empty}>لا يوجد أي اشتراك تجريبي أو مدفوع حتى الآن. ما في تجار أو مدفوعات وهمية.</div>:
   <div className={styles.tableWrap}><table className={styles.table}>
    <thead><tr><th scope="col">النشاط</th><th scope="col">الباقة</th><th scope="col">البداية</th><th scope="col">النهاية</th><th scope="col">الحالة الفعلية</th></tr></thead>
    <tbody>{trials.map((t,i)=><tr key={t.business_id+":"+t.starts_at+":"+i}>
      <td><span className={styles.businessName}>{businesses.find(b=>b.business_id===t.business_id)?.business_name??"نشاط غير متاح بالقائمة الحالية"}</span></td>
      <td><code dir="ltr">{t.plan_code}</code></td>
      <td>{new Date(t.starts_at).toLocaleDateString("ar")}</td>
      <td>{t.ends_at?new Date(t.ends_at).toLocaleDateString("ar"):"—"}</td>
      <td>{t.effective_status==="trial"?<span className={styles.status}>تجربة سارية</span>:<span className={styles.noPlan}>{t.effective_status==="expired"?"منتهية":t.effective_status}</span>}</td>
    </tr>)}</tbody>
   </table></div>}
 </section>;
}
