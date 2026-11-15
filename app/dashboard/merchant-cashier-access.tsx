"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type Staff={email:string;since:string};
export default function MerchantCashierAccess({branchId}:{branchId:string}){
 const [list,setList]=useState<Staff[]>([]),[email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g10_cashier_roster",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Cashier roster denied");
  setList(data as Staff[]);setLoaded(true);
 },[branchId]);
 useEffect(()=>{
  let active=true;setList([]);setLoaded(false);setError("");setNotice("");
  void refresh().catch(()=>{if(active)setError("تعذّر قراءة قائمة الكاشير. تأكد من صلاحية المدير.")});
  return()=>{active=false};
 },[refresh]);
 async function update(target:string,allow:boolean){
  if(busy)return;
  if(!allow&&!window.confirm("إلغاء صلاحية الكاشير لهذا الموظف في الفرع؟"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error}=await browserSupabase().rpc("g10_cashier_assign",{p_branch:branchId,p_email:target.trim(),p_allow:allow});
   if(error)throw error;
   setEmail("");await refresh();setNotice(allow?"تم تعيين موظف الكاشير في هذا الفرع.":"تم إلغاء وصول الكاشير.");
  }catch{setError("فشل الحفظ. يجب أن يكون حساب الموظف مسجلاً مسبقاً، وأن يكون من يمنح الصلاحية مالك النشاط.");}
  finally{setBusy(false)}
 }
 return <details className="beger-staff-kitchen" dir="rtl">
  <summary>موظفو الكاشير <small>قبول واستلام وتسجيل تحصيل · {list.length} موظف</small></summary>
  <div className="beger-staff-kitchen-body">
   <p>صلاحية الفرع المحدد فقط: قبول طلب، تأكيد تسليم، وتسجيل تحصيل تم بالفعل. ليست صلاحية تسوية أو تعديل أسعار أو إغلاق مالي.</p>
   <form className="beger-staff-add" onSubmit={e=>{e.preventDefault();void update(email,true)}}>
    <label>بريد موظف مسجّل<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="cashier@example.com" autoComplete="off"/></label>
    <button type="submit" disabled={busy||!loaded}>إضافة موظف كاشير</button>
   </form>
   {list.length===0&&loaded?<p>لا يوجد موظفون كاشير لهذا الفرع.</p>:list.map(m=><div className="beger-staff-row" key={m.email}><span>{m.email}</span><button type="button" disabled={busy} onClick={()=>void update(m.email,false)}>إلغاء الوصول</button></div>)}
   {notice?<p role="status" className="beger-staff-notice">{notice}</p>:null}
   {error?<p role="alert" className="beger-staff-error">{error}</p>:null}
   <p>رابط الموظف: <a href="/staff/cashier" target="_blank" rel="noopener noreferrer">فتح محطة الكاشير ↗</a> · يتطلب حساباً وصلاحية فرع.</p>
  </div>
 </details>;
}
