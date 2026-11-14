import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^salon-[a-f0-9]{24}$/.test(slug))return new Response("Not found",{status:404});
 return NextResponse.json({
  name:"Beger Salon — حجوزاتي",short_name:"Beger",
  start_url:"/salon/book/"+slug,scope:"/salon/book/",
  display:"standalone",background_color:"#f6faf7",theme_color:"#1c6548",
  description:"تابع حجز الصالون وعروض المواعيد الأبكر"
 },{headers:{"Content-Type":"application/manifest+json","Cache-Control":"private, no-store"}});
}
