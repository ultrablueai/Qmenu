"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "../../lib/supabase/browser";
import QrSvg from "../../lib/qr/qr-svg";

type Customer = { id: string; display_name: string; active: boolean };
type Props = { businessId: string; businessName: string; customers: Customer[]; canManage: boolean };

export default function CustomerCards({ businessId, businessName, customers, canManage }: Props) {
 const router = useRouter();
 const [name,setName] = useState("");
 const [consent,setConsent] = useState(false);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [notice,setNotice] = useState("");
 const [issued,setIssued] = useState<{code:string; name:string}|null>(null);
 const [rotateConfirm,setRotateConfirm] = useState<string|null>(null);

 async function issue(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!canManage || busy || !consent || name.trim().length < 2 || name.trim().length > 100) return;
  setBusy(true);setError("");setNotice("");setIssued(null);
  try {
   const { data, error: rpcError } = await browserSupabase().rpc("issue_business_customer_qr",{
    p_business: businessId, p_name:name.trim(), p_consent:true
   });
   if (rpcError) throw rpcError;
   const card = data?.[0] as {customer_id:string;qr_code:string}|undefined;
   if (!card?.qr_code?.startsWith("QMB1.")) throw new Error("invalid issue response");
   setIssued({code:card.qr_code,name:name.trim()});
   setName("");setConsent(false);setNotice("تم إصدار بطاقة الزبون بنجاح. احفظ الرمز الآن؛ لا نحتفظ بنسخة منه قابلة للاسترجاع.");
   router.refresh();
  } catch {
   setError("تعذّر إصدار بطاقة الزبون. تأكد من الموافقة والصلاحيات وحاول مجدداً.");
  } finally {setBusy(false);}
 }
 async function rotate(customer:Customer) {
  if (!canManage || busy || rotateConfirm !== customer.id) return;
  setBusy(true);setError("");setNotice("");setIssued(null);
  try {
   const {data,error:rpcError} = await browserSupabase().rpc("rotate_business_customer_qr",{
    p_business:businessId,p_customer:customer.id
   });
   if(rpcError || typeof data!=="string" || !data.startsWith("QMB1.")) throw new Error("rotation failure");
   setIssued({code:data,name:customer.display_name});
   setNotice("تم إبطال الرمز القديم وإصدار رمز جديد. سلّم الرمز الجديد للزبون.");
   setRotateConfirm(null);router.refresh();
  } catch {setError("تعذّر إعادة إصدار البطاقة.");}
  finally {setBusy(false);}
 }
 async function deactivate(customer:Customer) {
  if(!canManage || busy || rotateConfirm !== customer.id) return;
  setBusy(true);setError("");setNotice("");setIssued(null);
  try {
   const {data,error:rpcError} = await browserSupabase().rpc("deactivate_business_customer_qr",{
    p_business:businessId,p_customer:customer.id
   });
   if(rpcError || data!==true) throw new Error("deactivation failure");
   setRotateConfirm(null);setNotice("تم إيقاف بطاقة الزبون.");router.refresh();
  }catch {setError("تعذّر إيقاف البطاقة.");}
  finally {setBusy(false);}
 }
 if(!canManage) return <p>إصدار بطاقات QR متاح للمالك والمدير فقط.</p>;
 return <section style={{background:"#fff",border:"1px solid #e7edf0",borderRadius:17,padding:20,marginTop:22}} aria-labelledby="customer-qr-heading">
  <h2 id="customer-qr-heading" style={{margin:"0 0 8px",fontSize:18}}>بطاقات QR الموحّدة للزبائن</h2>
  <p style={{fontSize:12,color:"#79899a",lineHeight:1.9,marginBottom:16}}>نفس بطاقة الزبون تعمل بكل فروع <strong>{businessName}</strong>؛ ويتم تسجيل الفرع الذي يمسحها. لا تخوّل البطاقة تسجيل الدخول أو دفع الأموال.</p>
  <form onSubmit={issue} style={{display:"grid",gap:12,maxWidth:560}}>
   <label htmlFor="customer-display-name" style={{fontSize:13,fontWeight:700}}>اسم الزبون</label>
   <input id="customer-display-name" type="text" required minLength={2} maxLength={100} value={name}
    onChange={e=>setName(e.target.value)} disabled={busy} autoComplete="off"
    placeholder="الاسم الذي يوافق الزبون على تسجيله"
    style={{font:"inherit",padding:12,borderRadius:10,border:"1px solid #d7e1e6",width:"100%",boxSizing:"border-box"}}/>
   <label style={{fontSize:12,color:"#526777",display:"flex",gap:9,alignItems:"flex-start",lineHeight:1.8}}>
    <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy} style={{marginTop:5}}/>
    أؤكد أن الزبون وافق على إنشاء بطاقة تعريف للزيارات داخل هذا النشاط وفروعه، ويمكنه طلب إيقافها.
   </label>
   <button type="submit" disabled={busy||!consent||name.trim().length<2} style={{padding:12,border:0,borderRadius:10,background:"#165e67",color:"#fff",fontWeight:800,opacity:busy?.5:1,cursor:"pointer"}}>
    {busy?"جارٍ الحفظ...":"إصدار QR خاص بالزبون"}
   </button>
  </form>
  {notice&&<p role="status" style={{color:"#14745d",fontSize:12}}>{notice}</p>}
  {error&&<p role="alert" style={{color:"#b24137",fontSize:12}}>{error}</p>}
  {issued&&<div style={{marginTop:20,padding:18,background:"#f4f9fa",border:"1px solid #dcebe9",borderRadius:15,maxWidth:330,textAlign:"center"}}>
   <strong>بطاقة {issued.name}</strong>
   <div style={{display:"flex",justifyContent:"center",margin:"14px 0"}}><QrSvg value={issued.code} size={242}/></div>
   <p style={{fontSize:11,color:"#657786",lineHeight:1.8}}>اعرض هذا الرمز للزبون ليحفظه بصورة. الرمز سرّي ويعمل في كل فروع النشاط فقط.</p>
   <button type="button" onClick={()=>{navigator.clipboard?.writeText(issued.code).then(()=>setNotice("تم نسخ الرمز. شاركه مع الزبون فقط.")).catch(()=>setError("تعذّر النسخ؛ احتفظ بصورة الرمز."));}}
    style={{padding:"9px 14px",borderRadius:9,border:"1px solid #bad8d7",background:"#fff",color:"#175f68",fontWeight:700}}>نسخ الرمز</button>
   <button type="button" onClick={()=>setIssued(null)} style={{marginRight:8,padding:"9px 14px",borderRadius:9,border:"1px solid #e2e9ed",background:"#fff"}}>إخفاء الرمز</button>
  </div>}
  <div style={{marginTop:24}}>
   <h3 style={{fontSize:15,marginBottom:12}}>الزبائن المسجّلون ({customers.length})</h3>
   {customers.length===0?<p style={{fontSize:12,color:"#8394a1"}}>ما في بطاقات زبائن بعد.</p>:customers.map(customer=>
    <div key={customer.id} style={{padding:"12px 0",borderTop:"1px solid #e9eef1",display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
     <div><strong style={{fontSize:13}}>{customer.display_name}</strong><span style={{marginRight:8,fontSize:11,color:customer.active?"#158068":"#a75048"}}>{customer.active?"نشطة":"موقوفة"}</span></div>
     {customer.active&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {rotateConfirm===customer.id?<><button type="button" disabled={busy} onClick={()=>rotate(customer)}>تأكيد إعادة الإصدار</button><button type="button" disabled={busy} onClick={()=>deactivate(customer)}>إيقاف البطاقة</button><button type="button" onClick={()=>setRotateConfirm(null)}>إلغاء</button></>
       :<button type="button" disabled={busy} onClick={()=>setRotateConfirm(customer.id)} style={{border:"1px solid #d8e4e7",background:"#fff",borderRadius:9,padding:"8px 12px",color:"#386772"}}>إدارة البطاقة</button>}
     </div>}
    </div>)}
  </div>
 </section>;
}
