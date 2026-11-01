"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserSupabase } from "../../lib/supabase/browser";

export default function Signup() {
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const callbackUrl = () => new URL("/auth/callback", window.location.origin).toString();

 async function submit(event:FormEvent<HTMLFormElement>) {
   event.preventDefault();
   if(busy) return;
   setBusy(true);
   setMessage("");
   try {
     const {error}=await browserSupabase().auth.signUp({
       email:email.trim(), password, options:{emailRedirectTo:callbackUrl()}
     });
     if(error) throw error;
     setMessage("إذا أمكن إنشاء الحساب، تحقق من بريدك الإلكتروني لتأكيد التسجيل ثم سجّل الدخول.");
   } catch {
     setMessage("تعذّر إكمال التسجيل. تحقق من البيانات أو حاول لاحقاً.");
   } finally { setBusy(false); }
 }

 async function resendConfirmation() {
   if(busy || !email.trim()) {
     setMessage("أدخل بريدك الإلكتروني أولاً لإعادة إرسال رسالة التأكيد.");
     return;
   }
   setBusy(true);
   setMessage("");
   try {
     const {error}=await browserSupabase().auth.resend({
       type:"signup", email:email.trim(), options:{emailRedirectTo:callbackUrl()}
     });
     if(error) throw error;
     // Do not reveal whether this account exists.
     setMessage("إذا كان الحساب بانتظار التأكيد، ستصلك رسالة جديدة. تحقق من البريد غير المرغوب أيضاً.");
   } catch {
     setMessage("تعذّر طلب إعادة إرسال رسالة التأكيد حالياً. حاول لاحقاً.");
   } finally { setBusy(false); }
 }

 return <main style={{maxWidth:430,margin:"10vh auto",padding:24}}>
  <h1>إنشاء حساب تاجر</h1>
  <p>التسجيل لا ينشئ شركة أو يمنح صلاحيات تلقائياً.</p>
  <form onSubmit={submit}>
   <label htmlFor="email">البريد الإلكتروني</label>
   <input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:12,boxSizing:"border-box",margin:"8px 0 18px"}}/>
   <label htmlFor="password">كلمة مرور قوية (12 حرفاً على الأقل)</label>
   <input id="password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",padding:12,boxSizing:"border-box",margin:"8px 0 18px"}}/>
   <button disabled={busy} type="submit">{busy?"جارٍ التسجيل...":"إنشاء الحساب"}</button>
  </form>
  <p><button type="button" disabled={busy} onClick={resendConfirmation}>لم تصلك رسالة التأكيد؟ إعادة الإرسال</button></p>
  {message&&<p role="status">{message}</p>}
  <p>لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
 </main>;
}
