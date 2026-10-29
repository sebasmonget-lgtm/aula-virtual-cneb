'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,CalendarDays} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import {multiAgeAppRequest as api} from '@/src/lib/multi-age-app-client';
import {documentGeneratorAnnualState} from '@/src/lib/document-generator-planning-state.mjs';
import {AnnualCompactTimeline} from './annual-compact-timeline';
import {AnnualProjectPreview} from './annual-project-preview';
import {ProjectDetailView} from './project-detail-view';
import {generatorProjectDetail} from './generator-project-detail';
import type {AnnualMapRow} from './annual-year-map';
import {MultiAgeConversation} from './multi-age-conversation';
import {MultiAgeGenerationControl} from './multi-age-generation-control';
import {AyniMascot} from './initial-journey-ui';
import {LoadingState,PageIntro,WorkflowFeedback} from './workflow-ui';
import chatStyles from './annual-chat.module.css';
type Planning=NonNullable<MultiAgeAppState['planning']>;
type Workspace=NonNullable<MultiAgeAppState['workspace']>;

/** Original Ayni surfaces; creating a year saves it without another confirmation step. */
export function GeneratorAnnualWorkspace({planning:p,w,aiMode,onDecision,onPrepareProject,initialConversation=false,initialSlotId}:{initialSlotId?:string|null;initialConversation?:boolean;planning:Planning;w:Workspace;aiMode:'off'|'fixture'|'openai';onDecision:()=>Promise<void>;onPrepareProject:(slotId:string)=>void}){
 const {draft,source,proposal}=documentGeneratorAnnualState(p);
 const [view,setView]=useState<'chat'|'year'>(initialConversation||!source?'chat':'year'),[jobStatus,setJobStatus]=useState('loading');
 const selectedSlot=initialSlotId&&p.calendar.projects.find(s=>s.slot_id===initialSlotId);
 const [period,setPeriod]=useState(selectedSlot?String(w.periods.findIndex(period=>selectedSlot.starts_on>=period.starts_on&&selectedSlot.starts_on<=period.ends_on)+1):'1'),[slotId,setSlotId]=useState<string|null>(initialSlotId??proposal?.proposals[0]?.slot_id??null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[chatBlocked,setChatBlocked]=useState(false);
 const [chatReady,setChatReady]=useState(false),[generationTarget,setGenerationTarget]=useState<HTMLDivElement|null>(null);
 const [detailOpen,setDetailOpen]=useState(false),detailRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(detailOpen)detailRef.current?.scrollIntoView({block:'start',behavior:'instant'});},[detailOpen]);
 const guard=useRef(false),onStatus=useCallback((status:string)=>setJobStatus(status),[]);
 const pending=['preparing','queued','running'].includes(jobStatus),loading=jobStatus==='loading';
 const recoveredDraft=useRef('');
 useEffect(()=>{
  if(!draft?.current||view!=='year'||pending||loading||guard.current)return;
  const key=`${draft.id}:${draft.revision}`;if(recoveredDraft.current===key)return;recoveredDraft.current=key;guard.current=true;setBusy(true);setError('');
  void api('/document-year/use',{teacherConfirmed:true,classroomId:w.classroom.id,planId:draft.id,expectedRevision:draft.revision}).then(onDecision)
   .catch(cause=>setError(cause instanceof Error?cause.message:'No se pudo guardar Mi año. Puedes volver a abrir un proyecto para reintentar.')).finally(()=>{guard.current=false;setBusy(false);});
 },[draft,view,pending,loading,w.classroom.id,onDecision]);
 const effectiveSlot=proposal?.proposals.find(row=>row.slot_id===slotId)?.slot_id??proposal?.proposals[0]?.slot_id;
 const names=new Map<string,string>(p.coverage.flatMap(g=>g.competencies.map(c=>[c.id,c.name] as [string,string])));
 const rows:AnnualMapRow[]=proposal?.proposals.map((r,i)=>({proposal_id:r.slot_id,experience_type:'project',title:r.title,purpose:r.summary??r.purpose,rationale:r.common_invitation,period:String(w.periods.findIndex(period=>p.calendar.projects[i].starts_on>=period.starts_on&&p.calendar.projects[i].starts_on<=period.ends_on)+1),month:Number(p.calendar.projects[i].starts_on.slice(5,7)),duration_weeks:p.calendar.projects[i].instructional_dates.length>10?3:2,primary_competency_ids:[...new Set(r.opportunities.map(o=>o.competency_id))]}))??[];
 const preparedCount=(w.projects??[]).filter(project=>project.annual_plan_id===source?.id).length;
 const index=rows.findIndex(row=>row.proposal_id===effectiveSlot),row=rows[index],detail=proposal?.proposals[index],slot=p.calendar.projects[index];
 async function prepare(id:string){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{
   if(draft){await api('/document-year/use',{teacherConfirmed:true,classroomId:w.classroom.id,planId:draft.id,expectedRevision:draft.revision});await onDecision();}
   onPrepareProject(id);
 }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo abrir el proyecto. Tu año se conserva.');}finally{guard.current=false;setBusy(false);}}
 if(detailOpen&&detail&&slot)return <div ref={detailRef} className="min-w-0"><ProjectDetailView projectId={null} row={generatorProjectDetail(detail,slot,`Bimestre ${row.period}`)} index={index+1} names={names} onBack={()=>setDetailOpen(false)}/></div>;
 return <section className="ayni-workflow space-y-6">
   {!pending&&view==='chat'?<header className={chatStyles.pageHeader}><div><h1>Conversa con Ayni</h1><p>Conoceremos tu contexto y tus prioridades para personalizar el año.</p></div><div className="w-24"><AyniMascot/></div></header>:<PageIntro title="Mi año" description="Tu planificación y los proyectos del año." icon={CalendarDays}/>}
   {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
   {loading&&<LoadingState label="Recuperando la preparación de Mi año…"/>}
   {!loading&&!pending&&view==='chat'&&<><MultiAgeConversation documentsOnly contextPrepared={Boolean(source)} footer={<div ref={setGenerationTarget}/>} onReadyChange={setChatReady} onBusyChange={setChatBlocked} classroomId={w.classroom.id} mode={aiMode} onDecision={onDecision}/>{proposal&&<Button variant="outline" onClick={()=>setView('year')}><ArrowLeft/>Volver a Mi año</Button>}</>}
   <div hidden={!loading&&!pending&&view==='year'}><MultiAgeGenerationControl consumedJobId={source?.document_context?.generation_job_id} portalTarget={generationTarget} startVisible={chatReady} kind="annual" input={{classroomId:w.classroom.id}} sourceKey={p.sourceFingerprint} mode={aiMode} annualPresentation autoApply startLabel={source?'Actualizar Mi año':'Generar Mi año'} beforeStart={async()=>{await api('/conversation/prepare',{classroomId:w.classroom.id,teacherConfirmed:true});await onDecision();}} onStatusChange={onStatus} disabled={!w.students.length||chatBlocked||busy} onReview={async(result,id)=>{
    if(!result.output||!('proposals' in result.output))return;
    await api('/document-year/use',{classroomId:w.classroom.id,generationJobId:id,teacherConfirmed:true});
    await onDecision();setView('year');
   }}/></div>
   {!loading&&!pending&&view==='year'&&proposal&&<>
     <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#526b87]">{preparedCount===1?'1 proyecto preparado':`${preparedCount} proyectos preparados`}</p><Button variant="outline" disabled={busy} onClick={()=>setView('chat')}>Conversar con Ayni</Button></div>

     <AnnualCompactTimeline slots={p.calendar.projects.map((s,i)=>({...s,index:i+1,period:rows[i].period,proposal_id:s.slot_id,duration_weeks:rows[i].duration_weeks}))} rows={rows} period={period} onPeriod={value=>{setPeriod(value);if(value!=='all'&&row?.period!==value)setSlotId(rows.find(r=>r.period===value)?.proposal_id??null);}} selectedId={effectiveSlot??null} onSelect={setSlotId} onEmpty={()=>{}} today={new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})} disabled={busy}/>
     {row&&detail&&slot&&<AnnualProjectPreview row={{...row,period:`Bimestre ${row.period}`,planned_start_date:slot.starts_on,planned_end_date:slot.ends_on,planned_instructional_days:slot.instructional_dates.length,children_actions:generatorProjectDetail(detail,slot,`Bimestre ${row.period}`).children_actions}} index={index+1} names={names} disabled={busy} canChange={false} onChange={()=>{}} prepareLabel={(w.projects??[]).some(project=>project.annual_plan_id===source?.id&&project.annual_slot_id===row.proposal_id)?'Abrir proyecto':'Preparar proyecto'} onPrepare={()=>void prepare(row.proposal_id)} onDetails={()=>setDetailOpen(true)}/>}
   </>}

 </section>;
}
