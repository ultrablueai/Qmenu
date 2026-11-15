"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type Invite={id:string;businessName:string;branchName:string;role:"cashier"|"kitchen"|"pager";expiresAt:string};
const labels={cashier:"كاشير",kitchen:"مطبخ",pager:"بيجر"};
export default function StaffInvitations(){
 const [invites,setInvites]=useState<Invite[]>([]);
 const [busy,setBusy]=useState<string|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g11_my_invitations");
  if(error||!Array.isArray(data))throw Error("Unable to verify invitations");
  setInvites(data as Invite[]);setError("");setLoaded(true);
 },[]);
 useEffect(()=>{let live=true;void refresh().catch(()=>{if(live){setError("تعذّر تحميل الدعوات. حدّث الصفحة بعد التأكد من بريدك.");setLoaded(true)}});return()=>{live=false}},[refresh]);
 async function accept(invite:Invite){
  if(busy)return;setBusy(invite.id);setError("");
  try{
   const {data,error}=await browserSupabase().rpc("g11_accept_invitation",{p_invitation:invite.id});
   if(error||data?.assigned!==true)throw Error("Invitation not accepted");
   window.location.replace("/staff");
  }catch{setError("تعذّر قبول الدعوة. تحقق من تطابق البريد وتأكيده، أو اطلب من المالك تجديد الدعوة.");setBusy(null);}
 }
 return <section aria-label="دعوات العمل" style={{marginTop:26,padding:"18px",border:"1px solid #e2ddce",background:"#fff",borderRadius:14}}>
  <h2 style={{margin:"0 0 8px",fontSize:21}}>دعوات العمل</h2>
  <p style={{color:"#756d60",fontSize:13,lineHeight:1.7}}>الدعوات مرتبطة ببريدك الإلكتروني المؤكد. لا تُفعَّل الصلاحية إلا بعد الضغط على قبول.</p>
  {!loaded?<p role="status">جارٍ التحقق من الدعوات…</p>:invites.length===0?<p>لا توجد دعوات معلّقة لهذا البريد حالياً.</p>:<div style={{display:"grid",gap:11}}>{invites.map(invite=><article key={invite.id} style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",padding:14,border:"1px solid #e0e6d7",borderRadius:12,background:"#f7faf3"}}>
   <div><strong>{invite.businessName} · {invite.branchName}</strong><p style={{margin:"6px 0",fontSize:13}}>الدور: {labels[invite.role]} · تنتهي الدعوة: {new Date(invite.expiresAt).toLocaleDateString("ar")}</p></div>
   <button type="button" disabled={busy!==null} onClick={()=>void accept(invite)} style={{background:"#597844",color:"white",border:0,borderRadius:10,padding:"11px 16px",minHeight:44,cursor:"pointer"}}>{busy===invite.id?"جارٍ التفعيل…":"قبول الدور"}</button>
  </article>)}</div>}
  {error?<p role="alert" style={{color:"#994a35"}}>{error}</p>:null}
 </section>;
}
