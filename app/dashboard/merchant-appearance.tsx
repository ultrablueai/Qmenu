"use client";
import {useEffect,useState,type CSSProperties} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type Lang="ar"|"tr"|"en";
type Theme="luxe_dark"|"clean_light"|"bold_commerce";
const themes:{id:Theme;name:string;detail:string;bg:string;fg:string;accent:string}[]=[
 {id:"luxe_dark",name:"Luxe Dark",detail:"فاخر · كافيهات ومطاعم مميزة",bg:"#171613",fg:"#f6f1e7",accent:"#d8a642"},
 {id:"clean_light",name:"Clean Light",detail:"بسيط · عيادات وصالونات ومتاجر",bg:"#f5f8f7",fg:"#17383a",accent:"#12877b"},
 {id:"bold_commerce",name:"Bold Commerce",detail:"جريء · وجبات ومطاعم سريعة",bg:"#fff8ee",fg:"#29201b",accent:"#ef641d"}
];
const langNames:{id:Lang;name:string}[]=[{id:"ar",name:"العربية"},{id:"tr",name:"Türkçe"},{id:"en",name:"English"}];
const panel:CSSProperties={background:"#fff",padding:20,border:"1px solid #dce7e7",borderRadius:16,marginTop:22};
export default function MerchantAppearance({businessId}:{businessId:string}){
 const [theme,setTheme]=useState<Theme>("clean_light");
 const [langs,setLangs]=useState<Lang[]>(["ar","tr","en"]);
 const [defaultLang,setDefaultLang]=useState<Lang>("ar");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{let active=true;
   browserSupabase().from("business_menu_appearance").select("theme,enabled_languages,default_lang").eq("business_id",businessId).maybeSingle()
   .then(({data,error})=>{if(!active)return;if(error){setError("تعذّر تحميل إعدادات الواجهة");return;}
    if(data){const ids=langNames.map(x=>x.id);const enabled=(data.enabled_languages as string[]).filter((s):s is Lang=>ids.includes(s as Lang));
      if(enabled.length){setLangs(enabled);setDefaultLang(enabled.includes(data.default_lang as Lang)?data.default_lang as Lang:enabled[0]);}
      if(themes.some(t=>t.id===data.theme))setTheme(data.theme as Theme);}
   }).finally(()=>{if(active)setLoading(false)});
   return()=>{active=false};
 },[businessId]);
 function toggleLang(lang:Lang){
  const next=langs.includes(lang)?langs.filter(x=>x!==lang):[...langs,lang];
  if(!next.length)return;setLangs(next);
  if(!next.includes(defaultLang))setDefaultLang(next[0]);
 }
 async function save(){
  if(busy||!langs.length||!langs.includes(defaultLang))return;
  setBusy(true);setError("");setNotice("");
  try{const {error}=await browserSupabase().from("business_menu_appearance").upsert({
    business_id:businessId,theme,default_lang:defaultLang,enabled_languages:langs,updated_at:new Date().toISOString()
   },{onConflict:"business_id"});
   if(error)throw new Error(error.message);
   setNotice("تم حفظ تصميم المتجر واللغات. سيظهر الاختيار على صفحات الزبائن عند تحديثها.");
  }catch(e){setError(e instanceof Error?e.message:"تعذّر حفظ إعدادات الواجهة");}
  finally{setBusy(false);}
 }
 return <section id="customer-appearance" style={panel} dir="rtl" aria-label="تصميم واجهة الزبون">
   <h2 style={{fontSize:23,margin:"0 0 8px"}}>تصميم واجهة الزبون</h2>
   <p style={{fontSize:13,color:"#60787b"}}>اختر واحداً من ثلاثة تصاميم عالمية وحدد اللغات التي يمكن للزبون استخدامها. الإعدادات لجميع فروع هذا المتجر.</p>
   {loading?<p role="status">جارٍ تحميل الإعدادات…</p>:<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginTop:18}}>
      {themes.map(t=><button key={t.id} type="button" aria-pressed={theme===t.id}
         onClick={()=>setTheme(t.id)} style={{cursor:"pointer",textAlign:"right",border:theme===t.id?"3px solid "+t.accent:"1px solid #cedddd",borderRadius:14,padding:10,background:"#fff"}}>
        <div style={{height:95,background:t.bg,color:t.fg,borderRadius:9,padding:12,display:"grid",alignContent:"space-between"}}>
          <strong style={{fontSize:16}}>Beger</strong>
          <span style={{background:t.accent,color:t.id==="luxe_dark"?"#191714":"white",padding:"5px 8px",borderRadius:7,maxWidth:"max-content",fontSize:11}}>MENU</span>
        </div>
        <strong style={{display:"block",marginTop:8,color:"#233"}}>{t.name}</strong>
        <small style={{color:"#63777b"}}>{t.detail}</small>
      </button>)}
    </div>
    <fieldset style={{marginTop:18,border:"1px solid #d9e7e6",borderRadius:12,padding:14}}>
      <legend>اللغات المفعلة</legend>
      <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
        {langNames.map(lang=><label key={lang.id}><input type="checkbox" checked={langs.includes(lang.id)} onChange={()=>toggleLang(lang.id)}/> {lang.name}</label>)}
      </div>
      <label style={{display:"block",marginTop:15}}>اللغة الافتراضية:
        <select style={{display:"block",marginTop:6,padding:10,borderRadius:8,border:"1px solid #bfd4d2"}} value={defaultLang} onChange={e=>setDefaultLang(e.target.value as Lang)}>
        {langNames.filter(l=>langs.includes(l.id)).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
    </fieldset>
    {error?<p role="alert" style={{color:"#a62626"}}>{error}</p>:null}
    {notice?<p role="status" style={{color:"#087c5a"}}>{notice}</p>:null}
    <button type="button" onClick={save} disabled={busy} style={{marginTop:16,padding:"12px 22px",border:0,borderRadius:10,background:"#147b72",color:"white",fontWeight:700,cursor:"pointer"}}>{busy?"جارٍ الحفظ…":"حفظ واجهة الزبون"}</button>
   </>}
 </section>;
}
