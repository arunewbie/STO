'use client';

import { useEffect, useMemo, useState } from 'react';

function dateKey(v:any){
  if(!v) return '';
  if(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0,10);
}


function countSeconds(sto:any){
  if(sto?.startTime && sto?.endTime){
    const start = new Date(sto.startTime).getTime();
    const end = new Date(sto.endTime).getTime();
    if(!Number.isNaN(start) && !Number.isNaN(end) && end >= start){
      return Math.max(1, Math.round((end - start) / 1000));
    }
  }

  const hour = Number(sto?.durationHour || 0);
  return hour > 0 ? Math.max(1, Math.round(hour * 3600)) : 0;
}

function fmtDate(v:any){
  const key = dateKey(v);
  if(!key) return '-';
  const [y,m,d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export default function PrintPage(){
  const [stos,setStos]=useState<any[]>([]);
  const [parts,setParts]=useState<any[]>([]);
  const [loaded,setLoaded]=useState(false);

  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const stoId = params.get('stoId') || '';
  const date = params.get('date') || '';

  useEffect(()=>{
    const getLocalArray=(key:string)=>{
      try{
        const raw=localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }catch{
        return [];
      }
    };

    Promise.all([
      fetch('/api/stos').then(r=>r.json()).catch(()=>({ok:false,stos:[]})),
      fetch('/api/master-sto').then(r=>r.json()).catch(()=>({ok:false,parts:[]}))
    ]).then(([a,b])=>{
      const apiStos = a.ok && Array.isArray(a.stos) ? a.stos : [];
      const apiParts = b.ok && Array.isArray(b.parts) ? b.parts : [];

      const localStos = getLocalArray('sto_app_stos');
      const localParts = getLocalArray('sto_app_parts');

      const mergedStos = [...apiStos];
      localStos.forEach((s:any)=>{
        if(!mergedStos.some((x:any)=>x.stoId===s.stoId)){
          mergedStos.push(s);
        }
      });

      const mergedParts = [...apiParts];
      localParts.forEach((p:any)=>{
        if(!mergedParts.some((x:any)=>x.partNo===p.partNo)){
          mergedParts.push(p);
        }
      });

      setStos(mergedStos);
      setParts(mergedParts);
      setLoaded(true);
    }).catch(()=>{
      setStos(getLocalArray('sto_app_stos'));
      setParts(getLocalArray('sto_app_parts'));
      setLoaded(true);
    });
  },[]);

  const printList = useMemo(()=>{
    if(stoId) return stos.filter(s=>s.stoId===stoId);
    if(date) return stos.filter(s=>dateKey(s.stoDate)===date);
    return stos;
  },[stos,stoId,date]);

  
  // AUTO PRINT AFTER DATA READY
  useEffect(()=>{
    if(!loaded) return;
    if(printList.length===0) return;

    const t=setTimeout(()=>window.print(),500);
    return ()=>clearTimeout(t);
  },[loaded, printList.length]);

if(!loaded){
    return <div style={{padding:20,fontFamily:'Arial'}}>Loading print data...</div>;
  }

  if(printList.length===0){
    return <div style={{padding:20,fontFamily:'Arial'}}>Tidak ada data print.</div>;
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

      .print-root{
        background:#fff;
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

    {printList.map(sto=>{
      const first = sto.details?.[0];
      const firstPart = first ? parts.find((p:any)=>p.partNo===first.partNo) : null;

      const rows = [...(sto.details || [])];

      while(rows.length < 23){
        rows.push({
          id:`EMPTY-${rows.length}`,
          partNo:'',
          fiiId:'',
          partName:'',
          qtyPerBox:'',
          boxQty:'',
          fractionQty:'',
          grandTotal:''
        });
      }

      const area = sto.area || firstPart?.area || '';
      const location = firstPart?.rackNo || '';
      const sec = countSeconds(sto);
      const timeOfCount = sec ? `${sec} Sec` : '-';

      return <div className="sheet" key={sto.stoId}>
        <div className="title">STOCK TAKING TAG</div>

        <div className="head">
          <div>
            <div className="info-row">
              <div className="label">DATE</div>
              <div className="value">{fmtDate(sto.stoDate)}</div>
            </div>
            <div className="info-row">
              <div className="label">AREA</div>
              <div className="value">{area}</div>
            </div>
            <div className="info-row">
              <div className="label">TAG NUMBER</div>
              <div className="value">{sto.tagNo}</div>
            </div>
            <div className="info-row">
              <div className="label">LOCATION OR<br/>RACK NUMBER</div>
              <div className="value">{location}</div>
            </div>
          </div>

          <div className="count-box">
            <div className="count-label">NAME OF COUNT :</div>
            <div className="count-name">{sto.creatorName}</div>
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
              <th>TOTAL<br/>(a)×(b)</th>
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
            {rows.slice(0,23).map((d:any,i:number)=>{
              const p = parts.find((x:any)=>x.partNo===d.partNo);
              const qtyPerBox=Number(d.qtyPerBox||0);
              const boxQty=Number(d.boxQty||0);
              const fractionQty=Number(d.fractionQty||0);
              const grandTotal=Number(d.grandTotal||0);
              const total=qtyPerBox*boxQty;

              return <tr key={`${d.id}-${i}`}>
                <td className="c">{i+1}</td>
                <td>{d.partNo}</td>
                <td className="c">{d.fiiId}</td>
                <td>{d.partName}</td>
                <td className="n">{qtyPerBox ? qtyPerBox.toLocaleString('id-ID') : ''}</td>
                <td className="n">{boxQty ? boxQty.toLocaleString('id-ID') : ''}</td>
                <td className="n">{total ? total.toLocaleString('id-ID') : ''}</td>
                <td className="n">{fractionQty ? fractionQty.toLocaleString('id-ID') : ''}</td>
                <td className="n">{grandTotal ? grandTotal.toLocaleString('id-ID') : ''}</td>
                <td>{p?.rackNo || ''}</td>
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
              <div>{timeOfCount}</div>
            </div>
          </div>
        </div>
      </div>
    })}
  </div>;
}
