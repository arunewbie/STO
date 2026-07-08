"use client";

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Part, StoDetail, StoHeader, Tag, TagDetail, User, ViewMode } from '../lib/types';
import { sampleParts, sampleTagDetails, sampleTags, sampleUsers } from '../lib/sampleData';

type Menu = 'DASHBOARD'|'INPUT'|'CHECK'|'RESUME'|'MASTER';
const key = (k:string)=>`sto_app_${k}`;
const today = ()=>new Date().toISOString().slice(0,10);
const nowIso = ()=>new Date().toISOString();
const timeOnly = (iso:string)=> new Date(iso).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
const fmtDateTime = (iso?:string)=> iso ? new Date(iso).toLocaleString('id-ID') : '-';
const uid = (p='ID') => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${p}${crypto.randomUUID().replaceAll('-','')}`;
  }
  return `${p}${Date.now()}${Math.random().toString(36).slice(2,10)}`;
};

function load<T>(name:string, fallback:T):T{ if(typeof window==='undefined') return fallback; const raw=localStorage.getItem(key(name)); return raw?JSON.parse(raw):fallback; }
function save<T>(name:string, data:T){ localStorage.setItem(key(name), JSON.stringify(data)); }
function safeCalc(expr:string){
  const text = String(expr || '')
    .replace(/×/g,'*')
    .replace(/x/gi,'*')
    .replace(/,/g,'.')
    .replace(/[^0-9+\-*/.\s]/g,'')
    .trim();

  if(!text) return 0;

  try{
    const tokens = text.match(/\d+(?:\.\d+)?|[+\-*/]/g);
    if(!tokens || tokens.length === 0) return 0;

    let nums:number[] = [];
    let ops:string[] = [];

    const priority = (op:string) => (op === '+' || op === '-') ? 1 : 2;

    const apply = () => {
      const b = nums.pop();
      const a = nums.pop();
      const op = ops.pop();

      if(a === undefined || b === undefined || !op) return;

      if(op === '+') nums.push(a + b);
      if(op === '-') nums.push(a - b);
      if(op === '*') nums.push(a * b);
      if(op === '/') nums.push(b === 0 ? 0 : a / b);
    };

    for(const token of tokens){
      if(/^\d/.test(token)){
        nums.push(Number(token));
      }else{
        while(ops.length && priority(ops[ops.length - 1]) >= priority(token)){
          apply();
        }
        ops.push(token);
      }
    }

    while(ops.length){
      apply();
    }

    const result = nums[0] || 0;
    if(!Number.isFinite(result)) return 0;

    return Math.max(0, Math.floor(result));
  }catch{
    return 0;
  }
}

export default function Home(){
  const [users,setUsers]=useState<User[]>(sampleUsers);
  const [parts,setParts]=useState<Part[]>(sampleParts);
  const [tags,setTags]=useState<Tag[]>(sampleTags);
  const [tagDetails,setTagDetails]=useState<TagDetail[]>(sampleTagDetails);
  const [stos,setStos]=useState<StoHeader[]>([]);
  const [user,setUser]=useState<User|null>(null);
  const [masterLoaded,setMasterLoaded]=useState(false); const [menu,setMenu]=useState<Menu>('DASHBOARD'); const [dataLoaded,setDataLoaded]=useState(false); const [stosLoaded,setStosLoaded]=useState(false);

  useEffect(()=>{
    async function initData(){
      try{
        const [usersRes, masterRes, stosRes] = await Promise.all([
          fetch('/api/users').then(r=>r.json()).catch(()=>({ok:false,users:[]})),
          fetch('/api/master-sto').then(r=>r.json()).catch(()=>({ok:false,parts:[],tags:[],tagDetails:[]})),
          fetch('/api/stos').then(r=>r.json()).catch(()=>({ok:false,stos:[]}))
        ]);

        setUsers(usersRes.ok ? (usersRes.users || []) : []);

        setParts(masterRes.ok ? (masterRes.parts || []) : []);
        setTags(masterRes.ok ? (masterRes.tags || []) : []);
        setTagDetails(masterRes.ok ? (masterRes.tagDetails || []) : []);

        setStos(stosRes.ok ? (stosRes.stos || []) : []);

        const u=load<User|null>('session',null);
        setUser(u ? ({
          ...u,
          password:(u as any).password||'1234',
          signatureName:(u as any).signatureName||u.fullName,
          active:u.active!==false
        } as User) : null);
      }finally{
        setDataLoaded(true);
      }
    }

    initData();
  },[]);
  useEffect(()=>{ fetch('/api/users').then(r=>r.json()).then(j=>{ if(j.ok&&j.users) setUsers(j.users); }).catch(()=>{}); },[]);
 useEffect(()=>{ if(user && user.role!=='ADMIN' && menu==='MASTER') setMenu('DASHBOARD'); },[user,menu]);

  
  useEffect(()=>{
    if(!dataLoaded) return;

    fetch('/api/master-sto',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({parts,tags,tagDetails})
    }).catch(()=>{});
  },[dataLoaded,parts,tags,tagDetails]);

  useEffect(()=>{
    if(!dataLoaded) return;

    fetch('/api/stos',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({stos})
    }).catch(()=>{});
  },[dataLoaded,stos]);

  if(!dataLoaded) return <div className="login"><div className="card"><h2>Loading data STO dari Neon...</h2></div></div>;
  if(!user) return <Login users={users} onLogin={(u)=>{setUser(u); save('session',u)}} />;

  return <main className="app">
    <div className="topbar no-print">
      <div className="brand"><div><div className="logo">STO Web App</div><div className="sub">Mobile-first Stock Taking Tag</div></div><div className="row"><span className="pill">{user.fullName} / {user.role}</span><button className="btn small red" onClick={()=>{localStorage.removeItem(key('session')); setUser(null)}}>Logout</button></div></div>
      <div className="nav">
        {((user.role==='ADMIN'?['DASHBOARD','INPUT','CHECK','RESUME','MASTER']:['DASHBOARD','INPUT','CHECK','RESUME']) as Menu[]).map(m=><button key={m} className={menu===m?'active':''} onClick={()=>setMenu(m)}>{m}</button>)}
      </div>
    </div>
    {menu==='DASHBOARD' && <Dashboard tags={tags} stos={stos}/>} 
    {menu==='INPUT' && <InputSto user={user} parts={parts} setParts={setParts} tags={tags} setTags={setTags} tagDetails={tagDetails} setTagDetails={setTagDetails} stos={stos} setStos={setStos}/>} 
    {menu==='CHECK' && <CheckSto user={user} stos={stos} setStos={setStos}/>} 
    {menu==='RESUME' && <Resume user={user} parts={parts} stos={stos} setStos={setStos}/>} 
    {menu==='MASTER' && user.role==='ADMIN' && <Master parts={parts} setParts={setParts} tags={tags} setTags={setTags} tagDetails={tagDetails} setTagDetails={setTagDetails} users={users} setUsers={setUsers}/>}
    {menu==='MASTER' && user.role!=='ADMIN' && <div className="card span-12"><h2>Akses Ditolak</h2><p className="muted">Menu Master hanya untuk ADMIN.</p></div>} 
  </main>;
}



function Login({users,onLogin}:{users:User[],onLogin:(u:User)=>void}){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);


  


  const submit=async()=>{
    if(loading) return;

    if(!username.trim() || !password.trim()){
      alert('Username dan password wajib diisi');
      return;
    }

    setLoading(true);

    try{
      const res=await fetch('/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          username:username.trim(),
          password:password.trim()
        })
      });

      const j=await res.json();

      if(j.ok && j.user){
        onLogin(j.user);
      }else{
        alert(j.message || 'Username / password salah atau user tidak aktif');
      }
    }catch(e:any){
      alert('Gagal koneksi database. Cek DATABASE_URL / koneksi Neon.');
    }finally{
      setLoading(false);
    }
  };

  return <div className="login login-modern">
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-logo">PC</div>
        <h1>STOCK TAKING PC</h1>
      </div>

      <div className="card login-card">
        <div className="login-card-head">
          <div>
            <h2>Login STO</h2>
          </div>
        </div>

        <label>Username</label>
        <input
          value={username}
          onChange={e=>setUsername(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter') submit()}}
          placeholder="Masukkan username"
          autoComplete="username"
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter') submit()}}
          placeholder="Masukkan password"
          autoComplete="current-password"
        />

        <button className="btn primary login-btn" onClick={submit} disabled={loading}>
          {loading?'Loading...':'Masuk'}
        </button>
      </div>
    </div>
  </div>
}

function Dashboard({tags,stos}:{tags:Tag[],stos:StoHeader[]}){ const counted=stos.filter(s=>s.status==='COUNTED'||s.status==='CHECKED'||s.status==='CLOSED').length; const checked=stos.filter(s=>s.status==='CHECKED'||s.status==='CLOSED').length; return <div className="grid"><Stat t="Total Tag" v={tags.length}/><Stat t="Sudah Count" v={counted}/><Stat t="Belum Count" v={Math.max(tags.length-counted,0)}/><Stat t="Sudah Check Leader" v={checked}/></div> }
function Stat({t,v}:{t:string,v:number}){return <div className="card span-3"><div className="sub">{t}</div><div className="stat">{v}</div></div>}



function InputSto({user,parts,setParts,tags,setTags,tagDetails,setTagDetails,stos,setStos}:{user:User,parts:Part[],setParts:any,tags:Tag[],setTags:any,tagDetails:TagDetail[],setTagDetails:any,stos:StoHeader[],setStos:any}){
  const [date,setDate]=useState(today());
  const [area,setArea]=useState(user.defaultArea||'RM');
  const [tagNo,setTagNo]=useState(tags[0]?.tagNo||'');
  const [mode,setMode]=useState<ViewMode>(user.role==='OPERATOR'?'INPUT':'FULL');
  const [start,setStart]=useState(nowIso());
  const [details,setDetails]=useState<StoDetail[]>([]);

  const [extraOpen,setExtraOpen]=useState(false);
  const [masterSearch,setMasterSearch]=useState('');
  const [manualPart,setManualPart]=useState<any>({
    fiiId:'',
    partNo:'',
    partName:'',
    qtyPerBox:'',
    area:'',
    rackNo:'',
    dept:''
  });
  const [additionalTagNos,setAdditionalTagNos]=useState<string[]>([]);
  const [isAdditionalTag,setIsAdditionalTag]=useState(false);

  const validInputTags=useMemo(()=>{
    const validTagSet=new Set(
      tagDetails
        .filter((td:any)=>td.active!==false)
        .filter((td:any)=>parts.some((p:any)=>p.partNo===td.partNo && p.active!==false))
        .map((td:any)=>String(td.tagNo))
    );

    const map=new Map<string,any>();

    tags
      .filter((t:any)=>validTagSet.has(String(t.tagNo)))
      .forEach((t:any)=>{
        const tagNo=String(t.tagNo||'').trim();
        if(tagNo && !map.has(tagNo)){
          map.set(tagNo,t);
        }
      });

    const extraList=(typeof additionalTagNos!=='undefined' ? additionalTagNos : []);

    extraList.forEach((tagNo:string)=>{
      const clean=String(tagNo||'').trim();
      if(clean && !map.has(clean)){
        map.set(clean,{
          tagNo:clean,
          area,
          description:`TAG TAMBAHAN ${clean}`,
          active:true
        } as any);
      }
    });

    return Array.from(map.values()).sort((a:any,b:any)=>String(a.tagNo).localeCompare(String(b.tagNo)));
  },[tags,tagDetails,parts,area,additionalTagNos]);

  useEffect(()=>{
    if(!validInputTags.length) return;

    const exists=validInputTags.some((t:any)=>String(t.tagNo)===String(tagNo));

    if(!exists){
      setTagNo(validInputTags[0].tagNo);
    }
  },[validInputTags,tagNo]);



  const dateKey=(v:any)=>{
    if(!v) return '';
    if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
    const d=new Date(v);
    if(Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0,10);
  };

  const sameDateTag=(s:any)=>{
    return dateKey(s.stoDate)===dateKey(date) && String(s.tagNo||'')===String(tagNo||'');
  };

  const makeNextTagNo=()=>{
    const allTagNos=[
      ...tags.map((t:any)=>String(t.tagNo||'')),
      ...additionalTagNos,
      ...stos.map((s:any)=>String(s.tagNo||''))
    ].filter(Boolean);

    const current=String(tagNo || allTagNos[0] || 'M001');
    const m=current.match(/^([A-Za-z]+)(\d+)$/);

    const prefix=m ? m[1] : 'M';
    const digitLen=m ? m[2].length : 3;

    let maxNo=0;

    allTagNos.forEach(t=>{
      const mm=String(t).match(new RegExp(`^${prefix}(\\d+)$`));
      if(mm){
        maxNo=Math.max(maxNo, Number(mm[1])||0);
      }
    });

    const next=maxNo+1;
    return `${prefix}${String(next).padStart(digitLen,'0')}`;
  };

  const createAdditionalTag=()=>{
    const nextTag=makeNextTagNo();

    const exists = [
      ...tags.map((t:any)=>String(t.tagNo||'')),
      ...additionalTagNos,
      ...stos.map((s:any)=>String(s.tagNo||''))
    ].some(t=>String(t)===nextTag);

    if(exists){
      alert(`Tag tambahan ${nextTag} sudah ada. Coba refresh data atau cek Resume.`);
      return;
    }

    setAdditionalTagNos(prev=>Array.from(new Set(prev.includes(nextTag)?prev:[...prev,nextTag])));
    setTagNo(nextTag);
    setIsAdditionalTag(true);
    setDetails([]);
    setStart(nowIso());
    setExtraOpen(true);
    alert(`Tag tambahan dibuat: ${nextTag}. Silakan pilih part dari Master atau input manual.`);
  };

  const revisionSto = useMemo(()=>{
    return stos.find(s=>sameDateTag(s) && s.status==='REVISION');
  },[stos,tagNo,date]);

  useEffect(()=>{
    if(!tagNo) return;

    if(additionalTagNos.includes(tagNo)){
      setIsAdditionalTag(true);
      setStart(nowIso());
      return;
    }else{
      setIsAdditionalTag(false);
    }

    const rev = stos.find(s=>dateKey(s.stoDate)===dateKey(date) && s.tagNo===tagNo && s.status==='REVISION');

    if(rev){
      setArea(rev.area || user.defaultArea || 'RM');
      setStart(nowIso());
      setDetails((rev.details||[]).map((d:any)=>({
        ...d,
        id:d.id || uid('D'),
        leaderCheckStatus:false
      })));
      return;
    }

    setStart(nowIso());

    const ds=tagDetails
      .filter(td=>td.tagNo===tagNo&&td.active)
      .sort((a,b)=>a.sequenceNo-b.sequenceNo)
      .map(td=>parts.find(p=>p.partNo===td.partNo))
      .filter(Boolean)
      .map((p:any)=>({
        id:uid('D'),
        partNo:p.partNo,
        fiiId:p.fiiId,
        partName:p.partName,
        qtyPerBox:Number(p.qtyPerBox)||0,
        boxQty:0,
        fractionQty:0,
        grandTotal:0,
        calculationNote:'',
        leaderCheckStatus:false
      }));

    setDetails(ds);
  },[tagNo,date,parts,tagDetails,stos,user.defaultArea,additionalTagNos]);

  const update=(id:string,patch:Partial<StoDetail>)=>setDetails(ds=>ds.map(d=>{
    if(d.id!==id) return d;
    const n={...d,...patch};
    n.grandTotal=(Number(n.qtyPerBox)||0)*(Number(n.boxQty)||0)+(Number(n.fractionQty)||0);
    return n;
  }));
  const removeDetail=(id:string)=>setDetails(ds=>ds.filter(d=>d.id!==id));

  const filled=details.filter(d=>d.boxQty>0 || d.fractionQty>0).length;

  const duplicateInCurrentDetails=(partNo:string)=>{
    return details.some((d:any)=>String(d.partNo||'').trim().toLowerCase()===String(partNo||'').trim().toLowerCase());
  };

  const addPartToDetails=(p:any, source:'MASTER'|'MANUAL')=>{
    if(!isAdditionalTag){
      const ok=confirm('Saat ini Anda belum membuat Tag Tambahan. Part akan ditambahkan ke tag yang sedang dipilih. Lebih disarankan klik "Buat Tag Tambahan" dulu. Lanjutkan?');
      if(!ok) return;
    }

    const partNo=String(p.partNo||'').trim();

    if(!partNo){
      alert('Part Number wajib diisi');
      return;
    }

    if(duplicateInCurrentDetails(partNo)){
      const ok=confirm(`Part ${partNo} sudah ada di list tag ini. Tetap tambahkan?`);
      if(!ok) return;
    }

    const qtyPerBox=Number(p.qtyPerBox||0);

    const newDetail:any={
      id:uid(source==='MASTER'?'DM':'DX'),
      partNo,
      fiiId:String(p.fiiId||'').trim(),
      partName:String(p.partName||'').trim(),
      qtyPerBox,
      boxQty:0,
      fractionQty:0,
      grandTotal:0,
      calculationNote:source==='MASTER'?'Tambahan dari Master':'Tambahan Manual',
      leaderCheckStatus:false,
      isAdditional:true,
      additionalSource:source
    };

    setDetails(ds=>[...ds,newDetail]);
    setExtraOpen(false);
  };

  const masterOptions=useMemo(()=>{
    const q=masterSearch.trim().toLowerCase();

    if(!q) return parts.slice(0,20);

    return parts
      .filter((p:any)=>{
        return String(p.fiiId||'').toLowerCase().includes(q)
          || String(p.partNo||'').toLowerCase().includes(q)
          || String(p.partName||'').toLowerCase().includes(q)
          || String(p.rackNo||'').toLowerCase().includes(q);
      })
      .slice(0,30);
  },[parts,masterSearch]);

  const latestDuplicateCheck=async()=>{
    try{
      const res=await fetch('/api/stos');
      const j=await res.json();

      if(!j.ok || !Array.isArray(j.stos)) return null;

      return j.stos.find((s:any)=>{
        return dateKey(s.stoDate)===dateKey(date)
          && String(s.tagNo||'')===String(tagNo||'')
          && ['COUNTED','CHECKED','CLOSED','REVISION'].includes(String(s.status||''));
      }) || null;
    }catch{
      return null;
    }
  };

  const submit=async()=>{
    if(!tagNo){
      alert('Tag belum dipilih');
      return;
    }

    if(details.length===0){
      alert('Tidak ada item dalam tag ini');
      return;
    }

    const end=nowIso();
    const rawHour=(new Date(end).getTime()-new Date(start).getTime())/3600000;
    const dur=rawHour>0 ? Math.max(0.01, Math.round(rawHour*100)/100) : 0;

    if(revisionSto){
      const updated:StoHeader = {
        ...revisionSto,
        stoDate:date,
        area,
        creatorUserId:user.id,
        creatorName:user.fullName,
        startTime:start,
        endTime:end,
        durationHour:dur,
        status:'COUNTED' as any,
        creatorSignedAt:end,
        leaderUserId:undefined,
        leaderName:undefined,
        leaderSignedAt:undefined,
        details:details.map((d:any)=>({
          ...d,
          leaderCheckStatus:false,
          leaderNgNote:'',
          leaderCheckedBy:undefined,
          leaderCheckedAt:undefined
        }))
      } as any;

      setStos(stos.map(s=>s.stoId===revisionSto.stoId?updated:s));
      alert('Revisi STO tersimpan. Status kembali ke COUNTED dan siap dicek leader.');
      return;
    }

    const localDuplicate = stos.find((s:any)=>{
      return dateKey(s.stoDate)===dateKey(date)
        && String(s.tagNo||'')===String(tagNo||'')
        && ['COUNTED','CHECKED','CLOSED','REVISION'].includes(String(s.status||''));
    });

    if(localDuplicate){
      alert(`Tag ${tagNo} tanggal ${date} sudah pernah diinput oleh ${localDuplicate.creatorName || '-'} dengan status ${localDuplicate.status}.`);
      return;
    }

    const dbDuplicate = await latestDuplicateCheck();

    if(dbDuplicate){
      alert(`Tag ${tagNo} tanggal ${date} sudah pernah diinput oleh ${dbDuplicate.creatorName || '-'} dengan status ${dbDuplicate.status}.`);
      return;
    }

    
    // Persist tag tambahan supaya setelah disimpan, tag baru tetap muncul dengan list part yang sama
    if(isAdditionalTag || additionalTagNos.includes(tagNo)){
      const cleanTag=String(tagNo||'').trim();

      if(cleanTag){
        setTags(prev=>{
          if(prev.some((t:any)=>String(t.tagNo)===cleanTag)) return prev;

          return [...prev,{
            tagNo:cleanTag,
            area,
            description:`TAG TAMBAHAN ${cleanTag}`,
            active:true
          } as any];
        });

        setParts(prev=>{
          const next=[...prev];

          details.forEach((d:any)=>{
            const partNo=String(d.partNo||'').trim();
            if(!partNo) return;

            const exists=next.some((p:any)=>
              String(p.partNo||'').trim().toLowerCase()===partNo.toLowerCase()
            );

            if(!exists){
              next.push({
                partNo,
                fiiId:String(d.fiiId||'').trim(),
                partName:String(d.partName||'').trim(),
                qtyPerBox:Number(d.qtyPerBox||0),
                area,
                rackNo:'',
                dept:'',
                active:true
              } as any);
            }
          });

          return next;
        });

        setTagDetails(prev=>{
          const withoutOld=prev.filter((td:any)=>String(td.tagNo)!==cleanTag);

          const mapped=details
            .filter((d:any)=>String(d.partNo||'').trim())
            .map((d:any,i:number)=>({
              id:uid('TD'),
              tagNo:cleanTag,
              partNo:String(d.partNo||'').trim(),
              sequenceNo:i+1,
              active:true
            } as any));

          return [...withoutOld,...mapped];
        });

        setAdditionalTagNos(prev=>Array.from(new Set(prev.includes(cleanTag)?prev:[...prev,cleanTag])));
      }
    }


    const sto:StoHeader={
      stoId:uid('STO'),
      stoNo:`STO-${date.replaceAll('-','')}-${tagNo}`,
      stoDate:date,
      area,
      tagNo,
      creatorUserId:user.id,
      creatorName:user.fullName,
      startTime:start,
      endTime:end,
      durationHour:dur,
      status:'COUNTED' as any,
      creatorSignedAt:end,
      details
    } as any;

    setStos([sto,...stos]);
    if(isAdditionalTag || additionalTagNos.includes(tagNo)){ setIsAdditionalTag(true); }
    alert('STO tersimpan dan signature creator sudah dibuat.');
  };

  return <div className="grid">
    {revisionSto && <div className="card span-12" style={{borderColor:'#f59e0b',background:'#fffbeb'}}>
      <h2 className="title">Tag Ini Sedang Revisi</h2>
      <div className="sub">
        Catatan Leader: <b>{(revisionSto as any).revisionNote || '-'}</b>
      </div>
      <div className="sub">
        Diminta oleh: {(revisionSto as any).revisionBy || revisionSto.leaderName || '-'} • {(revisionSto as any).revisionAt ? fmtDateTime((revisionSto as any).revisionAt) : '-'}
      </div>
      <div style={{marginTop:8}}>
        {(revisionSto.details||[]).filter((d:any)=>d.leaderNgNote).map((d:any)=>
          <div key={d.id} className="ng-note">
            <b>NG {d.fiiId}</b> - {d.partNo}: {d.leaderNgNote}
          </div>
        )}
      </div>
    </div>}

    <div className="card span-12">
      <div className="between">
        <div>
          <h2 className="title">Input STO</h2>
          <div className="sub">Tag {tagNo} • Progress {filled}/{details.length} • Start {timeOnly(start)}</div>
        </div>
      </div>

      <div className="grid">
        <div className="span-3">
          <label>Tanggal</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        <div className="span-3">
          <label>Area</label>
          <select value={area} onChange={e=>setArea(e.target.value)}>
            <option>RM</option>
            <option>WIP</option>
            <option>FG</option>
            <option>P</option>
            <option>S</option>
            <option>RAK 1</option>
            <option>RAK 2</option>
            <option>RAK 3</option>
          </select>
        </div>
        <div className="span-3">
          <label>Tag Number</label>
          <select value={tagNo} onChange={e=>{
            setTagNo(e.target.value);
            setIsAdditionalTag(additionalTagNos.includes(e.target.value));
          }}>
            {validInputTags.map((t:any,i:number)=><option key={`${t.tagNo}-${i}`} value={t.tagNo}>{t.tagNo}</option>)}
          </select>
        </div>
        <div className="span-3">
          <label>Mode</label>
          <select value={mode} onChange={e=>setMode(e.target.value as ViewMode)}>
            <option value="INPUT">Input Mode</option>
            <option value="FULL">Full Mode</option>
          </select>
        </div>
      </div>
    </div>

    <div className="card span-12 extra-tag-card no-print">
      <div className="between">
        <div>
          <h2 className="title">Tag Tambahan</h2>
          <div className="sub">
            Buat tag baru otomatis melanjutkan tag terakhir. Contoh: M001-M033 → M034.
            Setelah tag dibuat, isi part bisa dari Master STO atau input manual.
          </div>
          {isAdditionalTag && <div className="extra-tag-pill">Sedang input tag tambahan: <b>{tagNo}</b></div>}
        </div>
        <div className="row">
          <button className="btn green" onClick={createAdditionalTag}>Buat Tag Tambahan</button>
          <button className="btn orange" onClick={()=>setExtraOpen(!extraOpen)}>
            {extraOpen?'Tutup':'Tambah / Pilih Part'}
          </button>
        </div>
      </div>

      {extraOpen && <div className="extra-panel">
        <div className="grid">
          <div className="span-6">
            <h3>Isi Part dari Master STO</h3>
            <label>Cari FII ID / Part Number / Part Name / Rack</label>
            <input value={masterSearch} onChange={e=>setMasterSearch(e.target.value)} placeholder="Cari part dari master..."/>

            <div className="extra-master-list">
              {masterOptions.map((p:any)=>
                <div className="extra-master-row" key={p.partNo}>
                  <div>
                    <b>{p.fiiId || '-'}</b> • {p.partNo}
                    <div className="sub">{p.partName} • Qty/Box {p.qtyPerBox || 0} • {p.rackNo || '-'}</div>
                  </div>
                  <button className="btn small green" onClick={()=>addPartToDetails(p,'MASTER')}>Tambah</button>
                </div>
              )}
            </div>
          </div>

          <div className="span-6">
            <h3>Isi Part Manual</h3>

            <div className="grid">
              <div className="span-6">
                <label>FII ID</label>
                <input value={manualPart.fiiId} onChange={e=>setManualPart({...manualPart,fiiId:e.target.value})}/>
              </div>
              <div className="span-6">
                <label>Part Number</label>
                <input value={manualPart.partNo} onChange={e=>setManualPart({...manualPart,partNo:e.target.value})}/>
              </div>
              <div className="span-12">
                <label>Part Name</label>
                <input value={manualPart.partName} onChange={e=>setManualPart({...manualPart,partName:e.target.value})}/>
              </div>
              <div className="span-6">
                <label>Qty/Box</label>
                <input type="number" value={manualPart.qtyPerBox} onChange={e=>setManualPart({...manualPart,qtyPerBox:e.target.value})}/>
              </div>
              <div className="span-6">
                <label>Area</label>
                <input value={manualPart.area} onChange={e=>setManualPart({...manualPart,area:e.target.value})}/>
              </div>
              <div className="span-6">
                <label>Lokasi / Rack</label>
                <input value={manualPart.rackNo} onChange={e=>setManualPart({...manualPart,rackNo:e.target.value})}/>
              </div>
              <div className="span-6">
                <label>Dept</label>
                <input value={manualPart.dept} onChange={e=>setManualPart({...manualPart,dept:e.target.value})}/>
              </div>
            </div>

            <div className="row" style={{marginTop:10}}>
              <button className="btn green" onClick={()=>addPartToDetails(manualPart,'MANUAL')}>Tambah Manual</button>
              <button className="btn" onClick={()=>setManualPart({fiiId:'',partNo:'',partName:'',qtyPerBox:'',area:'',rackNo:'',dept:''})}>Clear</button>
            </div>
          </div>
        </div>
      </div>}
    </div>

    <div className="input-list-header no-print span-12">
      <div>No</div>
      <div>FII / Part</div>
      <div>Box</div>
      <div>Fraction</div>
      <div>Calc</div>
      <div>Total</div>
    </div>

    <div className="span-12">
      {details.map((d,i)=><StoItem key={`${d.id}-${i}`} index={i+1} d={d} mode={mode} update={update} remove={removeDetail}/>)}
    </div>

    <div className="save-bottom no-print">
      <button className="btn green save-full" onClick={submit}>
        {revisionSto?'Simpan Revisi':'Simpan'}
      </button>
    </div>
  </div>
}

function StoItem({d,index,mode,update,remove}:{d:StoDetail,index:number,mode:ViewMode,update:(id:string,p:Partial<StoDetail>)=>void,remove:(id:string)=>void}){ 
  const ok=d.boxQty>0||d.fractionQty>0; 
  const [calcOpen,setCalcOpen]=useState(false);
  const [calc,setCalc]=useState(d.calculationNote||'');

  const boxValue = d.boxQty === 0 ? '' : String(d.boxQty);
  const fractionValue = d.fractionQty === 0 ? '' : String(d.fractionQty);

  const useCalc = () => {
    const result = safeCalc(calc);
    update(d.id,{boxQty:result, calculationNote:calc});
    setCalcOpen(false);
  };

  const addCalc = (value:string) => {
    setCalc(prev => prev + value);
  };

  const backspaceCalc = () => {
    setCalc(prev => prev.slice(0,-1));
  };

  return (
    <>
      <div className={`sto-line ${ok ? 'ok' : ''}`}>
        <div className="sto-col-no">{index}</div>

        <div className="sto-col-fii">
          <div className="fii-main">{d.fiiId}</div>
          {mode === 'FULL' && (
            <div className="fii-sub">
              {d.partNo} • {d.partName} • Q/B {d.qtyPerBox}
            </div>
          )}
        </div>

        <div className="sto-col-input">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            value={boxValue}
            onFocus={e=>e.currentTarget.select()}
            onChange={e=>{
              const raw=e.target.value.replace(/\D/g,'');
              update(d.id,{boxQty:raw===''?0:Number(raw)})
            }}
          />
        </div>

        <div className="sto-col-input">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            value={fractionValue}
            onFocus={e=>e.currentTarget.select()}
            onChange={e=>{
              const raw=e.target.value.replace(/\D/g,'');
              update(d.id,{fractionQty:raw===''?0:Number(raw)})
            }}
          />
        </div>

        <button className="sto-calc-btn" type="button" onClick={()=>setCalcOpen(!calcOpen)}>
          C
        </button>

        <div className="sto-col-total">
          {d.grandTotal === 0 ? '-' : d.grandTotal.toLocaleString('id-ID')}
        </div>
      </div>

      {calcOpen && (
        <div className="sto-calc-panel">
          <div className="calc-title">Calc Box FII {d.fiiId}</div>

          <div className="calc-row">
            <input
              inputMode="decimal"
              type="text"
              value={calc}
              placeholder="3 x 10 + 4"
              onChange={e=>setCalc(e.target.value)}
            />
            <button type="button" className="btn small primary" onClick={useCalc}>
              Pakai
            </button>
          </div>

          <div className="calc-keypad">
            <button type="button" onClick={()=>addCalc('7')}>7</button>
            <button type="button" onClick={()=>addCalc('8')}>8</button>
            <button type="button" onClick={()=>addCalc('9')}>9</button>
            <button type="button" className="op" onClick={()=>addCalc('/')}>÷</button>

            <button type="button" onClick={()=>addCalc('4')}>4</button>
            <button type="button" onClick={()=>addCalc('5')}>5</button>
            <button type="button" onClick={()=>addCalc('6')}>6</button>
            <button type="button" className="op" onClick={()=>addCalc('x')}>×</button>

            <button type="button" onClick={()=>addCalc('1')}>1</button>
            <button type="button" onClick={()=>addCalc('2')}>2</button>
            <button type="button" onClick={()=>addCalc('3')}>3</button>
            <button type="button" className="op" onClick={()=>addCalc('+')}>+</button>

            <button type="button" onClick={()=>addCalc('0')}>0</button>
            <button type="button" onClick={()=>addCalc('00')}>00</button>
            <button type="button" className="op" onClick={backspaceCalc}>⌫</button>
            <button type="button" className="op" onClick={()=>addCalc('-')}>-</button>
          </div>

          <div className="calc-footer">
            <div className="calc-result">
              Hasil Box: <b>{safeCalc(calc)}</b>
            </div>

            <button type="button" className="btn small" onClick={()=>setCalc('')}>
              Clear
            </button>

            <button type="button" className="btn small primary" onClick={useCalc}>
              Pakai
            </button>
          </div>
        </div>
      )}
    </>
  )
}



function CheckSto({user,stos,setStos}:{user:User,stos:StoHeader[],setStos:(s:StoHeader[])=>void}){
  const list=stos.filter(s=>s.status==='COUNTED');
  const updateSto=(sto:StoHeader)=>setStos(stos.map(s=>s.stoId===sto.stoId?sto:s));

  const updateDetailCheck=(sto:StoHeader, detailId:string, patch:any)=>{
    const at=nowIso();
    updateSto({
      ...sto,
      details:sto.details.map(d=>d.id===detailId?{
        ...d,
        ...patch,
        leaderCheckedBy:user.fullName,
        leaderCheckedAt:at
      }:d)
    } as any);
  };

  const checkAll=(sto:StoHeader)=>{
    const ngItems = sto.details.filter((d:any)=>d.leaderCheckStatus===false && d.leaderNgNote);
    if(ngItems.length>0){
      alert(`Masih ada ${ngItems.length} item NG. Jika masih NG, gunakan tombol Minta Revisi.`);
      return;
    }

    const at=nowIso();
    updateSto({
      ...sto,
      status:'CHECKED' as any,
      leaderUserId:user.id,
      leaderName:user.fullName,
      leaderSignedAt:at,
      details:sto.details.map(d=>({
        ...d,
        leaderCheckStatus:true,
        leaderNgNote:'',
        leaderCheckedBy:user.fullName,
        leaderCheckedAt:at
      }))
    } as any);
  };

  const requestRevision=(sto:StoHeader)=>{
    const ngDetails = sto.details.filter((d:any)=>d.leaderCheckStatus===false && d.leaderNgNote);
    const ngSummary = ngDetails.map((d:any)=>`${d.fiiId || d.partNo}: ${d.leaderNgNote}`).join('\\n');

    const note=prompt(
      `Alasan revisi untuk Tag ${sto.tagNo}?\\n\\nItem NG:\\n${ngSummary || '-'}`,
      ngSummary || (sto as any).revisionNote || ''
    );
    if(note===null) return;

    const at=nowIso();

    updateSto({
      ...sto,
      status:'REVISION' as any,
      leaderUserId:user.id,
      leaderName:user.fullName,
      leaderSignedAt:at,
      revisionNote:note || 'Perlu revisi',
      revisionBy:user.fullName,
      revisionAt:at,
      details:sto.details.map(d=>({
        ...d,
        leaderCheckStatus:false
      }))
    } as any);

    alert(`Tag ${sto.tagNo} dikembalikan ke operator untuk revisi.`);
  };

  return <div className="grid">
    <div className="card span-12">
      <h2>Leader Check</h2>
      <p className="muted">Tandai OK/NG per item. Jika ada NG, isi catatan lalu klik Minta Revisi.</p>
    </div>

    {list.length===0 && <div className="card span-12">
      <p className="muted">Tidak ada STO dengan status COUNTED yang menunggu check leader.</p>
    </div>}

    {list.map(sto=><div className="card span-12" key={sto.stoId}>
      <div className="between">
        <div>
          <b>{sto.tagNo}</b> • {sto.creatorName} • {sto.details.length} item
          <div className="sub">{sto.stoNo} • {sto.stoDate} • Waktu {Math.round((Number(sto.durationHour)||0)*3600)} sec</div>
        </div>
        <div className="row">
          <button className="btn green" onClick={()=>checkAll(sto)}>Check OK Per Tag</button>
          <button className="btn orange" onClick={()=>requestRevision(sto)}>Minta Revisi</button>
        </div>
      </div>

      <div className="table-wrap" style={{marginTop:10}}>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>FII</th>
              <th>Part</th>
              <th>Box</th>
              <th>Fraction</th>
              <th>Total</th>
              <th>Catatan NG</th>
            </tr>
          </thead>
          <tbody>
            {sto.details.map((d:any,i)=><tr key={`${d.id}-${i}`} className={d.leaderCheckStatus===false && d.leaderNgNote?'ng-row':d.leaderCheckStatus?'ok-row':''}>
              <td>
                <div className="row nowrap">
                  <button
                    className={`btn small ${d.leaderCheckStatus===true?'green':''}`}
                    onClick={()=>updateDetailCheck(sto,d.id,{leaderCheckStatus:true,leaderNgNote:''})}
                  >
                    OK
                  </button>
                  <button
                    className={`btn small ${d.leaderCheckStatus===false && d.leaderNgNote?'red':'orange'}`}
                    onClick={()=>{
                      const note=prompt(`Catatan NG untuk ${d.fiiId} / ${d.partNo}`, d.leaderNgNote || '');
                      if(note===null) return;
                      updateDetailCheck(sto,d.id,{leaderCheckStatus:false,leaderNgNote:note || 'NG'});
                    }}
                  >
                    NG
                  </button>
                </div>
              </td>
              <td>{d.fiiId}</td>
              <td>{d.partNo}<br/><span className="muted">{d.partName}</span></td>
              <td>{d.boxQty}</td>
              <td>{d.fractionQty}</td>
              <td>{d.grandTotal}</td>
              <td>{d.leaderNgNote || '-'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>)}
  </div>
}



function Resume({user,parts,stos,setStos}:{user:User,parts:Part[],stos:StoHeader[],setStos:(s:StoHeader[])=>void}){
  const [printDate,setPrintDate]=useState(today());
  const [printMode,setPrintMode]=useState<'NONE'|'ONE'|'MASS'>('NONE');
  const [printStoId,setPrintStoId]=useState('');

  const dateKey=(v:any)=>{
    if(!v) return '';
    if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
    const d=new Date(v);
    if(Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0,10);
  };

  const fmtDate=(v:any)=>{
    const key=dateKey(v);
    if(!key) return '-';
    const [y,m,d]=key.split('-');
    return `${d}/${m}/${y}`;
  };

  const exportExcel=()=>{
    const rows=stos.flatMap(s=>s.details.map(d=>{
      const p=parts.find(x=>x.partNo===d.partNo);
      return {
        'FII ID':d.fiiId,
        'PART NUMBER':d.partNo,
        'PART NAME':d.partName,
        'QTY(PCS/KG)':d.grandTotal,
        'AREA':p?.area||s.area,
        'LOKASI & NO RACK':p?.rackNo||'',
        'DEPT':p?.dept||'',
        'WAKTU':Math.round(((Number(s.durationHour)||0)*3600)/Math.max((s.details||[]).length,1)),
        'TAG':s.tagNo,
        'PIC':s.creatorName,
        'BOX':d.boxQty,
        'FRACTION':d.fractionQty,
        'CALCULATION NOTE':d.calculationNote,
        'STATUS':s.status
      }
    }));

    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'STO Report');
    XLSX.writeFile(wb,`STO_Report_${today()}.xlsx`);
  };

  const deleteSto=(sto:StoHeader)=>{
    const allowed = user.role==='ADMIN' || sto.status==='REVISION';
    if(!allowed){
      alert('Hapus STO hanya boleh oleh ADMIN, atau data yang statusnya REVISION.');
      return;
    }

    if(confirm(`Hapus data STO ${sto.stoNo} / Tag ${sto.tagNo}?`)){
      setStos(stos.filter(s=>s.stoId!==sto.stoId));
      alert('Data STO berhasil dihapus.');
    }
  };

  const doPrintOne=(sto:StoHeader)=>{
    window.open(`/print?stoId=${encodeURIComponent(sto.stoId)}`,'_blank');
  };

  const doPrintMass=()=>{
    const selected=stos.filter(s=>dateKey(s.stoDate)===printDate);
    if(selected.length===0){
      alert(`Tidak ada data STO untuk tanggal ${fmtDate(printDate)}`);
      return;
    }
    const ids=selected.map(s=>s.stoId).join(',');
    window.open(`/print?ids=${encodeURIComponent(ids)}`,'_blank');
  };

  useEffect(()=>{
    const cleanup=()=>{
      setPrintMode('NONE');
      setPrintStoId('');
      document.body.classList.remove('print-one-mode');
      document.body.classList.remove('print-mass-mode');
      document.querySelectorAll('.resume-card').forEach(el=>el.classList.remove('print-force-show'));
    };

    window.addEventListener('afterprint', cleanup);
    return ()=>window.removeEventListener('afterprint', cleanup);
  },[]);

  const massCount=stos.filter(s=>dateKey(s.stoDate)===printDate).length;

  return <div className={`grid resume-page print-mode-${printMode.toLowerCase()}`}>
    <div className="card span-12 no-print">
      <div className="between">
        <div>
          <h2>Resume STO</h2>
          <p className="muted">Export Excel, print per tag, print masal per tanggal, dan hapus transaksi.</p>
        </div>
        <button className="btn primary" onClick={exportExcel}>Export Excel</button>
      </div>

      <div className="resume-print-toolbar">
        <div>
          <label>Tanggal Print Masal</label>
          <input type="date" value={printDate} onChange={e=>setPrintDate(e.target.value)}/>
        </div>
        <button className="btn green" onClick={doPrintMass}>Print Masal Tanggal ({massCount})</button>
      </div>
    </div>

    {stos.map(sto=>{
      const isDateTarget=dateKey(sto.stoDate)===printDate;
      const isSingleTarget=sto.stoId===printStoId;

      return <div
        key={sto.stoId}
        data-sto-id={sto.stoId}
        className={`card span-12 resume-card ${isDateTarget?'print-date-target':''} ${isSingleTarget?'print-single-target':''}`}
      >
        <div className="between no-print">
          <div>
            <b>{sto.stoNo}</b> <span className={`badge ${String(sto.status).toLowerCase()}`}>{sto.status}</span>
            <div className="sub">{fmtDate(sto.stoDate)} • Tag {sto.tagNo} • PIC {sto.creatorName} • Waktu {Math.round((Number(sto.durationHour)||0)*3600)} sec</div>
          </div>
          <div className="row">
            <button className="btn" onClick={()=>doPrintOne(sto)}>Print</button>
            <button className="btn red" onClick={()=>deleteSto(sto)}>Hapus</button>
          </div>
        </div>
      </div>
    })}
  </div>
}

function AuditPrint({sto,parts}:{sto:StoHeader,parts:Part[]}){
  const dateKey=(v:any)=>{
    if(!v) return '';
    if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
    const d=new Date(v);
    if(Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0,10);
  };

  const fmtDate=(v:any)=>{
    const key=dateKey(v);
    if(!key) return '-';
    const [y,m,d]=key.split('-');
    return `${d}/${m}/${y}`;
  };

  const firstDetail:any = sto.details?.[0];
  const firstPart = firstDetail ? parts.find(p=>p.partNo===firstDetail.partNo) : undefined;

  const area = sto.area || firstPart?.area || '';
  const location = firstPart?.rackNo || '';

  const rows:any[] = [...(sto.details||[])];

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

  const timeOfCount = sto.durationHour !== undefined && sto.durationHour !== null
    ? `${sto.durationHour} Jam`
    : '-';

  return <div className="print-a4-page">
    <div className="print-title">STOCK TAKING TAG</div>

    <div className="print-head">
      <div className="print-info">
        <div className="print-info-row">
          <div className="print-label">DATE</div>
          <div>{fmtDate(sto.stoDate)}</div>
        </div>
        <div className="print-info-row">
          <div className="print-label">AREA</div>
          <div>{area}</div>
        </div>
        <div className="print-info-row">
          <div className="print-label">TAG NUMBER</div>
          <div>{sto.tagNo}</div>
        </div>
        <div className="print-info-row">
          <div className="print-label">LOCATION OR<br/>RACK NUMBER</div>
          <div>{location}</div>
        </div>
      </div>

      <div className="print-count-name">
        <div className="print-count-label">NAME OF COUNT :</div>
        <div className="print-count-value">{sto.creatorName}</div>
      </div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th rowSpan={2}>NO</th>
          <th rowSpan={2}>PART NUMBER</th>
          <th rowSpan={2}>FII ID</th>
          <th rowSpan={2}>PART NAME</th>
          <th>QTY/BOX<br/><span>(a)</span></th>
          <th>JUMLAH BOX<br/><span>(b)</span></th>
          <th>TOTAL<br/><span>(a) × (b)</span></th>
          <th>FRACTION<br/><span>(d)</span></th>
          <th>GRAND TOTAL<br/><span>(c) + (d)</span></th>
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
          const p=parts.find(x=>x.partNo===d.partNo);
          const qtyPerBox=Number(d.qtyPerBox||0);
          const boxQty=Number(d.boxQty||0);
          const fractionQty=Number(d.fractionQty||0);
          const grandTotal=Number(d.grandTotal||0);
          const total=qtyPerBox*boxQty;

          return <tr key={`${d.id}-${i}`}>
            <td className="center">{i+1}</td>
            <td>{d.partNo}</td>
            <td className="center">{d.fiiId}</td>
            <td>{d.partName}</td>
            <td className="num">{qtyPerBox ? qtyPerBox.toLocaleString('id-ID') : ''}</td>
            <td className="num">{boxQty ? boxQty.toLocaleString('id-ID') : ''}</td>
            <td className="num">{total ? total.toLocaleString('id-ID') : ''}</td>
            <td className="num">{fractionQty ? fractionQty.toLocaleString('id-ID') : ''}</td>
            <td className="num">{grandTotal ? grandTotal.toLocaleString('id-ID') : ''}</td>
            <td>{p?.rackNo || ''}</td>
          </tr>
        })}
      </tbody>
    </table>

    <div className="print-footer">
      <div className="print-number-box">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
        <span>7</span>
        <span>8</span>
        <span>9</span>
      </div>

      <div className="print-sign-box">
        <div className="print-sign-title">SIGN</div>
        <div className="print-sign-grid">
          <div>Auditor</div>
          <div>Leader Team</div>
          <div>Count</div>
        </div>
        <div className="print-sign-empty">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="print-time-row">
          <div>Time of Count :</div>
          <div>{timeOfCount}</div>
        </div>
      </div>
    </div>
  </div>
}


function Master({parts,setParts,tags,setTags,tagDetails,setTagDetails,users,setUsers}:{parts:Part[],setParts:any,tags:Tag[],setTags:any,tagDetails:TagDetail[],setTagDetails:any,users:User[],setUsers:any}){   
  const [tab,setTab]=useState<'MasterSTO'|'User'>('MasterSTO');
  const [search,setSearch]=useState('');

  const emptyMaster={
    fiiId:'',
    partNo:'',
    partName:'',
    qtyPerBox:'',
    area:'',
    rackNo:'',
    dept:'',
    tagNo:'',
    sequenceNo:'',
    active:true
  };

  const [form,setForm]=useState<any>(emptyMaster);
  const [editKey,setEditKey]=useState('');

  const cleanNumber=(v:any)=>{
    if(v===undefined || v===null) return 0;
    const s=String(v).replace(/,/g,'').replace(/\s/g,'').trim();
    return Number(s)||0;
  };

  const masterRows = useMemo(()=>{
    return tagDetails.map(td=>{
      const p=parts.find(x=>x.partNo===td.partNo);
      const t=tags.find(x=>x.tagNo===td.tagNo);

      return {
        key:`${td.tagNo}__${td.partNo}`,
        id:td.id,
        'FII ID': p?.fiiId || '',
        'PART NUMBER': td.partNo,
        'PART NAME': p?.partName || '',
        'QTY/BOX': p?.qtyPerBox || 0,
        'AREA': p?.area || t?.area || '',
        'LOKASI & NO RACK': p?.rackNo || '',
        'DEPT': p?.dept || '',
        'TAG': td.tagNo,
        'SEQUENCE': td.sequenceNo || 0,
        active:td.active!==false && p?.active!==false && t?.active!==false
      };
    }).sort((a,b)=>String(a.TAG).localeCompare(String(b.TAG)) || Number(a.SEQUENCE)-Number(b.SEQUENCE) || String(a['FII ID']).localeCompare(String(b['FII ID'])));
  },[parts,tags,tagDetails]);

  const filteredRows=useMemo(()=>{
    const q=search.trim().toLowerCase();

    if(!q) return masterRows;

    return masterRows.filter((r:any)=>{
      return String(r['FII ID']||'').toLowerCase().includes(q)
        || String(r['PART NUMBER']||'').toLowerCase().includes(q)
        || String(r['PART NAME']||'').toLowerCase().includes(q)
        || String(r['AREA']||'').toLowerCase().includes(q)
        || String(r['LOKASI & NO RACK']||'').toLowerCase().includes(q)
        || String(r['DEPT']||'').toLowerCase().includes(q)
        || String(r['TAG']||'').toLowerCase().includes(q);
    });
  },[masterRows,search]);

  const exportMasterSto=()=>{
    const rows=masterRows.map((r:any)=>({
      'FII ID':r['FII ID'],
      'PART NUMBER':r['PART NUMBER'],
      'PART NAME':r['PART NAME'],
      'QTY/BOX':r['QTY/BOX'],
      'AREA':r['AREA'],
      'LOKASI & NO RACK':r['LOKASI & NO RACK'],
      'DEPT':r['DEPT'],
      'TAG':r['TAG']
    }));

    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'MASTER STO');
    XLSX.writeFile(wb,`Master_STO_${today()}.xlsx`);
  };

  const importMasterSto=(e:any)=>{
    const file=e.target.files?.[0];
    if(!file) return;

    const reader=new FileReader();

    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target?.result,{type:'binary'});
      const rows:any[]=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const nextParts:Part[]=[];
      const tagMap=new Map<string,Tag>();
      const nextTagDetails:TagDetail[]=[];
      const usedSeq=new Map<string,number>();

      rows.forEach((r)=>{
        const fiiId=String(r['FII ID'] || r['fiiId'] || '').trim();
        const partNo=String(r['PART NUMBER'] || r['Part Number'] || r.partNo || '').trim();
        const partName=String(r['PART NAME'] || r['Part Name'] || r.partName || '').trim();
        const qtyPerBox=cleanNumber(r['QTY/BOX'] || r['QTY BOX'] || r['QTY PER BOX'] || r['Qty Per Box'] || r.qtyPerBox || 0);
        const area=String(r['AREA'] || r.Area || r.area || '').trim();
        const rackNo=String(r['LOKASI & NO RACK'] || r['Rack Number'] || r.rackNo || '').trim();
        const dept=String(r['DEPT'] || r.Dept || r.dept || '').trim();
        const tagNo=String(r['TAG'] || r['Tag'] || r.tagNo || '').trim();

        if(!partNo || !tagNo) return;

        if(!nextParts.some(p=>p.partNo===partNo)){
          nextParts.push({
            partNo,
            fiiId,
            partName,
            qtyPerBox,
            area,
            rackNo,
            dept,
            active:true
          });
        }

        if(!tagMap.has(tagNo)){
          tagMap.set(tagNo,{
            tagNo,
            area:area || 'RM',
            description:`TAG ${tagNo}`,
            active:true
          });
        }

        const seq=(usedSeq.get(tagNo)||0)+1;
        usedSeq.set(tagNo,seq);

        nextTagDetails.push({
          id:uid('TD'),
          tagNo,
          partNo,
          sequenceNo:seq,
          active:true
        });
      });

      setParts(nextParts);
      setTags(Array.from(tagMap.values()));
      setTagDetails(nextTagDetails);

      alert(`Import Master STO selesai.\nPart: ${nextParts.length}\nTag: ${tagMap.size}\nDetail: ${nextTagDetails.length}`);
      e.target.value='';
    };

    reader.readAsBinaryString(file);
  };

  const editRow=(r:any)=>{
    setEditKey(`${r['TAG']}__${r['PART NUMBER']}`);

    setForm({
      fiiId:r['FII ID'] || '',
      partNo:r['PART NUMBER'] || '',
      partName:r['PART NAME'] || '',
      qtyPerBox:r['QTY/BOX'] || '',
      area:r['AREA'] || '',
      rackNo:r['LOKASI & NO RACK'] || '',
      dept:r['DEPT'] || '',
      tagNo:r['TAG'] || '',
      sequenceNo:r['SEQUENCE'] || '',
      active:r.active!==false
    });

    window.scrollTo({top:0,behavior:'smooth'});
  };

  const clearForm=()=>{
    setForm(emptyMaster);
    setEditKey('');
  };

  const saveMasterRow=()=>{
    const partNo=String(form.partNo||'').trim();
    const tagNo=String(form.tagNo||'').trim();

    if(!partNo || !tagNo){
      alert('PART NUMBER dan TAG wajib diisi');
      return;
    }

    const payloadPart:any={
      partNo,
      fiiId:String(form.fiiId||'').trim(),
      partName:String(form.partName||'').trim(),
      qtyPerBox:cleanNumber(form.qtyPerBox),
      area:String(form.area||'').trim(),
      rackNo:String(form.rackNo||'').trim(),
      dept:String(form.dept||'').trim(),
      active:form.active!==false
    };

    const payloadTag:any={
      tagNo,
      area:payloadPart.area || 'RM',
      description:`TAG ${tagNo}`,
      active:true
    };

    const seq=Number(form.sequenceNo||0) || (
      Math.max(0,...tagDetails.filter(td=>td.tagNo===tagNo).map(td=>Number(td.sequenceNo)||0)) + 1
    );

    const newKey=`${tagNo}__${partNo}`;

    const duplicate=tagDetails.some((td:any)=>{
      const key=`${td.tagNo}__${td.partNo}`;
      return key===newKey && key!==editKey;
    });

    if(duplicate){
      alert(`Part ${partNo} sudah ada di TAG ${tagNo}`);
      return;
    }

    setParts(prev=>{
      const exists=prev.some((p:any)=>p.partNo===partNo);

      if(exists){
        return prev.map((p:any)=>p.partNo===partNo?{...p,...payloadPart}:p);
      }

      return [payloadPart,...prev];
    });

    setTags(prev=>{
      const exists=prev.some((t:any)=>t.tagNo===tagNo);

      if(exists){
        return prev.map((t:any)=>t.tagNo===tagNo?{...t,...payloadTag}:t);
      }

      return [payloadTag,...prev];
    });

    setTagDetails(prev=>{
      let next=[...prev];

      if(editKey){
        const [oldTag,oldPart]=editKey.split('__');
        next=next.filter((td:any)=>!(td.tagNo===oldTag && td.partNo===oldPart));
      }

      next.push({
        id:uid('TD'),
        tagNo,
        partNo,
        sequenceNo:seq,
        active:form.active!==false
      });

      return next.sort((a,b)=>String(a.tagNo).localeCompare(String(b.tagNo)) || Number(a.sequenceNo)-Number(b.sequenceNo));
    });

    alert(editKey?'Master berhasil diupdate':'Master berhasil ditambahkan');
    clearForm();
  };

  const deleteRow=(r:any)=>{
    const tagNo=String(r['TAG']);
    const partNo=String(r['PART NUMBER']);

    if(!confirm(`Hapus part ${partNo} dari TAG ${tagNo}?`)) return;

    setTagDetails(prev=>{
      const next=prev.filter((td:any)=>!(td.tagNo===tagNo && td.partNo===partNo));

      // Bersihkan TAG yang sudah tidak punya detail aktif
      const usedTags=new Set(
        next
          .filter((td:any)=>td.active!==false)
          .map((td:any)=>String(td.tagNo))
      );

      setTags(ts=>ts.filter((t:any)=>usedTags.has(String(t.tagNo))));

      // Bersihkan PART yang sudah tidak dipakai di tag mana pun
      const usedParts=new Set(
        next
          .filter((td:any)=>td.active!==false)
          .map((td:any)=>String(td.partNo))
      );

      setParts(ps=>ps.filter((p:any)=>usedParts.has(String(p.partNo))));

      return next;
    });

    alert('Data master berhasil dihapus');
  };

  return <div className="grid master-page">
    <div className="card span-12">
      <div className="row">
        <button className={`btn ${tab==='MasterSTO'?'primary':''}`} onClick={()=>setTab('MasterSTO')}>Master STO</button>
        <button className={`btn ${tab==='User'?'primary':''}`} onClick={()=>setTab('User')}>User Management</button>

        {tab==='MasterSTO' && <>
          <button className="btn primary" onClick={exportMasterSto}>Export Master STO</button>
          <label className="btn ghost">
            Import Master STO
            <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={importMasterSto}/>
          </label>
        </>}
      </div>
    </div>

    {tab==='User' && <UserManagement users={users} setUsers={setUsers}/>}

    {tab==='MasterSTO' && <>
      <div className="card span-12 master-form-card">
        <div className="between">
          <div>
            <h2 className="title">{editKey?'Edit Master STO':'Tambah Master STO'}</h2>
            <div className="sub">Tambah, edit, delete part/tag langsung dari aplikasi. Import/export Excel tetap tersedia.</div>
          </div>
          <span className="badge counted">{masterRows.length} item</span>
        </div>

        <div className="grid">
          <div className="span-3">
            <label>FII ID</label>
            <input value={form.fiiId} onChange={e=>setForm({...form,fiiId:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Part Number</label>
            <input value={form.partNo} onChange={e=>setForm({...form,partNo:e.target.value})}/>
          </div>
          <div className="span-6">
            <label>Part Name</label>
            <input value={form.partName} onChange={e=>setForm({...form,partName:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>QTY/BOX</label>
            <input type="number" value={form.qtyPerBox} onChange={e=>setForm({...form,qtyPerBox:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Area</label>
            <input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Lokasi / Rack</label>
            <input value={form.rackNo} onChange={e=>setForm({...form,rackNo:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Dept</label>
            <input value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Tag</label>
            <input value={form.tagNo} onChange={e=>setForm({...form,tagNo:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Sequence</label>
            <input type="number" value={form.sequenceNo} onChange={e=>setForm({...form,sequenceNo:e.target.value})}/>
          </div>
          <div className="span-3">
            <label>Status</label>
            <select value={form.active?'Y':'N'} onChange={e=>setForm({...form,active:e.target.value==='Y'})}>
              <option value="Y">Active</option>
              <option value="N">Inactive</option>
            </select>
          </div>
          <div className="span-3">
            <label>Aksi</label>
            <div className="row">
              <button className="btn green" onClick={saveMasterRow}>{editKey?'Update':'Tambah'}</button>
              <button className="btn" onClick={clearForm}>Clear</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card span-12">
        <div className="between" style={{marginBottom:10}}>
          <div>
            <h2 className="title">Master STO</h2>
            <div className="sub">Search, edit, delete, import, dan export master.</div>
          </div>
          <div style={{minWidth:260}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search FII / Part / Name / Area / Rack / Tag"/>
          </div>
        </div>

        <div className="table-wrap master-table-wrap">
          <table>
            <thead>
              <tr>
                <th>FII ID</th>
                <th>PART NUMBER</th>
                <th>PART NAME</th>
                <th>QTY/BOX</th>
                <th>AREA</th>
                <th>LOKASI & NO RACK</th>
                <th>DEPT</th>
                <th>TAG</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r:any)=><tr key={r.key}>
                <td>{r['FII ID']}</td>
                <td>{r['PART NUMBER']}</td>
                <td>{r['PART NAME']}</td>
                <td>{Number(r['QTY/BOX']||0).toLocaleString('id-ID')}</td>
                <td>{r['AREA']}</td>
                <td>{r['LOKASI & NO RACK']}</td>
                <td>{r['DEPT']}</td>
                <td><b>{r['TAG']}</b></td>
                <td>
                  <div className="row">
                    <button className="btn small" onClick={()=>editRow(r)}>Edit</button>
                    <button className="btn small red" onClick={()=>deleteRow(r)}>Delete</button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>}
  </div>   
}

function UserManagement({users,setUsers}:{users:User[],setUsers:(u:User[])=>void}){
  const empty:User={id:'',username:'',password:'1234',fullName:'',role:'OPERATOR',defaultArea:'RM',signatureName:'',active:true};
  const [form,setForm]=useState<User>(empty);
  const [loading,setLoading]=useState(false);

  const refreshUsers=async()=>{
    const res=await fetch('/api/users');
    const j=await res.json();
    if(j.ok && j.users) setUsers(j.users);
  };

  useEffect(()=>{
    refreshUsers().catch(()=>{});
  },[]);

  const edit=(u:User)=>setForm({...u,password:u.password||'1234'});

  const saveUser=async()=>{
    if(!String(form.username||'').trim() || !String(form.fullName||'').trim()){
      alert('Username dan Full Name wajib diisi');
      return;
    }

    setLoading(true);

    try{
      const payload={
        ...form,
        id:form.id || uid('U'),
        username:String(form.username||'').trim(),
        password:String(form.password||'1234').trim(),
        fullName:String(form.fullName||'').trim(),
        signatureName:String(form.signatureName||form.fullName||'').trim(),
        active:form.active!==false
      };

      const res=await fetch('/api/users',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });

      const j=await res.json();

      if(!j.ok){
        alert(j.message || 'Gagal simpan user');
        return;
      }

      setUsers(j.users || []);
      setForm(empty);
      alert('User tersimpan ke database Neon.');
    }catch(e:any){
      alert('Gagal koneksi database saat simpan user.');
    }finally{
      setLoading(false);
    }
  };

  const resetPass=async(u:User)=>{
    if(!confirm(`Reset password ${u.username} ke 1234?`)) return;

    const res=await fetch('/api/users',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:u.id,action:'resetPassword'})
    });

    const j=await res.json();

    if(j.ok) setUsers(j.users || []);
    else alert(j.message || 'Gagal reset password');
  };

  const toggle=async(u:User)=>{
    const res=await fetch('/api/users',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:u.id,action:'toggleActive'})
    });

    const j=await res.json();

    if(j.ok) setUsers(j.users || []);
    else alert(j.message || 'Gagal update status');
  };

  const remove=async(u:User)=>{
    if(!confirm(`Hapus user ${u.username}?`)) return;

    const res=await fetch(`/api/users?id=${encodeURIComponent(u.id)}`,{
      method:'DELETE'
    });

    const j=await res.json();

    if(j.ok) setUsers(j.users || []);
    else alert(j.message || 'Gagal hapus user');
  };

  return <div className="card span-12">
    <h2 className="title">User Management</h2>
    <p className="muted">Data user tersimpan di Neon PostgreSQL dan dapat dipakai dari komputer maupun HP.</p>

    <div className="grid">
      <div className="span-3">
        <label>Username</label>
        <input value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
      </div>

      <div className="span-3">
        <label>Password</label>
        <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      </div>

      <div className="span-3">
        <label>Full Name</label>
        <input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value,signatureName:e.target.value})}/>
      </div>

      <div className="span-3">
        <label>Role</label>
        <select value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>
          <option>ADMIN</option>
          <option>OPERATOR</option>
          <option>LEADER</option>
        </select>
      </div>

      <div className="span-3">
        <label>Default Area</label>
        <select value={form.defaultArea} onChange={e=>setForm({...form,defaultArea:e.target.value})}>
          <option>RM</option>
          <option>WIP</option>
          <option>FG</option>
          <option>P</option>
          <option>S</option>
          <option>RAK 1</option>
          <option>RAK 2</option>
        </select>
      </div>

      <div className="span-3">
        <label>Signature Name</label>
        <input value={form.signatureName||''} onChange={e=>setForm({...form,signatureName:e.target.value})}/>
      </div>

      <div className="span-3">
        <label>Status</label>
        <select value={form.active?'Y':'N'} onChange={e=>setForm({...form,active:e.target.value==='Y'})}>
          <option value="Y">Active</option>
          <option value="N">Inactive</option>
        </select>
      </div>

      <div className="span-3">
        <label>Aksi</label>
        <div className="row">
          <button className="btn green" onClick={saveUser} disabled={loading}>
            {loading?'Saving...':form.id?'Update':'Tambah'}
          </button>
          <button className="btn" onClick={()=>setForm(empty)}>Clear</button>
        </div>
      </div>
    </div>

    <div className="table-wrap" style={{marginTop:12}}>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Area</th>
            <th>Signature</th>
            <th>Active</th>
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody>
          {users.map(u=><tr key={u.id}>
            <td>{u.username}</td>
            <td>{u.fullName}</td>
            <td>{u.role}</td>
            <td>{u.defaultArea}</td>
            <td>{u.signatureName||u.fullName}</td>
            <td>{u.active?'Y':'N'}</td>
            <td>
              <div className="row">
                <button className="btn small" onClick={()=>edit(u)}>Edit</button>
                <button className="btn small ghost" onClick={()=>resetPass(u)}>Reset PW</button>
                <button className="btn small orange" onClick={()=>toggle(u)}>{u.active?'Nonaktif':'Aktifkan'}</button>
                <button className="btn small red" onClick={()=>remove(u)}>Hapus</button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>
}

