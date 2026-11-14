export type StaffProfile={name:string;chair:string;model:"commission"|"chair_rent"|"salary_plus_commission"|"owner";percent:number;rent:number;rentPeriod:"day"|"week"|"month";open:string;close:string;pauseStart:string;pauseEnd:string;takingBookings:boolean;serviceIds:string[]};
export type SalonStaffRecord={barberId:string;state:string;paid:boolean;serviceIds:string[]};
export type StaffLedger={bookings:number;pending:number;completed:number;paidBookings:number;serviceCount:number;serviceRevenue:number;barberShare:number;shopShare:number;chairRent:number;model:StaffProfile["model"];percent:number};
export const staffProfiles:Record<string,StaffProfile>;
export function staffBusinessSummary(bookings:SalonStaffRecord[],profiles?:Record<string,StaffProfile>):{details:Record<string,StaffLedger>;totals:{bookings:number;pending:number;completed:number;serviceRevenue:number;barberShare:number;shopShare:number}};
export function canStaffOffer(profiles:Record<string,StaffProfile>,staffId:string,serviceIds:string[]):boolean;
