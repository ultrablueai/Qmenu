"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import "../salon.css";
type Item={id:string;token:string;name:string;time:string;state:string;events:{state:string;at:string}[]};
const STORE="beger:salon:role-demo:v1";
const labels:Record<string,string>={pending:"بانتظار التأكيد",confirmed:"الموعد مؤكد",arrived:"تم تأكيد الحضور",in_service:"الخدمة جارية",completed:"انتهت الخدمة",cancelled:"ملغى"};
export default function SalonCheckin(){
 const [message,setMessage]=useState("جارٍ فحص رابط الحضور…"),[record,setRecord]=useState<Item|null>(null);
 useEffect(()=>{
  const token=new URLSearchParams(window.location.search).get("token")||"";
  try{
   const rows=JSON.parse(localStorage.getItem(STORE)||"[]") as Item[];
   if(!token||token.length>100||!Array.isArray(rows)){setMessage("رابط الحضور غير صالح");return;}
   const item=rows.find(b=>b.token===token);
   if(!item){setMessage("الحجز غير موجود على هذا الجهاز. في النسخة الفعلية سيتم التحقق من الخادم.");return;}
   setRecord(item);
   setMessage(item.state==="confirmed"?"اضغط تأكيد وجودك في الصالون":"الحالة الحالية: "+(labels[item.state]||item.state));
  }catch{setMessage("تعذر قراءة بيانات الحجز التجريبي");}
 },[]);
 function arrive(){
  if(!record||record.state!=="confirmed")return;
  try{
   const rows=JSON.parse(localStorage.getItem(STORE)||"[]") as Item[];
   const current=rows.find(b=>b.id===record.id&&b.token===record.token&&b.state==="confirmed");
   if(!current){setMessage("حالة الحجز تغيرت، افتح الرابط من جديد");return;}
   const updated={...current,state:"arrived",events:[...current.events,{state:"arrived",at:new Date().toISOString()}]};
   localStorage.setItem(STORE,JSON.stringify(rows.map(b=>b.id===current.id?updated:b)));
   window.dispatchEvent(new Event("beger-salon-change"));setRecord(updated);setMessage("تم تسجيل الوصول بالتجربة وسيظهر لدى المعلم وصاحب الصالون في نفس المتصفح");
  }catch{setMessage("تعذّر تسجيل الوصول");}
 }
 return <main className="bs-page" lang="ar" dir="rtl"><div className="bs-wrap"><section className="bs-panel" style={{maxWidth:620,margin:"55px auto",textAlign:"center"}}>
  <span className="bs-eyebrow">BEGER · SALON ARRIVAL</span><h1>تأكيد الوصول للصالون</h1>
  <p role="status" className="bs-notice">{message}</p>
  {record?<><h2>الحجز #{record.id}</h2><p>{record.name} · {record.time}</p><button type="button" className="bs-primary" disabled={record.state!=="confirmed"} onClick={arrive}>أنا وصلت إلى الصالون</button></>:null}
  <p className="bs-fine">هذا تأكيد تجريبي محلي، وليس QR مصادقاً عليه أو إثبات موقع فعلي. لا يعمل عبر أجهزة مختلفة ولا يتضمن تحققاً من هوية الشخص.</p>
  <Link href="/demo/salon/customer">صفحة الزبون</Link></section></div></main>;
}
