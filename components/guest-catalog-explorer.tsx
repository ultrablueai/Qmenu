"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {GuestLang} from "../lib/g2-public";
import GuestIcon from "./guest-icons";

type Category={id:string;name:string;icon:"coffee"|"sandwich"|"dessert"|"more";count:number};
export default function GuestCatalogExplorer({categories,lang,children,initialCategoryId}:{categories:Category[];lang:GuestLang;children:ReactNode;initialCategoryId?:string}){
 const [selected,setSelected]=useState(initialCategoryId??categories.find(c=>c.count>0)?.id??categories[0]?.id??""),[query,setQuery]=useState("");
 const [found,setFound]=useState(true);
 const sectionsRef=useRef<HTMLDivElement>(null);
 const labels=lang==="ar"?{search:"ابحث عن قهوة أو منتج",empty:"لا توجد منتجات مطابقة",hint:"اختر التصنيف المناسب لاستعراض المنتجات"}:lang==="tr"?{search:"Kahve veya ürün ara",empty:"Eşleşen ürün bulunamadı",hint:"Ürünleri görmek için kategori seçin"}:{search:"Search menu products",empty:"No matching products",hint:"Choose a category to browse products"};
 useEffect(()=>{
  const root=sectionsRef.current;if(!root)return;
  const sections=[...root.querySelectorAll<HTMLElement>(".beger-menu-section")];
  let visible=0;
  const normalized=query.trim().toLocaleLowerCase();
  for(const section of sections){
   const inCategory=Boolean(normalized)||section.dataset.categoryId===selected;
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
 return <div className="beger-catalog-browser" aria-label={lang==="ar"?"استعراض منتجات المنيو":lang==="tr"?"Menü ürünleri":"Browse menu products"}>
  <div className="beger-menu-search"><span aria-hidden="true"><GuestIcon name="search" size={21}/></span><input type="search" autoComplete="off" aria-label={labels.search} placeholder={labels.search} value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <div className="beger-category-scroller" role="group" aria-label={labels.hint}>
   {categories.map(category=><button key={category.id} type="button" className="beger-category-filter" aria-pressed={selected===category.id} onClick={()=>{setSelected(category.id);setQuery("");}}><span aria-hidden="true"><GuestIcon name={category.icon} size={23}/></span><strong>{category.name}</strong></button>)}
  </div>
  <p className="beger-category-hint">{query.trim()?labels.search:labels.hint}</p>
  <div ref={sectionsRef} className="beger-category-results">{children}</div>
  {!found?<p role="status" className="beger-catalog-empty">{labels.empty}</p>:null}
 </div>;
}
