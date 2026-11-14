import PublicSalonBooking from "./public-salon-booking";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return {title:"Beger Salon | حجز موعد",robots:{index:false,follow:false},
  manifest:/^salon-[a-f0-9]{24}$/.test(slug)?"/salon/book/"+slug+"/manifest.webmanifest":undefined,
  appleWebApp:{capable:true,title:"Beger Salon",statusBarStyle:"default" as const}};
}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;return <PublicSalonBooking slug={slug}/>;
}
