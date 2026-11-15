/**
 * Beger cross-sector service lifecycle vocabulary.
 * This is a pure domain layer, NOT a database authority, payment confirmation,
 * scheduling implementation, or active-subscription entitlement.
 *
 * A queue ticket, an appointment, and a food order have distinct lifecycles.
 * The public pager consumes a projection from their events; it must never infer
 * access to medical data or permit status changes based on a display number.
 */
export type ServiceJourney="table_order"|"counter_order"|"scheduled_pickup"|"walk_in"|"appointment"|"clinic_checkin";
export type OrderStatus="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
export type QueueStatus="waiting"|"called"|"serving"|"completed"|"missed"|"cancelled";
export type AppointmentStatus="requested"|"confirmed"|"checked_in"|"in_service"|"completed"|"cancelled"|"no_show";
export type PublicServiceSignal="received"|"waiting"|"scheduled"|"in_progress"|"called"|"ready"|"completed"|"cancelled"|"none";

export type WorkflowDefinition<T extends string> = {
 journey:ServiceJourney;
 label:string;
 kind:"order"|"queue"|"appointment";
 initial:T;
 transitions:Readonly<Record<T,readonly T[]>>;
 publicSignal:Readonly<Record<T,PublicServiceSignal>>;
};
const orderTransitions={
 pending:["accepted","rejected"],
 accepted:["preparing","rejected"],
 preparing:["ready"],
 ready:["fulfilled"],
 fulfilled:[],
 rejected:[]
} as const satisfies Record<OrderStatus,readonly OrderStatus[]>;
const orderSignals={
 pending:"received",accepted:"waiting",preparing:"in_progress",ready:"ready",fulfilled:"completed",rejected:"cancelled"
} as const satisfies Record<OrderStatus,PublicServiceSignal>;
const queueTransitions={
 waiting:["called","cancelled"],
 called:["serving","missed","cancelled"],
 serving:["completed"],
 completed:[],missed:["waiting","cancelled"],cancelled:[]
} as const satisfies Record<QueueStatus,readonly QueueStatus[]>;
const queueSignals={
 waiting:"waiting",called:"called",serving:"in_progress",completed:"completed",missed:"waiting",cancelled:"cancelled"
} as const satisfies Record<QueueStatus,PublicServiceSignal>;
const appointmentTransitions={
 requested:["confirmed","cancelled"],
 confirmed:["checked_in","cancelled","no_show"],
 checked_in:["in_service","cancelled"],
 in_service:["completed"],
 completed:[],cancelled:[],no_show:[]
} as const satisfies Record<AppointmentStatus,readonly AppointmentStatus[]>;
const appointmentSignals={
 requested:"received",confirmed:"scheduled",checked_in:"waiting",in_service:"in_progress",completed:"completed",cancelled:"cancelled",no_show:"cancelled"
} as const satisfies Record<AppointmentStatus,PublicServiceSignal>;
const order:Omit<WorkflowDefinition<OrderStatus>,"journey"|"label">={
 kind:"order",initial:"pending",transitions:orderTransitions,publicSignal:orderSignals
};
const queue:Omit<WorkflowDefinition<QueueStatus>,"journey"|"label">={
 kind:"queue",initial:"waiting",transitions:queueTransitions,publicSignal:queueSignals
};
const appointment:Omit<WorkflowDefinition<AppointmentStatus>,"journey"|"label">={
 kind:"appointment",initial:"requested",transitions:appointmentTransitions,publicSignal:appointmentSignals
};
export const serviceWorkflows={
 table_order:{...order,journey:"table_order",label:"طلب طاولة"},
 counter_order:{...order,journey:"counter_order",label:"طلب كاشير"},
 scheduled_pickup:{...order,journey:"scheduled_pickup",label:"طلب مسبق للاستلام"},
 walk_in:{...queue,journey:"walk_in",label:"دور انتظار"},
 appointment:{...appointment,journey:"appointment",label:"حجز موعد"},
 clinic_checkin:{...queue,journey:"clinic_checkin",label:"دور مراجعة"}
} as const;
export function canTransition(journey:ServiceJourney,current:string,next:string):boolean{
 const workflow=serviceWorkflows[journey] as {transitions:Record<string,readonly string[]>};
 return (workflow.transitions[current]??[]).includes(next);
}
export function publicServiceSignal(journey:ServiceJourney,status:string):PublicServiceSignal{
 const workflow=serviceWorkflows[journey] as {publicSignal:Record<string,PublicServiceSignal>};
 return workflow.publicSignal[status]??"none";
}
export function isTerminalStatus(journey:ServiceJourney,status:string):boolean{
 const workflow=serviceWorkflows[journey] as {transitions:Record<string,readonly string[]>};
 return Object.hasOwn(workflow.transitions,status)&&workflow.transitions[status].length===0;
}
export function isGuestVisibleSignal(signal:PublicServiceSignal):boolean{
 return signal!=="none";
}
export const publicSignalLabels:Record<PublicServiceSignal,{ar:string;tr:string;en:string}>={
 received:{ar:"تم استلام الطلب",tr:"Talep alındı",en:"Request received"},
 waiting:{ar:"بانتظار الدور",tr:"Sırada bekliyor",en:"Waiting"},
 scheduled:{ar:"الموعد مؤكد",tr:"Randevu onaylandı",en:"Appointment confirmed"},
 in_progress:{ar:"جارٍ تقديم الخدمة",tr:"İşlem devam ediyor",en:"In progress"},
 called:{ar:"حان دورك",tr:"Sıra sizde",en:"It's your turn"},
 ready:{ar:"جاهز للاستلام",tr:"Teslim almaya hazır",en:"Ready for pickup"},
 completed:{ar:"تمت الخدمة",tr:"Tamamlandı",en:"Completed"},
 cancelled:{ar:"أُلغي الطلب أو الدور",tr:"İptal edildi",en:"Cancelled"},
 none:{ar:"الحالة غير متاحة",tr:"Durum kullanılamıyor",en:"Status unavailable"}
};
