"use client";
import {useEffect,useState} from "react";

/** Local animation only: completion and errors always come from the saved job. */
export function PreparationRing({startedAt,complete=false,paused=false,annual=false,completed=0,total=0}:{startedAt?:string;complete?:boolean;paused?:boolean;annual?:boolean;completed?:number;total?:number}){
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{const start=Date.parse(startedAt??"");if(!Number.isFinite(start))return;
    const tick=()=>setElapsed(Math.max(0,Math.floor((Date.now()-start)/1000)));tick();
    if(complete||paused)return;const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[startedAt,complete,paused]);
  const value=complete?100:annual?Math.min(100,Math.floor(elapsed/390*100)):Math.min(95,Math.floor(Math.max(5+35*(1-Math.exp(-elapsed/200)),total?40+50*completed/Math.max(1,total):0)));
  return <div className="flex flex-wrap items-center justify-center gap-4 py-3 text-[#07576c]">
    <div className="relative size-24 shrink-0" role="progressbar" aria-label="Avance estimado de la preparación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="#cce5eb" strokeWidth="8"/><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={264} strokeDashoffset={264*(1-value/100)} className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000"/></svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-bold tabular-nums">{value}%</span>
    </div>
    <div className="text-left text-sm"><p className="font-semibold">{complete?"Preparación guardada":paused?"Preparación pausada":"Avance estimado"}</p><p className="mt-1 tabular-nums">{Math.floor(elapsed/60)} min {elapsed%60} s</p>{!complete&&<p className="mt-1 max-w-xs">{paused?"Conservamos el trabajo guardado.":annual&&value===100?"Ayni sigue preparando el resultado. Aparecerá cuando esté guardado.":"La preparación termina cuando Ayni guarda y verifica el resultado."}</p>}</div>
  </div>;
}
