"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { multiAgeAppRequest as api, multiAgeDownloadUrl } from '@/src/lib/multi-age-app-client';
import { PeriodConsolidated } from './period-consolidated';
import { WorkflowFeedback } from './workflow-ui';

type Overview={sourceFingerprint:string;ready:boolean;progress:{total:number;confirmed:number;concluded:number;valued:number;pending:number;blockers:number;annualUnvalued:number};
  closure:{closed:boolean;current:boolean;currentVersionId:string|null;versions:{id:string;version:number;confirmed_at:string}[];events:{type:string;reason?:string;at:string}[]}};
type Props={classroomId:string;periodId:string;periodLabel:string;revision:object;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>;onReview:(studentId:string,competencyId:string)=>void};

export function MultiAgePeriodConsolidated({classroomId,periodId,periodLabel,revision,run,onReview}:Props){
  const [result,setResult]=useState<{revision:object;periodId:string;reload:number;overview:Overview|null;error:string}|null>(null),[reload,setReload]=useState(0);
  const current=result?.revision===revision&&result?.periodId===periodId&&result?.reload===reload?result:null;
  const overview=current?.overview??null,error=current?.error??'';
  useEffect(()=>{
    let active=true;
    api<Overview>(`/periods/overview?classroomId=${encodeURIComponent(classroomId)}&periodId=${encodeURIComponent(periodId)}`)
      .then(value=>{if(active)setResult({revision,periodId,reload,overview:value,error:''});}).catch(cause=>{if(active)setResult({revision,periodId,reload,overview:null,error:cause instanceof Error?cause.message:'No se pudo cargar el bimestre.'});});
    return ()=>{active=false;};
  },[classroomId,periodId,revision,reload]);
  async function submit(event:FormEvent<HTMLFormElement>,reopen:boolean){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);if(!overview)return;
    const saved=await run(reopen?'/periods/reopen':'/periods/close',{teacherConfirmed:true,classroomId,periodId,expectedCurrentVersionId:overview.closure.currentVersionId,
      ...(reopen?{reason:data.get('reason')}:{expectedSourceFingerprint:overview.sourceFingerprint,pendingAcknowledged:data.get('pending')==='on'})});
    if(saved){form.reset();setReload(value=>value+1);}
  }
  return <section className="mt-5 min-w-0 space-y-5">
    {error&&<WorkflowFeedback tone="error">{error} <Button variant="outline" onClick={()=>setReload(value=>value+1)}>Reintentar</Button></WorkflowFeedback>}
    {!overview&&!error&&<p role="status">Comprobando el bimestre y sus fuentes…</p>}
    {overview&&<>
      <div className="ayni-panel space-y-3 p-4 sm:p-5"><h2 className="text-lg font-bold">{periodLabel} · {overview.closure.closed?'Cerrado':'Abierto'}</h2>
        <p>{overview.progress.valued} valoraciones confirmadas · {overview.progress.concluded} registros con conclusión · {overview.progress.pending} pendientes.</p>
        <p className="text-sm text-[#526b87]">Preparar una actividad no acredita que todos hayan participado. Cada niño conserva los registros y criterios de su grupo curricular.</p>
        {overview.closure.closed&&!overview.closure.current&&<WorkflowFeedback tone="error">Las fuentes actuales difieren del cierre guardado. Su versión anterior se conserva; reabre para revisar antes de cerrar de nuevo.</WorkflowFeedback>}
      </div>
      <PeriodConsolidated key={`${periodId}:${overview.sourceFingerprint}:${overview.closure.closed}`} classroomId={classroomId} periodId={periodId} periodLabel={periodLabel} multiAge onReview={onReview}/>
      <div className="ayni-panel space-y-4 p-4 sm:p-5"><h2 className="text-lg font-bold">Cierre del bimestre</h2>
        <p className="text-sm text-[#526b87]">El cierre guarda las valoraciones, conclusiones, fuentes y pendientes por edad. Reabrir conserva esa versión y registra el motivo.</p>
        {overview.closure.closed?<details className="rounded-2xl border bg-[#f2f7fb] p-4"><summary className="min-h-11 cursor-pointer font-bold">Necesito corregir algo</summary>
          <form className="mt-3 space-y-3" onSubmit={event=>void submit(event,true)}><label className="block text-sm font-semibold">Motivo de reapertura<Textarea name="reason" required minLength={3} maxLength={1000} className="mt-1"/></label>
            <Button variant="outline" type="submit">Reabrir bimestre</Button></form></details>:<>
          {overview.progress.blockers>0&&<p role="status">Hay {overview.progress.blockers} registros con fuentes por revisar o conclusiones por confirmar. Revísalos antes de cerrar.</p>}
          {overview.progress.annualUnvalued>0&&<p role="status">El cierre anual tiene {overview.progress.annualUnvalued} pares niño–competencia sin valoración docente vigente durante el año. Revisa los bimestres; Ayni no asignará notas para completarlos.</p>}
          {!overview.progress.total&&<p>No hay registros del período para guardar un cierre.</p>}
          <form className="space-y-3" onSubmit={event=>void submit(event,false)}><fieldset disabled={!overview.ready} className="space-y-3">
            {overview.progress.pending>0&&<label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" name="pending" type="checkbox" required/>He revisado los pendientes y confirmo que se conservarán sin asignarles notas ni logros.</label>}
            <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" type="checkbox" required/>He revisado el Consolidado y confirmo el cierre del bimestre.</label>
            <Button type="submit">Cerrar bimestre</Button></fieldset></form>
        </>}
        {overview.closure.versions.length>0&&<details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Versiones de cierre conservadas</summary><ul className="space-y-3">{overview.closure.versions.map(v=><li key={v.id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Versión {v.version} · {new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima'}).format(new Date(v.confirmed_at))}</span><Button asChild variant="outline"><a href={multiAgeDownloadUrl(`/periods/closures/${v.id}.xlsx`)}>Descargar Excel del cierre v{v.version}</a></Button></li>)}</ul></details>}
        {overview.closure.events.some(e=>e.type==='reopened')&&<details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Motivos de reapertura</summary><ul className="space-y-2 text-sm">{overview.closure.events.filter(e=>e.type==='reopened').map((e,i)=><li key={i}>{new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima'}).format(new Date(e.at))} · {e.reason}</li>)}</ul></details>}
      </div>
    </>}
  </section>;
}
