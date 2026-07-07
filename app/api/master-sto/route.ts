import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

function rowToPart(r:any){
  return {
    partNo: r.part_no,
    fiiId: r.fii_id || '',
    partName: r.part_name || '',
    qtyPerBox: Number(r.qty_per_box || 0),
    area: r.area || '',
    rackNo: r.rack_no || '',
    dept: r.dept || '',
    active: r.active !== false
  };
}

function rowToTag(r:any){
  return {
    tagNo: r.tag_no,
    area: r.area || 'RM',
    description: `TAG ${r.tag_no}`,
    active: true
  };
}

function rowToTagDetail(r:any){
  return {
    id: r.id,
    tagNo: r.tag_no,
    partNo: r.part_no,
    sequenceNo: Number(r.sequence_no || 0),
    active: r.active !== false
  };
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM master_sto
      WHERE active = true
      ORDER BY tag_no, sequence_no, fii_id, part_no
    `;

    const partMap = new Map<string, any>();
    const tagMap = new Map<string, any>();
    const tagDetails:any[] = [];

    rows.forEach((r:any, idx:number)=>{
      if(!partMap.has(r.part_no)){
        partMap.set(r.part_no, rowToPart(r));
      }

      if(!tagMap.has(r.tag_no)){
        tagMap.set(r.tag_no, rowToTag(r));
      }

      tagDetails.push({
        ...rowToTagDetail(r),
        sequenceNo: Number(r.sequence_no || idx + 1)
      });
    });

    return NextResponse.json({
      ok:true,
      rows,
      parts: Array.from(partMap.values()),
      tags: Array.from(tagMap.values()),
      tagDetails
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Load master STO error' },
      { status:500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parts:any[] = body.parts || [];
    const tags:any[] = body.tags || [];
    const tagDetails:any[] = body.tagDetails || [];

    await sql`DELETE FROM master_sto`;

    for (let i = 0; i < tagDetails.length; i++) {
      const td:any = tagDetails[i];
      const p:any = parts.find((x:any)=>x.partNo === td.partNo) || {};
      const t:any = tags.find((x:any)=>x.tagNo === td.tagNo) || {};

      const partNo = String(td.partNo || p.partNo || '').trim();
      const tagNo = String(td.tagNo || '').trim();

      if(!partNo || !tagNo) continue;

      const id = `MS_${i}_${tagNo}_${partNo}`.replace(/[^a-zA-Z0-9_-]/g,'_');
      const fiiId = String(p.fiiId || '').trim();
      const partName = String(p.partName || '').trim();
      const qtyPerBox = Number(p.qtyPerBox || 0);
      const area = String(p.area || t.area || '').trim();
      const rackNo = String(p.rackNo || '').trim();
      const dept = String(p.dept || '').trim();
      const sequenceNo = Number(td.sequenceNo || i + 1);
      const active = td.active !== false && p.active !== false;

      await sql`
        INSERT INTO master_sto (
          id,
          fii_id,
          part_no,
          part_name,
          qty_per_box,
          area,
          rack_no,
          dept,
          tag_no,
          sequence_no,
          active,
          updated_at
        )
        VALUES (
          ${id},
          ${fiiId},
          ${partNo},
          ${partName},
          ${qtyPerBox},
          ${area},
          ${rackNo},
          ${dept},
          ${tagNo},
          ${sequenceNo},
          ${active},
          NOW()
        )
      `;
    }

    return NextResponse.json({
      ok:true,
      message:'Master STO tersimpan ke Neon',
      count: tagDetails.length
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Save master STO error' },
      { status:500 }
    );
  }
}
