export type Station="merchant"|"cashier"|"kitchen";
export type OrderSnapshot={id:string;status:string;reference?:string;table?:string};
export type StationAlert={key:string;message:string;status:string;orderId:string;at:string};
export type StationMemory={seen:Record<string,string>;alerts:StationAlert[]};
const maxSeen=250;
const maxAlerts=30;
const allowed:Record<Station,Record<string,string>>={
 merchant:{pending:"طلب جديد ينتظر الموافقة"},
 cashier:{pending:"طلب جديد ينتظر قبول الكاشير",ready:"طلب جاهز للاستلام"},
 kitchen:{accepted:"طلب مقبول وصل إلى المطبخ"}
};
export function stationStorageKey(station:Station,branchId:string){
 return "beger-station-alerts-v1:"+station+":"+branchId;
}
export function parseStationMemory(input:unknown):StationMemory|null{
 if(!input||typeof input!=="object")return null;
 const data=input as Record<string,unknown>;
 if(!data.seen||typeof data.seen!=="object"||Array.isArray(data.seen)||!Array.isArray(data.alerts))return null;
 const seen:Record<string,string>={};
 for(const [k,v] of Object.entries(data.seen).slice(-maxSeen)){
  if(/^[0-9a-f-]{36}$/i.test(k)&&typeof v==="string")seen[k]=v.slice(0,40);
 }
 const alerts:StationAlert[]=[];
 for(const a of data.alerts.slice(-maxAlerts)){
  if(!a||typeof a!=="object")continue;
  const v=a as Partial<StationAlert>;
  if(typeof v.key==="string"&&typeof v.message==="string"&&typeof v.orderId==="string"&&typeof v.status==="string"&&typeof v.at==="string"){
   alerts.push({key:v.key.slice(0,90),message:v.message.slice(0,140),status:v.status.slice(0,40),orderId:v.orderId,at:v.at});
  }
 }
 return {seen,alerts};
}
export function reconcileStationMemory(
 previous:StationMemory|null,station:Station,snapshot:OrderSnapshot[],isoTime:string
):{next:StationMemory;newAlerts:StationAlert[]}{
 const seen={...(previous?.seen??{})};
 const emitted:StationAlert[]=[];
 for(const order of snapshot){
  if(!/^[0-9a-f-]{36}$/i.test(order.id))continue;
  const prior=seen[order.id];
  const label=allowed[station][order.status];
  // First visit initializes a baseline without sounding alarms for historical orders.
  // After navigating away/reloading the previous sessionStorage snapshot is restored.
  if(previous!==null&&label&&prior!==order.status){
   const key=order.id+":"+order.status;
   if(!previous.alerts.some(a=>a.key===key)){
    const reference=(order.reference??order.id.replace(/-/g,"").slice(0,10)).slice(0,20);
    emitted.push({key,message:label+" · #"+reference,status:order.status,orderId:order.id,at:isoTime});
   }
  }
  seen[order.id]=order.status;
 }
 const trimmedSeen=Object.fromEntries(Object.entries(seen).slice(-maxSeen));
 return {next:{seen:trimmedSeen,alerts:[...(previous?.alerts??[]),...emitted].slice(-maxAlerts)},newAlerts:emitted};
}
