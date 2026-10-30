"use client";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "../../lib/supabase/browser";

export default function Onboarding() {
  const [name,setName] = useState("");
  const [branch,setBranch] = useState("");
  const [country,setCountry] = useState<"TR"|"SY">("TR");
  const [pending,setPending] = useState(false);
  const [notice,setNotice] = useState("");
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true); setNotice("");
    try {
      const supabase=browserSupabase();
      const {data:{user},error:sessionError}=await supabase.auth.getUser();
      if(sessionError || !user) { window.location.replace("/login"); return; }
      const {error}=await supabase.rpc("create_first_business",{
        p_business_name:name.trim(),
        p_branch_name:branch.trim(),
        p_country_code:country
      });
      if(error) throw error;
      window.location.replace("/dashboard");
    } catch {
      setNotice("تعذّر إنشاء النشاط. تحقق من بياناتك أو راجع الدعم إذا كان لديك نشاط مسجل.");
      setPending(false);
    }
  }
  return <main style={{margin:"8vh auto",maxWidth:500,padding:24}}>
    <h1>إعداد نشاطك الأول</h1>
    <p>يمكن للحساب إنشاء نشاط واحد كبداية. إضافة فروع أو أنشطة جديدة تتطلب صلاحيات منفصلة.</p>
    <form onSubmit={submit}>
      <label htmlFor="name">اسم النشاط</label>
      <input id="name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/>
      <label htmlFor="branch">اسم الفرع</label>
      <input id="branch" required maxLength={160} value={branch} onChange={e=>setBranch(e.target.value)}/>
      <label htmlFor="country">الدولة</label>
      <select id="country" value={country} onChange={e=>setCountry(e.target.value as "TR"|"SY")}>
        <option value="TR">تركيا</option><option value="SY">سوريا</option>
      </select>
      {notice && <p role="alert">{notice}</p>}
      <button type="submit" disabled={pending}>{pending?"جارٍ الإنشاء...":"إنشاء نشاطي"}</button>
    </form>
  </main>;
}
