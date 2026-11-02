"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {GuestLang} from "../lib/g2-public";
import GuestIcon from "./guest-icons";

type Category={id:string;name:string;icon:"coffee"|"sandwich"|"dessert"|"more";count:number};
export default function GuestCatalogExplorer({categories,lang,children}:{categories:Category[];lang:GuestLang;children:ReactNode}){
 const [selected,setSelected]=useState("all"),[query,setQuery]=useState("");
 const [found,setFound]=useState(true);
 const sectionsRef=useRef<HTMLDivElement>(null);
 const labels=lang==="ar"?{all:"الكل",search:"ابحث عن قهوة أو منتج",empty:"لا توجد منتجات مطابقة",count:"منتج",hint:"اختر تصنيفاً لتظهر منتجاته فقط"}:lang==="tr"?{all:"Tümü",search:"Kahve veya ürün ara",empty:"Eşleşen ürün bulunamadı",count:"ürün",hint:"Yalnızca ürünlerini görmek için bir kategori seçin"}:{all:"All",search:"Search menu products",empty:"No matching products",count:"items",hint:"Select a category to see only its products"};
 useEffect(()=>{
  const root=sectionsRef.current;if(!root)return;
  const sections=[...root.querySelectorAll<HTMLElement>(".beger-menu-section")];
  let visible=0;
  const normalized=query.trim().toLocaleLowerCase();
  for(const section of sections){
   const inCategory=selected==="all"||section.dataset.categoryId===selected;
   let sectionProducts=0;
   for(const product of section.querySelectorAll<HTMLElement>(".beger-guest-product")){
    const matched=!normalized||(product.dataset.searchText||product.textContent||"").toLocaleLowerCase().includes(normalized);
    product.hidden=!inCategory||!matched;
    if(inCategory&&matched)sectionProducts++;
   }
   section.hidden=!inCategory||sectionProducts===0;
   visible+=sectionProducts;
  }
  setFound(visible>0||categories.length===0);
 },[selected,query,categories.length]);
 const total=categories.reduce((sum,c)=>sum+c.count,0);
 return <div className="beger-catalog-browser" aria-label={lang==="ar"?"استعراض منتجات المنيو":lang==="tr"?"Menü ürünleri":"Browse menu products"}>
  <div className="beger-menu-search"><span aria-hidden="true"><GuestIcon name="search" size={21}/></span><input type="search" autoComplete="off" aria-label={labels.search} placeholder={labels.search} value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <div className="beger-category-scroller" role="group" aria-label={labels.hint}>
   <button type="button" className="beger-category-filter" aria-pressed={selected==="all"} onClick={()=>setSelected("all")}><span aria-hidden="true"><GuestIcon name="more" size={23}/></span><strong>{labels.all}</strong><small>{total} {labels.count}</small></button>
   {categories.map(category=><button key={category.id} type="button" className="beger-category-filter" aria-pressed={selected===category.id} onClick={()=>setSelected(category.id)}><span aria-hidden="true"><GuestIcon name={category.icon} size={23}/></span><strong>{category.name}</strong><small>{category.count} {labels.count}</small></button>)}
  </div>
  <p className="beger-category-hint">{query.trim()?labels.search:labels.hint}</p>
  <div ref={sectionsRef} className="beger-category-results">{children}</div>
  {!found?<p role="status" className="beger-catalog-empty">{labels.empty}</p>:null}
 </div>;
}
