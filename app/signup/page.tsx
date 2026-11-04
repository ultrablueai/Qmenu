"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import BegerAuthLayout from "../../components/beger-auth-layout";
import { browserSupabase } from "../../lib/supabase/browser";

export default function Signup() {
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>) {
   event.preventDefault();
   if(busy) return;
   setBusy(true);
   setMessage("");
   try {
     const callback = new URL("/auth/callback", window.location.origin);
     const {error}=await browserSupabase().auth.signUp({
       email, password, options:{emailRedirectTo:callback.toString()}
     });
     if(error) throw error;
     setMessage("إذا أمكن إنشاء الحساب، تحقق من بريدك الإلكتروني لتأكيد التسجيل ثم سجّل الدخول.");
   } catch {
     setMessage("تعذّر إكمال التسجيل. تحقق من البيانات أو حاول لاحقاً.");
   } finally { setBusy(false); }
 }
 return <BegerAuthLayout title="إنشاء حساب Beger" eyebrow="BEGER · تسجيل حساب">
   <p className="beger-auth-description">للتاجر: أنشئ حساباً ثم أضف نشاطك وفروعك. للموظف: أنشئ حسابك وأكّد بريدك، ثم اطلب من مالك المتجر تعيين دورك؛ لا تنشئ نشاطاً جديداً.</p>
   <form className="beger-auth-form" onSubmit={submit}>
    <label className="beger-auth-label" htmlFor="email">البريد الإلكتروني</label>
    <input className="beger-auth-input" id="email" type="email" autoComplete="email" inputMode="email" dir="ltr" placeholder="name@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/>
    <label className="beger-auth-label" htmlFor="password">كلمة مرور قوية (12 حرفاً على الأقل)</label>
    <input className="beger-auth-input" id="password" type="password" required minLength={12} autoComplete="new-password" dir="ltr" placeholder="••••••••••••" value={password} onChange={e=>setPassword(e.target.value)}/>
    <button className="beger-marketing-button" disabled={busy} type="submit">{busy?"جارٍ التسجيل...":"إنشاء الحساب ←"}</button>
   </form>
   {message&&<p className="beger-auth-success" role="status">{message}</p>}
   <nav className="beger-auth-links" aria-label="خيارات الحساب"><Link href="/login">عندك حساب؟ تسجيل الدخول</Link><Link href="/">العودة للرئيسية</Link></nav>
  </BegerAuthLayout>;
}
