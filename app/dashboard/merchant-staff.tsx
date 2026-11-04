"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import MerchantKitchenAccess from "./merchant-kitchen-access";
import "./merchant-staff.css";
type Member={email:string;assignedAt:string};
export default function MerchantStaff({branchId,branchName}:{branchId:string;branchName:string}){
 const [members,setMembers]=useState<Member[]>([]);
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g7_staff_pager_roster",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Unable to fetch roster");
  setMembers(data as Member[]);
 },[branchId]);
 useEffect(()=>{
  let live=true;setMembers([]);setLoading(true);setError("");setNotice("");
  void refresh().catch(()=>{if(live)setError("تعذّر قراءة موظفي الفرع. تحقق من صلاحيات الإدارة.")}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[refresh]);
 async function assign(target:string,allow:boolean){
  if(busy)return;
  if(!allow&&!window.confirm("إلغاء وصول هذا الموظف إلى البيجر في هذا الفرع؟"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error}=await browserSupabase().rpc("g7_staff_pager_assign",{p_branch:branchId,p_email:target.trim(),p_allow:allow});
   if(error)throw error;
   setEmail("");await refresh();
   setNotice(allow?"تم منح الموظف صلاحية البيجر لهذا الفرع فقط.":"تم إلغاء وصول الموظف لهذا الفرع.");
  }catch{
   setError("تعذّر تنفيذ العملية. يجب أن يكون الحساب مسجلاً مسبقاً، وتتوفر صلاحية مالك النشاط. لا تتغير صلاحيات المديرين أو المالكين.");
  }finally{setBusy(false)}
 }
 return <section className="beger-staff-workspace" dir="rtl" aria-label="الموظفون والصلاحيات">
  <div className="beger-staff-intro"><span>BEGER / STAFF ACCESS</span><h3>موظفو البيجر</h3><p>{branchName} · صلاحيات تشغيل محدودة دون الوصول إلى إدارة المتجر أو التقارير المالية.</p></div>
  <form className="beger-staff-add" onSubmit={e=>{e.preventDefault();void assign(email,true)}}>
   <label>بريد موظف مسجّل في Beger<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" maxLength={254} autoComplete="off" placeholder="staff@example.com"/></label>
   <button type="submit" disabled={busy||loading}>منح صلاحية البيجر</button>
  </form>
  <p className="beger-staff-explainer">الإضافة متاحة لمالك النشاط فقط. يجب أن ينشئ الموظف حسابه مسبقاً. لا يتم إرسال دعوة تلقائية، ولا يُمنح وصول لفروع أخرى.</p>
  {notice?<p role="status" className="beger-staff-notice">{notice}</p>:null}
  {error?<p role="alert" className="beger-staff-error">{error}</p>:null}
  <div className="beger-staff-list">
   <strong>الموظفون المصرّح لهم ({members.length})</strong>
   {loading?<p role="status">جارٍ تحميل القائمة…</p>:members.length===0?<p>لا يوجد موظفون مخصصون لهذا الفرع.</p>:members.map(member=><div key={member.email} className="beger-staff-row">
    <span>{member.email}</span><button type="button" disabled={busy} onClick={()=>void assign(member.email,false)}>إلغاء الوصول</button>
   </div>)}
  </div>
  <MerchantKitchenAccess key={"kitchen-"+branchId} branchId={branchId}/>
  <p className="beger-staff-explainer">شاشة الموظف: <a href="/staff/pager" target="_blank" rel="noopener noreferrer">فتح محطة البيجر ↗</a>. يستطيع الموظف إصدار رقم وتحديث حالته فقط؛ لا يستطيع إدارة الفروع أو المستخدمين.</p>
 </section>;
}
