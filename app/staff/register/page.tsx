"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import BegerAuthLayout from "../../../components/beger-auth-layout";
import {browserSupabase} from "../../../lib/supabase/browser";

export default function StaffRegistration(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setBusy(true);setNotice("");
  try{
   const callback=new URL("/auth/callback",window.location.origin);
   const {error}=await browserSupabase().auth.signUp({email:email.trim(),password,options:{emailRedirectTo:callback.toString()}});
   if(error)throw error;
   setNotice("راجع بريدك لتأكيد الحساب، ثم سجل دخولك من بوابة الموظفين. ستظهر الدعوات المرتبطة ببريدك بعد التأكيد.");
  }catch{setNotice("تعذّر التسجيل. تأكد من البريد وكلمة المرور أو من إعدادات إرسال البريد في بيئة التجربة.");}
  finally{setBusy(false);}
 }
 return <BegerAuthLayout title="تسجيل موظف في Beger" eyebrow="BEGER STAFF · حساب موظف">
  <p className="beger-auth-description">هذه بوابة الموظفين فقط، منفصلة عن فتح المتاجر. إذا أدخل صاحب العمل بريدك وأرسل لك دعوة دور، ستجدها في مساحة الموظف بعد تأكيد البريد وتسجيل الدخول. تقديم طلب وظيفة لا يمنح أي صلاحية تشغيلية.</p>
  <form className="beger-auth-form" onSubmit={submit}>
   <label className="beger-auth-label" htmlFor="staff-email">بريد الموظف الذي أرسل إليه صاحب العمل الدعوة</label>
   <input className="beger-auth-input" id="staff-email" required type="email" autoComplete="email" dir="ltr" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="employee@example.com"/>
   <label className="beger-auth-label" htmlFor="staff-password">كلمة مرور يختارها الموظف بنفسه (12 حرفاً على الأقل)</label>
   <input className="beger-auth-input" id="staff-password" required type="password" minLength={12} autoComplete="new-password" dir="ltr" value={password} onChange={e=>setPassword(e.target.value)}/>
   <button className="beger-marketing-button" type="submit" disabled={busy}>{busy?"جارٍ إنشاء الحساب…":"إنشاء حساب موظف"}</button>
  </form>
  {notice?<p role="status" className="beger-auth-success">{notice}</p>:null}
  <nav className="beger-auth-links" aria-label="دخول الموظفين"><Link href="/login">عندي حساب — تسجيل الدخول</Link><Link href="/staff">فتح مساحة الموظف</Link><Link href="/signup">أنا صاحب نشاط — تسجيل تاجر</Link></nav>
 </BegerAuthLayout>;
}
