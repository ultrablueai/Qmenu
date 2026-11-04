import PublicPagerBoard from "./public-board";
export default async function PublicPagerDisplayPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))
  return <main dir="rtl" lang="ar" style={{padding:30,textAlign:"center"}}>رابط شاشة النداء غير صالح.</main>;
 return <PublicPagerBoard token={token}/>;
}
