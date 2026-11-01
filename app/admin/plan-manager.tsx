"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "../../lib/supabase/browser";
import styles from "./admin.module.css";

type Plan = {id:string;code:string;name:string;active:boolean};
export default function PlanManager({plans,canManage}: {plans:Plan[];canManage:boolean}) {
 const router=useRouter();
 const [code,setCode]=useState("");
 const [name,setName]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 async function create(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(!canManage || busy || !/^[a-z][a-z0-9_]{2,31}$/.test(code.trim().toLowerCase()) || name.trim().length<2 || name.trim().length>90) return;
  setBusy("create");setError("");setNotice("");
  try{
   const {error:rpcError}=await browserSupabase().rpc("platform_owner_create_plan",{
     p_code:code.trim().toLowerCase(),p_name:name.trim()
   });
   if(rpcError) throw rpcError;
   setCode("");setName("");setNotice("تم إنشاء الباقة بنجاح. لا يوجد سعر أو اشتراك مفعل تلقائياً.");
   router.refresh();
  }catch {setError("تعذّر إنشاء الباقة؛ قد يكون رمزها مستخدماً، أو لا تمتلك صلاحية المالك.");}
  finally{setBusy(null);}
 }
 async function toggle(plan:Plan){
  if(!canManage || busy)return;
  setBusy(plan.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("platform_owner_set_plan_active",{
     p_plan:plan.id,p_active:!plan.active
   });
   if(rpcError || data!==true)throw new Error("Failed");
   setNotice(plan.active?"تم إيقاف إتاحة الباقة للاشتراكات الجديدة، دون حذف اشتراكات قائمة.":"تمت إعادة إتاحة الباقة.");
   router.refresh();
  }catch{setError("تعذّر تغيير حالة الباقة. حاول مجدداً.");}
  finally{setBusy(null);}
 }
 return <section id="plans" className={styles.panel} aria-labelledby="plans-heading">
  <div className={styles.panelHead}>
   <div><h2 id="plans-heading" className={styles.panelTitle}>إدارة الباقات</h2><p className={styles.panelDesc}>تعريف باقات بيجر وتشغيلها أو إيقافها. التسعير والاشتراكات والمدفوعات لم تُفعّل بعد.</p></div>
   <span className={styles.panelCount}>{plans.length} باقة</span>
  </div>
  {canManage && <form onSubmit={create} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12,alignItems:"end",marginBottom:20}}>
   <div style={{display:"grid",gap:7}}>
    <label htmlFor="plan-code" style={{fontSize:12,fontWeight:800}}>رمز الباقة (إنجليزي)</label>
    <input id="plan-code" required minLength={3} maxLength={32} value={code} onChange={e=>setCode(e.target.value)} placeholder="starter"
     pattern="[a-zA-Z][a-zA-Z0-9_]{2,31}" disabled={Boolean(busy)}
     style={{padding:12,border:"1px solid #d9e3e8",borderRadius:10,font:"inherit",boxSizing:"border-box",width:"100%"}} dir="ltr"/>
   </div>
   <div style={{display:"grid",gap:7}}>
    <label htmlFor="plan-name" style={{fontSize:12,fontWeight:800}}>اسم الباقة</label>
    <input id="plan-name" required minLength={2} maxLength={90} value={name} onChange={e=>setName(e.target.value)} placeholder="الباقة الأساسية"
     disabled={Boolean(busy)}
     style={{padding:12,border:"1px solid #d9e3e8",borderRadius:10,font:"inherit",boxSizing:"border-box",width:"100%"}}/>
   </div>
   <button type="submit" disabled={Boolean(busy)||name.trim().length<2||code.trim().length<3}
    style={{padding:13,border:0,borderRadius:10,background:"#17646b",color:"white",fontWeight:850,font:"inherit",cursor:"pointer"}}>
    {busy==="create"?"جارٍ الإنشاء...":"إضافة باقة"}
   </button>
  </form>}
  {notice && <p role="status" style={{color:"#216e58",fontSize:12}}>{notice}</p>}
  {error && <p role="alert" className={styles.error}>{error}</p>}
  {plans.length===0?<div className={styles.empty}>لا توجد باقات معرّفة بعد. إنشاء الباقة لا يفعّل تحصيلاً مالياً أو يمنح التاجر اشتراكاً تلقائياً.</div>:
   <div className={styles.tableWrap}>
    <table className={styles.table}>
     <thead><tr><th scope="col">الباقة</th><th scope="col">الرمز</th><th scope="col">الحالة</th><th scope="col">الإجراء</th></tr></thead>
     <tbody>{plans.map(plan=><tr key={plan.id}>
      <td><span className={styles.businessName}>{plan.name}</span></td>
      <td><code dir="ltr">{plan.code}</code></td>
      <td>{plan.active?<span className={styles.status}>متاحة</span>:<span className={styles.noPlan}>موقوفة</span>}</td>
      <td>{canManage?<button type="button" disabled={Boolean(busy)} onClick={()=>void toggle(plan)}
       style={{border:"1px solid #cddde2",background:"white",color:"#1b6670",borderRadius:8,padding:"9px 12px",cursor:"pointer",fontWeight:750}}>
       {busy===plan.id?"جارٍ الحفظ...":plan.active?"إيقاف الإتاحة":"إعادة الإتاحة"}
      </button>:<span style={{color:"#8796a3"}}>قراءة فقط</span>}</td>
     </tr>)}</tbody>
    </table>
   </div>}
 </section>;
}
