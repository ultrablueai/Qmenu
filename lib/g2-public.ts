import { createClient } from "@supabase/supabase-js";

export type GuestLang = "ar"|"tr"|"en";
export type GuestTheme = "luxe_dark"|"clean_light"|"bold_commerce";
export type GuestAppearance = {theme:GuestTheme;default_lang:GuestLang;enabled_languages:GuestLang[]};
export type G2Item = { id:string; name_ar:string; name_tr:string; name_en?:string; description_ar:string; description_tr:string; description_en?:string; price_minor:number; image_url:string|null };
export type G2Category = { id:string; name_ar:string; name_tr:string; name_en?:string; items:G2Item[] };
export type G2Branch = { branch_id:string; branch_name:string; business_name:string; country_code:string };

export function anonymousBeger() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url||!key) throw new Error("Staging public configuration unavailable");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function safeLanguage(lang:string|undefined,appearance?:GuestAppearance):GuestLang {
 const enabled=appearance?.enabled_languages?.length?appearance.enabled_languages:["ar","tr","en"] as GuestLang[];
 return (lang==="ar"||lang==="tr"||lang==="en")&&enabled.includes(lang)?lang:(appearance?.default_lang&&enabled.includes(appearance.default_lang)?appearance.default_lang:enabled[0]);
}
export function localizedText(obj:{name_ar:string;name_tr:string;name_en?:string},lang:GuestLang):string{
 return (lang==="en"?obj.name_en:lang==="tr"?obj.name_tr:obj.name_ar)?.trim()||obj.name_ar||obj.name_tr;
}
export async function loadGuestAppearance(branchId:string):Promise<GuestAppearance>{
 const {data,error}=await anonymousBeger().rpc("public_business_menu_appearance",{p_branch:branchId});
 if(error)throw new Error("Public menu appearance unavailable");
 const validThemes:GuestTheme[]=["luxe_dark","clean_light","bold_commerce"];
 const validLangs:GuestLang[]=["ar","tr","en"];
 const langs=Array.isArray(data?.enabled_languages)?validLangs.filter(l=>data.enabled_languages.includes(l)):validLangs;
 const enabled=langs.length?langs:validLangs;
 const def=validLangs.includes(data?.default_lang)?data.default_lang as GuestLang:"ar";
 return {theme:validThemes.includes(data?.theme)?data.theme as GuestTheme:"clean_light",default_lang:enabled.includes(def)?def:enabled[0],enabled_languages:enabled};
}
export function formatPrice(value:number,country:string,lang:GuestLang) {
  const currency=country==="TR"?"TRY":country==="SY"?"SYP":null;
  if (!currency) return String(value);
  const factor=currency==="TRY"?100:1;
  return new Intl.NumberFormat(lang==="tr"?"tr-TR":lang==="en"?"en-US":"ar",{style:"currency",currency,maximumFractionDigits:currency==="TRY"?2:0,minimumFractionDigits:currency==="TRY"?2:0}).format(value/factor);
}
export async function loadPublicMenu(branchId:string) {
  const {data,error}=await anonymousBeger().rpc("public_branch_menu",{p_branch:branchId});
  if(error) throw new Error("Public menu unavailable");
  return Array.isArray(data)?data as G2Category[]:[];
}
