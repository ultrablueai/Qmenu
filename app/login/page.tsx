"use client";
import { useState, type FormEvent } from "react";
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
      const { error: authError } = await browserSupabase().auth.signInWithPassword({email, password});
      if (authError) throw authError;
      window.location.assign("/dashboard");
    } catch {
      setError("تعذر تسجيل الدخول. تحقق من البيانات وحاول مجدداً.");
      setBusy(false);
    }
  }
  return <main style={{maxWidth:420, margin:"12vh auto", padding:24}}>
    <h1>دخول التاجر</h1>
    <form onSubmit={submit}>
      <label htmlFor="email">البريد الإلكتروني</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:12,marginBottom:16,boxSizing:"border-box"}}/>
      <label htmlFor="password">كلمة المرور</label>
      <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",padding:12,marginBottom:16,boxSizing:"border-box"}}/>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} type="submit">{busy?"جارٍ التحقق...":"دخول"}</button>
    </form>
  </main>;
}
