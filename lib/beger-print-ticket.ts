"use client";

export type PrintableOrder={
 id:string;table:string;serviceMode?:"dine_in"|"takeaway";status:string;
 paymentStatus?:"unpaid"|"paid";paymentMethod?:string|null;
 currency:string;totalMinor:number;createdAt:string;
 items:{name:string;quantity:number;selections?:{options?:{name_ar?:string}[];removedIngredients?:string[]}}[]
};
type TicketKind="kitchen"|"pickup"|"summary";
type Paper="80mm"|"58mm"|"a4";
const orderNumber=(id:string)=>id.replace(/-/g,"").slice(0,10).toUpperCase();
const amount=(minor:number,currency:string)=>new Intl.NumberFormat("en-US",{
 minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0
}).format(minor/(currency==="TRY"?100:1))+" "+currency;

const labels:Record<TicketKind,{title:string;eyebrow:string;note:string}>={
 kitchen:{title:"تذكرة تجهيز المطبخ",eyebrow:"KITCHEN TICKET",note:"ورقة تجهيز فقط — ليست إيصالاً ضريبياً"},
 pickup:{title:"بطاقة استلام الطلب",eyebrow:"PICKUP LABEL",note:"طابق رقم الاستلام مع الطلب قبل التسليم"},
 summary:{title:"كشف حساب داخلي",eyebrow:"INTERNAL ORDER SUMMARY",note:"كشف حساب داخلي — هذه الورقة ليست فاتورة ضريبية أو فيش ÖKC"}
};
const steps:Record<string,string>={
 pending:"بانتظار الموافقة",accepted:"مقبول",preparing:"قيد التحضير",ready:"جاهز للاستلام",
 fulfilled:"تم التسليم",rejected:"مرفوض"
};

export function printOrderTicket(order:PrintableOrder,branchName:string,kind:TicketKind):boolean{
 // Only a directly clicked staff action opens the preview; never sends customer data to external services.
 const popup=window.open("","_blank","width=680,height=820");
 if(!popup)return false;
 const d=popup.document;
 d.title="Beger "+orderNumber(order.id);
 d.documentElement.lang="ar";
 d.documentElement.dir="rtl";
 const stylesheet=d.createElement("style");
 stylesheet.textContent=`
 :root{color-scheme:light;--ink:#362d25;--muted:#776d62;--accent:#637b46;--line:#e7e1d5}
 *{box-sizing:border-box}
 html{background:#edeae4}
 body{font:14px/1.65 system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:var(--ink);margin:0;min-height:100vh;direction:rtl}
 .print-toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;background:#302d28;color:#fff;padding:13px 16px}
 .print-toolbar label{display:flex;align-items:center;gap:8px;font-size:12px}
 .print-toolbar select,.print-toolbar button{font:inherit;font-size:13px;border-radius:9px;border:1px solid #c9c6be;min-height:40px;padding:7px 13px;cursor:pointer}
 .print-toolbar button{border-color:#a5bd86;background:#758d55;color:white;font-weight:750}
 .print-toolbar button:focus-visible,.print-toolbar select:focus-visible{outline:3px solid #adc68e;outline-offset:2px}
 .print-help{font-size:11px;color:#dbd9d3}
 .preview-stage{display:flex;justify-content:center;padding:26px 12px 52px}
 .receipt{width:80mm;max-width:100%;background:#fff;padding:6mm 5mm;border-radius:3px;box-shadow:0 8px 35px #372c1e20;overflow-wrap:anywhere}
 body[data-paper="58mm"] .receipt{width:58mm;padding:4mm 3mm}
 body[data-paper="a4"] .receipt{width:min(100%,185mm);padding:16mm 13mm}
 .brand{display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;font-weight:900;font-size:20px;line-height:1.25}
 .brand-mark{display:inline-grid;place-items:center;background:#637b46;color:#fff;border-radius:7px;width:28px;height:28px;font-weight:900;font-family:Georgia,serif;font-size:20px}
 .branch{text-align:center;font-size:14px;font-weight:800;margin:7px 0 10px}
 .document-type{text-align:center;border-top:1px dashed #bcb5a7;border-bottom:1px dashed #bcb5a7;padding:9px 0;margin-bottom:12px}
 .document-type strong{display:block;font-size:14px}
 .eyebrow{display:block;font-size:9px;color:#827767;letter-spacing:.11em;font-weight:750}
 .reference-box{text-align:center;background:#f1f4eb;border:1px solid #dce5ce;border-radius:11px;padding:13px 7px;margin:10px 0 13px;break-inside:avoid}
 .reference-caption{display:block;color:#647b46;font-size:11px;font-weight:850}
 .reference{display:block;font-size:clamp(21px,5vw,31px);font-weight:900;line-height:1.35;letter-spacing:.045em;direction:ltr;unicode-bidi:isolate}
 .paper-meta{display:grid;gap:6px;margin:12px 0;padding:0}
 .meta-row{display:flex;justify-content:space-between;align-items:flex-start;gap:9px;border-bottom:1px solid #f1ede6;padding-bottom:5px;font-size:11px}
 .meta-row dt{color:#80766b;flex:none}.meta-row dd{margin:0;text-align:end;font-weight:750;overflow-wrap:anywhere}
 .item-head{display:flex;justify-content:space-between;border-bottom:2px solid #4d493f;padding:8px 0 6px;margin-top:14px;font-size:11px;font-weight:850}
 .items{list-style:none;padding:0;margin:0}
 .items li{display:flex;gap:9px;align-items:flex-start;border-bottom:1px dashed #d6d0c5;padding:11px 0;break-inside:avoid}
 .qty{font-weight:900;color:#526a3a;background:#eff3e9;min-width:32px;text-align:center;padding:3px;border-radius:6px;flex:none}
 .item-body{flex:1;min-width:0}.item-name{font-size:13px;font-weight:800;line-height:1.5}
 .item-note{display:block;margin-top:3px;font-size:10px;color:#756b61;line-height:1.6}
 .summary{margin-top:14px;padding:13px 0;border-top:2px solid #423c32;border-bottom:2px solid #423c32;break-inside:avoid}
 .summary-row{display:flex;justify-content:space-between;align-items:center;gap:10px}
 .summary-row dt{font-size:13px;font-weight:850}.summary-row dd{margin:0;font-size:19px;font-weight:900;direction:ltr;unicode-bidi:isolate}
 .status-line{text-align:center;font-size:12px;font-weight:800;margin:13px 0;padding:8px;border-radius:8px;border:1px solid #d7dfcc;background:#f3f6ef}
 .footnote{text-align:center;font-size:10px;color:#736a5d;margin:18px 0 2px;border-top:1px dashed #c8c2b7;padding-top:10px;line-height:1.6}
 .pickup-title{text-align:center;color:#526a3a;font-size:13px;font-weight:850;margin:10px 0}
 body[data-paper="58mm"] .brand{font-size:17px}
 body[data-paper="58mm"] .branch{font-size:12px}
 body[data-paper="58mm"] .reference{font-size:24px}
 body[data-paper="58mm"] .item-name{font-size:12px}
 @page{size:80mm auto;margin:4mm}
 @media print{
  @page{size:80mm auto;margin:4mm}
  html,body{background:#fff!important;margin:0!important;padding:0!important;min-height:0!important}
  .print-toolbar,.print-help{display:none!important}
  .preview-stage{display:block!important;padding:0!important}
  .receipt{width:100%!important;max-width:100%!important;padding:0!important;margin:0!important;border:0!important;box-shadow:none!important;border-radius:0!important}
  .document-type,.reference-box,.summary,.items li{-webkit-print-color-adjust:exact;print-color-adjust:exact}
 }
 `;
 d.head.appendChild(stylesheet);
 const add=(tag:string,value:string,className?:string,parent:HTMLElement=d.body)=>{
  const node=d.createElement(tag);node.textContent=value;if(className)node.className=className;parent.appendChild(node);return node;
 };
 const toolbar=add("div","","print-toolbar");
 const label=add("label","حجم الورق",undefined,toolbar);
 const selector=d.createElement("select");label.appendChild(selector);
 for(const [value,name] of [["80mm","حراري 80 مم"],["58mm","حراري 58 مم"],["a4","A4 / كشف داخلي"]]){
  const opt=d.createElement("option");opt.value=value;opt.textContent=name;selector.appendChild(opt);
 }
 const defaultPaper:Paper=kind==="summary"?"a4":"80mm";
 selector.value=defaultPaper;
 d.body.dataset.paper=defaultPaper;
 selector.addEventListener("change",()=>{d.body.dataset.paper=selector.value;});
 const printButton=add("button","طباعة المستند",undefined,toolbar);
 printButton.addEventListener("click",()=>popup.print());
 add("span","اختر قياس الورق نفسه من إعدادات الطابعة عند الطباعة","print-help",toolbar);
 const stage=add("main","","preview-stage");
 const receipt=add("article","","receipt",stage);
 const brand=add("header","","brand",receipt);
 add("span","B","brand-mark",brand);
 add("span","Beger",undefined,brand);
 add("p",branchName,"branch",receipt);
 const type=add("div","","document-type",receipt);
 add("span",labels[kind].eyebrow,"eyebrow",type);
 add("strong",labels[kind].title,undefined,type);
 const ref=add("section","","reference-box",receipt);
 add("span",kind==="pickup"?"رقم الاستلام":"رقم الطلب","reference-caption",ref);
 add("strong","#"+orderNumber(order.id),"reference",ref);
 const meta=add("dl","","paper-meta",receipt);
 const row=(key:string,value:string)=>{
  const wrapper=add("div","","meta-row",meta);
  add("dt",key,undefined,wrapper);add("dd",value,undefined,wrapper);
 };
 row("نوع الخدمة",order.serviceMode==="takeaway"?"سفري · استلام من المحل":"داخل المطعم");
 if(order.serviceMode!=="takeaway")row("الطاولة",order.table);
 row("التاريخ والوقت",new Date(order.createdAt).toLocaleString("ar"));
 if(kind!=="pickup"){
  row("حالة الطلب",steps[order.status]??order.status);
  const heading=add("div","","item-head",receipt);
  add("span","الصنف",undefined,heading);add("span","الكمية",undefined,heading);
  const list=add("ul","","items",receipt);
  for(const item of order.items){
   const li=add("li","",undefined,list);
   add("span",String(item.quantity)+" ×","qty",li);
   const body=add("div","","item-body",li);
   add("div",item.name,"item-name",body);
   const options=(item.selections?.options??[]).map(o=>o.name_ar).filter(Boolean).join(" · ");
   const removed=item.selections?.removedIngredients??[];
   if(options)add("small","إضافات: "+options,"item-note",body);
   if(removed.length)add("small","بدون: "+removed.join("، "),"item-note",body);
  }
 }
 if(kind==="summary"){
  const summary=add("dl","","summary",receipt);
  const total=add("div","","summary-row",summary);
  add("dt","إجمالي الطلب",undefined,total);
  add("dd",amount(order.totalMinor,order.currency),undefined,total);
  const state=order.paymentStatus==="paid"?"التحصيل مسجّل لدى التاجر":"لم يُسجّل التحصيل";
  add("p",state,"status-line",receipt);
  // Line-item amounts, taxes, and discounts are intentionally absent until server snapshots exist.
 }
 if(kind==="pickup")add("p","احتفظ بهذه البطاقة حتى استلام الطلب","pickup-title",receipt);
 add("p",labels[kind].note,"footnote",receipt);
 popup.focus();
 return true;
}
