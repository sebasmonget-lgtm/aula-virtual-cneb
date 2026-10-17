"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ChevronDown, Eye, List, LogOut, MessageCircle, Pencil, Search, Users, Star, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadDiagnostics, loadSpontaneousObservations, type DiagnosticWorkspace, type LocalDashboard, type SpontaneousObservation, type FamilyInterview } from "@/src/lib/local-database";
import { canLeaveWorkspace, readWorkspaceParams, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { FamilyInterviewEditor, useFamilyInterviewStatusMap, type FamilyInterviewEditorHandle } from "./family-interview-v4";
import { SpontaneousDiagnostic } from "./spontaneous-diagnostic-v4";
import { GuidedObservationWorkspace } from "./guided-observation-workspace";
import { StudentPhoto } from "./student-photo";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";
import { ObservationCoverageMatrix } from "./observation-coverage-matrix";
import { PreparationSteps } from "./preparation-steps";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { mergeGuidedObservation } from "@/src/lib/guided-observation-flow.mjs";
import { isRecordedObservation, rankGuidedExperiences, experiencePriorityLabel } from "@/src/lib/diagnostic-ui-flow.mjs";
import shell from "./pilot-setup.module.css";
import styles from "./interviews-workspace.module.css";

type RankedExperience={experience:DiagnosticWorkspace["experiences"][number];opportunities:{id:string;name:string;missing:number;few:number}[];missingRate:number;fewRate:number};

export function InterviewsWorkspace({dashboard,onBack,onProfile,onSignOut,onPlan}: {
  dashboard:LocalDashboard;onBack:()=>void;onProfile:()=>void;onPreparation:()=>void;onPlan:()=>void;onSignOut?:()=>void;
}) {
  const [error,setError]=useState("");
  const viewFromLocation=()=>{const params=readWorkspaceParams("Planificar");return params.get("step")!=="3"?"capture":"matrix";};
  const [view,setView]=useState(viewFromLocation);
  const [matrix,setMatrix]=useState<{curriculum:{id:string;name:string}[];counts:Record<string,number>;unclassified:number;records:{student_id:string;text:string;date:string;competency_ids:string[]}[]}|null>(null);
  const [observationRevision,setObservationRevision]=useState(0);
  const [cell,setCell]=useState<{studentId:string;competencyId:string}|null>(null);
  function openView(next:string){setView(next);writeWorkspaceLocation("Planificar",{tab:"diagnostic",step:next==="capture"?tab==="interviews"?"1":"2":"3",mode:next==="capture"?mode==="guided"?"guided":"spontaneous":next},true);}
  const [data,setData]=useState<DiagnosticWorkspace|null>(null);
  const [records,setRecords]=useState<SpontaneousObservation[]>([]);
  const [tab,setTab]=useState<"interviews"|"observations">(()=>readWorkspaceParams("Planificar").get("step")==="2"?"observations":"interviews");
  const [mode,setMode]=useState<"free"|"guided">(()=>readWorkspaceParams("Planificar").get("mode")==="guided"?"guided":"free");
  const [studentId,setStudentId]=useState(dashboard.students[0]?.id??"");
  const [experienceId,setExperienceId]=useState("");
  const [query,setQuery]=useState("");
  const [revision,setRevision]=useState(0);

  const [navigationBusy,setNavigationBusy]=useState(false);
  const [profileMenu,setProfileMenu]=useState(false);
  const interviewRef=useRef<FamilyInterviewEditorHandle>(null);
  const {answerCounts,answerTotals,statuses,updateInterview,loaded:progressLoaded,error:progressError}=useFamilyInterviewStatusMap(String(revision));
  const updateInterviewProgress=useCallback((interview:FamilyInterview)=>updateInterview(interview),[updateInterview]);
  const updateObservationProgress=useCallback(()=>setObservationRevision(value=>value+1),[]);
  useEffect(()=>{let live=true;Promise.all([loadDiagnostics(),loadSpontaneousObservations(),apiFetch(localDatabaseApiUrl+"/api/annual-journey/coverage").then(async response=>{if(!response.ok)throw Error("No pudimos consultar los registros por competencia. Reintenta.");return response.json() as Promise<NonNullable<typeof matrix>>;})]).then(([workspace,free,coverage])=>{if(live){setData(workspace);setRecords(free.observations);setMatrix(coverage);setExperienceId(current=>current||rankGuidedExperiences(workspace.experiences,dashboard.students,workspace.experience_observations,free.observations,coverage.counts)[0]?.experience.id||"");setError("");}}).catch(cause=>{if(live)setError(cause instanceof Error?cause.message:"No se pudo abrir el registro inicial.");});return()=>{live=false;};},[observationRevision,dashboard.students]);
  useEffect(()=>{
    const sync=()=>{setView(viewFromLocation());const params=readWorkspaceParams("Planificar");if(params.get("step")==="3")return;setTab(params.get("step")==="2"?"observations":"interviews");setMode(params.get("mode")==="guided"?"guided":"free");};
    window.addEventListener("ayni-location-change",sync);window.addEventListener("popstate",sync);window.addEventListener("hashchange",sync);return()=>{window.removeEventListener("ayni-location-change",sync);window.removeEventListener("popstate",sync);window.removeEventListener("hashchange",sync);};
  },[]);
  async function change(work:()=>void){
    if(navigationBusy)return;
    setNavigationBusy(true);
    try{if(tab==="interviews"&&interviewRef.current){if(!await interviewRef.current.flush())return;}else if(!canLeaveWorkspace())return;work();}
    finally{setNavigationBusy(false);}
  }
  function destination(nextTab:"interviews"|"observations",nextMode:"free"|"guided"=mode){setView("capture");setTab(nextTab);setMode(nextMode);writeWorkspaceLocation("Planificar",{tab:"diagnostic",step:nextTab==="interviews"?"1":"2",mode:nextMode==="guided"?"guided":"spontaneous"},true);}
  const selected=dashboard.students.find(student=>student.id===studentId)??dashboard.students[0];
  const selectedName=selected?.first_name??selected?.name??"el niño";
  const rankedExperiences:RankedExperience[]=data?rankGuidedExperiences(data.experiences,dashboard.students,data.experience_observations,records,matrix?.counts):[];
  const recommended=rankedExperiences[0];
  const experience=data?.experiences.find(item=>item.id===experienceId)??recommended?.experience??data?.experiences[0];
  const students=dashboard.students.filter(student=>(`${student.first_name??student.name} ${student.last_name??""}`).toLocaleLowerCase("es-PE").includes(query.toLocaleLowerCase("es-PE")));
  const meaningful=isRecordedObservation;
  const guidedMode=tab==="observations"&&mode==="guided";
  const nextChild=dashboard.students.find(student=>student.id!==selected?.id&&statuses[student.id]!=="confirmed");
  const allConfirmed=progressLoaded&&dashboard.students.length>0&&dashboard.students.every(student=>statuses[student.id]==="confirmed");
  const teacherName=dashboard.profile.teacher_name;
  return <div className={styles.page} data-ayni-screen="interviews-observations">
    <header className={shell.topbar}><div className={styles.topbarInner}>
      <div className={styles.brand}><span className={styles.brandSymbol}><svg aria-hidden="true" viewBox="0 0 48 40" width={40} height={36}><circle cx="24" cy="8" r="6" fill="white"/><circle cx="9" cy="14" r="4.5" fill="#ffd357"/><circle cx="39" cy="14" r="4.5" fill="#ffd357"/><path d="M16 39V24a8 8 0 0 1 16 0v15h-6V29h-4v10ZM1 34V26a8 8 0 0 1 13-6v16H8v-8H6v6ZM47 34V26a8 8 0 0 0-13-6v16h6v-8h2v6Z" fill="white"/></svg></span><div><strong>Ayni Aula</strong><small>Tu aula en inicial</small></div></div>
      <div className={styles.account}><button type="button" disabled={navigationBusy} aria-expanded={profileMenu} onClick={()=>setProfileMenu(value=>!value)}><span className={styles.avatar}>{teacherName.split(/\s+/).slice(0,2).map(part=>part[0]).join("")}</span><span>{teacherName}</span><ChevronDown size={18}/></button>{profileMenu&&<div className={styles.accountMenu}><button type="button" onClick={()=>void change(onProfile)}>Datos del colegio y aula</button>{onSignOut&&<button type="button" onClick={()=>void change(onSignOut)}><LogOut size={17}/>Cerrar sesión</button>}</div>}</div>
    </div></header>
    <main className={styles.content}>
      <div className={`${shell.intro} ${styles.intro}`}><h1>{view==="matrix"?"Resumen de observaciones":"Entrevistas y observaciones"}</h1><p>Conoce a tus niños y niñas a través de sus familias y de lo que observas en el aula.<br/>Puedes hacer primero las entrevistas, las observaciones, o alternarlas.</p><Image className={`${shell.illustration} ${styles.illustration}`} src="/ayni-classroom-welcome.png" alt="" width={1536} height={1024} sizes="420px" preload/>
        <PreparationSteps current={3} className={styles.steps} disabled={navigationBusy} onSelect={step=>void change(step===1?onProfile:step===2?onBack:step===4?onPlan:()=>openView("capture"))}/>
      </div>
      {view==="capture"&&<><div className={styles.mainTabs} role="tablist" aria-label="Entrevistas y observaciones">{([["interviews","Entrevistas","Responde solo con lo que la familia te comentó",MessageCircle],["observations","Observaciones","Registra lo que observas en el aula",Eye]] as const).map(([id,title,hint,Icon])=><button key={id} type="button" role="tab" aria-selected={tab===id} aria-controls="initial-information-panel" disabled={navigationBusy} onClick={()=>void change(()=>destination(id))}><Icon size={38} aria-hidden="true"/><span><strong>{title}</strong><small>{hint}</small></span></button>)}</div>
      <div className={`${styles.columns} ${guidedMode?styles.guidedColumns:""} ${tab==="observations"?styles.compactObservations:""}`}>
        {!guidedMode&&<aside className={styles.studentList} aria-labelledby="initial-children-title"><h2 id="initial-children-title"><Users size={27}/>Mis niños ({dashboard.students.length})</h2><label className={styles.search}><Search size={21}/><span className="sr-only">Buscar niño o niña</span><Input placeholder="Buscar niño o niña…" value={query} onChange={event=>setQuery(event.target.value)}/></label><div className={styles.studentRows}>{students.map(student=>{
          const count=tab==="interviews"?answerCounts[student.id]??0:mode==="free"?records.filter(record=>record.student_id===student.id).length:(data?.experience_observations??[]).filter(record=>record.student_id===student.id&&record.experience_id===experience?.id&&meaningful(record)).length;
          const covered=tab==="observations"&&mode==="guided"?new Set((data?.experience_observations??[]).filter(record=>record.student_id===student.id&&record.experience_id===experience?.id&&meaningful(record)).map(record=>record.aspect_id)).size:count;
          const total=tab==="interviews"?(answerTotals[student.id]??8):experience?.aspects.length??1;
          const name=student.first_name?`${student.first_name} ${student.last_name??""}`:student.name;
          return <button key={student.id} type="button" className={styles.studentRow} aria-pressed={studentId===student.id} disabled={navigationBusy} onClick={()=>{if(student.id!==studentId)void change(()=>setStudentId(student.id));}}><StudentPhoto id={student.id} name={name} className={styles.studentPhoto}/><span><strong>{name}</strong><small>{dashboard.profile.age_label} · Sección {dashboard.profile.section}</small><small>{tab==="interviews"?progressLoaded?`${count}/${total} preguntas · ${statuses[student.id]==="confirmed"?"Confirmada":statuses[student.id]==="partial"?"Borrador":"Sin iniciar"}`:"Consultando avance…":mode==="free"?`${count} ${count===1?"observación libre":"observaciones libres"}`:`${count} ${count===1?"registro":"registros"} en esta experiencia`}</small>{(tab==="interviews"||mode==="guided")&&<span className={styles.progress} role="progressbar" aria-label={`Avance de ${name}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(covered,total)}><span style={{width:`${Math.min(100,covered/total*100)}%`}}/></span>}</span></button>;
        })}{!students.length&&<p>No encontramos niños con ese nombre.</p>}</div>{progressError&&<WorkflowFeedback tone="error">{progressError}</WorkflowFeedback>}</aside>}
        <div id="initial-information-panel" role="tabpanel" className={styles.workspace}>
          {error&&<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>{setRevision(value=>value+1);updateObservationProgress();}}>Reintentar</Button></WorkflowFeedback>}
          {!data&&!error?<LoadingState label="Cargando entrevistas y observaciones…"/>:!selected?<p>Añade a tus niños para comenzar.</p>:tab==="interviews"?<FamilyInterviewEditor key={selected.id} ref={interviewRef} layout="stacked" studentId={selected.id} studentName={selectedName} printContext={{institution:dashboard.profile.institution_name,classroom:dashboard.profile.section}} onSaved={updateInterviewProgress} onNext={nextChild?()=>void change(()=>setStudentId(nextChild.id)):undefined}/>:<>
            <div className={styles.modeTabs} role="tablist" aria-label="Forma de observar">{([["free","Libre","Registra lo que observas",Pencil],["guided","Guiada","Con apoyo de indicadores",List]] as const).map(([id,title,hint,Icon])=><button key={id} type="button" role="tab" aria-selected={mode===id} disabled={navigationBusy} onClick={()=>void change(()=>destination("observations",id))}><Icon size={31}/><span><strong>{title}</strong><small>{hint}</small></span></button>)}</div>
            {mode==="free"?<SpontaneousDiagnostic key={selected.id} embedded students={dashboard.students} initialStudentId={selected.id} initialDate={dashboard.today.date} initialTime={dashboard.today.qa_clock?.time??dashboard.today.now} guidedRecords={data?.experience_observations} onRecordsUpdated={setRecords} onSaved={updateObservationProgress} onDecisionSaved={updateObservationProgress}/>:experience&&data?<><section className={styles.experiencePicker}><label className={styles.experienceSelect}><span className={styles.pickerTitle}><Star size={19} aria-hidden="true"/>Elige una experiencia guiada <small>({data.experiences.length} disponibles)</small></span><select value={experience.id} disabled={navigationBusy} onChange={event=>{const id=event.target.value;void change(()=>setExperienceId(id));}}>{rankedExperiences.map((item,index)=><option key={item.experience.id} value={item.experience.id}>{recommended?.experience.id===item.experience.id?"★ Recomendada · ":`Prioridad ${index+1} · `}{item.experience.title} · {experiencePriorityLabel(item)}</option>)}</select></label>{recommended?.experience.id===experience.id&&<div className={styles.recommendation}><Lightbulb size={22} aria-hidden="true"/><strong>Experiencia recomendada para tu aula</strong><span>{recommended.opportunities.length?`${recommended.opportunities.length} ${recommended.opportunities.length===1?"competencia":"competencias"} con pocos o ningún registro`:"La que tiene menos registros por niño y competencia"}</span></div>}</section><GuidedObservationWorkspace key={experience.id} experience={experience} students={dashboard.students} coverage={matrix?.counts??null} onChooseAnother={()=>{const next=rankedExperiences.find(item=>item.experience.id!==experience.id);if(next)void change(()=>setExperienceId(next.experience.id));}} onSaved={record=>{setData(current=>current?mergeGuidedObservation(current,record):current);setObservationRevision(value=>value+1);}}/><SpontaneousDiagnostic key={data.experience_observations.length} listOnly students={dashboard.students} guidedRecords={data.experience_observations} onDecisionSaved={updateObservationProgress}/></>:<p>No hay experiencias disponibles para esta aula.</p>}
          </>}
        </div>
      </div>
      {tab==="interviews"&&allConfirmed&&<section className={styles.completedInterviews} role="status"><h2>¡Buen trabajo! Todas las entrevistas están confirmadas.</h2><p>Puedes seguir conociendo a tus niños con las observaciones.</p><Button className={styles.primary} disabled={navigationBusy} onClick={()=>void change(()=>destination("observations","free"))}>Continuar con observaciones</Button></section>}
      </>}
      {view==="matrix"&&data&&(matrix?<ObservationCoverageMatrix data={data} counts={matrix.counts} unclassified={matrix.unclassified} competencies={matrix.curriculum} records={matrix.records} onRecord={(studentId,competencyId)=>setCell({studentId,competencyId})} onGuided={(_id,experienceId)=>{setExperienceId(experienceId);destination("observations","guided");}} onBack={()=>openView("capture")} onContinue={()=>void change(onPlan)}/>:error?<WorkflowFeedback tone="error">{error}<Button onClick={updateObservationProgress}>Reintentar</Button></WorkflowFeedback>:<LoadingState label="Abriendo el resumen de observaciones…"/>)}
      <Dialog open={!!cell} onOpenChange={value=>{if(!value&&canLeaveWorkspace())setCell(null);}}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Anotar una observación</DialogTitle><DialogDescription>Registra lo ocurrido para el niño y la competencia elegidos en el resumen.</DialogDescription></DialogHeader>{cell&&<SpontaneousDiagnostic embedded formOnly students={dashboard.students} initialStudentId={cell.studentId} initialCompetencyId={cell.competencyId} initialDate={dashboard.today.date} onBack={()=>setCell(null)} onSaved={()=>{setCell(null);updateObservationProgress();}}/>}</DialogContent></Dialog>
      <footer className={styles.footer}>{view==="capture"&&<><Button variant="outline" disabled={navigationBusy} onClick={()=>void change(onBack)}><ArrowLeft/>Volver</Button><Button className={styles.primary} disabled={navigationBusy} onClick={()=>void change(()=>openView("matrix"))}>Continuar al resumen de observaciones</Button></>}</footer>
    </main>
  </div>;
}
