"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {GuestLang} from "../lib/g2-public";
import {publicServiceSignal,publicSignalLabels} from "../lib/beger-service-workflows";
import {BegerFeedbackControls,useBegerFeedback} from "./beger-feedback";

export type OrderLine={productId?:string;quantity:number;optionIds?:string[];removedIngredients?:string[]};
const words={
 ar:{send:"إرسال الطلب للمطعم",sending:"جارٍ إرسال الطلب...",table:"طاولة",notice:"الطلب يُرسل للمطعم أولاً، ولا يبدأ التحضير إلا بعد موافقة الموظف.",notEnabled:"الطلبات الفعلية غير مفعّلة لهذا الفرع بعد. السلة حالياً للمعاينة.",needTable:"لإرسال طلب، امسح رمز طاولتك. QR المتجر لعرض المنيو فقط.",error:"تعذّر تأكيد نتيجة الإرسال. ربما وصل الطلب بالفعل؛ أعد المحاولة دون تغيير السلة لتجنّب تكراره.",success:"تم إرسال طلبك للمطعم",retry:"تحديث حالة الطلب",status:"حالة الطلب",pending:"بانتظار موافقة المطعم",accepted:"وافق المطعم على الطلب",preparing:"جاري التحضير في المطبخ",ready:"طلبك جاهز!",fulfilled:"تم تسليم الطلب",rejected:"تعذّر قبول الطلب",saved:"احتفظ بهذه الصفحة لمتابعة حالة الطلب",newOrder:"بدء طلب جديد"},
 tr:{send:"Siparişi restorana gönder",sending:"Sipariş gönderiliyor...",table:"Masa",notice:"Restoran siparişi onayladıktan sonra hazırlanır.",notEnabled:"Bu şubede gerçek sipariş henüz aktif değil. Sepet önizlemedir.",needTable:"Sipariş için masanızın QR kodunu tarayın. Mağaza QR yalnızca menü içindir.",error:"Siparişin ulaştığı doğrulanamadı. Sipariş zaten alınmış olabilir; aynı sepetle tekrar deneyin.",success:"Sipariş restorana gönderildi",retry:"Sipariş durumunu güncelle",status:"Sipariş durumu",pending:"Restoran onayı bekleniyor",accepted:"Restoran siparişi kabul etti",preparing:"Mutfakta hazırlanıyor",ready:"Siparişiniz hazır!",fulfilled:"Teslim edildi",rejected:"Sipariş reddedildi",saved:"Siparişinizi takip etmek için bu sayfayı açık tutun",newOrder:"Yeni sipariş"},
 en:{send:"Send order to restaurant",sending:"Sending order...",table:"Table",notice:"The restaurant must accept your order before the kitchen starts preparing it.",notEnabled:"Real ordering is not enabled for this branch yet. Your basket is a preview.",needTable:"Scan your table QR to order. A shop QR is for browsing only.",error:"Could not confirm the order result. It may already have arrived; retry with the same basket to avoid duplicates.",success:"Order sent to the restaurant",retry:"Refresh order status",status:"Order status",pending:"Waiting for restaurant approval",accepted:"Restaurant accepted your order",preparing:"Preparing in kitchen",ready:"Your order is ready!",fulfilled:"Order delivered",rejected:"Restaurant declined the order",saved:"Keep this page to follow your order",newOrder:"Start another order"}
} as const;
type OrderStatus="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
function client(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw Error("Public Supabase config unavailable");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export default function GuestOrderSubmission({lang,branchId,serviceMode="browse",tableToken,tableLabel,items,onSent}:{lang:GuestLang;branchId:string;serviceMode?:"browse"|"dine_in"|"takeaway";tableToken?:string;tableLabel?:string;items:OrderLine[];onSent:()=>void}){
 const t=words[lang];
 const isTakeaway=serviceMode==="takeaway"&&!tableToken;
 const trackingKey=isTakeaway?"beger-g3-pickup-order:"+branchId:"beger-g3-order:"+tableToken;
 const feedback=useBegerFeedback();
 const lastStatusRef=useRef<OrderStatus|null>(null);
 const [orderReference,setOrderReference]=useState<string|null>(null),[paymentStatus,setPaymentStatus]=useState<"unpaid"|"paid">("unpaid");
 const [enabled,setEnabled]=useState(false),[checking,setChecking]=useState(Boolean(tableToken)||serviceMode==="takeaway"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[token,setToken]=useState<string|null>(null),[status,setStatus]=useState<OrderStatus|null>(null);
 const requestRef=useRef<{signature:string;request:string}|null>(null);
 useEffect(()=>{let alive=true;setChecking(true);
 if(isTakeaway){Promise.resolve(client().rpc("g3_pickup_order_enabled",{p_branch:branchId})).then(({data,error})=>{if(alive)setEnabled(!error&&data===true)}).catch(()=>{if(alive)setEnabled(false)}).finally(()=>{if(alive)setChecking(false)});return()=>{alive=false};}
 if(!tableToken){setChecking(false);setEnabled(false);return;}
 Promise.resolve(client().rpc("g3_table_order_enabled",{p_table_token:tableToken})).then(({data,error})=>{if(alive)setEnabled(!error&&data===true)}).catch(()=>{if(alive)setEnabled(false)}).finally(()=>{if(alive)setChecking(false)});return()=>{alive=false};},[tableToken,branchId,isTakeaway]);
 useEffect(()=>{if(!tableToken&&!isTakeaway)return;try{const stored=sessionStorage.getItem(trackingKey);if(stored)setToken(stored);}catch{/* Restricted browser storage */}},[tableToken,trackingKey,isTakeaway]);
 async function refresh(){if(!token)return;try{const {data,error}=await client().rpc("g3_public_order_status",{p_token:token});if(!error&&data?.status){const next=data.status as OrderStatus;if(lastStatusRef.current&&lastStatusRef.current!==next){const kind=next==="accepted"?"accepted":next==="preparing"?"preparing":next==="ready"?"ready":next==="rejected"?"rejected":next==="fulfilled"?"fulfilled":null;if(kind)feedback.signal(kind,t[next]);}lastStatusRef.current=next;setStatus(next);if(typeof data.reference==="string")setOrderReference(data.reference);if(data.paymentStatus==="paid"||data.paymentStatus==="unpaid")setPaymentStatus(data.paymentStatus);}}catch{/* transient network failure: keep last known status */}}
 useEffect(()=>{if(!token)return;void refresh();const timer=window.setInterval(()=>{void refresh()},7000);const onVisible=()=>{if(document.visibilityState==="visible")void refresh();};document.addEventListener("visibilitychange",onVisible);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};},[token]);
 async function submit(){
  if((!tableToken&&!isTakeaway)||!enabled||busy||items.length===0||items.some(i=>!i.productId))return;
  setBusy(true);setError("");
  // Preserve the same idempotency key across a refresh if the server accepted the request but the response was lost.
  const payload=items.map(i=>({productId:i.productId,quantity:i.quantity,optionIds:i.optionIds??[],removedIngredients:i.removedIngredients??[]}));
  const signature=JSON.stringify(payload);
  const pendingKey=isTakeaway?"beger-g3-pickup-pending:"+branchId:"beger-g3-pending:"+tableToken;
  let request=requestRef.current?.signature===signature?requestRef.current.request:null;
  if(!request){
   try{
    const saved=sessionStorage.getItem(pendingKey);
    if(saved){
     const pending=JSON.parse(saved) as {signature?:string;request?:string};
     if(pending?.signature===signature&&typeof pending.request==="string"&&/^[0-9a-f-]{36}$/i.test(pending.request))request=pending.request;
    }
   }catch{/* Storage is optional; server-side idempotency still protects in-session retries */}
  }
  request=request??crypto.randomUUID();
  requestRef.current={signature,request};
  try{sessionStorage.setItem(pendingKey,JSON.stringify({signature,request}));}catch{/* Optional storage */}
  try{
   const {data,error}=isTakeaway?await client().rpc("g3_submit_pickup_order",{p_branch:branchId,p_request_id:request,p_items:payload}):await client().rpc("g3_submit_table_order",{p_table_token:tableToken,p_request_id:request,p_items:payload});
   if(error||!data?.token)throw Error("Order could not be submitted");
   setToken(data.token);setStatus("pending");setOrderReference(null);setPaymentStatus("unpaid");lastStatusRef.current="pending";feedback.signal("sent",t.success);
   try{sessionStorage.setItem(trackingKey,data.token)}catch{/* Session storage optional */}
   try{sessionStorage.removeItem(pendingKey)}catch{/* Optional storage */}
   onSent();requestRef.current=null;
  }catch{setError(t.error);}
  finally{setBusy(false);}
 }
 const statuses=lang==="ar"?["بانتظار الموافقة","مقبول","قيد التحضير","جاهز",isTakeaway?"تم الاستلام":"تم التسليم"]:lang==="tr"?["Beklemede","Kabul edildi","Hazırlanıyor","Hazır",isTakeaway?"Teslim alındı":"Teslim edildi"]:["Pending","Accepted","Preparing","Ready",isTakeaway?"Collected":"Fulfilled"];
 const ordered=["pending","accepted","preparing","ready","fulfilled"] as const;
 const current=ordered.indexOf(status as typeof ordered[number]);
 return <section className="beger-guest-order-submit" aria-label={t.status}>
  <BegerFeedbackControls settings={feedback.settings} onChange={feedback.change} onTest={()=>feedback.signal("ready",lang==="ar"?"هذا تنبيه تجريبي":lang==="tr"?"Bu bir test bildirimidir":"This is a test alert")} labels={lang==="ar"?{sound:"الصوت",vibration:"اهتزاز",test:"تجربة التنبيه"}:lang==="tr"?{sound:"Ses",vibration:"Titreşim",test:"Bildirimi dene"}:{sound:"Sound",vibration:"Vibration",test:"Test alert"}}/>
  {feedback.message?<p className="beger-feedback-toast" role="status">{feedback.message}</p>:null}
  {isTakeaway?<p className="beger-order-table-label">⌗ {lang==="ar"?"سفري · استلام من المحل":lang==="tr"?"Paket · Mağazadan teslim":"Takeaway · Pick up at shop"}</p>:tableToken&&tableLabel?<p className="beger-order-table-label">⌗ {t.table}: <strong>{tableLabel}</strong></p>:null}
  {token?<div className="beger-guest-order-tracking" role="status"><h3>{isTakeaway?(lang==="ar"?"تم إرسال طلب السفري":lang==="tr"?"Paket sipariş gönderildi":"Takeaway order sent"):t.success}</h3><strong>{status==="ready"&&isTakeaway?(lang==="ar"?"طلبك جاهز للاستلام":lang==="tr"?"Siparişiniz teslim almaya hazır":"Ready for pickup"):status?t[status]:t.pending}</strong>
    <div className="beger-customer-order-card"><span>{lang==="ar"?"رقم طلبك":lang==="tr"?"Sipariş numaranız":"Your order number"}</span><strong dir="ltr">{orderReference?"#"+orderReference:"…"}</strong><small>{isTakeaway?(lang==="ar"?"سفري · استلام من المحل":lang==="tr"?"Paket · mağazadan teslim":"Takeaway · pickup"):(lang==="ar"?"طلب طاولة":lang==="tr"?"Masa siparişi":"Table order")} · {paymentStatus==="paid"?(lang==="ar"?"التحصيل مسجّل":lang==="tr"?"Ödeme kaydedildi":"Payment recorded"):(lang==="ar"?"التحصيل غير مسجّل":lang==="tr"?"Ödeme henüz kaydedilmedi":"Payment not recorded")}</small></div>
    <p aria-label={t.status} className="beger-public-pager-signal">{publicSignalLabels[publicServiceSignal("table_order",status??"pending")][lang]}</p>
    {status!=="rejected"?<ol className="beger-order-steps">{statuses.map((label,index)=><li className={index<=current?"is-current":""} key={label}>{label}</li>)}</ol>:null}
    <p>{t.saved}</p><button type="button" onClick={()=>void refresh()}>{t.retry}</button>{(status==="fulfilled"||status==="rejected")?<button type="button" onClick={()=>{setToken(null);setStatus(null);setOrderReference(null);setPaymentStatus("unpaid");lastStatusRef.current=null;requestRef.current=null;try{sessionStorage.removeItem(trackingKey)}catch{/* optional storage */}}}>{t.newOrder}</button>:null}
   </div>:items.length>0?<>
    <p className="beger-order-send-note">{tableToken?enabled?t.notice:checking?t.sending:t.notEnabled:isTakeaway?enabled?(lang==="ar"?"سيُرسل طلب السفري إلى المطعم للموافقة ثم التحضير. الاستلام من المحل؛ الدفع الإلكتروني والتغليف المدفوع غير مفعّلين.":lang==="tr"?"Paket sipariş restoran onayına gönderilir, ardından hazırlanır. Mağazadan teslim; çevrim içi ödeme etkin değildir.":"Your takeaway order is sent for approval and preparation, then collected at the shop. Online payment is not enabled."):checking?t.sending:(lang==="ar"?"طلبات السفري غير مفعلة لهذا الفرع.":lang==="tr"?"Bu şubede paket sipariş etkin değil.":"Takeaway ordering is not enabled at this branch."):t.needTable}</p>
    {enabled&&(tableToken||isTakeaway)?<button className="beger-order-send-button" type="button" disabled={busy} onClick={()=>void submit()}>{busy?t.sending:isTakeaway?(lang==="ar"?"إرسال طلب السفري":lang==="tr"?"Paket siparişi gönder":"Send takeaway order"):t.send}</button>:null}
    {error?<p role="alert" className="beger-order-send-error">{error}</p>:null}
   </>:null}
 </section>;
}
