"use client";

export type ExportableOrder={
 id:string;table:string;serviceMode?:"dine_in"|"takeaway";
 status:string;paymentStatus?:"paid"|"unpaid";paymentMethod?:string|null;
 currency:string;totalMinor:number;createdAt:string;items:{name:string;quantity:number}[]
};
const ref=(id:string)=>id.replace(/-/g,"").slice(0,10).toUpperCase();
const safeCell=(value:string|number)=>{
 const normalized=String(value??"");
 // Escape potential spreadsheet formulas, even when preceded by whitespace/control characters.
 const escaped=/^[\s\u0000-\u001f]*[=+\-@]/u.test(normalized)?"'"+normalized:normalized;
 return '"'+escaped.replace(/"/g,'""')+'"';
};
export function createOrderCsv(rows:ExportableOrder[]):string{
 const headers=["رقم الطلب","تاريخ الإنشاء","الخدمة","الطاولة","حالة الطلب","التحصيل","طريقة التحصيل","العملة","الإجمالي بالوحدة الصغرى","الأصناف"];
 const lines=[headers.map(safeCell).join(",")];
 for(const order of rows){
  lines.push([
   ref(order.id),order.createdAt,
   order.serviceMode==="takeaway"?"سفري":"طاولة",
   order.serviceMode==="takeaway"?"":order.table,order.status,
   order.paymentStatus==="paid"?"مسجّل":"غير مسجّل",
   order.paymentMethod??"",order.currency,order.totalMinor,
   order.items.map(item=>item.quantity+" × "+item.name).join(" | ")
  ].map(safeCell).join(","));
 }
 return "\uFEFF"+lines.join("\r\n");
}
export function downloadOrderCsv(rows:ExportableOrder[],view:"live"|"history"):boolean{
 if(!rows.length)return false;
 const data=createOrderCsv(rows);
 const blob=new Blob([data],{type:"text/csv;charset=utf-8"});
 const uri=URL.createObjectURL(blob);
 try{
  const a=document.createElement("a");
  a.href=uri;a.download="beger-"+view+"-orders-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a);a.click();a.remove();
  return true;
 }finally{URL.revokeObjectURL(uri);}
}
