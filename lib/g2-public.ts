import { createClient } from "@supabase/supabase-js";

export type G2Item = { id:string; name_ar:string; name_tr:string; description_ar:string; description_tr:string; price_minor:number; image_url:string|null };
export type G2Category = { id:string; name_ar:string; name_tr:string; items:G2Item[] };
export type G2Branch = { branch_id:string; branch_name:string; business_name:string; country_code:string };

export function anonymousBeger() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url||!key) throw new Error("Staging public configuration unavailable");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function safeLanguage(lang:string|undefined){return lang==="tr"?"tr":"ar";}
export function formatPrice(value:number,country:string,lang:"ar"|"tr") {
  const currency=country==="TR"?"TRY":country==="SY"?"SYP":null;
  if (!currency) return String(value);
  const factor=currency==="TRY"?100:1;
  return new Intl.NumberFormat(lang==="tr"?"tr-TR":"ar",{style:"currency",currency,maximumFractionDigits:currency==="TRY"?2:0,minimumFractionDigits:currency==="TRY"?2:0}).format(value/factor);
}
export async function loadPublicMenu(branchId:string) {
  const {data,error}=await anonymousBeger().rpc("public_branch_menu",{p_branch:branchId});
  if(error) throw new Error("Public menu unavailable");
  return Array.isArray(data)?data as G2Category[]:[];
}
