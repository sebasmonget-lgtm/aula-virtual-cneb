"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Eye, List, LogOut, MessageCircle, Pencil, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadDiagnostics, loadSpontaneousObservations, type DiagnosticWorkspace, type LocalDashboard, type SpontaneousObservation } from "@/src/lib/local-database";
import { canLeaveWorkspace, readWorkspaceParams, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { FamilyInterviewEditor, useFamilyInterviewStatusMap, type FamilyInterviewEditorHandle } from "./family-interview-v4";
import { SpontaneousDiagnostic } from "./spontaneous-diagnostic-v4";
import { GuidedObservationWorkspace } from "./guided-observation-workspace";
import { StudentPhoto } from "./student-photo";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";
import { mergeGuidedObservation } from "@/src/lib/guided-observation-flow.mjs";
import shell from "./pilot-setup.module.css";
import styles from "./interviews-workspace.module.css";

export function InterviewsWorkspace({dashboard,onBack,onProfile,onPlan,onSignOut,onReview}: {
  dashboard:LocalDashboard;onBack:()=>void;onProfile:()=>void;onPlan:()=>void;onReview:()=>void;onSignOut?:()=>void;
}) {
  const [data,setData]=useState<DiagnosticWorkspace|null>(null);
  const [records,setRecords]=useState<SpontaneousObservation[]>([]);
  const [tab,setTab]=useState<"interviews"|"observations">(()=>readWorkspaceParams("Planificar").get("step")==="2"?"observations":"interviews");
  const [mode,setMode]=useState<"free"|"guided">(()=>readWorkspaceParams("Planificar").get("mode")==="guided"?"guided":"free");
  const [studentId,setStudentId]=useState(dashboard.students[0]?.id??"");
  const [experienceId,setExperienceId]=useState("");
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  const [observationRevision,setObservationRevision]=useState(0);
  const [navigationBusy,setNavigationBusy]=useState(false);
  const [profileMenu,setProfileMenu]=useState(false);
  const interviewRef=useRef<FamilyInterviewEditorHandle>(null);
  const {answerCounts,loaded:progressLoaded,error:progressError}=useFamilyInterviewStatusMap(String(revision));
  const updateInterviewProgress=useCallback(()=>setRevision(value=>value+1),[]);
  const updateObservationProgress=useCallback(()=>setObservationRevision(value=>value+1),[]);
  useEffect(()=>{let live=true;Promise.all([loadDiagnostics(),loadSpontaneousObservations()]).then(([workspace,free])=>{if(live){setData(workspace);setRecords(free.observations);setError("");}}).catch(cause=>{if(live)setError(cause instanceof Error?cause.message:"No se pudo abrir el registro inicial.");});return()=>{live=false;};},[observationRevision]);
  useEffect(()=>{
    const sync=()=>{const params=readWorkspaceParams("Planificar");setTab(params.get("step")==="2"?"observations":"interviews");setMode(params.get("mode")==="guided"?"guided":"free");};
    window.addEventListener("popstate",sync);window.addEventListener("hashchange",sync);return()=>{window.removeEventListener("popstate",sync);window.removeEventListener("hashchange",sync);};
  },[]);
  async function change(work:()=>void){
    if(navigationBusy)return;
    setNavigationBusy(true);
    try{if(tab==="interviews"&&interviewRef.current){if(!await interviewRef.current.flush())return;}else if(!canLeaveWorkspace())return;work();}
    finally{setNavigationBusy(false);}
  }
  function destination(nextTab:"interviews"|"observations",nextMode:"free"|"guided"=mode){setTab(nextTab);setMode(nextMode);writeWorkspaceLocation("Planificar",{tab:"diagnostic",step:nextTab==="interviews"?"1":"2",mode:nextMode==="guided"?"guided":"spontaneous"},true);}
  const selected=dashboard.students.find(student=>student.id===studentId)??dashboard.students[0];
  const selectedName=selected?.first_name??selected?.name??"el niño";
  const experience=data?.experiences.find(item=>item.id===experienceId)??data?.experiences[0];
  const students=dashboard.students.filter(student=>(`${student.first_name??student.name} ${student.last_name??""}`).toLocaleLowerCase("es-PE").includes(query.toLocaleLowerCase("es-PE")));
  const meaningful=(record:DiagnosticWorkspace["experience_observations"][number])=>!['draft','withdrawn','cancelled','voided','insufficient_information'].includes(record.observation_status)&&Boolean(record.observation_text?.trim()||record.has_media);
  const teacherName=dashboard.profile.teacher_name;
  return <div className={styles.page} data-ayni-screen="interviews-observations">
    <header className={shell.topbar}><div className={styles.topbarInner}>
      <div className={styles.brand}><span className={styles.brandSymbol}><svg aria-hidden="true" viewBox="0 0 48 40" width={40} height={36}><circle cx="24" cy="8" r="6" fill="white"/><circle cx="9" cy="14" r="4.5" fill="#ffd357"/><circle cx="39" cy="14" r="4.5" fill="#ffd357"/><path d="M16 39V24a8 8 0 0 1 16 0v15h-6V29h-4v10ZM1 34V26a8 8 0 0 1 13-6v16H8v-8H6v6ZM47 34V26a8 8 0 0 0-13-6v16h6v-8h2v6Z" fill="white"/></svg></span><div><strong>Ayni Aula</strong><small>Tu aula en inicial</small></div></div>
      <div className={styles.account}><button type="button" disabled={navigationBusy} aria-expanded={profileMenu} onClick={()=>setProfileMenu(value=>!value)}><span className={styles.avatar}>{teacherName.split(/\s+/).slice(0,2).map(part=>part[0]).join("")}</span><span>{teacherName}</span><ChevronDown size={18}/></button>{profileMenu&&<div className={styles.accountMenu}><button type="button" onClick={()=>void change(onProfile)}>Datos del colegio y aula</button>{onSignOut&&<button type="button" onClick={()=>void change(onSignOut)}><LogOut size={17}/>Cerrar sesión</button>}</div>}</div>
    </div></header>
    <main className={styles.content}>
      <div className={`${shell.intro} ${styles.intro}`}><button type="button" className={styles.backLink} disabled={navigationBusy} onClick={()=>void change(onBack)}><ArrowLeft size={18}/>Volver</button><h1>Entrevistas y observaciones</h1><p>Conoce a tus niños y niñas a través de sus familias y de lo que observas en el aula.<br/>Puedes hacer primero las entrevistas, las observaciones, o alternarlas.</p><Image className={`${shell.illustration} ${styles.illustration}`} src="/ayni-classroom-welcome.png" alt="" width={1536} height={1024} sizes="420px" preload/>
        <ol className={`${shell.steps} ${styles.steps}`} aria-label="Preparación de tu aula">{["Configura tu aula","Añade a tus niños","Entrevistas y observaciones","Conversar con Ayni para crear Mi año"].map((label,index)=><li key={label} className={index<2?styles.completed:undefined} aria-current={index===2?"step":undefined}><span>{index<2?<Check size={22} aria-label="Completado"/>:index+1}</span><span>{label}</span></li>)}</ol>
      </div>
      <div className={styles.mainTabs} role="tablist" aria-label="Entrevistas y observaciones">{([["interviews","Entrevistas","Responde solo con lo que la familia te comentó",MessageCircle],["observations","Observaciones","Registra lo que observas en el aula",Eye]] as const).map(([id,title,hint,Icon])=><button key={id} type="button" role="tab" aria-selected={tab===id} aria-controls="initial-information-panel" disabled={navigationBusy} onClick={()=>void change(()=>destination(id))}><Icon size={38} aria-hidden="true"/><span><strong>{title}</strong><small>{hint}</small></span></button>)}</div>
      <div className={styles.columns}>
        <aside className={styles.studentList} aria-labelledby="initial-children-title"><h2 id="initial-children-title"><Users size={27}/>Mis niños ({dashboard.students.length})</h2><label className={styles.search}><Search size={21}/><span className="sr-only">Buscar niño o niña</span><Input placeholder="Buscar niño o niña…" value={query} onChange={event=>setQuery(event.target.value)}/></label><div className={styles.studentRows}>{students.map(student=>{
          const count=tab==="interviews"?answerCounts[student.id]??0:mode==="free"?records.filter(record=>record.student_id===student.id).length:(data?.experience_observations??[]).filter(record=>record.student_id===student.id&&record.experience_id===experience?.id&&meaningful(record)).length;
          const covered=tab==="observations"&&mode==="guided"?new Set((data?.experience_observations??[]).filter(record=>record.student_id===student.id&&record.experience_id===experience?.id&&meaningful(record)).map(record=>record.aspect_id)).size:count;
          const total=tab==="interviews"?6:experience?.aspects.length??1;
          const name=student.first_name?`${student.first_name} ${student.last_name??""}`:student.name;
          return <button key={student.id} type="button" className={styles.studentRow} aria-pressed={studentId===student.id} disabled={navigationBusy} onClick={()=>{if(student.id!==studentId)void change(()=>setStudentId(student.id));}}><StudentPhoto id={student.id} name={name} className={styles.studentPhoto}/><span><strong>{name}</strong><small>{dashboard.profile.age_label} · Sección {dashboard.profile.section}</small><small>{tab==="interviews"?progressLoaded?`${count}/6 preguntas`:"Consultando avance…":mode==="free"?`${count} ${count===1?"observación libre":"observaciones libres"}`:`${count} ${count===1?"registro":"registros"} en esta experiencia`}</small>{(tab==="interviews"||mode==="guided")&&<span className={styles.progress} role="progressbar" aria-label={`Avance de ${name}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(covered,total)}><span style={{width:`${Math.min(100,covered/total*100)}%`}}/></span>}</span></button>;
        })}{!students.length&&<p>No encontramos niños con ese nombre.</p>}</div>{progressError&&<WorkflowFeedback tone="error">{progressError}</WorkflowFeedback>}<Button variant="outline" className={styles.backButton} disabled={navigationBusy} onClick={()=>void change(onBack)}><ArrowLeft/>Volver</Button></aside>
        <div id="initial-information-panel" role="tabpanel" className={styles.workspace}>
          {error&&<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>{updateInterviewProgress();updateObservationProgress();}}>Reintentar</Button></WorkflowFeedback>}
          {!data&&!error?<LoadingState label="Cargando entrevistas y observaciones…"/>:!selected?<p>Añade a tus niños para comenzar.</p>:tab==="interviews"?<FamilyInterviewEditor key={selected.id} ref={interviewRef} layout="stacked" studentId={selected.id} studentName={selectedName} printContext={{institution:dashboard.profile.institution_name,classroom:dashboard.profile.section}} onSaved={updateInterviewProgress}/>:<>
            <div className={styles.modeTabs} role="tablist" aria-label="Forma de observar">{([["free","Libre","Registra lo que observas",Pencil],["guided","Guiada","Con apoyo de indicadores",List]] as const).map(([id,title,hint,Icon])=><button key={id} type="button" role="tab" aria-selected={mode===id} disabled={navigationBusy} onClick={()=>void change(()=>destination("observations",id))}><Icon size={31}/><span><strong>{title}</strong><small>{hint}</small></span></button>)}</div>
            {mode==="free"?<SpontaneousDiagnostic key={selected.id} embedded students={dashboard.students} initialStudentId={selected.id} initialDate={dashboard.today.date} initialTime={dashboard.today.qa_clock?.time??dashboard.today.now} onSaved={updateObservationProgress} onDecisionSaved={updateObservationProgress}/>:experience&&data?<><label className={styles.experienceSelect}>Experiencia para observar<select value={experience.id} disabled={navigationBusy} onChange={event=>{const id=event.target.value;void change(()=>setExperienceId(id));}}>{data.experiences.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><GuidedObservationWorkspace key={experience.id} experience={experience} students={dashboard.students} observations={data.experience_observations} initialStudentId={selected.id} onSaved={record=>{setData(current=>current?mergeGuidedObservation(current,record):current);}}/></>:<p>No hay experiencias disponibles para esta aula.</p>}
          </>}
        </div>
      </div>
      <footer className={styles.footer}><Button variant="outline" disabled={navigationBusy} onClick={()=>void change(onReview)}>Ver matriz y revisiones anteriores</Button><Button className={styles.primary} disabled={navigationBusy||!dashboard.students.length} onClick={()=>void change(onPlan)}>Conversar con Ayni para crear Mi año<ArrowRight/></Button></footer>
    </main>
  </div>;
}
