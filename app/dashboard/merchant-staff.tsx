"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import MerchantKitchenAccess from "./merchant-kitchen-access";
import MerchantCashierAccess from "./merchant-cashier-access";
import "./merchant-staff.css";
type Member={email:string;assignedAt:string};
type Invitation={id:string;email:string;role:"cashier"|"kitchen"|"pager";status:"pending"|"accepted"|"revoked"|"expired";expiresAt:string};
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
 const [invitations,setInvitations]=useState<Invitation[]>([]);
 const [invitationNotice,setInvitationNotice]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refreshInvites=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g11_owner_invitations",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Invitation roster unavailable");
  setInvitations(data as Invitation[]);
 },[branchId]);
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g7_staff_pager_roster",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Unable to fetch roster");
  setMembers(data as Member[]);
 },[branchId]);
 useEffect(()=>{
  let live=true;setMembers([]);setLoading(true);setError("");setNotice("");
  void Promise.all([refresh(),refreshInvites()]).catch(()=>{if(live)setError("تعذّر قراءة الموظفين أو الدعوات. تحقق من صلاحية المالك.")}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[refresh,refreshInvites]);
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
  if(busy)return;setBusy(true);setError("");setNotice("");setInvitationNotice("");
  const target=email.trim().toLowerCase();
  try{
   const {data,error:requestError}=await browserSupabase().rpc("g11_staff_invite",{p_branch:branchId,p_email:target,p_role:role});
   if(requestError||data?.status!=="pending")throw requestError??Error("Invitation not confirmed");
   await refreshInvites();
   setEmail("");
   setInvitationNotice("دعوة "+staffRoles[role].label+" أُنشئت للبريد "+target+". الموظف يسجّل من بوابته ويقبلها بنفسه قبل حصوله على الصلاحية.");
  }catch(reason){
   const detail=reason instanceof Error?reason.message:"";
   setError(/forbidden|not authorized|permission|denied|42501/i.test(detail)?"إرسال الدعوة متاح لمالك النشاط فقط.":"تعذّر إنشاء الدعوة. تأكد من البريد وصلاحيات الفرع ثم حاول مرة أخرى.");
  }finally{setBusy(false)}
 }
 async function revokeInvitation(id:string){
  if(busy||!window.confirm("إلغاء هذه الدعوة قبل قبولها؟"))return;
  setBusy(true);setError("");
  try{
   const {error}=await browserSupabase().rpc("g11_revoke_invitation",{p_invitation:id});
   if(error)throw error;
   await refreshInvites();setInvitationNotice("أُلغيت الدعوة المعلّقة.");
  }catch{setError("تعذّر إلغاء الدعوة. تحقق من صلاحية المالك.")}
  finally{setBusy(false)}
 }
 return <section className="beger-staff-workspace" dir="rtl" aria-label="الموظفون والصلاحيات">
  <div className="beger-staff-intro"><span>BEGER / STAFF ACCESS</span><h3>الموظفون والأدوار</h3><p>{branchName} · عيّن الموظف لدوره والفرع الصحيح، ثم اختبر المحطة بحسابه.</p></div>
  <ol className="beger-staff-steps"><li>صاحب النشاط يدخل بريد الموظف ويختار دوره. تُنشأ دعوة معلّقة دون منح صلاحية فورية.</li><li>الموظف يفتح <a href="/staff/register" target="_blank" rel="noopener noreferrer">بوابة تسجيل الموظفين</a> ويؤكد نفس البريد المدعو.</li><li>الموظف يدخل <a href="/staff" target="_blank" rel="noopener noreferrer">مساحة الموظف</a> ويقبل الدعوة، ثم تظهر محطته.</li></ol>
  <form className="beger-staff-add beger-staff-quick-add" onSubmit={e=>{e.preventDefault();void quickAssign()}}>
   <label>بريد الموظف المراد دعوته<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" maxLength={254} autoComplete="off" inputMode="email" dir="ltr" placeholder="employee@example.com"/></label>
   <label>الدور المطلوب<select value={role} onChange={e=>setRole(e.target.value as StaffRole)}>{(Object.keys(staffRoles) as StaffRole[]).map(value=><option key={value} value={value}>{staffRoles[value].label}</option>)}</select></label>
   <button type="submit" disabled={busy||loading}>{busy?"جارٍ إنشاء الدعوة…":"إرسال دعوة الدور"}</button>
  </form>
  <p className="beger-staff-explainer">الدور المختار: {staffRoles[role].help}. الدعوة مرتبطة بهذا البريد والفرع وتنتهي خلال 14 يوماً. تتفعّل فقط عندما يقبلها الموظف من حساب مؤكد البريد. لا نُنشئ له كلمة مرور، ولا نرسل بريداً تلقائياً في Staging؛ أرسل له رابط بوابة الموظفين.</p>
  {invitationNotice?<p role="status" className="beger-staff-notice">{invitationNotice} <a href="/staff/register" target="_blank" rel="noopener noreferrer">فتح بوابة تسجيل الموظفين</a></p>:null}
  <div className="beger-staff-list" aria-label="دعوات الموظفين"><strong>دعوات الموظفين ({invitations.length})</strong>{invitations.length===0?<p>لا توجد دعوات لهذا الفرع.</p>:invitations.map(invite=><div key={invite.id} className="beger-staff-row"><span>{invite.email} · {staffRoles[invite.role].label} · {invite.status==="pending"?"بانتظار القبول":invite.status==="accepted"?"مقبولة":invite.status==="expired"?"منتهية":"ملغاة"}</span>{invite.status==="pending"?<button type="button" disabled={busy} onClick={()=>void revokeInvitation(invite.id)}>إلغاء الدعوة</button>:null}</div>)}</div>
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
