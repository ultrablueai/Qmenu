"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import BegerAuthLayout from "../../components/beger-auth-layout";
import { browserSupabase } from "../../lib/supabase/browser";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: authError } = await browserSupabase().auth.signInWithPassword({email: email.trim(), password});
      if (authError) {
        setError(authError.message.toLowerCase().includes("email not confirmed")
          ? "يرجى تأكيد بريدك الإلكتروني أولاً ثم إعادة المحاولة."
          : "تعذّر تسجيل الدخول. تأكد من البريد وكلمة المرور ثم حاول مجدداً.");
        return;
      }
      if (!data.session) throw new Error("No authenticated session");
      // The dashboard verifies the session and membership server-side.
      // New merchants are routed from there to /onboarding.
      const target = new URLSearchParams(window.location.search).get("next");
      // Only these two fixed internal destinations are allowed, never arbitrary URLs.
      window.location.replace(target === "/admin" ? "/admin" : "/dashboard");
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
      setBusy(false);
    } finally { setBusy(false); }
  }
  return <BegerAuthLayout title="أهلاً بعودتك إلى Beger" eyebrow="MERCHANT LOGIN · دخول التاجر">
    <p className="beger-auth-description">ادخل إلى مساحة التاجر لإدارة الفروع، الكتالوج، المنيو وخيارات المنتجات. يتم التحقق من عضويتك وصلاحياتك بأمان.</p>
    <form className="beger-auth-form" onSubmit={submit}>
      <label className="beger-auth-label" htmlFor="email">البريد الإلكتروني</label>
      <input className="beger-auth-input" id="email" type="email" required autoComplete="email" inputMode="email" placeholder="name@example.com" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)}/>
      <label className="beger-auth-label" htmlFor="password">كلمة المرور</label>
      <input className="beger-auth-input" id="password" type="password" required autoComplete="current-password" placeholder="••••••••••" dir="ltr" value={password} onChange={e=>setPassword(e.target.value)}/>
      {error&&<p className="beger-auth-error" role="alert">{error}</p>}
      <button className="beger-marketing-button" disabled={busy} type="submit">{busy?"جارٍ التحقق...":"دخول إلى لوحة التاجر ←"}</button>
    </form>
    <nav className="beger-auth-links" aria-label="خيارات الحساب"><Link href="/forgot-password">نسيت كلمة المرور؟</Link><Link href="/signup">إنشاء حساب تاجر جديد</Link><Link href="/">العودة للرئيسية</Link></nav>
  </BegerAuthLayout>;
}
