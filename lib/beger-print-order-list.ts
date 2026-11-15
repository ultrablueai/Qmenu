"use client";

type PrintableListOrder={
 id:string;table:string;serviceMode?:"dine_in"|"takeaway";status:string;
 paymentStatus?:"unpaid"|"paid";totalMinor:number;currency:string;createdAt:string
};
type PrintedView="live"|"history";
const ref=(id:string)=>id.replace(/-/g,"").slice(0,10).toUpperCase();
const currencyTotal=(minor:number,currency:string)=>new Intl.NumberFormat("ar",{minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0}).format(minor/(currency==="TRY"?100:1))+" "+currency;
export function printFilteredOrderList(rows:PrintableListOrder[],branchName:string,view:PrintedView):boolean{
 const popup=window.open("","_blank","width=760,height=850");
 if(!popup)return false;
 const d=popup.document;d.title="Beger — "+(view==="live"?"الطلبات المباشرة":"سجل الطلبات");
 d.documentElement.lang="ar";d.documentElement.dir="rtl";
 const style=d.createElement("style");
 style.textContent=`*{box-sizing:border-box}body{background:#f2efe9;color:#3d3328;font:13px/1.6 Tahoma,Arial,sans-serif;margin:0;direction:rtl}.toolbar{padding:14px;text-align:center;background:#35342b;color:white}.toolbar button{min-height:42px;background:#71864f;color:#fff;border:0;border-radius:9px;padding:9px 23px;cursor:pointer}.page{max-width:210mm;min-height:160mm;margin:22px auto;padding:17mm 14mm;background:#fff;box-shadow:0 9px 32px #2319061a}.brand{color:#5a7042;font-size:19px;font-weight:900}.title{font-size:25px;font-weight:900;margin:12px 0 3px}.note{color:#746d61;font-size:11px}.meta{display:flex;justify-content:space-between;border-block:1px solid #ded9d0;padding:12px 0;margin:15px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;text-align:right}th{background:#eff3e7;color:#405832;font-size:12px}td,th{padding:10px 8px;border-bottom:1px solid #e8e3d8;overflow-wrap:anywhere}td:first-child{font-weight:800}.code{direction:ltr;unicode-bidi:isolate;display:inline-block}footer{padding-top:18px;border-top:1px dashed #bfb5a6;margin-top:18px;color:#87786a;font-size:11px}@page{size:A4;margin:11mm}@media print{body{background:white}.toolbar{display:none!important}.page{max-width:none;min-height:0;margin:0;padding:0;box-shadow:none}thead{display:table-header-group}tr{break-inside:avoid}}@media(max-width:700px){.page{padding:14px;margin:10px}.meta{flex-wrap:wrap;gap:8px}td,th{padding:7px 4px;font-size:10px}}`;
 d.head.appendChild(style);
 const add=(tag:string,text:string,parent:HTMLElement=d.body,cls?:string)=>{const n=d.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.appendChild(n);return n};
 const toolbar=add("div","",d.body);
 // The print-only button stays outside the paper and is hidden in print media.
 toolbar.className="toolbar";
 const btn=add("button","طباعة القائمة",toolbar);btn.addEventListener("click",()=>popup.print());
 const page=add("main","",d.body,"page");
 add("div","Beger · "+branchName,page,"brand");
 add("h1",view==="live"?"الطلبات المباشرة — القائمة المفلترة":"سجل الطلبات — القائمة المفلترة",page,"title");
 add("p","هذه القائمة تحتوي فقط على الطلبات الظاهرة بعد تطبيق فلاتر الشاشة.",page,"note");
 const meta=add("div","",page,"meta");
 add("span","عدد الطلبات: "+rows.length,meta);
 add("span","تاريخ الطباعة: "+new Date().toLocaleString("ar"),meta);
 const table=add("table","",page);
 const header=d.createElement("thead");table.appendChild(header);
 const headRow=d.createElement("tr");header.appendChild(headRow);
 for(const h of ["رقم الطلب","الطاولة / الخدمة","الحالة","التحصيل","الإجمالي"]){add("th",h,headRow)}
 const tbody=d.createElement("tbody");table.appendChild(tbody);
 for(const order of rows){
  const tr=d.createElement("tr");tbody.appendChild(tr);
  add("td","#"+ref(order.id),tr,"code");
  add("td",order.serviceMode==="takeaway"?"سفري":order.table,tr);
  add("td",order.status,tr);
  add("td",order.paymentStatus==="paid"?"مسجّل":"غير مسجّل",tr);
  add("td",currencyTotal(order.totalMinor,order.currency),tr);
 }
 if(!rows.length){const tr=d.createElement("tr");tbody.appendChild(tr);const cell=add("td","لا توجد طلبات مطابقة للفلاتر",tr);cell.setAttribute("colspan","5");}
 add("footer","تقرير تشغيلي داخلي — ليس فاتورة ضريبية أو إثبات تحصيل مصرفي.",page);
 popup.focus();return true;
}
