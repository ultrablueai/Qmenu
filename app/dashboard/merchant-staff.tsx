"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import MerchantKitchenAccess from "./merchant-kitchen-access";
import MerchantCashierAccess from "./merchant-cashier-access";
import "./merchant-staff.css";
type Member={email:string;assignedAt:string};
type StaffRole="cashier"|"kitchen"|"pager";
const staffRoles:Record<StaffRole,{label:string;rpc:string;station:string;help:string}>={
 cashier:{label:"كاشير",rpc:"g10_cashier_assign",station:"/staff/cashier",help:"قبول الطلب، تأكيد التسليم وتسجيل التحصيل اليدوي"},
 kitchen:{label:"مطبخ",rpc:"g9_kitchen_assign",station:"/staff/kitchen",help:"تجهيز الطلب وإعلان الجاهزية دون الاطلاع على المدفوعات"},
 pager:{label:"بيجر",rpc:"g7_staff_pager_assign",station:"/staff/pager",help:"إصدار أرقام انتظار مستقلة ومتابعتها"}
};
export default function MerchantStaff({branchId,branchName}:{branchId:string;branchName:string}){
 const [members,setMembers]=useState<Member[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState<StaffRole>("cashier");
 const [rosterRevision,setRosterRevision]=useState(0);
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
   setEmail("");await refresh();setRosterRevision(v=>v+1);
   setNotice(allow?"تم منح الموظف صلاحية البيجر لهذا الفرع فقط.":"تم إلغاء وصول الموظف لهذا الفرع.");
  }catch{
   setError("تعذّر تنفيذ العملية. يجب أن يكون الحساب مسجلاً مسبقاً، وتتوفر صلاحية مالك النشاط. لا تتغير صلاحيات المديرين أو المالكين.");
  }finally{setBusy(false)}
 }
 async function quickAssign(){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  const target=email.trim().toLowerCase();
  const selected=staffRoles[role];
  try{
   const {error:requestError}=await browserSupabase().rpc(selected.rpc,{p_branch:branchId,p_email:target,p_allow:true});
   if(requestError)throw requestError;
   if(role==="pager")await refresh();
   setRosterRevision(v=>v+1);
   setEmail("");
   setNotice("تم تعيين "+target+" بدور "+selected.label+" في فرع "+branchName+". يمكن للموظف تسجيل الدخول إلى محطته.");
  }catch(reason){
   const detail=reason instanceof Error?reason.message:"";
   setError(/register|not found|does not exist|User must register/i.test(detail)?"الحساب غير مسجل في Beger بعد. اطلب من الموظف إنشاء حساب وتأكيد بريده، ثم أعد التعيين.":/forbidden|not authorized|permission|denied|42501/i.test(detail)?"تعيين الأدوار متاح لمالك النشاط فقط. سجل الدخول بحساب المالك.":"تعذّر منح الصلاحية. تأكد من تسجيل حساب الموظف وصلاحية المالك، ثم أعد المحاولة.");
  }finally{setBusy(false)}
 }
 return <section className="beger-staff-workspace" dir="rtl" aria-label="الموظفون والصلاحيات">
  <div className="beger-staff-intro"><span>BEGER / STAFF ACCESS</span><h3>الموظفون والأدوار</h3><p>{branchName} · عيّن الموظف لدوره والفرع الصحيح، ثم اختبر المحطة بحسابه.</p></div>
  <ol className="beger-staff-steps"><li>الموظف ينشئ حسابه في <a href="/signup" target="_blank" rel="noopener noreferrer">صفحة التسجيل</a> ويؤكد البريد. لا يحتاج لإنشاء متجر.</li><li>المالك يدخل بريد الموظف ويختار وظيفته لهذا الفرع.</li><li>الموظف يفتح رابط محطته أدناه ويسجل الدخول بحسابه.</li></ol>
  <form className="beger-staff-add beger-staff-quick-add" onSubmit={e=>{e.preventDefault();void quickAssign()}}>
   <label>بريد الموظف المسجّل<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" maxLength={254} autoComplete="off" inputMode="email" dir="ltr" placeholder="employee@example.com"/></label>
   <label>الدور المطلوب<select value={role} onChange={e=>setRole(e.target.value as StaffRole)}>{(Object.keys(staffRoles) as StaffRole[]).map(value=><option key={value} value={value}>{staffRoles[value].label}</option>)}</select></label>
   <button type="submit" disabled={busy||loading}>{busy?"جارٍ التعيين…":"تعيين الموظف"}</button>
  </form>
  <p className="beger-staff-explainer">الدور المختار: {staffRoles[role].help}. التعيين لهذا الفرع فقط، ولا يُنشئ حساباً أو يرسل دعوة. يجب أن يكون المنفّذ مالك النشاط.</p>
  {notice?<p role="status" className="beger-staff-notice">{notice}</p>:null}
  {error?<p role="alert" className="beger-staff-error">{error}</p>:null}
  <div className="beger-staff-list">
   <strong>موظفو البيجر ({members.length})</strong>
   {loading?<p role="status">جارٍ تحميل القائمة…</p>:members.length===0?<p>لا يوجد موظفون مخصصون لهذا الفرع.</p>:members.map(member=><div key={member.email} className="beger-staff-row">
    <span>{member.email}</span><button type="button" disabled={busy} onClick={()=>void assign(member.email,false)}>إلغاء الوصول</button>
   </div>)}
  </div>
  <MerchantKitchenAccess key={"kitchen-"+branchId+"-"+rosterRevision} branchId={branchId}/>
  <MerchantCashierAccess key={"cashier-"+branchId+"-"+rosterRevision} branchId={branchId}/>
  <nav className="beger-staff-stations" aria-label="محطات عمل الموظفين"><a href={"/staff/cashier?branch="+encodeURIComponent(branchId)} target="_blank" rel="noopener noreferrer">محطة الكاشير <span>قبول وتسليم وتسجيل التحصيل</span></a><a href={"/staff/kitchen?branch="+encodeURIComponent(branchId)} target="_blank" rel="noopener noreferrer">محطة المطبخ <span>التحضير وإعلان الجاهزية</span></a><a href={"/staff/pager?branch="+encodeURIComponent(branchId)} target="_blank" rel="noopener noreferrer">محطة البيجر <span>أرقام الانتظار المستقلة</span></a></nav><p className="beger-staff-explainer">كل محطة تتطلب حساباً مسجلاً وصلاحية مخصصة للفرع. هذه الروابط لا تمنح أي صلاحيات، ولا تعرض البيانات المالية لموظف المطبخ أو البيجر.</p>
 </section>;
}
