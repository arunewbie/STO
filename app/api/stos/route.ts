import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

function toIso(v:any){
  if(!v) return undefined;
  try{
    return new Date(v).toISOString();
  }catch{
    return undefined;
  }
}

function rowToHeader(r:any, details:any[]){
  return {
    stoId: r.sto_id,
    stoNo: r.sto_no,
    stoDate: String(r.sto_date).slice(0,10),
    area: r.area || '',
    tagNo: r.tag_no || '',
    creatorUserId: r.creator_user_id || '',
    creatorName: r.creator_name || '',
    startTime: toIso(r.start_time),
    endTime: toIso(r.end_time),
    durationHour: Number(r.duration_hour || 0),
    status: r.status || 'COUNTED',
    creatorSignedAt: toIso(r.creator_signed_at),
    leaderUserId: r.leader_user_id || undefined,
    leaderName: r.leader_name || undefined,
    leaderSignedAt: toIso(r.leader_signed_at),
    revisionNote: r.revision_note || undefined,
    revisionBy: r.revision_by || undefined,
    revisionAt: toIso(r.revision_at),
    details
  };
}

function rowToDetail(r:any){
  return {
    id: r.id,
    partNo: r.part_no,
    fiiId: r.fii_id || '',
    partName: r.part_name || '',
    qtyPerBox: Number(r.qty_per_box || 0),
    boxQty: Number(r.box_qty || 0),
    fractionQty: Number(r.fraction_qty || 0),
    grandTotal: Number(r.grand_total || 0),
    calculationNote: r.calculation_note || '',
    leaderCheckStatus: r.leader_check_status === true,
    leaderCheckedBy: r.leader_checked_by || undefined,
    leaderCheckedAt: toIso(r.leader_checked_at),
    leaderNgNote: r.leader_ng_note || ''
  };
}

export async function GET() {
  try {
    const headers = await sql`
      SELECT *
      FROM sto_headers
      ORDER BY created_at DESC, sto_date DESC, tag_no
    `;

    const details = await sql`
      SELECT *
      FROM sto_details
      ORDER BY sto_id, sequence_no, id
    `;

    const detailMap = new Map<string, any[]>();

    details.forEach((d:any)=>{
      const arr = detailMap.get(d.sto_id) || [];
      arr.push(rowToDetail(d));
      detailMap.set(d.sto_id, arr);
    });

    const stos = headers.map((h:any)=>rowToHeader(h, detailMap.get(h.sto_id) || []));

    return NextResponse.json({
      ok:true,
      stos
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Load STO error' },
      { status:500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stos:any[] = body.stos || [];

    await sql`DELETE FROM sto_details`;
    await sql`DELETE FROM sto_headers`;

    for(const s of stos){
      const stoId = String(s.stoId || '');
      if(!stoId) continue;

      await sql`
        INSERT INTO sto_headers (
          sto_id,
          sto_no,
          sto_date,
          area,
          tag_no,
          creator_user_id,
          creator_name,
          start_time,
          end_time,
          duration_hour,
          status,
          creator_signed_at,
          leader_user_id,
          leader_name,
          leader_signed_at,
          revision_note,
          revision_by,
          revision_at,
          updated_at
        )
        VALUES (
          ${stoId},
          ${String(s.stoNo || '')},
          ${String(s.stoDate || new Date().toISOString().slice(0,10))},
          ${String(s.area || '')},
          ${String(s.tagNo || '')},
          ${String(s.creatorUserId || '')},
          ${String(s.creatorName || '')},
          ${s.startTime || null},
          ${s.endTime || null},
          ${Number(s.durationHour || 0)},
          ${String(s.status || 'COUNTED')},
          ${s.creatorSignedAt || null},
          ${s.leaderUserId || null},
          ${s.leaderName || null},
          ${s.leaderSignedAt || null},
          ${s.revisionNote || null},
          ${s.revisionBy || null},
          ${s.revisionAt || null},
          NOW()
        )
      `;

      const details:any[] = s.details || [];

      for(let i=0; i<details.length; i++){
        const d = details[i];
        const id = String(d.id || `${stoId}_D${i}`);

        await sql`
          INSERT INTO sto_details (
            id,
            sto_id,
            part_no,
            fii_id,
            part_name,
            qty_per_box,
            box_qty,
            fraction_qty,
            grand_total,
            calculation_note,
            leader_check_status,
            leader_checked_by,
            leader_checked_at,
            leader_ng_note,
            sequence_no,
            updated_at
          )
          VALUES (
            ${id},
            ${stoId},
            ${String(d.partNo || '')},
            ${String(d.fiiId || '')},
            ${String(d.partName || '')},
            ${Number(d.qtyPerBox || 0)},
            ${Number(d.boxQty || 0)},
            ${Number(d.fractionQty || 0)},
            ${Number(d.grandTotal || 0)},
            ${String(d.calculationNote || '')},
            ${d.leaderCheckStatus === true},
            ${d.leaderCheckedBy || null},
            ${d.leaderCheckedAt || null},
            ${d.leaderNgNote || null},
            ${i + 1},
            NOW()
          )
        `;
      }
    }

    return NextResponse.json({
      ok:true,
      message:'Transaksi STO tersimpan ke Neon'
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Save STO error' },
      { status:500 }
    );
  }
}
