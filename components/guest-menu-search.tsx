"use client";
import {useEffect,useState} from "react";
import type {GuestLang} from "../lib/g2-public";
import GuestIcon from "./guest-icons";
export default function GuestMenuSearch({lang}:{lang:GuestLang}){
 const [term,setTerm]=useState("");
 const [found,setFound]=useState(true);
 useEffect(()=>{
  const normalized=term.trim().toLocaleLowerCase();
  const cards=[...document.querySelectorAll<HTMLElement>(".beger-menu-section .beger-guest-product")];
  let visible=0;
  for(const card of cards){const match=!normalized||((card.dataset.searchText||card.textContent||"").toLocaleLowerCase().includes(normalized));card.hidden=!match;if(match)visible++;}
  const sections=[...document.querySelectorAll<HTMLElement>(".beger-menu-section")];
  for(const section of sections){section.hidden=normalized.length>0&&!section.querySelector(".beger-guest-product:not([hidden])");}
  setFound(visible>0||!normalized);
  return ()=>{for(const card of cards)card.hidden=false;for(const section of sections)section.hidden=false;};
 },[term]);
 const hint=lang==="ar"?"ابحث عن قهوة أو منتج":lang==="tr"?"Ürün veya kahve ara":"Search coffee, sandwiches...";
 return <div className="beger-menu-search">
  <span aria-hidden="true"><GuestIcon name="search" size={21}/></span>
  <input type="search" autoComplete="off" aria-label={hint} placeholder={hint} value={term} onChange={e=>setTerm(e.target.value)} />
  {!found?<small role="status">{lang==="ar"?"ما لقينا نتائج":lang==="tr"?"Sonuç bulunamadı":"No results found"}</small>:null}
 </div>;
}
