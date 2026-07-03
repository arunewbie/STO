export type Role = 'ADMIN' | 'OPERATOR' | 'LEADER';
export type Status = 'DRAFT' | 'COUNTED' | 'CHECKED' | 'CLOSED';
export type ViewMode = 'INPUT' | 'FULL';

export type User = { id:string; username:string; password:string; fullName:string; role:Role; defaultArea:string; signatureName?:string; active:boolean };
export type Part = { partNo:string; fiiId:string; partName:string; qtyPerBox:number; area:string; rackNo:string; dept:string; active:boolean };
export type Tag = { tagNo:string; area:string; description:string; active:boolean };
export type TagDetail = { id:string; tagNo:string; partNo:string; sequenceNo:number; active:boolean };
export type StoDetail = { id:string; partNo:string; fiiId:string; partName:string; qtyPerBox:number; boxQty:number; fractionQty:number; grandTotal:number; calculationNote:string; leaderCheckStatus:boolean; leaderCheckedBy?:string; leaderCheckedAt?:string };
export type StoHeader = { stoId:string; stoNo:string; stoDate:string; area:string; tagNo:string; creatorUserId:string; creatorName:string; startTime:string; endTime?:string; durationHour?:number; status:Status; creatorSignedAt?:string; leaderUserId?:string; leaderName?:string; leaderSignedAt?:string; details:StoDetail[] };
