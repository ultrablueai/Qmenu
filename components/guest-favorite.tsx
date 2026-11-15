"use client";
import {useState} from "react";
import type {GuestLang} from "../lib/g2-public";
export default function GuestFavorite({lang}:{lang:GuestLang}){
 const [saved,setSaved]=useState(false);
 const text=lang==="ar"?(saved?"إزالة من المفضلة":"أضف للمفضلة"):lang==="tr"?(saved?"Favorilerden çıkar":"Favorilere ekle"):(saved?"Remove favorite":"Add favorite");
 return <button className="beger-favorite-button" type="button" aria-pressed={saved} aria-label={text} onClick={()=>setSaved(v=>!v)} title={text}>{saved?"♥":"♡"}</button>;
}
