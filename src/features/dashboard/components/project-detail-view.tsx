"use client";
import {useEffect,useState,type ReactNode} from 'react';
import Image from 'next/image';
import {ArrowLeft,Target,Eye,Heart,Package} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {apiFetch,apiJson} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import type {OpenDocument} from './documents-screen';
import {ProjectReadingView} from './project-reading-view';
import {AnnualCompetencies,AnnualProjectPreview} from './annual-project-preview';
import type {ChangeProposal} from './annual-proposal-change-dialog';
import {LoadingState,WorkflowFeedback} from './workflow-ui';
import styles from './activity-reading.module.css';

/** Same saved project reader used by Documentos. Opening this view never prepares or edits. */
export function ProjectDetailView({projectId,row,names,onBack,onChange,changeDialog}:{projectId:string|null;row:ChangeProposal;names:Map<string,string>;onBack:()=>void;onChange:()=>void;changeDialog?:ReactNode}){
  const [document,setDocument]=useState<OpenDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{if(!projectId)return;const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/documents/experience/${projectId}`,{signal:controller.signal}).then(async response=>{const data=await apiJson<{document:OpenDocument;error?:string}>(response);if(!response.ok)throw Error(data.error??'No pudimos abrir el detalle guardado.');return data.document;}).then(data=>{if(!controller.signal.aborted){setDocument(data);setError('');}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[projectId,retry]);
  return <section className="space-y-5"><Button variant="outline" onClick={onBack}><ArrowLeft size={18}/>Volver a Mi año</Button>
    {error?<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button></WorkflowFeedback>:projectId&&!document?<LoadingState label="Abriendo el detalle del proyecto…"/>:document?<ProjectReadingView document={document}/>:<>
      <AnnualProjectPreview row={row} index={1} names={names} canChange={false} disabled={false} onChange={onChange}/>
      <div className={styles.reader}><section className={`${styles.purpose} ${styles.mint}`}><Image src="/project-illustrations/ideas.webp" alt="" width={100} height={100} unoptimized/><div><h2><Target/>Qué buscamos</h2><p>{row.purpose}</p></div></section>
      <div className={styles.pair}>{row.opportunities?.map(item=><section key={item.competency_id} className={`${styles.support} ${styles.sky}`}><AnnualCompetencies ids={[item.competency_id]} names={names}/><h2 className="mt-4"><Heart/>Cómo acompañar</h2><p>{item.mediation}</p><h2 className="mt-4"><Eye/>Qué observar</h2><p>{item.observation}</p><h3 className="mt-4">Apoyos</h3><p>{item.supports}</p></section>)}</div>
      <section className={`${styles.support} ${styles.sand}`}><h2><Package/>Materiales del proyecto</h2><ul className={styles.lines}>{row.materials.map((item,index)=><li key={index}>{item}</li>)}</ul></section></div>
    </>}
    <div className="flex flex-wrap justify-end gap-3"><Button onClick={onChange}>Cambiar con Ayni</Button></div>{changeDialog}
  </section>;
}
