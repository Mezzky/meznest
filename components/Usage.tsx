"use client";
import {useEffect,useState} from 'react';
type Window={usedPercent:number;windowDurationMins?:number;resetsAt?:number};
type Bucket={limitName?:string;primary?:Window;secondary?:Window};
export default function Usage(){
 const [data,setData]=useState<{buckets:Bucket[];allowed:boolean|null}|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function refresh(){setLoading(true);setError('');try{const r=await fetch('/api/office?usage=1');const d=await r.json();if(!r.ok)throw Error(d.error||'Usage unavailable');setData(d);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer);},[]);
 return <div className="usage-panel"><p>Your account limits, reported by local Codex.</p>{loading&&!data&&<p role="status">Checking usage…</p>}{error&&<p role="alert">{error}</p>}{data?.allowed===false&&<p>Codex reports that included usage is currently unavailable.</p>}{data?.buckets.map((b,i)=><section className="usage-bucket" key={i}><h3>{b.limitName||'Codex'}</h3>{[b.primary,b.secondary].filter(Boolean).map((window,j)=>{const w=window!,used=Math.max(0,Math.min(100,w.usedPercent)),remaining=Math.round(100-used);return <div className="usage-window" key={j}><div><strong>{w.windowDurationMins ? (w.windowDurationMins>=1440?`${Math.round(w.windowDurationMins/1440)}-day limit`:`${w.windowDurationMins/60}-hour limit`):j?'Secondary limit':'Primary limit'}</strong><span>{remaining}% remaining</span></div><progress value={remaining} max={100} aria-label="Codex capacity remaining" aria-valuetext={`${remaining}% remaining`}/><small>{w.resetsAt?`Resets ${new Date(w.resetsAt*1000).toLocaleString()}`:'Reset time unavailable'}</small></div>})}{!b.primary&&!b.secondary&&<p>No usage windows reported.</p>}</section>)}{data&&!data.buckets.length&&<p>No limits were reported for this account.</p>}</div>;
}
