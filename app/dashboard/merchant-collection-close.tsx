"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-collection-close.css";

type MoneyRow={currency:string;records:number;totalMinor:number;cashMinor:number;cardMinor:number;transferMinor:number};
type Preview={start:string;end:string;overlaps:boolean;summary:{recordedPayments:number;currencies:MoneyRow[]}};
type Closed={id:string;start:string;end:string;closedAt:string;note:string|null;records:number;currencies:MoneyRow[]};
type Period={start:string;end:string};
function localInput(d:Date){
 const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
 return local.toISOString().slice(0,16);
}
function money(value:number,currency:string){
 const factor=["TRY","USD","EUR","GBP"].includes(currency)?100:1;
 return new Intl.NumberFormat("ar",{minimumFractionDigits:factor===100?2:0,maximumFractionDigits:factor===100?2:0}).format(value/factor)+" "+currency;
}
const stamp=(value:string)=>new Date(value).toLocaleString("ar",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
export default function MerchantCollectionClose({branchId}:{branchId:string}){
 const [start,setStart]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return localInput(d)});
 const [end,setEnd]=useState(()=>localInput(new Date()));
 const [note,setNote]=useState("");
 const [preview,setPreview]=useState<Preview|null>(null);
 const [history,setHistory]=useState<Closed[]>([]);
 const [loadedHistory,setLoadedHistory]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{setPreview(null);setHistory([]);setLoadedHistory(false);setNote("");setError("");setNotice("");},[branchId]);
 const period=():Period|null=>{
  const a=new Date(start),b=new Date(end),now=Date.now();
  if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a||b.getTime()-a.getTime()>31*3600000||b.getTime()>now+60000||a.getTime()<now-60*86400000)return null;
  return {start:a.toISOString(),end:b.toISOString()};
 };
 async function fetchHistory(){
  const p=period();
  if(!p){setError("اختر فترة صحيحة لا تتجاوز 31 ساعة ومن آخر 60 يوماً.");return;}
  setBusy(true);setError("");
  try{
   const {data,error}=await browserSupabase().rpc("g8_collection_close",{
    p_branch:branchId,p_start:p.start,p_end:p.end,p_action:"history",p_note:null
   });
   if(error||!Array.isArray(data))throw Error("Invalid close history");
   setHistory(data as Closed[]);setLoadedHistory(true);
  }catch{setError("تعذّر عرض سجلات الإغلاق. تحقق من تسجيل الدخول وصلاحيات الفرع.");}
  finally{setBusy(false)}
 }
 async function loadPreview(){
  const p=period();
  if(!p){setError("اختر فترة صحيحة: البداية قبل النهاية، بحد أقصى 31 ساعة ومن آخر 60 يوماً.");return;}
  setBusy(true);setError("");setNotice("");setPreview(null);
  try{
   const {data,error}=await browserSupabase().rpc("g8_collection_close",{
    p_branch:branchId,p_start:p.start,p_end:p.end,p_action:"preview",p_note:null
   });
   if(error||!data||!data.summary||!Array.isArray(data.summary.currencies))throw Error("Invalid close preview");
   setPreview(data as Preview);
  }catch{setError("تعذّرت معاينة الإغلاق. راجع صلاحية المدير أو الفترة المحددة.");}
  finally{setBusy(false)}
 }
 async function confirmClose(){
  if(!preview||preview.overlaps||busy)return;
  const p=period();
  if(!p||p.start!==preview.start||p.end!==preview.end){setPreview(null);setError("تغيّرت الفترة. اعرض المعاينة مجدداً.");return;}
  if(!window.confirm("تأكيد إغلاق فترة التحصيل المسجّل؟ لا يمكن تعديل أو حذف السجل بعد الحفظ. هذا ليس جرداً نقدياً أو إغلاقاً ضريبياً."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g8_collection_close",{
    p_branch:branchId,p_start:p.start,p_end:p.end,p_action:"close",p_note:note.trim()||null
   });
   if(error||!data?.id)throw Error("Close not persisted");
   setPreview(null);setNote("");setNotice("حُفظ إغلاق الفترة بنجاح. يمكنك مراجعته في سجل الإغلاقات.");
   setLoadedHistory(false);setHistory([]);
  }catch{setError("لم يُحفظ إغلاق الفترة. قد تكون أُغلقت سابقاً أو حدث خطأ في الصلاحيات أو الاتصال. راجع السجل قبل إعادة المحاولة.");}
  finally{setBusy(false)}
 }
 return <details className="beger-close-workspace" dir="rtl">
  <summary><strong>إغلاق فترة التحصيل</strong><span>سجل تشغيلي مستقل · لا يشمل تسوية البنك</span></summary>
  <div className="beger-close-content">
   <p>يُحتسب التحصيل حسب وقت تسجيل الموظف للمبلغ المستلم، وليس تاريخ الطلب. كل عملة مستقلة. تأكد من الفترة قبل الحفظ؛ السجل المحفوظ غير قابل للتعديل.</p>
   <div className="beger-close-period">
    <label>من<input type="datetime-local" value={start} onChange={event=>{setStart(event.target.value);setPreview(null)}} /></label>
    <label>إلى<input type="datetime-local" value={end} onChange={event=>{setEnd(event.target.value);setPreview(null)}} /></label>
    <button type="button" disabled={busy} onClick={()=>void loadPreview()}>معاينة الإغلاق</button>
   </div>
   {preview?<section className="beger-close-preview" aria-label="معاينة فترة التحصيل">
    <h4>معاينة التحصيل</h4>
    <p>{stamp(preview.start)} — {stamp(preview.end)} · {preview.summary.recordedPayments} عملية تحصيل مسجلة</p>
    {preview.summary.currencies.length?preview.summary.currencies.map(row=><div className="beger-close-currency" key={row.currency}>
     <strong>{row.currency}</strong>
     <div><span>الإجمالي</span><b dir="ltr">{money(row.totalMinor,row.currency)}</b></div>
     <div><span>نقداً</span><b dir="ltr">{money(row.cashMinor,row.currency)}</b></div>
     <div><span>بطاقة خارجية</span><b dir="ltr">{money(row.cardMinor,row.currency)}</b></div>
     <div><span>تحويل خارجي</span><b dir="ltr">{money(row.transferMinor,row.currency)}</b></div>
    </div>):<p>لا يوجد تحصيل مسجّل لهذه الفترة.</p>}
    {preview.overlaps?<p role="alert" className="beger-close-warning">الفترة متداخلة مع إغلاق محفوظ سابقاً؛ لا يمكن حفظ إغلاق آخر لها.</p>:<>
     <label className="beger-close-note">ملاحظة داخلية اختيارية<textarea rows={2} maxLength={250} value={note} onChange={event=>setNote(event.target.value)} placeholder="مثلاً: مراجعة المشرف" /></label>
     <button type="button" disabled={busy} className="beger-close-confirm" onClick={()=>void confirmClose()}>تأكيد وحفظ إغلاق الفترة</button>
    </>}
   </section>:null}
   <div className="beger-close-history-header"><strong>سجل الإغلاقات المحفوظة</strong><button type="button" disabled={busy} onClick={()=>void fetchHistory()}>عرض / تحديث السجل</button></div>
   {loadedHistory&&history.length===0?<p>لا توجد إغلاقات محفوظة بعد.</p>:null}
   {history.length>0?<div className="beger-close-history">{history.map(entry=><article key={entry.id}>
    <strong>{stamp(entry.start)} — {stamp(entry.end)}</strong>
    <small>أغلق بتاريخ {stamp(entry.closedAt)} · {entry.records} عملية</small>
    {entry.currencies.map(row=><div key={row.currency}>{row.currency}: {money(row.totalMinor,row.currency)} · نقداً: {money(row.cashMinor,row.currency)} · بطاقة: {money(row.cardMinor,row.currency)} · تحويل: {money(row.transferMinor,row.currency)}</div>)}
    {entry.note?<p>{entry.note}</p>:null}
   </article>)}</div>:null}
   {notice?<p role="status" className="beger-close-success">{notice}</p>:null}
   {error?<p role="alert" className="beger-close-error">{error}</p>:null}
   <p className="beger-close-caveat">إغلاق تشغيلي مبني على تسجيل التاجر للاستلام، وليس إثباتاً لمبالغ الصندوق النقدي أو المصرف أو فاتورة ضريبية. الاستردادات والتعديلات النقدية تتطلب دورة مستقلة قبل المطابقة النهائية.</p>
  </div>
 </details>;
}
