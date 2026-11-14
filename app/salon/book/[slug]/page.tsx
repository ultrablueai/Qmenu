import PublicSalonBooking from "./public-salon-booking";
export const dynamic="force-dynamic";
export const metadata={title:"Beger Salon | حجز موعد",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PublicSalonBooking slug={slug}/>;}
