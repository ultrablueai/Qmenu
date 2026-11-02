/** Beger model catalog: business sector selects the workspace, subscription selects its enabled capabilities.
 * These definitions are product contracts, not paid entitlements or statements that all modules are shipped.
 * Server-side subscription entitlements MUST be checked when a feature is implemented.
 */
export type BusinessSector="cafe"|"restaurant"|"bakery"|"barber"|"salon"|"clinic"|"retail";
export type Capability="qr_catalog"|"table_orders"|"counter_queue"|"kitchen_board"|"scheduled_pickup"|"appointments"|"walkin_queue"|"digital_pager"|"customer_loyalty"|"analytics";
export type CapabilityAvailability="pilot"|"planned";
export type SectorDefinition={id:BusinessSector;name:string;description:string;defaultCapabilities:Capability[];availableCapabilities:Capability[]};
export const capabilities:Record<Capability,{name:string;availability:CapabilityAvailability;description:string}>={
 qr_catalog:{name:"قائمة رقمية ورمز QR",availability:"pilot",description:"عرض المنتجات أو الخدمات بحسب نوع النشاط"},
 table_orders:{name:"طلب مباشر من الطاولة",availability:"pilot",description:"طلب مستقل لكل زبون وموافقة موظف"},
 counter_queue:{name:"دور الكاشير والاستلام",availability:"planned",description:"تسجيل زبون الكاونتر وربط دوره بالطلب"},
 kitchen_board:{name:"لوحة المطبخ والتحضير",availability:"pilot",description:"انتقال الطلب من القبول للتحضير والجاهزية"},
 scheduled_pickup:{name:"طلب مسبق بموعد استلام",availability:"planned",description:"حجز فترة استلام محسوبة وفق قدرة العمل"},
 appointments:{name:"حجز المواعيد",availability:"planned",description:"اختيار الخدمة والموظف والوقت المتاح"},
 walkin_queue:{name:"الطابور الفوري",availability:"planned",description:"أخذ دور ومتابعة وقت الانتظار"},
 digital_pager:{name:"البيجر والإشعارات",availability:"pilot",description:"متابعة جاهزية الطلب داخل الصفحة؛ Push عند إغلاقها غير جاهز"},
 customer_loyalty:{name:"العملاء والمكافآت",availability:"planned",description:"برنامج اختياري محصور ببيانات المتجر"},
 analytics:{name:"الإحصائيات التشغيلية",availability:"planned",description:"أرقام تشغيل حقيقية حسب الوحدات المستخدمة"}
};
export const sectors:SectorDefinition[]=[
 {id:"cafe",name:"مقهى / كوفي",description:"منيو، طاولات، طلبات كاونتر وتجهيز المشروبات",defaultCapabilities:["qr_catalog","table_orders","kitchen_board","digital_pager"],availableCapabilities:["qr_catalog","table_orders","counter_queue","kitchen_board","scheduled_pickup","digital_pager","customer_loyalty","analytics"]},
 {id:"restaurant",name:"مطعم",description:"منيو، طاولات، مطبخ، طلب سفري وجدولة الاستلام",defaultCapabilities:["qr_catalog","table_orders","kitchen_board","digital_pager"],availableCapabilities:["qr_catalog","table_orders","counter_queue","kitchen_board","scheduled_pickup","digital_pager","customer_loyalty","analytics"]},
 {id:"bakery",name:"فرن / معجنات",description:"قائمة منتجات وتجهيز واستلام بوقت محدد",defaultCapabilities:["qr_catalog","scheduled_pickup","digital_pager"],availableCapabilities:["qr_catalog","counter_queue","kitchen_board","scheduled_pickup","digital_pager","customer_loyalty","analytics"]},
 {id:"barber",name:"حلاقة رجالية",description:"خدمات ومواعيد ونداء الدور واختيار الحلاق",defaultCapabilities:["qr_catalog","appointments","walkin_queue","digital_pager"],availableCapabilities:["qr_catalog","appointments","walkin_queue","digital_pager","customer_loyalty","analytics"]},
 {id:"salon",name:"صالون تجميل",description:"خدمات ومواعيد ومختصون وأدوار انتظار",defaultCapabilities:["qr_catalog","appointments","walkin_queue","digital_pager"],availableCapabilities:["qr_catalog","appointments","walkin_queue","digital_pager","customer_loyalty","analytics"]},
 {id:"clinic",name:"عيادة / مركز طبي",description:"حجز ومراجعين وطابور بخصوصية أعلى، دون معلومات طبية على الشاشة العامة",defaultCapabilities:["appointments","walkin_queue","digital_pager"],availableCapabilities:["appointments","walkin_queue","digital_pager","analytics"]},
 {id:"retail",name:"متجر / محل",description:"كتالوج وخدمة كاونتر وتجهيز للاستلام",defaultCapabilities:["qr_catalog","counter_queue","digital_pager"],availableCapabilities:["qr_catalog","counter_queue","scheduled_pickup","digital_pager","customer_loyalty","analytics"]}
];
export function sectorById(id:BusinessSector){return sectors.find(s=>s.id===id)??sectors[0]}
export function sanitizeCapabilities(sector:BusinessSector,requested:readonly string[]):Capability[]{
 const available=new Set(sectorById(sector).availableCapabilities);
 return [...new Set(requested)].filter((id):id is Capability=>available.has(id as Capability));
}
export function previewPlan(sector:BusinessSector,selected:readonly string[]){
 const enabled=sanitizeCapabilities(sector,selected);
 return {sector,enabled,pilot:enabled.filter(id=>capabilities[id].availability==="pilot"),planned:enabled.filter(id=>capabilities[id].availability==="planned"),priceMinor:null,paymentActive:false} as const;
}
