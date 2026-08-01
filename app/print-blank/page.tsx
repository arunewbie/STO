'use client';

import { useEffect, useMemo, useState } from 'react';

function today(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateDisplay(v:string){
  if(!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '-';
  const [y,m,d] = v.split('-');
  return `${d}/${m}/${y}`;
}

function tagRank(tag:string){
  const m = String(tag || '').match(/^([A-Za-z]+)([0-9]+)$/);
  if(!m) return { prefix:String(tag || ''), num:999999, raw:String(tag || '') };
  return { prefix:m[1], num:Number(m[2] || 0), raw:String(tag || '') };
}

function compareTag(a:string,b:string){
  const aa = tagRank(a);
  const bb = tagRank(b);
  if(aa.prefix !== bb.prefix) return aa.prefix.localeCompare(bb.prefix);
  if(aa.num !== bb.num) return aa.num - bb.num;
  return aa.raw.localeCompare(bb.raw);
}

export default function PrintBlankTagPage(){
  const [parts,setParts] = useState<any[]>([]);
  const [tags,setTags] = useState<any[]>([]);
  const [tagDetails,setTagDetails] = useState<any[]>([]);
  const [loaded,setLoaded] = useState(false);

  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const queryDate = params.get('date') || today();
  const queryFrom = params.get('from') || '';
  const queryTo = params.get('to') || '';
  const allMode = params.get('all') === '1';

  const [date,setDate] = useState(queryDate);
  const [fromTag,setFromTag] = useState(queryFrom);
  const [toTag,setToTag] = useState(queryTo);

  useEffect(()=>{
    fetch('/api/master-sto?ts=' + Date.now(), { cache:'no-store' })
      .then(r=>r.json())
      .then(j=>{
        if(j.ok){
          setParts(j.parts || []);
          setTags(j.tags || []);
          setTagDetails(j.tagDetails || []);
        }
      })
      .finally(()=>setLoaded(true));
  },[]);

  const masterTags = useMemo(()=>{
    const tagSet = new Set(
      tagDetails
        .filter((td:any)=>td.active !== false)
        .map((td:any)=>String(td.tagNo || '').trim())
        .filter(Boolean)
    );

    const result = Array.from(tagSet)
      .sort(compareTag)
      .map(tagNo=>{
        const t = tags.find((x:any)=>String(x.tagNo) === tagNo);
        return {
          tagNo,
          area:t?.area || ''
        };
      });

    return result;
  },[tags,tagDetails]);

  const printTags = useMemo(()=>{
    if(!loaded) return [];

    if(allMode){
      return masterTags;
    }

    if(queryFrom && queryTo){
      const sorted = masterTags.slice().sort((a,b)=>compareTag(a.tagNo,b.tagNo));
      return sorted.filter(t=>compareTag(t.tagNo,queryFrom) >= 0 && compareTag(t.tagNo,queryTo) <= 0);
    }

    if(queryFrom){
      return masterTags.filter(t=>t.tagNo === queryFrom);
    }

    return [];
  },[loaded,allMode,queryFrom,queryTo,masterTags]);

  useEffect(()=>{
    if(!loaded) return;
    if(printTags.length === 0) return;
    if(!(allMode || queryFrom)) return;

    const timer = setTimeout(()=>window.print(),700);
    return ()=>clearTimeout(timer);
  },[loaded,printTags.length,allMode,queryFrom]);

  const openAll=()=>{
    window.open(`/print-blank?date=${encodeURIComponent(date)}&all=1`,'_blank');
  };

  const openRange=()=>{
    if(!fromTag || !toTag){
      alert('Isi range tag dari dan sampai.');
      return;
    }
    window.open(`/print-blank?date=${encodeURIComponent(date)}&from=${encodeURIComponent(fromTag)}&to=${encodeURIComponent(toTag)}`,'_blank');
  };

  const rowsForTag=(tagNo:string)=>{
    const details = tagDetails
      .filter((td:any)=>String(td.tagNo) === String(tagNo) && td.active !== false)
      .sort((a:any,b:any)=>(Number(a.sequenceNo)||0) - (Number(b.sequenceNo)||0));

    return details.map((td:any)=>{
      const p = parts.find((x:any)=>String(x.partNo) === String(td.partNo)) || {};
      return {
        partNo:td.partNo || '',
        fiiId:p.fiiId || '',
        partName:p.partName || '',
        qtyPerBox:Number(p.qtyPerBox || 0),
        area:p.area || '',
        rackNo:p.rackNo || '',
        dept:p.dept || ''
      };
    });
  };

  if(!loaded){
    return <div style={{padding:20,fontFamily:'Arial'}}>Loading master tag...</div>;
  }

  if(!(allMode || queryFrom)){
    return <div className="screen">
      <style>{`
        body{
          margin:0;
          background:#f3f4f6;
          font-family:Arial, sans-serif;
          color:#111827;
        }

        .screen{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
        }

        .card{
          width:min(720px,100%);
          background:#fff;
          border-radius:22px;
          padding:24px;
          box-shadow:0 20px 60px rgba(15,23,42,.14);
          border:1px solid #e5e7eb;
        }

        h1{
          margin:0 0 6px;
          font-size:25px;
        }

        .sub{
          color:#6b7280;
          margin-bottom:18px;
          font-size:13px;
        }

        label{
          display:block;
          margin:12px 0 6px;
          font-weight:800;
          font-size:13px;
        }

        input,select{
          width:100%;
          height:42px;
          border:1px solid #cbd5e1;
          border-radius:12px;
          padding:0 10px;
          box-sizing:border-box;
        }

        .grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .btnrow{
          display:flex;
          gap:10px;
          margin-top:18px;
          flex-wrap:wrap;
        }

        button{
          border:0;
          border-radius:12px;
          padding:12px 16px;
          font-weight:900;
          cursor:pointer;
        }

        .primary{
          background:#2563eb;
          color:white;
        }

        .green{
          background:#16a34a;
          color:white;
        }

        .muted{
          background:#e5e7eb;
          color:#111827;
        }

        .info{
          margin-top:16px;
          padding:12px;
          border-radius:14px;
          background:#eff6ff;
          color:#1e3a8a;
          font-weight:700;
          font-size:13px;
        }

        @media(max-width:760px){
          .grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="card">
        <h1>Print Tag Kosong</h1>
        <div className="sub">Print blank tag berdasarkan Master STO. Bisa print semua tag atau range tag.</div>

        <label>Tanggal Print</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} />

        <div className="grid">
          <div>
            <label>Dari Tag</label>
            <select value={fromTag} onChange={e=>setFromTag(e.target.value)}>
              <option value="">Pilih tag awal</option>
              {masterTags.map(t=><option key={t.tagNo} value={t.tagNo}>{t.tagNo}</option>)}
            </select>
          </div>

          <div>
            <label>Sampai Tag</label>
            <select value={toTag} onChange={e=>setToTag(e.target.value)}>
              <option value="">Pilih tag akhir</option>
              {masterTags.map(t=><option key={t.tagNo} value={t.tagNo}>{t.tagNo}</option>)}
            </select>
          </div>
        </div>

        <div className="btnrow">
          <button className="green" onClick={openRange}>Print Range</button>
          <button className="primary" onClick={openAll}>Print All</button>
          <button className="muted" onClick={()=>window.location.reload()}>Refresh Master</button>
        </div>

        <div className="info">
          Total tag dari master: {masterTags.length}. Contoh range: M001 sampai M021.
        </div>
      </div>
    </div>;
  }

  if(printTags.length === 0){
    return <div style={{padding:20,fontFamily:'Arial'}}>Tidak ada tag master untuk range ini.</div>;
  }

  return <div className="print-root">
    <style>{`
      @page{
        size:A4 portrait;
        margin:6mm;
      }

      html,body{
        margin:0;
        padding:0;
        background:#fff;
        color:#000;
        font-family:Arial, sans-serif;
      }

      .screen-only{
        display:none;
      }

      .sheet{
        width:198mm;
        height:285mm;
        box-sizing:border-box;
        background:#fff;
        border:1px solid #000;
        padding:2mm;
        margin:0 auto 8mm auto;
        page-break-after:always;
        overflow:hidden;
      }

      .sheet:last-child{
        page-break-after:auto;
      }

      .title{
        height:8mm;
        line-height:8mm;
        text-align:center;
        font-size:14px;
        font-weight:900;
        border:1px solid #000;
        border-bottom:0;
      }

      .head{
        display:grid;
        grid-template-columns:1fr 38mm;
        border:1px solid #000;
        margin-bottom:2mm;
      }

      .info-row{
        display:grid;
        grid-template-columns:32mm 1fr;
        min-height:8mm;
        border-bottom:1px solid #000;
      }

      .info-row:last-child{
        border-bottom:0;
      }

      .label{
        border-right:1px solid #000;
        padding:1mm;
        font-size:8px;
        font-weight:900;
      }

      .value{
        padding:1mm;
        font-size:8px;
        display:flex;
        align-items:center;
      }

      .count-box{
        border-left:1px solid #000;
      }

      .count-label{
        height:9mm;
        border-bottom:1px solid #000;
        padding:1mm;
        font-size:7px;
        font-weight:900;
      }

      .count-name{
        height:25mm;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        font-size:10px;
        font-weight:900;
      }

      table{
        width:100%;
        border-collapse:collapse;
        table-layout:fixed;
      }

      th,td{
        border:1px solid #000;
        font-size:7px;
        line-height:1.05;
        padding:1px 2px;
        vertical-align:middle;
        overflow:hidden;
        color:#000;
        background:#fff;
      }

      th{
        text-align:center;
        font-weight:900;
      }

      thead tr:first-child th{
        height:9mm;
      }

      thead tr:nth-child(2) th{
        height:5mm;
      }

      tbody tr{
        height:6.35mm;
      }

      .c{text-align:center;}
      .n{text-align:right;}

      .footer{
        display:grid;
        grid-template-columns:1fr 52mm;
        height:29mm;
        border-left:1px solid #000;
        border-right:1px solid #000;
        border-bottom:1px solid #000;
      }

      .nums{
        display:flex;
        align-items:center;
        gap:4mm;
        padding-left:5mm;
        border-right:1px solid #000;
      }

      .nums span{
        font-size:18px;
        font-weight:900;
        color:#5f6673;
      }

      .sign{
        display:grid;
        grid-template-rows:5mm 6mm 13mm 5mm;
      }

      .sign-title{
        text-align:center;
        font-size:7px;
        font-weight:900;
        border-bottom:1px solid #000;
      }

      .sign-head,
      .sign-empty{
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        border-bottom:1px solid #000;
      }

      .sign-head div,
      .sign-empty div{
        border-right:1px solid #000;
        text-align:center;
        font-size:6.5px;
        font-weight:900;
      }

      .sign-head div:last-child,
      .sign-empty div:last-child{
        border-right:0;
      }

      .time{
        display:grid;
        grid-template-columns:1fr 20mm;
      }

      .time div{
        font-size:7px;
        font-weight:900;
        text-align:center;
        border-right:1px solid #000;
      }

      .time div:last-child{
        border-right:0;
      }

      @media print{
        .sheet{
          margin:0;
        }
      }
    `}</style>

    {printTags.map(tag=>{
      const rows = rowsForTag(tag.tagNo);
      const first:any = rows[0] || {};
      const area = tag.area || first.area || '';
      const location = first.rackNo || '';

      const printRows:any[] = rows.slice();

      while(printRows.length < 23){
        printRows.push({
          partNo:'',
          fiiId:'',
          partName:'',
          qtyPerBox:0,
          boxQty:'',
          fractionQty:'',
          grandTotal:'',
          rackNo:''
        });
      }

      return <div className="sheet" key={tag.tagNo}>
        <div className="title">STOCK TAKING TAG</div>

        <div className="head">
          <div>
            <div className="info-row">
              <div className="label">DATE</div>
              <div className="value">{dateDisplay(queryDate)}</div>
            </div>
            <div className="info-row">
              <div className="label">AREA</div>
              <div className="value">{area}</div>
            </div>
            <div className="info-row">
              <div className="label">TAG NUMBER</div>
              <div className="value">{tag.tagNo}</div>
            </div>
            <div className="info-row">
              <div className="label">LOCATION OR<br/>RACK NUMBER</div>
              <div className="value">{location}</div>
            </div>
          </div>

          <div className="count-box">
            <div className="count-label">NAME OF COUNT :</div>
            <div className="count-name"></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowSpan={2} style={{width:'7mm'}}>NO</th>
              <th rowSpan={2} style={{width:'28mm'}}>PART NUMBER</th>
              <th rowSpan={2} style={{width:'11mm'}}>FII ID</th>
              <th rowSpan={2} style={{width:'47mm'}}>PART NAME</th>
              <th>QTY/BOX<br/>(a)</th>
              <th>JUMLAH BOX<br/>(b)</th>
              <th>TOTAL<br/>(a)x(b)</th>
              <th>FRACTION<br/>(d)</th>
              <th>GRAND TOTAL<br/>(c)+(d)</th>
              <th>Rack Detail<br/>Column-Rows</th>
            </tr>
            <tr>
              <th>pcs</th>
              <th>box</th>
              <th>pcs</th>
              <th>pcs</th>
              <th>pcs</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {printRows.slice(0,23).map((d:any,i:number)=>{
              return <tr key={`${tag.tagNo}-${i}-${d.partNo}`}>
                <td className="c">{i+1}</td>
                <td>{d.partNo}</td>
                <td className="c">{d.fiiId}</td>
                <td>{d.partName}</td>
                <td className="n">{d.qtyPerBox ? Number(d.qtyPerBox).toLocaleString('id-ID') : ''}</td>
                <td className="n"></td>
                <td className="n"></td>
                <td className="n"></td>
                <td className="n"></td>
                <td>{d.rackNo || ''}</td>
              </tr>
            })}
          </tbody>
        </table>

        <div className="footer">
          <div className="nums">
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span>
            <span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
          </div>

          <div className="sign">
            <div className="sign-title">SIGN</div>
            <div className="sign-head">
              <div>Auditor</div>
              <div>Leader Team</div>
              <div>Count</div>
            </div>
            <div className="sign-empty">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <div className="time">
              <div>Time of Count :</div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    })}
  </div>;
}
