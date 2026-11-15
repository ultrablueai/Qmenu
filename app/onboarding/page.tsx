"use client";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "../../lib/supabase/browser";
import BegerSectorConfigurator from "../../components/beger-sector-configurator";
import {sectorById,type BusinessSector,type Capability} from "../../lib/beger-sector-catalog";
import "../../components/beger-sector-configurator.css";

export default function Onboarding() {
  const [name,setName] = useState("");
  const [branch,setBranch] = useState("");
  const [country,setCountry] = useState<"TR"|"SY">("TR");
  const [selection,setSelection]=useState<{sector:BusinessSector;features:Capability[]}>({sector:"cafe",features:sectorById("cafe").defaultCapabilities});
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
      const {data:businessId,error}=await supabase.rpc("create_first_business",{
        p_business_name:name.trim(),
        p_branch_name:branch.trim(),
        p_country_code:country
      });
      if(error||!businessId) throw error??new Error("Business not created");
      // Preferences are saved separately from the atomic business bootstrap.
      // Failure does not create an active subscription or roll back an existing merchant.
      const {error:preferencesError}=await supabase.from("beger_merchant_model_preferences").upsert({
        business_id:businessId,sector:selection.sector,requested_capabilities:selection.features,
        updated_by:user.id,updated_at:new Date().toISOString()
      },{onConflict:"business_id"});
      window.location.replace(preferencesError?"/dashboard?setup=review":"/dashboard");
    } catch {
      setNotice("تعذّر إنشاء النشاط. تحقق من بياناتك أو راجع الدعم إذا كان لديك نشاط مسجل.");
      setPending(false);
    }
  }
  return <main style={{margin:"8vh auto",maxWidth:860,padding:24}}>
    <h1>إعداد نشاطك الأول</h1>
    <p>يمكن للحساب إنشاء نشاط واحد كبداية. إضافة فروع أو أنشطة جديدة تتطلب صلاحيات منفصلة.</p>
    <BegerSectorConfigurator draftKey="onboarding" onSelectionChange={(sector,features)=>setSelection({sector,features})}/>
    <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:22,maxWidth:540}}>
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
