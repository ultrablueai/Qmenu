"use client";
import {createContext,useContext,useState,type ReactNode} from "react";
import type {GuestLang} from "../lib/g2-public";
import {useGuestCart} from "./guest-cart";

type Stage="welcome"|"menu";
type Journey={stage:Stage;go:(next:Stage)=>void};
const ScreenContext=createContext<Journey|null>(null);

export default function GuestScreenSwitcher({lang,children}:{lang:GuestLang;children:ReactNode}){
 const [stage,setStage]=useState<Stage>("welcome");
 function go(next:Stage){setStage(next);window.scrollTo({top:0,behavior:"instant"});}
 return <ScreenContext.Provider value={{stage,go}}>
  <div className="beger-screen-switcher" data-stage={stage}>{children}
   <GuestBottomNavigation lang={lang}/>
  </div>
 </ScreenContext.Provider>;
}

export function GuestOpenMenu({lang}:{lang:GuestLang}){
 const journey=useContext(ScreenContext);
 return <button className="beger-welcome-cta" type="button" onClick={()=>journey?.go("menu")}>
  <span aria-hidden="true">▦</span>
  <span>{lang==="ar"?"افتح القائمة":lang==="tr"?"Menüyü Aç":"Open Menu"}</span>
  <span aria-hidden="true">→</span>
 </button>;
}

function GuestBottomNavigation({lang}:{lang:GuestLang}){
 const journey=useContext(ScreenContext);
 const basket=useGuestCart();
 const labels=lang==="ar"?["الرئيسية","القائمة","السلة","المكافآت قريباً"]:lang==="tr"?["Ana Sayfa","Menü","Sepet","Ödüller yakında"]:["Home","Menu","Basket","Rewards soon"];
 if(!journey)return null;
 return <nav className="beger-guest-bottom-nav" aria-label={lang==="ar"?"التنقل الرئيسي":lang==="tr"?"Ana gezinme":"Main navigation"}>
  <button type="button" aria-current={journey.stage==="welcome"?"page":undefined} onClick={()=>journey.go("welcome")}><span aria-hidden="true">⌂</span>{labels[0]}</button>
  <button type="button" aria-current={journey.stage==="menu"?"page":undefined} onClick={()=>journey.go("menu")}><span aria-hidden="true">♜</span>{labels[1]}</button>
  <button type="button" onClick={()=>basket?.open()} aria-label={labels[2]}><span aria-hidden="true">▢</span>{labels[2]}{basket?.count? <b className="beger-nav-count">{basket.count}</b>:null}</button>
  <span className="beger-guest-nav-future" aria-disabled="true"><span aria-hidden="true">☆</span>{labels[3]}</span>
 </nav>;
}
