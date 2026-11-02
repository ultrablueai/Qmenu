"use client";
import {useEffect,useState,type FormEvent} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./product-options-manager.css";

type Product={id:string;name_ar:string};
type Ingredient={id:string;product_id:string;name_ar:string;name_tr:string;is_optional:boolean};
type Group={id:string;product_id:string;name_ar:string;name_tr:string;min_select:number;max_select:number;active:boolean};
type Option={id:string;group_id:string;name_ar:string;name_tr:string;price_delta_minor:number;active:boolean};
const style={padding:10,border:"1px solid #cfdfdf",borderRadius:9,width:"100%",boxSizing:"border-box" as const};
const button={padding:"11px 16px",background:"#637a43",color:"white",border:0,borderRadius:11,cursor:"pointer"};
const box={border:"1px solid #eadfd2",background:"#fffefa",padding:18,borderRadius:16,marginTop:14,boxShadow:"0 4px 15px #5a413008"};
export default function ProductOptionsManager({businessId,country,products}:{businessId:string;country:string;products:Product[]}){
 const [productId,setProductId]=useState(""),[ingredients,setIngredients]=useState<Ingredient[]>([]),[groups,setGroups]=useState<Group[]>([]),[options,setOptions]=useState<Option[]>([]);
 const [nameAr,setNameAr]=useState(""),[nameTr,setNameTr]=useState(""),[nameEn,setNameEn]=useState(""),[optional,setOptional]=useState(false);
 const [groupAr,setGroupAr]=useState(""),[groupTr,setGroupTr]=useState(""),[groupEn,setGroupEn]=useState(""),[min,setMin]=useState(0),[max,setMax]=useState(1);
 const [optionGroup,setOptionGroup]=useState(""),[optionAr,setOptionAr]=useState(""),[optionTr,setOptionTr]=useState(""),[optionEn,setOptionEn]=useState(""),[delta,setDelta]=useState("0");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const factor=country==="TR"?100:1,currency=country==="TR"?"TRY":country==="SY"?"SYP":country;
 const selected=products.some(p=>p.id===productId)?productId:products[0]?.id??"";
 async function refresh(id:string){
  if(!id){setIngredients([]);setGroups([]);setOptions([]);return;}
  const db=browserSupabase();
  const [a,b,c]=await Promise.all([
   db.from("catalog_product_ingredients").select("id,product_id,name_ar,name_tr,is_optional").eq("business_id",businessId).eq("product_id",id),
   db.from("catalog_modifier_groups").select("id,product_id,name_ar,name_tr,min_select,max_select,active").eq("business_id",businessId).eq("product_id",id),
   db.from("catalog_modifier_options").select("id,group_id,name_ar,name_tr,price_delta_minor,active").eq("business_id",businessId)
  ]);
  if(a.error||b.error||c.error)throw Error("تعذّر تحميل خيارات المنتج");
  setIngredients(a.data??[]);setGroups(b.data??[]);
  const groupIds=new Set((b.data??[]).map(g=>g.id));
  setOptions((c.data??[]).filter(o=>groupIds.has(o.group_id)));
  setOptionGroup(old=>groupIds.has(old)?old:(b.data??[])[0]?.id??"");
 }
 useEffect(()=>{refresh(selected).catch(e=>setError(e.message));},[selected,businessId]);
 async function run(write:()=>Promise<{error:{message:string}|null}>,message:string){
  if(busy)return false;setBusy(true);setError("");setNotice("");
  try{const res=await write();if(res.error)throw Error(res.error.message);await refresh(selected);setNotice(message);return true;}
  catch(e){setError(e instanceof Error?e.message:"تعذّر الحفظ");return false;}
  finally{setBusy(false);}
 }
 async function addIngredient(e:FormEvent){e.preventDefault();if(!selected)return;
  if(await run(async()=>browserSupabase().from("catalog_product_ingredients").insert({business_id:businessId,product_id:selected,name_ar:nameAr.trim(),name_tr:nameTr.trim(),name_en:nameEn.trim()||null,is_optional:optional}),"تم حفظ مكوّن المنتج")){setNameAr("");setNameTr("");setNameEn("");setOptional(false);}
 }
 async function addGroup(e:FormEvent){e.preventDefault();if(!selected)return;
  if(min<0||max<1||min>max||max>20){setError("عدد الاختيارات غير صالح");return;}
  if(await run(async()=>browserSupabase().from("catalog_modifier_groups").insert({business_id:businessId,product_id:selected,name_ar:groupAr.trim(),name_tr:groupTr.trim(),name_en:groupEn.trim()||null,min_select:min,max_select:max}),"تم حفظ مجموعة الاختيارات")){setGroupAr("");setGroupTr("");setGroupEn("");setMin(0);setMax(1);}
 }
 async function addOption(e:FormEvent){e.preventDefault();if(!groups.some(g=>g.id===optionGroup))return;
  const n=Number(delta),minor=Math.round(n*factor);
  if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(minor)||minor>100000000000){setError("سعر الإضافة غير صالح");return;}
  if(await run(async()=>browserSupabase().from("catalog_modifier_options").insert({business_id:businessId,group_id:optionGroup,name_ar:optionAr.trim(),name_tr:optionTr.trim(),name_en:optionEn.trim()||null,price_delta_minor:minor}),"تم حفظ الخيار")){setOptionAr("");setOptionTr("");setOptionEn("");setDelta("0");}
 }
 if(!products.length)return <section style={box}><h3>تفاصيل المنتجات والإضافات</h3><p>أنشئ منتجاً مركزياً أولاً لإعداد مكوّناته وخياراته.</p></section>;
 return <section dir="rtl" style={{...box,marginTop:26}} aria-label="تفاصيل المنتج وتخصيصه">
  <h2>تفاصيل المنتج ومكوناته وإضافاته</h2>
  <p style={{fontSize:13,color:"#527073"}}>يُعرّف المتجر الرئيسي الخيارات مرة واحدة، وتظهر على قوائم الفروع المنشور فيها المنتج. يمكن حذف مكوّن اختياري أو اختيار إضافات برسوم محددة، ولا يتم إنشاء طلب من هذه الشاشة.</p>
  <label>اختر المنتج<select style={style} value={selected} onChange={e=>{setProductId(e.target.value);setError("");}}>{products.map(p=><option key={p.id} value={p.id}>{p.name_ar}</option>)}</select></label>
  {error?<p role="alert" style={{color:"#ac2222"}}>{error}</p>:null}{notice?<p role="status" style={{color:"#12694a"}}>{notice}</p>:null}
  <div style={box}><h3>المكونات الأساسية</h3>
    <form onSubmit={addIngredient} style={{display:"grid",gap:9}}>
      <input style={style} aria-label="اسم المكوّن بالعربية" placeholder="مثال: قهوة إسبريسو، خبز، جبنة" required maxLength={120} value={nameAr} onChange={e=>setNameAr(e.target.value)}/>
      <input style={style} aria-label="اسم المكوّن بالتركية" placeholder="Türkçe malzeme" required maxLength={120} value={nameTr} onChange={e=>setNameTr(e.target.value)}/>
      <input style={style} aria-label="English ingredient (optional)" placeholder="English ingredient name" maxLength={120} value={nameEn} onChange={e=>setNameEn(e.target.value)}/>
      <label><input type="checkbox" checked={optional} onChange={e=>setOptional(e.target.checked)}/> يمكن طلب إزالته (مثلاً بدون بصل)</label>
      <button style={button} disabled={busy}>إضافة المكوّن</button>
    </form>
    {ingredients.map(i=><p key={i.id}>{i.name_ar} · {i.name_tr} {i.is_optional?"· يمكن إزالته":""}</p>)}
  </div>
  <div style={box}><h3>مجموعات الاختيارات</h3>
    <p style={{fontSize:12}}>مثال: مستوى السكر (اختيار واحد)، إضافات السندويش (حتى 3)، نوع الحليب (اختيار واحد مطلوب).</p>
    <form onSubmit={addGroup} style={{display:"grid",gap:9}}>
      <input style={style} placeholder="اسم المجموعة بالعربية" aria-label="اسم المجموعة بالعربية" required maxLength={120} value={groupAr} onChange={e=>setGroupAr(e.target.value)}/>
      <input style={style} placeholder="Türkçe seçenek grubu" aria-label="اسم المجموعة بالتركية" required maxLength={120} value={groupTr} onChange={e=>setGroupTr(e.target.value)}/>
      <input style={style} aria-label="English modifier group (optional)" placeholder="English group name" maxLength={120} value={groupEn} onChange={e=>setGroupEn(e.target.value)}/>
      <label>الحد الأدنى للاختيارات <input style={style} type="number" min={0} max={20} value={min} onChange={e=>setMin(Number(e.target.value))}/></label>
      <label>الحد الأعلى للاختيارات <input style={style} type="number" min={1} max={20} value={max} onChange={e=>setMax(Number(e.target.value))}/></label>
      <button disabled={busy} style={button}>إنشاء المجموعة</button>
    </form>
    {groups.length===0?<p className="beger-options-hint">ما في مجموعات بعد. أنشئ مجموعة مثل «نوع الحليب» أو «درجة السكر» ثم أضف الخيارات الخاصة فيها.</p>:<div className="beger-hq-option-groups">{groups.map((g,index)=><article className="beger-hq-option-group" key={g.id}>
  <div className="beger-hq-option-group-header"><span className="beger-hq-step">{index+1}</span><div><h4>{g.name_ar}</h4><small>{g.name_tr}</small></div><span className={g.min_select>0?"beger-hq-required":"beger-hq-optional"}>{g.min_select>0?"مطلوب":"اختياري"} · {g.min_select}–{g.max_select}</span></div>
  <div className="beger-hq-option-list">{options.filter(o=>o.group_id===g.id).map(o=><div className="beger-hq-option-row" key={o.id}><div><strong>{o.name_ar}</strong><small>{o.name_tr}</small></div><span>{Number(o.price_delta_minor)>0?"+":""}{(Number(o.price_delta_minor)/factor).toFixed(factor===100?2:0)} {currency}</span></div>)}
  {!options.some(o=>o.group_id===g.id)?<p className="beger-options-hint">هذه المجموعة بدون خيارات. أضف خياراتها من النموذج التالي قبل نشر المنتج.</p>:null}</div>
  <button className="beger-hq-add-to-group" type="button" onClick={()=>{setOptionGroup(g.id);document.getElementById("beger-add-modifier-option")?.scrollIntoView({behavior:"smooth",block:"center"});}}>+ إضافة خيار إلى {g.name_ar}</button>
 </article>)}</div>}
  </div>
  <div id="beger-add-modifier-option" style={box}><h3>إضافة خيار داخل مجموعة</h3>
    <form onSubmit={addOption} style={{display:"grid",gap:9}}>
      <select style={style} required aria-label="مجموعة الخيار" value={optionGroup} onChange={e=>setOptionGroup(e.target.value)}><option value="">اختر المجموعة</option>{groups.filter(g=>g.active).map(g=><option key={g.id} value={g.id}>{g.name_ar}</option>)}</select>
      <input style={style} required maxLength={120} placeholder="مثال: سكر زيادة، شوكولا، جبنة إضافية" aria-label="اسم الخيار بالعربية" value={optionAr} onChange={e=>setOptionAr(e.target.value)}/>
      <input style={style} required maxLength={120} placeholder="Türkçe seçenek" aria-label="اسم الخيار بالتركية" value={optionTr} onChange={e=>setOptionTr(e.target.value)}/>
      <input style={style} aria-label="English option name (optional)" placeholder="English option name" maxLength={120} value={optionEn} onChange={e=>setOptionEn(e.target.value)}/>
      <label>سعر الإضافة ({currency}) <input style={style} type="number" min="0" step={factor===100?"0.01":"1"} value={delta} onChange={e=>setDelta(e.target.value)} required/></label>
      <button disabled={busy||!groups.length} style={button}>إضافة الخيار</button>
    </form>
    <p className="beger-options-hint">تظهر الخيارات في المجموعة التابعة لها أعلاه، مع السعر والإلزامية والحد الأقصى.</p>
  </div>
 </section>;
}
