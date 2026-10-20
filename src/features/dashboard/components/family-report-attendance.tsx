"use client";
import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch, apiJson } from '@/src/lib/ayni-api-fetch';
import { localDatabaseApiUrl } from '@/src/lib/local-database';
import { familyAttendanceChart } from '@/src/lib/family-attendance-presentation.mjs';
import styles from './family-report-attendance.module.css';

type Counts = { id:string; total:number; present:number; late:number; absent:number; excused:number; pending:number };
type Summary = { as_of:string; children:Counts[] };
export function FamilyReportAttendance({ classroomId, periodId, studentId }:{ classroomId:string; periodId:string; studentId:string }) {
  const [result,setResult]=useState<{ scope:string; data:Summary|null; error:string }|null>(null),[retry,setRetry]=useState(0);
  const scope=`${classroomId}:${periodId}`;
  useEffect(()=>{
    const controller=new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/attendance/summary?${new URLSearchParams({classroomId,attendancePeriod:periodId})}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{const data=await apiJson<Summary&{error?:string}>(response);if(!response.ok)throw new Error(data.error??'No pudimos cargar la asistencia.');if(!controller.signal.aborted)setResult({scope,data,error:''});})
      .catch(error=>{if(!controller.signal.aborted)setResult({scope,data:null,error:error instanceof Error?error.message:'No pudimos cargar la asistencia.'});});
    return()=>controller.abort();
  },[classroomId,periodId,scope,retry]);
  const current=result?.scope===scope?result:null,child=current?.data?.children.find(row=>row.id===studentId);
  const chart=child?familyAttendanceChart({...child,as_of:current!.data!.as_of}):null;
  return <section className={styles.attendance} aria-label="Asistencia del bimestre">
    <h3><CalendarCheck size={18} aria-hidden="true"/>Asistencia del bimestre</h3>
    {!current?<p role="status">Cargando asistencia…</p>:current.error?<div role="alert"><p>{current.error}</p><Button variant="outline" onClick={()=>{setResult(null);setRetry(value=>value+1);}}>Volver a cargar</Button></div>:!chart?<p>No hay información de asistencia para este alumno.</p>:<>
      <p className={styles.summary}>{chart.summary}</p>
      <div className={styles.chart}>
        <svg className={styles.donut} viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="72" fill="none" stroke="#E7EDF3" strokeWidth="28"/><g transform="rotate(-90 100 100)">{chart.rows.map((row:{key:string;count:number;color:string;width:number},index:number)=>row.count>0&&<circle key={row.key} cx="100" cy="100" r="72" fill="none" stroke={row.color} strokeWidth="28" strokeDasharray={`${row.width/100*2*Math.PI*72} ${2*Math.PI*72}`} strokeDashoffset={-chart.rows.slice(0,index).reduce((sum:number,part:{width:number})=>sum+part.width,0)/100*2*Math.PI*72}/>)}</g><text x="100" y="101" textAnchor="middle" className={styles.total}>{chart.recorded}</text><text x="100" y="123" textAnchor="middle" className={styles.totalLabel}>{chart.pending?'días registrados':'días de clase'}</text></svg>
        <div className={styles.legend}>{chart.rows.map((row:{key:string;label:string;count:number;color:string;percentageLabel:string})=><div className={styles.row} key={row.key}><span className={styles.swatch} style={{backgroundColor:row.color}} aria-hidden="true"/><span>{row.label}<small>{row.count} {row.count===1?'día':'días'}</small></span><strong>{row.percentageLabel}</strong></div>)}<p className={styles.totalDays}>Total: {chart.total} días de clase</p></div>
      </div>
      <p className={styles.note}>{chart.note}{chart.asOf&&` Corte: ${chart.asOf.slice(8,10)}/${chart.asOf.slice(5,7)}/${chart.asOf.slice(0,4)}.`}</p>
    </>}
  </section>;
}
