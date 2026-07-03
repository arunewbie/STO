import { Part, Tag, TagDetail, User } from './types';

export const sampleUsers: User[] = [
  { id:'U001', username:'admin', password:'1234', fullName:'ADMIN STO', role:'ADMIN', defaultArea:'RM', signatureName:'ADMIN STO', active:true },
  { id:'U002', username:'agung', password:'1234', fullName:'AGUNG Y', role:'OPERATOR', defaultArea:'RM', signatureName:'AGUNG Y', active:true },
  { id:'U003', username:'leader', password:'1234', fullName:'UDEN', role:'LEADER', defaultArea:'RM', signatureName:'UDEN', active:true },
];

export const sampleParts: Part[] = [
  { fiiId:'1376', partNo:'74U50-FL617S', partName:'FLANGE, EGR', qtyPerBox:120, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1372', partNo:'74U00-BS710S', partName:'BOSS', qtyPerBox:150, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1377', partNo:'74U50-FLP02S', partName:'FLANGE NO.2', qtyPerBox:120, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1001', partNo:'42134-0W030', partName:'COVER S/A RR AXLE HOUSING', qtyPerBox:50, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1029', partNo:'77M10-CA506S-001', partName:'CASE BLANK', qtyPerBox:70, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1003', partNo:'42154-0W010', partName:'PLATE RR SPRING SEAT SUB', qtyPerBox:120, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1015', partNo:'67LA0-CA505S-001', partName:'CASE BLANK', qtyPerBox:20, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
  { fiiId:'1327', partNo:'18456-B0030', partName:'SEAL MONOLITHIC CATALYST', qtyPerBox:714, area:'RAK 1', rackNo:'RAK 1', dept:'PC', active:true },
];

export const sampleTags: Tag[] = [{ tagNo:'M001', area:'RM', description:'RAK 1', active:true }];
export const sampleTagDetails: TagDetail[] = sampleParts.map((p, i) => ({ id:`TD${i+1}`, tagNo:'M001', partNo:p.partNo, sequenceNo:i+1, active:true }));
