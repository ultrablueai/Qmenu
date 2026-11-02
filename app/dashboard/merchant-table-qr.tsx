"use client";
import {useEffect,useState,type FormEvent} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import QrSvg from "../../lib/qr/qr-svg";
type Table={id:string;label:string;qr_token:string;active:boolean};
const buttonStyle={border:"1px solid #cbd5b5",borderRadius:11,padding:"10px 14px",fontWeight:800,fontSize:12,cursor:"pointer",color:"#52683a",background:"#fbfdf6"} as const;
export default function MerchantTableQr({businessId,branchId,branchName}:{businessId:string;branchId:string;branchName:string}){
 const [rows,setRows]=useState<Table[]>([]),[label,setLabel]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[origin,setOrigin]=useState("");
 useEffect(()=>{setOrigin(window.location.origin)},[]);
 useEffect(()=>{let active=true;setLoading(true);browserSupabase().from("dining_tables").select("id,label,qr_token,active").eq("business_id",businessId).eq("branch_id",branchId).order("created_at").then(({data,error})=>{if(!active)return;if(error)setError("تعذّر تحميل طاولات الفرع. تأكد من صلاحية الإدارة.");else{setRows(data??[]);setError("")}setLoading(false)});return()=>{active=false}},[businessId,branchId]);
 async function refresh(){const {data,error}=await browserSupabase().from("dining_tables").select("id,label,qr_token,active").eq("business_id",businessId).eq("branch_id",branchId).order("created_at");if(error)throw error;setRows(data??[]);}
 async function add(event:FormEvent<HTMLFormElement>){event.preventDefault();const value=label.trim();if(!value||value.length>50||busy)return;setBusy(true);setError("");setNotice("");try{const {error}=await browserSupabase().from("dining_tables").insert({business_id:businessId,branch_id:branchId,label:value});if(error)throw error;setLabel("");await refresh();setNotice("تم إنشاء الطاولة ورمزها الحقيقي في هذا الفرع.")}catch{setError("تعذّر إنشاء الطاولة. قد يكون الاسم مستخدماً مسبقاً أو الصلاحيات غير كافية.")}finally{setBusy(false)}}
 async function toggle(table:Table){if(busy)return;setBusy(true);setError("");setNotice("");try{const {data,error}=await browserSupabase().from("dining_tables").update({active:!table.active}).eq("id",table.id).eq("branch_id",branchId).eq("business_id",businessId).select("id").maybeSingle();if(error||!data)throw error??new Error("Not updated");await refresh();setNotice(table.active?"تم إيقاف رمز الطاولة.":"تم إعادة تفعيل رمز الطاولة.")}catch{setError("لم نتمكن من تغيير حالة الطاولة.")}finally{setBusy(false)}}
 async function rotate(table:Table){if(busy||!confirm("سيتم إبطال QR السابق للطاولة. متابعة؟"))return;setBusy(true);setError("");setNotice("");try{const {data,error}=await browserSupabase().from("dining_tables").update({qr_token:crypto.randomUUID()}).eq("id",table.id).eq("business_id",businessId).eq("branch_id",branchId).select("id").maybeSingle();if(error||!data)throw error??new Error("Not updated");await refresh();setNotice("تم تجديد الرمز وإبطال الرمز القديم.")}catch{setError("تعذّر تحديث الرمز. تحقق من الصلاحيات.")}finally{setBusy(false)}}
 return <section className="beger-qr-manager" aria-labelledby="beger-table-qr-title">
 <h3 id="beger-table-qr-title">رموز QR للطاولات · {branchName}</h3>
 <p>كل طاولة لها رمز مستقل يفتح منيو نفس الفرع مع رقم الطاولة. الرمز لا يثبت وجود الزبون ولا ينشئ طلباً.</p>
 <form onSubmit={add} className="beger-qr-add-table"><label htmlFor="beger-table-label">اسم أو رقم الطاولة</label><input id="beger-table-label" value={label} onChange={e=>setLabel(e.target.value)} required maxLength={50} placeholder="مثلاً: طاولة 01" disabled={busy}/><button type="submit" disabled={busy||!label.trim()}>+ إضافة طاولة</button></form>
 {loading?<p role="status">جارٍ تحميل الطاولات...</p>:null}{error?<p role="alert" className="beger-qr-error">{error}</p>:null}{notice?<p role="status" className="beger-qr-success">{notice}</p>:null}
 {!loading&&rows.length===0?<p className="beger-qr-empty">لم تُنشأ طاولات بعد. أضف أول طاولة ليظهر رمزها.</p>:null}
 <div className="beger-qr-grid">{rows.map(t=>{const path="/t/"+t.qr_token;const url=origin+path;return <article key={t.id} className="beger-qr-card">
  <div className="beger-qr-card-heading"><strong>{t.label}</strong><span className={t.active?"beger-qr-active":"beger-qr-inactive"}>{t.active?"نشط":"متوقف"}</span></div>
  <div className="beger-qr-code">{origin?<QrSvg value={url} size={170} label={"رمز QR للطاولة "+t.label}/>:<span>جارٍ إنشاء QR</span>}</div>
  <a href={path} target="_blank" rel="noopener noreferrer">فتح منيو الطاولة ↗</a>
  <div className="beger-qr-card-controls"><button type="button" disabled={busy} onClick={()=>toggle(t)} style={buttonStyle}>{t.active?"إيقاف":"تفعيل"}</button><button type="button" disabled={busy} onClick={()=>rotate(t)} style={buttonStyle}>تجديد الرمز</button><button type="button" style={buttonStyle} disabled={!origin} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setNotice("تم نسخ الرابط")).catch(()=>setError("تعذّر النسخ، افتح الرابط يدوياً"))}>نسخ</button></div>
 </article>})}</div>
 </section>;
}
