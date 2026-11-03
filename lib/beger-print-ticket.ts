"use client";

export type PrintableOrder={
 id:string;table:string;serviceMode?:"dine_in"|"takeaway";status:string;
 paymentStatus?:"unpaid"|"paid";currency:string;totalMinor:number;createdAt:string;
 items:{name:string;quantity:number;selections?:{options?:{name_ar?:string}[];removedIngredients?:string[]}}[]
};
type TicketKind="kitchen"|"pickup"|"summary";
const orderNumber=(id:string)=>id.replace(/-/g,"").slice(0,10).toUpperCase();
const amount=(minor:number,currency:string)=>new Intl.NumberFormat("en-US",{
 minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0
}).format(minor/(currency==="TRY"?100:1))+" "+currency;

export function printOrderTicket(order:PrintableOrder,branchName:string,kind:TicketKind):boolean{
 // User-triggered only. Never sends order data to a third-party print service.
 const popup=window.open("","_blank","width=480,height=720");
 if(!popup)return false;
 const d=popup.document;
 d.title="Beger "+orderNumber(order.id);
 const stylesheet=d.createElement("style");
 stylesheet.textContent=`@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{font:14px Arial,sans-serif;direction:rtl;color:#151515;margin:0;padding:12px;max-width:80mm}h1{font-size:20px;margin:6px 0}h2{font-size:29px;letter-spacing:1px;margin:8px 0}p{margin:6px 0;line-height:1.55}ul{list-style:none;margin:12px 0;padding:0}li{padding:8px 0;border-bottom:1px dashed #999;overflow-wrap:anywhere}small{display:block;font-size:11px;color:#444;margin-top:4px}.line{border-top:1px dashed #888;margin:10px 0}.meta{font-size:12px}.notice{font-size:11px;padding:10px 0;border-top:1px dashed #888}button{margin:15px 0;padding:10px}@media print{button{display:none}body{padding:0}}`;
 d.head.appendChild(stylesheet);
 const add=(tag:string,value:string,className?:string,parent:HTMLElement=d.body)=>{
  const node=d.createElement(tag);node.textContent=value;if(className)node.className=className;parent.appendChild(node);return node;
 };
 const ref="#"+orderNumber(order.id);
 add("h1",branchName);
 add("p",kind==="kitchen"?"ورقة تجهيز المطبخ":kind==="pickup"?"ملصق رقم الاستلام":"كشف حساب الطلب · نسخة داخلية","meta");
 add("h2",ref);
 add("p",order.serviceMode==="takeaway"?"سفري · استلام من المحل":"طاولة: "+order.table);
 add("p","وقت الطلب: "+new Date(order.createdAt).toLocaleString("ar"));
 if(kind!=="pickup"){
  const list=d.createElement("ul");d.body.appendChild(list);
  for(const item of order.items){
   const li=add("li",item.quantity+" × "+item.name,undefined,list);
   const options=(item.selections?.options??[]).map(o=>o.name_ar).filter(Boolean).join(" · ");
   const removed=item.selections?.removedIngredients??[];
   if(options)add("small","إضافات: "+options,undefined,li);
   if(removed.length)add("small","بدون: "+removed.join("، "),undefined,li);
  }
  if(kind==="summary"){
   add("p","الإجمالي: "+amount(order.totalMinor,order.currency));
   add("p",order.paymentStatus==="paid"?"التحصيل مسجّل لدى التاجر":"لم يُسجّل التحصيل");
  }
 }
 add("p",kind==="summary"?"كشف حساب داخلي — ليس فاتورة ضريبية أو فيش ÖKC":kind==="pickup"?"طابق رقم الاستلام قبل التسليم":"ورقة تجهيز فقط — ليست إيصالاً ضريبياً","notice");
 const button=add("button","طباعة");
 button.addEventListener("click",()=>popup.print());
 // Keep the print view open when printing is blocked or cancelled.
 popup.focus();
 popup.setTimeout(()=>popup.print(),180);
 return true;
}
