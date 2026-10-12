"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDiagnostics, loadFamilyInterviewStatuses, loadSpontaneousObservations, type LocalDashboard } from "@/src/lib/local-database";
import { initialDiagnosticProgress } from "@/src/lib/initial-diagnostic-progress.mjs";
import { preparationStage } from "@/src/lib/preparation-navigation.mjs";
import { DiagnosticProgress } from "./diagnostic-progress";

export function PreparationHome({ dashboard, year, annualDraft, onStage }: { dashboard: LocalDashboard | null; year?: number; annualDraft: boolean; onStage: (stage: number) => void }) {
  const [coverage, setCoverage] = useState<{interviewed:number;observed:number;complete:boolean} | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const configured = Boolean(dashboard);
  const total = dashboard?.students.length ?? 0;
  useEffect(() => {
    if (!total) return;
    let live = true;
    Promise.all([loadDiagnostics(), loadFamilyInterviewStatuses(), loadSpontaneousObservations()]).then(([data, interviews, observations]) => {
      if (live) {setCoverage(initialDiagnosticProgress({students:data.students, interviews:interviews.students, spontaneous:observations.observations, guided:data.experience_observations, legacy:data.observations}));setError("");}
    }).catch(() => {if(live)setError("No pudimos consultar las entrevistas y observaciones. Tus registros siguen guardados.");});
    return () => {live=false;};
  }, [total, retry]);
  const next = preparationStage({configured,studentCount:total,annualDraft,initialCoverage:coverage?.complete ?? false});
  const stages = [
    {id:1,title:"Configura tu aula",description:configured ? `${dashboard?.profile.section} · ${dashboard?.profile.age_label} · Aula configurada` : "Registra los datos de tu colegio y tu aula.",action:configured ? "Editar aula" : "Configurar aula",enabled:true},
    {id:2,title:"Añade a tus niños",description:`${total} ${total===1 ? "niño registrado" : "niños registrados"}`,action:"Continuar matrícula",enabled:configured},
    {id:3,title:"Conoce a tu grupo",description:"Conversa con las familias y observa a tus niños mientras juegan.",action:"Continuar conociendo a mi grupo",enabled:total>0},
    {id:4,title:"Prepara Mi año",description:annualDraft ? "Tu borrador está guardado. Puedes continuar preparándolo." : "Puedes comenzar con lo que tienes y seguir conociendo al grupo después.",action:annualDraft ? "Continuar Mi año" : "Comenzar Mi año",enabled:configured},
  ];
  return <section data-ayni-screen="preparation-home" className="mx-auto max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-extrabold text-[#172b52] sm:text-3xl">Preparemos tu año escolar</h1><p className="mt-2 text-[#526b87]">{dashboard?.profile.school_year ?? year ?? ""} · Avanza a tu ritmo. Puedes volver a cualquiera de estas etapas.</p></header>
    <ol className="divide-y divide-[#d4e1ed] rounded-xl border border-[#d4e1ed] bg-white px-5 sm:px-6">
      {stages.map(stage => <li key={stage.id} className="py-5" aria-current={next===stage.id ? "step" : undefined}>
        <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#9bbccc] text-sm font-bold text-[#07576c]" aria-hidden="true">{stage.id===1 && configured ? <Check className="size-4"/> : stage.id}</span><div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-5"><div><h2 className="text-lg font-bold text-[#172b52]">{stage.title}</h2><p className="mt-1 text-sm text-[#526b87]">{stage.description}</p></div>
          {stage.id===3 && <div className="mt-4 grid gap-4 sm:col-span-2 sm:grid-cols-2"><DiagnosticProgress label="Familias entrevistadas" count={coverage?.interviewed ?? 0} total={total} loading={total>0 && !coverage} error={error}/><DiagnosticProgress label="Niños con observaciones iniciales" count={coverage?.observed ?? 0} total={total} loading={total>0 && !coverage} error={error}/></div>}
          {stage.id===3 && error && <Button variant="outline" className="mt-3" onClick={()=>setRetry(value=>value+1)}>Reintentar progreso</Button>}
          <Button variant={next===stage.id ? "default" : "outline"} disabled={!stage.enabled} className="mt-4 min-h-11 max-w-full whitespace-normal text-left sm:col-start-2 sm:row-start-1 sm:mt-0" onClick={()=>onStage(stage.id)}>{stage.action}<ArrowRight aria-hidden="true" className="size-4 shrink-0"/></Button>
        </div></div>
      </li>)}
    </ol>
    <p className="text-sm text-[#526b87]">Las entrevistas y observaciones son recomendadas. Puedes preparar Mi año aunque las barras estén incompletas.</p>
  </section>;
}
