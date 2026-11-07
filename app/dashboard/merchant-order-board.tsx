"use client";
import {useEffect,useState} from "react";
import {StationAlertBell,useStationAlerts} from "../../components/beger-station-alerts";
import {DurableStationNotifications} from "../../components/beger-durable-station-notifications";
import {BegerFeedbackControls,useBegerFeedback} from "../../components/beger-feedback";
import {browserSupabase} from "../../lib/supabase/browser";
import {publicServiceSignal,publicSignalLabels} from "../../lib/beger-service-workflows";
import {printOrderTicket as printOrderTicketBase} from "../../lib/beger-print-ticket";
import MerchantPrintSettings,{DEFAULT_BRANCH_PRINT_SETTINGS,type BranchPrintSettings} from "./merchant-print-settings";
import MerchantPrintQueue from "./merchant-print-queue";
import {printFilteredOrderList} from "../../lib/beger-print-order-list";
import {downloadOrderCsv} from "../../lib/beger-order-csv";
import "./merchant-order-board.css";
type Status="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
type Item={name:string;quantity:number;selections:{options?:{name_ar?:string}[];removedIngredients?:string[]}};
type Order={id:string;table:string;serviceMode?:"dine_in"|"takeaway";paymentStatus?:"unpaid"|"paid";paymentMethod?:string|null;status:Status;totalMinor:number;currency:string;createdAt:string;items:Item[]};
const titles:Record<Status,string>={pending:"بانتظار الموافقة",accepted:"تم قبول الطلب",preparing:"قيد التحضير",ready:"جاهز للتسليم",fulfilled:"تم التسليم",rejected:"مرفوض"};
function formatOrderTotal(minor:number,currency:string){const factor=currency==="TRY"?100:1;return new Intl.NumberFormat("ar",{minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0}).format(minor/factor)+" "+currency;}
function orderReference(id:string){return id.replace(/-/g,"").slice(0,10).toUpperCase();}
export default function MerchantOrderBoard({businessId,branchId,branchName,onOpenStation}:{businessId:string;branchId:string;branchName:string;onOpenStation?:(station:"kitchen"|"cashier")=>void}){
 const feedback=useBegerFeedback();
 const stationAlerts=useStationAlerts("merchant",branchId,feedback.signal);
 const [historyOpen,setHistoryOpen]=useState(false),[historyBusy,setHistoryBusy]=useState(false),[closedOrders,setClosedOrders]=useState<Order[]>([]),[historyLoaded,setHistoryLoaded]=useState(false);
 const [enabled,setEnabled]=useState(false),[pickupEnabled,setPickupEnabled]=useState(false),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [collectionMethods,setCollectionMethods]=useState<Record<string,string>>({});
 const [printSettings,setPrintSettings]=useState<BranchPrintSettings>(DEFAULT_BRANCH_PRINT_SETTINGS);
 const [showAdvanced,setShowAdvanced]=useState(false);
 const [showFilters,setShowFilters]=useState(false);
 const printOrderTicket=(order:Order,branch:string,kind:"kitchen"|"pickup"|"summary")=>printOrderTicketBase(order,branch,kind,printSettings);
 const [activeView,setActiveView]=useState<"live"|"history">("live");
 const [archiveLayout,setArchiveLayout]=useState<"grid"|"list"|"table">("table");
 const [archiveSort,setArchiveSort]=useState<"newest"|"oldest">("newest");
 const [serviceFilter,setServiceFilter]=useState<"all"|"dine_in"|"takeaway">("all");
 const [paymentFilter,setPaymentFilter]=useState<"all"|"paid"|"unpaid">("all");
 const [statusFilter,setStatusFilter]=useState<"all"|Status>("all");
 const [searchQuery,setSearchQuery]=useState("");
 const filterOrder=(order:Order)=>(
  (serviceFilter==="all"||(order.serviceMode??"dine_in")===serviceFilter)&&
  (paymentFilter==="all"||(order.paymentStatus??"unpaid")===paymentFilter)&&
  (statusFilter==="all"||order.status===statusFilter)&&
  (!searchQuery.trim()||orderReference(order.id).toLowerCase().includes(searchQuery.trim().replace(/^#/,"").toLowerCase())||order.table.toLowerCase().includes(searchQuery.trim().toLowerCase()))
 );
 const filteredLive=orders.filter(filterOrder);
 const filteredHistory=closedOrders.filter(filterOrder).sort((a,b)=>archiveSort==="newest"?Date.parse(b.createdAt)-Date.parse(a.createdAt):Date.parse(a.createdAt)-Date.parse(b.createdAt));
 async function refresh(){
  const db=browserSupabase();
  const [cap,list]=await Promise.all([
   db.from("g3_branch_order_settings").select("enabled,pickup_enabled").eq("branch_id",branchId).eq("business_id",businessId).maybeSingle(),
   db.rpc("g3_branch_orders",{p_branch:branchId})
  ]);
  if(cap.error)throw cap.error;
  if(list.error)throw list.error;
  setEnabled(cap.data?.enabled===true);setPickupEnabled(cap.data?.pickup_enabled===true);
  const fresh=Array.isArray(list.data)?list.data as Order[]:[];
  stationAlerts.observe(fresh);
  setOrders(fresh);
  setError("");
  setLoaded(true);
 }
 useEffect(()=>{let live=true;setLoaded(false);const reload=()=>{void refresh().catch(()=>{if(live)setError("تعذّر تحميل الطلبات؛ تأكد من تسجيل الدخول وصلاحية الإدارة.")})};reload();const timer=window.setInterval(reload,7000);const onVisible=()=>{if(document.visibilityState==="visible")reload();};document.addEventListener("visibilitychange",onVisible);return()=>{live=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible)}},[branchId,businessId]);
 async function loadHistory(){
  setHistoryBusy(true);
  try{
   const {data,error}=await browserSupabase().rpc("g4_recent_closed_orders",{p_branch:branchId});
   if(error)throw error;
   setClosedOrders(Array.isArray(data)?data as Order[]:[]);
   setHistoryLoaded(true);
  }catch{setError("تعذّر تحميل سجل الطلبات السابقة. تحقق من الاتصال والصلاحيات.")}
  finally{setHistoryBusy(false)}
 }
 async function toggleHistory(){
  if(historyOpen){setHistoryOpen(false);setActiveView("live");return;}
  setActiveView("history");setHistoryOpen(true);setStatusFilter("all");
  await loadHistory();
 }
 function showLive(){
  setActiveView("live");setHistoryOpen(false);setStatusFilter("all");
 }
 async function toggle(){
  if(busy||!confirm(enabled?"إيقاف استقبال طلبات QR الجديدة لهذا الفرع؟ الطلبات السابقة ستبقى محفوظة.":"تفعيل استقبال طلبات الطاولات على نسخة Staging؟ هذا يعني إمكانية إرسال طلبات اختبار حقيقية إلى هذه اللوحة."))return;
  setBusy(true);setError("");setNotice("");
  try{const {data,error}=await browserSupabase().from("g3_branch_order_settings").upsert({branch_id:branchId,business_id:businessId,enabled:!enabled,updated_at:new Date().toISOString()},{onConflict:"branch_id"}).select("enabled").single();if(error||!data)throw error??Error("No updated record");setEnabled(data.enabled);setNotice(data.enabled?"استقبال الطلبات التجريبية مفعّل لهذا الفرع.":"تم إيقاف استقبال الطلبات الجديدة.")}catch{setError("لم يتغير إعداد استقبال الطلبات. تحقق من صلاحياتك.")}finally{setBusy(false)}
 }
 async function togglePickup(){
  if(busy||!confirm(pickupEnabled?"إيقاف استقبال طلبات السفري لهذا الفرع؟ ستبقى الطلبات السابقة محفوظة.":"تفعيل طلبات السفري التجريبية لهذا الفرع؟ ستظهر الطلبات في لوحة المطبخ وتتطلب موافقتك."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().from("g3_branch_order_settings").upsert({branch_id:branchId,business_id:businessId,pickup_enabled:!pickupEnabled,updated_at:new Date().toISOString()},{onConflict:"branch_id"}).select("pickup_enabled").single();
   if(error||!data)throw error??Error("No updated setting");
   setPickupEnabled(data.pickup_enabled===true);
   setNotice(data.pickup_enabled?"تم تفعيل استقبال طلبات السفري التجريبية.":"تم إيقاف طلبات السفري الجديدة.");
  }catch{setError("لم يتغير إعداد طلبات السفري. تأكد من صلاحيات الإدارة.")}
  finally{setBusy(false)}
 }
 async function recordPayment(order:Order){
  if(busy||order.paymentStatus==="paid")return;
  const method=collectionMethods[order.id]??"cash";
  const methodLabel=method==="cash"?"نقداً":method==="external_card"?"بطاقة على جهاز التاجر":"تحويل خارجي";
  if(!confirm("تأكيد استلام كامل المبلغ "+formatOrderTotal(order.totalMinor,order.currency)+" عبر "+methodLabel+"؟ هذا لا يجري أي خصم إلكتروني."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g3_record_external_payment",{p_order:order.id,p_method:method});
   if(error||data?.paymentStatus!=="paid")throw error??Error("Collection not confirmed");
   setOrders(current=>current.map(item=>item.id===order.id?{...item,paymentStatus:"paid",paymentMethod:method}:item));
   setClosedOrders(current=>current.map(item=>item.id===order.id?{...item,paymentStatus:"paid",paymentMethod:method}:item));
   setNotice("تم تسجيل تحصيل الطلب #"+orderReference(order.id)+" لدى التاجر. العملية ليست دفعاً إلكترونياً عبر Beger.");
   try{await refresh();if(historyOpen)await loadHistory()}catch{setError("تم تسجيل التحصيل لكن فشل تحديث القائمة. حدّث الطلبات للتحقق.");}
  }catch{setError("تعذّر تأكيد تسجيل التحصيل. حدّث الطلبات أولاً قبل إعادة المحاولة.")}
  finally{setBusy(false)}
 }
 async function transition(order:Order,status:Status){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g3_transition_order",{p_order:order.id,p_next:status});
   if(error||data?.status!==status)throw error??Error("Update not confirmed");
   // Server has confirmed the transition; a later refresh failure must never tell staff it was undone.
   setOrders(current=>current.map(item=>item.id===order.id?{...item,status}:item));
   setNotice("تم تحديث طلب #"+orderReference(order.id)+" من "+order.table+" إلى "+titles[status]);
   feedback.signal(status==="accepted"?"accepted":status==="preparing"?"preparing":status==="ready"?"ready":status==="fulfilled"?"fulfilled":"rejected","تم تحديث طلب #"+orderReference(order.id)+" إلى "+titles[status]);
   try{await refresh()}catch{setError("تم تغيير حالة الطلب بنجاح، لكن تعذّر تحديث القائمة. أعد تحميل الطلبات للتحقق من أحدث البيانات.");}
  }catch{setError("تعذّر تأكيد تغيير حالة الطلب. حدّث القائمة قبل إعادة المحاولة لتجنّب إجراء مكرر.");}
  finally{setBusy(false)}
 }
 return <section id="beger-merchant-orders" className="beger-order-board" dir="rtl" aria-label="إدارة طلبات الطاولات">
  <header className="beger-order-board-header"><div><span>BEGER · ORDERS</span><h2>الطلبات المباشرة</h2><p>{branchName} · قبول واحد ← يصل الطلب للمطبخ تلقائياً ← تجهيز ← تسليم</p></div><details className="beger-order-reception-settings" style={{border:"1px solid #dce4d6",borderRadius:10,padding:"9px 12px",background:"#fff"}}><summary style={{cursor:"pointer",fontSize:12,fontWeight:750,color:"#537044"}}>⚙ استقبال الطلبات · الطاولات {enabled?"مفعّلة":"متوقفة"} / السفري {pickupEnabled?"مفعّل":"متوقف"}</summary><div style={{display:"grid",gap:8,marginTop:11}}><span className={enabled?"beger-order-enabled":"beger-order-disabled"}>{enabled?"● طلبات الطاولات مفعّلة":"○ طلبات الطاولات متوقفة"}</span><button type="button" disabled={busy||!loaded} onClick={()=>void toggle()}>{enabled?"إيقاف طلبات الطاولات":"تفعيل طلبات الطاولات"}</button><span className={pickupEnabled?"beger-order-enabled":"beger-order-disabled"}>{pickupEnabled?"● طلبات السفري مفعّلة":"○ طلبات السفري متوقفة"}</span><button type="button" disabled={busy||!loaded} onClick={()=>void togglePickup()}>{pickupEnabled?"إيقاف استقبال السفري":"تفعيل استقبال السفري"}</button></div></details></header>
  <div className="beger-order-journey" role="navigation" aria-label="خطوات رحلة الطلب" style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center",margin:"12px 0 18px"}}>
   <button type="button" onClick={showLive} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #bfcdb6",background:"#edf4e7",fontWeight:800}}>① استقبال الطلبات</button>
   <button type="button" onClick={()=>onOpenStation?.("kitchen")} disabled={!onOpenStation} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #bfcdb6",background:"#fff",fontWeight:800}}>② فتح المطبخ · {orders.filter(o=>o.status==="accepted"||o.status==="preparing").length}</button>
   <button type="button" onClick={()=>onOpenStation?.("cashier")} disabled={!onOpenStation} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #bfcdb6",background:"#fff",fontWeight:800}}>③ الكاشير والتسليم · {orders.filter(o=>o.status==="ready").length}</button>
  </div>
  <nav className="beger-board-view-tabs" aria-label="مساحات الطلبات">
   <button type="button" className={activeView==="live"?"is-active":""} aria-current={activeView==="live"?"page":undefined} onClick={showLive}>الطلبات المباشرة</button>
   <button type="button" className={activeView==="history"?"is-active":""} aria-current={activeView==="history"?"page":undefined} onClick={()=>{if(activeView!=="history")void toggleHistory();}}>سجل الطلبات السابقة</button>
  </nav>
  <button type="button" aria-expanded={showFilters} onClick={()=>setShowFilters(v=>!v)} style={{padding:"8px 13px",border:"1px solid #d9e2d0",background:"#fff",borderRadius:9,margin:"8px 0"}}>⌕ {showFilters?"إخفاء البحث والفلاتر":"بحث وتصفية متقدمة"}</button>
  {showFilters?<section className="beger-order-filterbar" aria-label="تصفية الطلبات">
   <label>بحث برقم الطلب أو الطاولة<input type="search" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="رقم الطلب أو الطاولة" /></label>
   <label>نوع الطلب<select value={serviceFilter} onChange={event=>setServiceFilter(event.target.value as typeof serviceFilter)}><option value="all">كل الخدمات</option><option value="dine_in">الطاولات</option><option value="takeaway">السفري</option></select></label>
   <label>التحصيل<select value={paymentFilter} onChange={event=>setPaymentFilter(event.target.value as typeof paymentFilter)}><option value="all">الكل</option><option value="paid">محصّل</option><option value="unpaid">غير محصّل</option></select></label>
   <label>حالة الطلب<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">كل الحالات</option>{(activeView==="live"?(["pending","accepted","preparing","ready"] as const):(["fulfilled","rejected"] as const)).map(status=><option key={status} value={status}>{titles[status]}</option>)}</select></label>
   <button type="button" className="beger-board-filter-reset" onClick={()=>{setServiceFilter("all");setPaymentFilter("all");setStatusFilter("all");setSearchQuery("");}}>مسح الفلاتر</button>
   <button type="button" className="beger-board-filter-print" disabled={activeView==="live"?!loaded:!historyLoaded} onClick={()=>{if(!printFilteredOrderList(activeView==="live"?filteredLive:filteredHistory,branchName,activeView))setError("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.");}}>طباعة النتائج المفلترة</button>
   <button type="button" className="beger-board-filter-export" disabled={activeView==="live"?!loaded||filteredLive.length===0:!historyLoaded||filteredHistory.length===0} onClick={()=>{downloadOrderCsv(activeView==="live"?filteredLive:filteredHistory,activeView);}}>تصدير CSV</button>
   <span className="beger-board-result-count" role="status">المعروض: {activeView==="live"?filteredLive.length:filteredHistory.length} طلب</span>
  </section>:null}
  {activeView==="live"?<section className="beger-order-board-kpis" aria-label="ملخص بيانات الطلبات الحالية">
   {([{label:"بانتظار الموافقة",value:orders.filter(o=>o.status==="pending").length},
      {label:"وصلت إلى المطبخ",value:orders.filter(o=>o.status==="accepted"||o.status==="preparing").length},
      {label:"جاهزة للاستلام",value:orders.filter(o=>o.status==="ready").length},
      {label:"لم يُسجّل تحصيلها",value:orders.filter(o=>o.paymentStatus!=="paid").length}
    ]).map(stat=><div className="beger-order-board-kpi" key={stat.label}><span>{stat.label}</span><strong>{loaded?stat.value:"—"}</strong></div>)}
  </section>:null}
  <button type="button" aria-expanded={showAdvanced} onClick={()=>setShowAdvanced(v=>!v)} style={{padding:"10px 14px",border:"1px solid #cedbc9",background:"#fff",borderRadius:11,margin:"10px 0",fontWeight:750}}>⚙ {showAdvanced?"إخفاء أدوات الطباعة والتنبيهات":"الطباعة والتنبيهات والإعدادات المتقدمة"}</button>
  {showAdvanced?<div className="beger-order-advanced" style={{padding:"12px 14px",border:"1px solid #dce6d6",borderRadius:14,marginBottom:13}}>
   <MerchantPrintSettings branchId={branchId} onSettings={setPrintSettings}/>
   <MerchantPrintQueue branchId={branchId} branchName={branchName} settings={printSettings}/>
   <BegerFeedbackControls settings={feedback.settings} onChange={feedback.change} onTest={()=>feedback.signal("new-order","هذا تنبيه اختبار، وليس طلباً جديداً")}/>
   <p style={{fontSize:12,color:"#64715f"}}>إيقاف استقبال طلبات الطاولات والسفري من إعدادات التشغيل في أعلى اللوحة، وليس من داخل بطاقة الطلب.</p>
  </div>:null}
  <StationAlertBell alerts={stationAlerts.alerts} clear={stationAlerts.clear} actionable={orders.filter(o=>o.status==="pending").length} label="التاجر"/>
  {showAdvanced?<DurableStationNotifications branchId={branchId} station="merchant"/>:null}
  {feedback.message?<p role="status" className="beger-feedback-toast">{feedback.message}</p>:null}
  {error?<p role="alert" className="beger-order-board-error">{error}</p>:null}
  {notice?<p role="status" className="beger-order-board-notice">{notice}</p>:null}
  {!loaded?<p role="status">جارٍ تحميل حالة الطلبات...</p>:null}
  {activeView==="live"?<><div className="beger-order-board-controls"><button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setError("تعذّر تحديث الطلبات. تحقق من الاتصال والصلاحية."))}>تحديث الطلبات الآن ↻</button><span>تُحدَّث الطلبات تلقائياً كل 7 ثوانٍ</span></div>
  <div className="beger-order-board-columns">{(["pending","accepted","preparing","ready"] as const).map(stage=><section key={stage} className="beger-order-board-column" aria-label={titles[stage]}>
    <h3>{titles[stage]} <span>{orders.filter(o=>o.status===stage).length}</span></h3>
    {filteredLive.filter(o=>o.status===stage).map(o=><article className="beger-order-ticket" key={o.id}>
      <div className="beger-order-ticket-head"><strong>⌗ {o.serviceMode==="takeaway"?"سفري · استلام من المحل":o.table}</strong><span className="beger-order-reference" aria-label={"رقم الطلب "+orderReference(o.id)}>طلب #{orderReference(o.id)}</span><time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</time></div>
      <ul>{o.items.map((item,index)=><li key={index}><strong>{item.quantity}× {item.name}</strong><small>{(item.selections?.options??[]).map(opt=>opt.name_ar).filter(Boolean).join(" · ")}{(item.selections?.removedIngredients??[]).length?" · بدون "+(item.selections?.removedIngredients??[]).join("، "):""}</small></li>)}</ul>
      <div className="beger-order-ticket-price">{formatOrderTotal(o.totalMinor,o.currency)}</div>
      <p className="beger-order-stage-hint" style={{margin:"10px 0",padding:"10px 12px",borderRadius:10,background:"#eff5e9",color:"#3d6436",fontSize:13,fontWeight:700}}>
       {o.status==="pending"?"الخطوة الآن: وافق على الطلب ليظهر في المطبخ تلقائياً.":o.status==="accepted"?"✓ وصل للمطبخ · بانتظار أن يبدأ الموظف التحضير":o.status==="preparing"?"المطبخ يحضّر الطلب · لا تحتاج لاتخاذ إجراء": "✓ جاهز · حوّله للكاشير لتأكيد التسليم"}
      </p>
      {o.status==="pending"?<button className="beger-order-primary-action" disabled={busy} type="button" onClick={()=>void transition(o,"accepted")}>✓ قبول وإرسال تلقائي للمطبخ</button>:null}
      {(o.status==="accepted"||o.status==="preparing")?<button type="button" className="beger-order-primary-action" disabled={!onOpenStation} onClick={()=>onOpenStation?.("kitchen")}>فتح محطة المطبخ ←</button>:null}
      {o.status==="ready"?<button type="button" className="beger-order-primary-action" disabled={!onOpenStation} onClick={()=>onOpenStation?.("cashier")}>فتح الكاشير للتسليم ←</button>:null}
      <details className="beger-order-ticket-more" style={{marginTop:11,padding:"8px 10px",border:"1px solid #e0e7d8",borderRadius:10}}>
       <summary style={{cursor:"pointer",color:"#697366",fontSize:12}}>التحصيل والطباعة وإجراءات إضافية</summary>
       <div className="beger-order-payment" aria-label="حالة تحصيل الطلب">
        <strong className={o.paymentStatus==="paid"?"is-paid":"is-unpaid"}>{o.paymentStatus==="paid"?"✓ تم تسجيل التحصيل":"◯ لم يُسجّل التحصيل"}</strong>
        {o.paymentStatus==="paid"?<small>{o.paymentMethod==="cash"?"نقداً":o.paymentMethod==="external_card"?"بطاقة التاجر":o.paymentMethod==="external_transfer"?"تحويل خارجي":""}</small>:<div className="beger-order-payment-actions">
         <label htmlFor={"collection-"+o.id}>طريقة التحصيل</label>
         <select id={"collection-"+o.id} disabled={busy} value={collectionMethods[o.id]??"cash"} onChange={event=>setCollectionMethods(current=>({...current,[o.id]:event.target.value}))}><option value="cash">نقداً</option><option value="external_card">بطاقة على جهاز التاجر</option><option value="external_transfer">تحويل خارجي</option></select>
         <button type="button" disabled={busy} onClick={()=>void recordPayment(o)}>تسجيل المبلغ المستلم</button>
        </div>}
       </div>
       <div className="beger-order-ticket-print" role="group" aria-label={"طباعة مستندات الطلب "+orderReference(o.id)}>
        <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"kitchen"))setError("اسمح بنوافذ الطباعة.")}}>تذكرة المطبخ</button>
        <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"pickup"))setError("اسمح بنوافذ الطباعة.")}}>بطاقة الاستلام</button>
        <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"summary"))setError("اسمح بنوافذ الطباعة.")}}>كشف داخلي</button>
       </div>
       <div className="beger-order-pager-signal" aria-label="حالة متابعة الزبون">متابعة الزبون: {publicSignalLabels[publicServiceSignal("table_order",o.status)].ar}</div>
       {(o.status==="pending"||o.status==="accepted")?<button className="beger-order-reject" disabled={busy} type="button" onClick={()=>{if(confirm("رفض الطلب؟ سيتم إبلاغ الزبون بحالة الرفض."))void transition(o,"rejected")}}>رفض الطلب</button>:null}
      </details>
    </article>)}
    {!filteredLive.some(o=>o.status===stage)?<p className="beger-order-board-empty">لا توجد طلبات بهذه الحالة</p>:null}
   </section>)}</div></>:null}
  {activeView==="history"?<section className="beger-order-history" aria-label="سجل الطلبات المكتملة والمرفوضة">
   <header className="beger-order-history-heading"><div><h3>سجل الطلبات السابقة</h3><p>آخر 7 أيام · للمتابعة والتحصيل والطباعة · لا يُرسل تنبيه طلب جديد</p></div><button type="button" disabled={historyBusy} aria-expanded={historyOpen} onClick={()=>void toggleHistory()}>{historyBusy?"جارٍ التحميل…":historyOpen?"إخفاء السجل":"عرض سجل الطلبات"}</button></header>
   {historyOpen?<div className="beger-order-history-content">
    <div className="beger-order-history-tools"><span>{historyLoaded?filteredHistory.length+" طلباً مطابقاً (من آخر 50 طلب)":"جارٍ تحميل سجل الطلبات…"}</span><button type="button" disabled={historyBusy} onClick={()=>void loadHistory()}>تحديث السجل ↻</button></div>
    <div className="beger-archive-toolbar">
     <div className="beger-archive-layout" role="group" aria-label="طريقة عرض سجل الطلبات">
      <button type="button" aria-pressed={archiveLayout==="table"} onClick={()=>setArchiveLayout("table")}><span aria-hidden="true">▤</span> جدول</button>
      <button type="button" aria-pressed={archiveLayout==="list"} onClick={()=>setArchiveLayout("list")}><span aria-hidden="true">☷</span> قائمة</button>
      <button type="button" aria-pressed={archiveLayout==="grid"} onClick={()=>setArchiveLayout("grid")}><span aria-hidden="true">▦</span> شبكة</button>
     </div>
     <label className="beger-archive-sort">ترتيب التاريخ<select value={archiveSort} onChange={event=>setArchiveSort(event.target.value as typeof archiveSort)}><option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option></select></label>
    </div>
    {archiveLayout==="table"?<div className="beger-archive-table-scroll"><table className="beger-archive-table"><thead><tr><th>رقم الطلب</th><th>الخدمة</th><th>وقت الطلب</th><th>الحالة</th><th>التحصيل</th><th>الإجمالي</th><th>التفاصيل</th></tr></thead><tbody>{filteredHistory.map(o=><tr key={o.id}>
     <td><strong dir="ltr">#{orderReference(o.id)}</strong></td>
     <td>{o.serviceMode==="takeaway"?"سفري":o.table}</td>
     <td><time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleString("ar")}</time></td>
     <td>{titles[o.status]}</td>
     <td>{o.paymentStatus==="paid"?"✓ مسجّل":"◯ غير مسجّل"}</td>
     <td dir="ltr">{formatOrderTotal(o.totalMinor,o.currency)}</td>
     <td><details className="beger-archive-row-detail"><summary>إجراءات الطلب</summary>
      <ul>{o.items.map((item,i)=><li key={i}>{item.quantity}× {item.name}</li>)}</ul>
      {o.status==="fulfilled"&&o.paymentStatus!=="paid"?<div className="beger-order-payment-actions"><label htmlFor={"table-collection-"+o.id}>طريقة التحصيل</label><select id={"table-collection-"+o.id} disabled={busy} value={collectionMethods[o.id]??"cash"} onChange={event=>setCollectionMethods(current=>({...current,[o.id]:event.target.value}))}><option value="cash">نقداً</option><option value="external_card">بطاقة جهاز التاجر</option><option value="external_transfer">تحويل خارجي</option></select><button type="button" disabled={busy} onClick={()=>void recordPayment(o)}>تسجيل المبلغ المستلم</button></div>:null}
      <div className="beger-archive-row-actions"><button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"summary"))setError("اسمح بالنوافذ المنبثقة للطباعة.");}}>كشف حساب</button><button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"kitchen"))setError("اسمح بالنوافذ المنبثقة للطباعة.");}}>ورقة المطبخ</button><button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"pickup"))setError("اسمح بالنوافذ المنبثقة للطباعة.");}}>ملصق</button></div>
     </details></td>
    </tr>)}</tbody></table></div>:null}
    {archiveLayout!=="table"?<div className={"beger-archive-cards "+(archiveLayout==="list"?"is-list":"is-grid")}>
    {filteredHistory.map(o=><article className="beger-order-history-ticket" key={o.id}>
     <div className="beger-order-history-top"><strong dir="ltr">#{orderReference(o.id)}</strong><span className={o.status==="fulfilled"?"is-fulfilled":"is-rejected"}>{titles[o.status]}</span></div>
     <p>{o.serviceMode==="takeaway"?"سفري · استلام من المحل":o.table} · <time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleString("ar")}</time></p>
     <ul>{o.items.map((item,i)=><li key={i}>{item.quantity}× {item.name}</li>)}</ul>
     <div className="beger-order-history-total"><strong>{formatOrderTotal(o.totalMinor,o.currency)}</strong><span>{o.paymentStatus==="paid"?"✓ تم تسجيل التحصيل":"◯ لم يُسجّل التحصيل"}</span></div>
     {o.status==="fulfilled"&&o.paymentStatus!=="paid"?<div className="beger-order-payment-actions">
      <label htmlFor={"archive-collection-"+o.id}>طريقة تحصيل الطلب المكتمل</label>
      <select id={"archive-collection-"+o.id} disabled={busy} value={collectionMethods[o.id]??"cash"} onChange={event=>setCollectionMethods(current=>({...current,[o.id]:event.target.value}))}><option value="cash">نقداً</option><option value="external_card">بطاقة على جهاز التاجر</option><option value="external_transfer">تحويل خارجي</option></select>
      <button type="button" disabled={busy} onClick={()=>void recordPayment(o)}>تأكيد مبلغ تم استلامه</button>
     </div>:null}
     <div className="beger-order-ticket-print" role="group" aria-label={"إعادة طباعة الطلب "+orderReference(o.id)}>
      <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"kitchen"))setError("المتصفح منع نافذة الطباعة.")}}>طباعة المطبخ</button>
      <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"pickup"))setError("المتصفح منع نافذة الطباعة.")}}>ملصق الاستلام</button>
      <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"summary"))setError("المتصفح منع نافذة الطباعة.")}}>كشف حساب داخلي</button>
     </div>
    </article>)}
    </div>:null}
    {historyLoaded&&filteredHistory.length===0?<p className="beger-order-board-empty">لا توجد طلبات مكتملة أو مرفوضة خلال الأيام السبعة الماضية.</p>:null}
   </div>:null}
  </section>:null}
 </section>;
}
