"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadDiagnostics, loadFamilyInterviewStatuses, loadSpontaneousObservations, type LocalDashboard } from "@/src/lib/local-database";
import { initialDiagnosticProgress } from "@/src/lib/initial-diagnostic-progress.mjs";
import { preparationStage } from "@/src/lib/preparation-navigation.mjs";
import { DiagnosticProgress } from "./diagnostic-progress";

export function PreparationHome({ dashboard, year, annualDraft, onStage }: { dashboard: LocalDashboard | null; year?: number; annualDraft: boolean; onStage: (stage: number) => void }) {
  const [coverage, setCoverage] = useState<{interviewed:number;observed:number;complete:boolean} | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [annualWarning, setAnnualWarning] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const configured = Boolean(dashboard);
  const enrollmentCompleted = Boolean(dashboard?.profile.enrollment_completed_at);
  const total = dashboard?.students.length ?? 0;
  useEffect(() => {
    if (!total) return;
    let live = true;
    const timeout = window.setTimeout(()=>{if(live){live=false;setError("No pudimos consultar el progreso. Reintenta cuando tengas conexión.");}},15000);
    Promise.all([loadDiagnostics(), loadFamilyInterviewStatuses(), loadSpontaneousObservations()]).then(([data, interviews, observations]) => {
      if (live) {setCoverage(initialDiagnosticProgress({students:data.students, interviews:interviews.students, spontaneous:observations.observations, guided:data.experience_observations, legacy:data.observations}));setError("");}
    }).catch(() => {if(live)setError("No pudimos consultar las entrevistas y observaciones. Tus registros siguen guardados.");}).finally(()=>window.clearTimeout(timeout));
    return () => {live=false;window.clearTimeout(timeout);};
  }, [total, retry]);
  const initialCoverage = Boolean(coverage?.complete && !error);
  const next = preparationStage({configured,studentCount:total,enrollmentCompleted,initialCoverage});
  const selected = selectedStage ?? next;
  function openStage(stage: number) {
    if (stage === 4 && !initialCoverage) setAnnualWarning(true);
    else onStage(stage);
  }
  const stages = [
    {id:1,title:"Configura tu aula",completed:configured,description:configured ? `${dashboard?.profile.section} · ${dashboard?.profile.age_label} · Aula configurada` : "Registra los datos de tu colegio y tu aula.",action:configured ? "Editar aula" : "Configurar aula",enabled:true},
    {id:2,title:"Añade a tus niños",completed:enrollmentCompleted,description:`${total} ${total===1 ? "niño registrado" : "niños registrados"}${enrollmentCompleted ? " · Matrícula confirmada" : ""}`,action:enrollmentCompleted ? "Gestionar niños" : "Continuar matrícula",enabled:configured},
    {id:3,title:"Conoce a tu grupo",completed:initialCoverage,description:initialCoverage ? "Cobertura inicial de todos tus niños. Seguirás conociéndolos durante el año." : "Conversa con las familias y observa a tus niños mientras juegan.",action:"Continuar conociendo a mi grupo",enabled:total>0},
    {id:4,title:"Prepara Mi año",completed:false,description:annualDraft ? "Tu borrador está guardado. Puedes continuar preparándolo." : "Puedes comenzar con lo que tienes y seguir conociendo al grupo después.",action:annualDraft ? "Continuar Mi año" : "Comenzar Mi año",enabled:configured},
  ];
  return <section data-ayni-screen="preparation-home" className="mx-auto max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-extrabold text-[#172b52] sm:text-3xl">Preparemos tu año escolar</h1><p className="mt-2 text-[#526b87]">{dashboard?.profile.school_year ?? year ?? ""} · Avanza a tu ritmo. Puedes volver a cualquiera de estas etapas.</p></header>
    <ol className="ayni-journey ayni-preparation-journey" role="tablist" aria-label="Etapas de mi preparación">
      {stages.map(stage => <li key={stage.id} role="presentation" data-stage={stage.id} data-state={stage.completed ? "completed" : selected===stage.id ? "active" : "pending"} className={stage.completed ? "is-complete" : ""}>
        <button type="button" role="tab" id={`preparation-tab-${stage.id}`} aria-label={`${stage.id}. ${stage.title}${stage.completed ? ", completado" : ""}`} aria-controls="preparation-stage-content" aria-selected={selected===stage.id} tabIndex={selected===stage.id ? 0 : -1} className="ayni-journey-link" onClick={()=>setSelectedStage(stage.id)} onKeyDown={event=>{
          const target = event.key === "ArrowRight" ? stage.id % 4 + 1 : event.key === "ArrowLeft" ? (stage.id + 2) % 4 + 1 : event.key === "Home" ? 1 : event.key === "End" ? 4 : null;
          if(target){event.preventDefault();setSelectedStage(target);document.getElementById(`preparation-tab-${target}`)?.focus();}
        }}><span aria-hidden="true">{stage.completed ? <Check/> : stage.id}</span><small>{stage.id}. {stage.title}</small></button>
      </li>)}
    </ol>
    <div id="preparation-stage-content" role="tabpanel" aria-labelledby={`preparation-tab-${selected}`} className="ayni-panel space-y-5 p-5 sm:p-7" tabIndex={0}>
      {selected===1 && <>
        <div className="flex items-start gap-3">{configured && <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#17653f] text-white"><Check aria-hidden="true"/></span>}<div><h2 className="text-xl font-extrabold text-[#172b52]">{configured ? "¡Tu aula está configurada!" : "Configura tu aula"}</h2><p className="mt-2 text-sm text-[#526b87]">{stages[0].description}</p></div></div>
        <div className="flex flex-wrap gap-3"><Button variant={configured ? "outline" : "default"} onClick={()=>onStage(1)}>{stages[0].action}</Button><Button variant="outline" onClick={()=>setSelectedStage(2)}>Continuar<ArrowRight aria-hidden="true"/></Button></div>
      </>}
      {selected===2 && <>
        <div className="flex items-start gap-3">{enrollmentCompleted && <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#17653f] text-white"><Check aria-hidden="true"/></span>}<div><h2 className="text-xl font-extrabold text-[#172b52]">{enrollmentCompleted ? "¡Tu matrícula está confirmada!" : "Añade a tus niños"}</h2><p className="mt-2 text-sm text-[#526b87]">{stages[1].description}</p>{!enrollmentCompleted && <p className="mt-2 text-sm text-[#526b87]">Añádelos uno por uno o importa tu lista. Cuando termines, confirma «Terminé de registrar a mis niños».</p>}</div></div>
        <div className="flex flex-wrap gap-3"><Button variant={enrollmentCompleted ? "outline" : "default"} disabled={!configured} onClick={()=>onStage(2)}>{enrollmentCompleted ? "Gestionar niños" : "Añadir niños"}</Button><Button variant="outline" onClick={()=>setSelectedStage(3)}>Continuar<ArrowRight aria-hidden="true"/></Button></div>
        {!configured && <Button variant="outline" onClick={()=>onStage(1)}>Configurar aula</Button>}
      </>}
      {selected===3 && <>
        <div><h2 className="text-xl font-extrabold text-[#172b52]">Conoce a tu grupo</h2><p className="mt-2 text-sm leading-relaxed text-[#526b87]">Descubre qué les gusta a tus niños y cómo aprenden, conversando con las familias y observándolos mientras juegan.</p></div>
        <div className="grid gap-5 sm:grid-cols-2"><DiagnosticProgress label="Entrevistas a familias" count={coverage?.interviewed ?? 0} total={total} loading={total>0 && !coverage} error={error}/><DiagnosticProgress label="Observaciones iniciales" count={coverage?.observed ?? 0} total={total} loading={total>0 && !coverage} error={error}/></div>
        {error && <Button variant="outline" onClick={()=>{setCoverage(null);setError("");setRetry(value=>value+1);}}>Reintentar progreso</Button>}
        <Button className="min-h-12 w-full whitespace-normal" disabled={!total} onClick={()=>onStage(3)}>Continuar conociendo a mi grupo<ArrowRight aria-hidden="true" className="shrink-0"/></Button>
        <p className="rounded-xl bg-[#edf8fc] p-4 text-sm leading-relaxed text-[#526b87]">Las entrevistas y observaciones son recomendadas. Puedes avanzar a Prepara Mi año aunque las barras estén incompletas.</p>
      </>}
      {selected===4 && <>
        <div><h2 className="text-xl font-extrabold text-[#172b52]">Prepara Mi año</h2><p className="mt-2 text-sm leading-relaxed text-[#526b87]">{annualDraft ? stages[3].description : "Ayni utilizará la información de tu aula y lo que conoces de tus niños para ayudarte a preparar los proyectos del año."}</p></div>
        <p className="text-sm text-[#526b87]">Puedes comenzar con la información disponible y seguir conociendo a tu grupo después.</p>
        <Button variant={initialCoverage ? "default" : "outline"} disabled={!configured} className="min-h-12 whitespace-normal" onClick={()=>openStage(4)}>{stages[3].action}<ArrowRight aria-hidden="true"/></Button>
        {!configured && <Button variant="outline" onClick={()=>onStage(1)}>Configurar aula</Button>}
      </>}
    </div>
    <Dialog open={annualWarning} onOpenChange={setAnnualWarning}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Aún puedes conocer mejor a tu grupo</DialogTitle><DialogDescription>Todavía tienes entrevistas u observaciones iniciales pendientes. Ayni puede preparar tu plan anual ahora, pero tendrá menos información para personalizar los proyectos según los intereses y necesidades de tus niños. Podrás completar estos registros después.</DialogDescription></DialogHeader>
        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button className="min-h-12 whitespace-normal" onClick={()=>{setAnnualWarning(false);onStage(3);}}>Volver a conocer a mi grupo</Button>
          <Button variant="outline" className="min-h-12 whitespace-normal" onClick={()=>{setAnnualWarning(false);onStage(4);}}>Continuar con la información disponible</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
