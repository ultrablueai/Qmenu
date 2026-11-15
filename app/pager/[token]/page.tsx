import PagerCustomer from "./pager-customer";
export default async function StandalonePagerPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))
  return <main style={{padding:32,textAlign:"center"}} lang="ar" dir="rtl">رابط النداء غير صالح.</main>;
 return <PagerCustomer token={token}/>;
}
