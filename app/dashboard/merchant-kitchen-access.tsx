"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type Staff={email:string;since:string};
export default function MerchantKitchenAccess({branchId}:{branchId:string}){
 const [list,setList]=useState<Staff[]>([]);
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g9_kitchen_roster",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Kitchen roster denied");
  setList(data as Staff[]);setLoaded(true);
 },[branchId]);
 useEffect(()=>{
  let live=true;setList([]);setLoaded(false);setError("");setNotice("");
  void refresh().catch(()=>{if(live)setError("تعذّر قراءة قائمة المطبخ؛ تأكد من صلاحية المدير.")});
  return()=>{live=false};
 },[refresh]);
 async function update(target:string,allow:boolean){
  if(busy)return;
  if(!allow&&!window.confirm("إلغاء صلاحية المطبخ لهذا الموظف في الفرع الحالي؟"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error}=await browserSupabase().rpc("g9_kitchen_assign",{p_branch:branchId,p_email:target.trim(),p_allow:allow});
   if(error)throw error;
   setEmail("");await refresh();
   setNotice(allow?"تم تعيين موظف للمطبخ في هذا الفرع.":"تم إلغاء صلاحية المطبخ.");
  }catch{setError("تعذّر الحفظ. يجب أن يكون حساب الموظف مسجلاً مسبقاً، وأن يكون من ينفذ العملية مالك النشاط.");}
  finally{setBusy(false)}
 }
 return <details className="beger-staff-kitchen">
  <summary>موظفو المطبخ <small>صلاحية تجهيز فقط · {list.length} موظف</small></summary>
  <div className="beger-staff-kitchen-body">
   <p>الموظف يستطيع رؤية مكونات الطلب وتغيير التحضير والجاهزية فقط. لا يستطيع الاطلاع على إجمالي المبيعات أو التحصيل.</p>
   <form className="beger-staff-add" onSubmit={event=>{event.preventDefault();void update(email,true)}}>
    <label>بريد موظف مسجّل<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={event=>setEmail(event.target.value)} placeholder="kitchen@example.com"/></label>
    <button type="submit" disabled={busy||!loaded}>إضافة موظف مطبخ</button>
   </form>
   {list.length===0&&loaded?<p>لا يوجد موظفون للمطبخ في هذا الفرع.</p>:list.map(item=><div key={item.email} className="beger-staff-row"><span>{item.email}</span><button type="button" disabled={busy} onClick={()=>void update(item.email,false)}>إلغاء الوصول</button></div>)}
   {notice?<p role="status" className="beger-staff-notice">{notice}</p>:null}
   {error?<p role="alert" className="beger-staff-error">{error}</p>:null}
   <p>رابط الموظف: <a href="/staff/kitchen" target="_blank" rel="noopener noreferrer">فتح محطة المطبخ ↗</a> · الدخول بحساب مسجّل وصلاحية فرع.</p>
  </div>
 </details>;
}
