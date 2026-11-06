"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import MerchantCollectionClose from "./merchant-collection-close";
import "./merchant-report.css";

type Range="today"|"week"|"month";
type Counts={orders:number;pending:number;accepted:number;preparing:number;ready:number;fulfilled:number;rejected:number;dineIn:number;takeaway:number};
type AmountRow={currency:string;grossOrderMinor:number;outstandingMinor:number};
type CollectionRow={currency:string;collectedMinor:number;cashMinor:number;cardMinor:number;transferMinor:number};
type Report={start:string;end:string;counts:Counts;orderTotals:AmountRow[];recordedCollections:CollectionRow[];basis:string};
const ranges:{id:Range;label:string;days:number}[]=[
 {id:"today",label:"اليوم",days:1},
 {id:"week",label:"آخر 7 أيام",days:7},
 {id:"month",label:"آخر 30 يوماً",days:30}
];
function periodBounds(range:Range){
 const end=new Date();
 const start=new Date(end);
 start.setHours(0,0,0,0);
 if(range!=="today")start.setDate(start.getDate()-(range==="week"?6:29));
 return {start:start.toISOString(),end:end.toISOString()};
}
function money(minor:number,currency:string){
 const factor=currency==="TRY"?100:1;
 return new Intl.NumberFormat("ar",{maximumFractionDigits:currency==="TRY"?2:0,minimumFractionDigits:currency==="TRY"?2:0}).format(minor/factor)+" "+currency;
}
function metric(value:number|undefined){return typeof value==="number"?new Intl.NumberFormat("ar").format(value):"—"}
export default function MerchantReport({branchId,branchName}:{branchId:string;branchName:string}){
 const [range,setRange]=useState<Range>("today");
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let live=true;
  const fetchReport=async()=>{
   setLoading(true);setError("");setReport(null);
   const period=periodBounds(range);
   try{
    const {data,error}=await browserSupabase().rpc("g4_branch_report",{
     p_branch:branchId,p_start:period.start,p_end:period.end
    });
    if(error)throw error;
    if(!data||typeof data!=="object"||!data.counts||!Array.isArray(data.orderTotals)||!Array.isArray(data.recordedCollections))throw Error("Invalid report");
    if(live)setReport(data as Report);
   }catch{if(live)setError("تعذّر تحميل التقرير. تأكد من تسجيل الدخول وصلاحية إدارة الفرع ثم حاول مجدداً.");}
   finally{if(live)setLoading(false);}
  };
  void fetchReport();
  return()=>{live=false};
 },[branchId,range,revision]);
 const counts=report?.counts;
 const details=[
  {label:"إجمالي الطلبات المنشأة",value:counts?.orders??undefined},
  {label:"طلبات الطاولات",value:counts?.dineIn??undefined},
  {label:"طلبات السفري",value:counts?.takeaway??undefined},
  {label:"تم تسليمها",value:counts?.fulfilled??undefined},
  {label:"مرفوضة",value:counts?.rejected??undefined},
  {label:"بانتظار الموافقة",value:counts?.pending??undefined}
 ];
 return <section className="beger-merchant-report" dir="rtl" aria-label="التقارير والتحصيل">
  <div className="beger-report-header">
   <div><span className="beger-report-eyebrow">BEGER / BUSINESS INSIGHTS</span><h3>التقارير والكاشير</h3><p>{branchName} · بيانات تشغيلية فعلية مع فصل حالة الطلب عن حالة التحصيل</p></div>
   <button type="button" disabled={loading} onClick={()=>setRevision(value=>value+1)}>تحديث التقرير ↻</button>
  </div>
  <div className="beger-report-ranges" role="group" aria-label="الفترة الزمنية">
   {ranges.map(item=><button key={item.id} type="button" disabled={loading} aria-pressed={range===item.id} onClick={()=>setRange(item.id)}>{item.label}</button>)}
  </div>
  {loading?<p role="status" className="beger-report-loading">جارٍ تحميل بيانات الفرع…</p>:null}
  {error?<p role="alert" className="beger-report-error">{error}</p>:null}
  <section className="beger-report-metrics" aria-label="ملخص الطلبات">
   {details.map((item,index)=><article key={item.label} className={"beger-report-metric"+(index===0?" is-primary":"")}>
    <span>{item.label}</span><strong>{metric(item.value)}</strong>
   </article>)}
  </section>
  {report?<div className="beger-report-finance">
   <section className="beger-report-panel" aria-label="قيمة الطلبات المسجلة">
    <h4>قيمة الطلبات خلال الفترة</h4>
    <p>حسب تاريخ إنشاء الطلب، مع استبعاد الطلبات المرفوضة من الإجمالي</p>
    {report.orderTotals.length?report.orderTotals.map(row=><div className="beger-report-currency" key={row.currency}>
     <div><span>قيمة الطلبات</span><strong dir="ltr">{money(row.grossOrderMinor,row.currency)}</strong></div>
     <div><span>لم يُسجّل تحصيلها</span><strong dir="ltr">{money(row.outstandingMinor,row.currency)}</strong></div>
    </div>):<p className="beger-report-empty">لا توجد طلبات لهذه الفترة.</p>}
   </section>
   <section className="beger-report-panel" aria-label="التحصيل المسجل لدى التاجر">
    <h4>التحصيل المسجّل لدى التاجر</h4>
    <p>حسب تاريخ تسجيل استلام المبلغ، وليس تاريخ إنشاء الطلب</p>
    {report.recordedCollections.length?report.recordedCollections.map(row=><div className="beger-report-currency" key={row.currency}>
     <div className="beger-report-emphasis"><span>إجمالي التحصيل المسجّل</span><strong dir="ltr">{money(row.collectedMinor,row.currency)}</strong></div>
     <div><span>نقداً</span><strong dir="ltr">{money(row.cashMinor,row.currency)}</strong></div>
     <div><span>بطاقة عبر جهاز التاجر</span><strong dir="ltr">{money(row.cardMinor,row.currency)}</strong></div>
     <div><span>تحويل خارجي</span><strong dir="ltr">{money(row.transferMinor,row.currency)}</strong></div>
    </div>):<p className="beger-report-empty">لم يُسجّل تحصيل خلال هذه الفترة.</p>}
   </section>
  </div>:null}
  <MerchantCollectionClose key={"close-"+branchId} branchId={branchId}/>
  <p className="beger-report-footnote">هذا تقرير تشغيلي من بيانات Beger، وليس إغلاقاً ضريبياً أو إثبات تسوية مصرفية. يتم عرض كل عملة على حدة، ولا تُحتسب المدفوعات إلا بعد تسجيل التاجر لاستلامها.</p>
 </section>;
}
