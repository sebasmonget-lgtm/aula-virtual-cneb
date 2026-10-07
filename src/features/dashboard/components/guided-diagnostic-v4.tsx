"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { PedagogicalBlock } from "./pedagogical-block";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDiagnostics, loadClassroomContext, loadSpontaneousObservations, saveDiagnosticExperienceObservation,
  type DiagnosticWorkspace, type LocalDashboard, type PublicClassroomContext, type SpontaneousObservation,
} from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { DiagnosticReview } from "./diagnostic-review-v4";
import { DiagnosticBriefReview } from "./diagnostic-brief-review";
import { FamilyInterviewEditor, FamilyInterviewStatusBadge, useFamilyInterviewStatusMap } from "./family-interview-v4";
import { SpontaneousDiagnostic } from "./spontaneous-diagnostic-v4";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { DictationRecorder } from "./dictation-recorder";
import { useWorkspaceSubview } from "@/src/lib/workspace-location";
import { JourneySteps } from "./initial-journey-ui";
import { StudentPhoto } from "./student-photo";
import { ObservationCoverageMatrix } from "./observation-coverage-matrix";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

type Filter = "all" | "without" | "with" | "today";
const diagnosticStepValues = [1, 2, 3] as const;
const observationModes = ["guided", "spontaneous"] as const;
function isToday(value: string) { return new Date(value).toDateString() === new Date().toDateString(); }

export function GuidedDiagnostic({ dashboard, onPlan, onStudents, initialStep = 1 }: {
  dashboard: LocalDashboard; onPlan?: () => void; onStudents?: () => void; initialStep?: 1 | 2 | 3;
}) {
  const [data, setData] = useState<DiagnosticWorkspace | null>(null);
  const [step, setStep] = useWorkspaceSubview("Planificar", "step", diagnosticStepValues, initialStep === 3 ? 2 : initialStep);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [interviewStudentId, setInterviewStudentId] = useState<string | null>(null);
  const [observationMode, setObservationMode] = useWorkspaceSubview("Planificar", "mode", observationModes, "spontaneous");
  const [, setPendingSpontaneous] = useState<number | null>(null);
  const [spontaneousRecords, setSpontaneousRecords] = useState<SpontaneousObservation[] | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [aspectId, setAspectId] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [working, setWorking] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [classroomContext, setClassroomContext] = useState<PublicClassroomContext | null>(null);
  const [legacyReviewOpen, setLegacyReviewOpen] = useState(false);
  const [matrixOpen,setMatrixOpen]=useState(false);
  const [matrixCompetencies,setMatrixCompetencies]=useState<{id:string;name:string}[]>([]);
  const [matrixCoverage,setMatrixCoverage]=useState<{counts:Record<string,number>;unclassified:number;observed_students:number;records?:{student_id:string;text:string;date:string;competency_ids:string[]}[]}|null>(null);
  const [matrixError,setMatrixError]=useState("");
  const [briefReview,setBriefReview]=useState(false);
  const [freeStudentId,setFreeStudentId]=useState("");
  const [freeCompetencyId,setFreeCompetencyId]=useState("");
  async function refreshObservationProgress(){await refreshPendingSpontaneous();try{setData(await loadDiagnostics());setError("");}catch{setFeedback("Observación guardada. El resumen se actualizará al abrir la matriz.");}}
  const { statuses: interviewStatuses, error: interviewStatusError } = useFamilyInterviewStatusMap(`${interviewStudentId ?? "list"}:${data?.students.map((item) => item.id).join(",") ?? ""}`, Boolean(data?.students.length));

  useEffect(() => { loadDiagnostics().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el diagnóstico.")); }, []);
  useEffect(()=>{let live=true;
    apiFetch(`${localDatabaseApiUrl}/api/annual-journey/coverage`).then(async response=>{
      if(!response.ok)throw new Error("No pudimos consultar los registros. Puedes volver a observar o continuar a preparar tu año.");
      const result=await response.json() as {curriculum:{id:string;name:string}[];counts:Record<string,number>;unclassified:number;observed_students:number};
      if(live){setMatrixError("");setMatrixCompetencies(result.curriculum);setMatrixCoverage(result);}
    }).catch(e=>{if(live){setMatrixCoverage(null);setMatrixError(e.message);}});return()=>{live=false;};
  },[matrixOpen,data,spontaneousRecords]);
  async function refreshPendingSpontaneous() {
    try {
      const result = await loadSpontaneousObservations();
      setSpontaneousRecords(result.observations);
      setPendingSpontaneous(result.observations.filter((item) => item.classification_source !== "teacher").length);
    } catch { setPendingSpontaneous(null); }
  }
  useEffect(() => { loadSpontaneousObservations().then((result) => {
    setSpontaneousRecords(result.observations);
    const count = result.observations.filter((item) => item.classification_source !== "teacher").length;
    setPendingSpontaneous(count);
    if (initialStep === 3) setStep(3);
  }).catch(() => { setPendingSpontaneous(null); if (initialStep === 3) setStep(3); }); }, [initialStep, setStep]);
  function openMatrix(){setMatrixCoverage(null);setMatrixError("");setMatrixOpen(true);}
  function goToStep(next: 1 | 2 | 3) {
    if (next === 3 && onPlan) { openMatrix(); setStep(2); return; }
    setMatrixOpen(false); setStep(next); setStudentId(null); setInterviewStudentId(null);
  }
  useEffect(() => {
    if (interviewStudentId || step !== 1) return;
    let cancelled = false;
    loadClassroomContext().then((value) => { if (!cancelled) setClassroomContext(value); }).catch(() => { if (!cancelled) setClassroomContext(null); });
    return () => { cancelled = true; };
  }, [interviewStudentId, step]);
  const experience = data?.experiences.find((item) => item.id === experienceId);
  const student = data?.students.find((item) => item.id === studentId);
  const records = useMemo(() => data?.experience_observations.filter((item) => item.experience_id === experienceId) ?? [], [data, experienceId]);
  const coverage = data?.experience_coverage.find((item) => item.experience_id === experienceId);
  const observedPairs = new Set([
    ...(data?.experience_observations ?? []).map((item) => `${item.student_id}:${item.competency_v4_id}`),
    ...(spontaneousRecords ?? []).filter((item) => item.classification_source === "teacher")
      .flatMap((item) => item.competency_v4_ids.map((id) => `${item.student_id}:${id}`)),
  ]);
  const missingFor = (id: string, competencyIds: string[]) => competencyIds.filter((competencyId) =>
    !observedPairs.has(`${id}:${competencyId}`));
  const experienceGapScore = (competencyIds: string[]) => (data?.students ?? []).reduce((total, item) =>
    total + missingFor(item.id, competencyIds).length, 0);
  const highestGapScore = Math.max(0, ...(data?.experiences ?? []).map((item) => experienceGapScore(item.competencies.map((card) => card.id))));
  const visibleStudents = (data?.students ?? []).filter((item) => {
    const own = records.filter((record) => record.student_id === item.id);
    if (filter === "without") return missingFor(item.id, experience?.competencies.map((card) => card.id) ?? []).length > 0;
    if (filter === "with") return own.length > 0;
    if (filter === "today") return own.some((record) => isToday(record.observed_at));
    return true;
  }).sort((a, b) => missingFor(b.id, experience?.competencies.map((card) => card.id) ?? []).length -
    missingFor(a.id, experience?.competencies.map((card) => card.id) ?? []).length);

  function selectExperience(id: string) {
    setExperienceId(id); setStudentId(null); setFilter("all"); setFeedback(""); setError("");
  }
  function selectStudent(id: string) {
    setStudentId(id); setNote(""); setError(""); setFeedback("");
  }
  async function save() {
    if (!studentId || !experienceId || !aspectId || !note.trim() || working || audioBusy) return;
    setWorking(true); setError("");
    try {
      const updated = await saveDiagnosticExperienceObservation({ studentId, experienceId, aspectId, observationStatus: "observed_without_judgment", observationText: note });
      setData(updated); setStudentId(null); setFilter("all");
      setFeedback("Observación registrada. Puedes elegir a otro niño o volver a registrar al mismo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setWorking(false); }
  }

  if (error && !data) return <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error}</p>;
  if (!data) return <LoadingState label="Cargando diagnóstico..." />;
  if(briefReview)return <DiagnosticBriefReview onBack={()=>setBriefReview(false)} onContinue={()=>onPlan?.()}/>;
  if (!data.students.length) return <section className="diagnostic-panel space-y-3 p-5"><h1 className="text-2xl font-bold">Primero, conoce a tu grupo</h1><p className="text-sm text-[#526b87]">Agrega a las niñas y los niños del aula para comenzar.</p>{onStudents && <Button onClick={onStudents}>Agregar niños <ArrowRight className="size-4" /></Button>}</section>;

  return <div className="diagnostic-shell space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><span className="grid size-10 sm:size-14 shrink-0 place-items-center rounded-full bg-[#087d96] text-2xl font-bold text-white">{matrixOpen?3:step}</span><div><h1 className="text-2xl sm:text-3xl font-extrabold text-[#172b52]">{matrixOpen?"Revisar lo que conocemos":step===1?"Familias":"Observar"}</h1><p className="mt-2 text-sm text-[#526b87]">{matrixOpen?"Alumnos × competencias":step===1?"Una pregunta a la vez, con ejemplos y progreso.":"Registra lo que observas o prueba una experiencia para conocer mejor."}</p></div></div>
      <span className="hidden sm:block rounded-full bg-[#edf5fb] px-4 py-2 text-sm font-semibold text-[#1b5175]">{data.classroom.age_years} años · {data.classroom.section}</span>
    </header>
    <JourneySteps active={matrixOpen?3:step} onStep={n=>goToStep(n as 1|2|3)}/>
    {error && !student && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}

    {step === 1 && interviewStudentId && <FamilyInterviewEditor studentId={interviewStudentId} studentName={data.students.find((item) => item.id === interviewStudentId)?.name ?? "este niño"} printContext={{ institution: dashboard.profile.institution_name, classroom: data.classroom.section }} onSaved={() => setInterviewFeedback("Entrevista guardada. Puedes entrevistar a otro niño.")} onBack={() => setInterviewStudentId(null)} />}
    {step === 1 && !interviewStudentId && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <h2 className="text-xl font-bold">Conoce a cada niño y su familia</h2>
      <p>{dashboard.profile.institution_name} · {data.classroom.section} · {data.students.length} niños</p>
      <p className="text-sm text-[#526b87]">Registra una entrevista breve si ya conversaste con la familia. Puedes responder solo lo necesario o imprimirla para hacerla en papel.</p>
      {interviewFeedback && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm text-[#176442]">{interviewFeedback}</p>}
      {interviewStatusError && <p role="alert" className="text-sm text-[#88591d]">{interviewStatusError}</p>}
      <div className="grid gap-2 sm:grid-cols-2">{data.students.map((item) => <button key={item.id} type="button" className={`flex min-h-16 items-center justify-between gap-2 rounded-xl border p-3 text-left font-semibold hover:border-[#087d96] ${interviewStatuses[item.id] === "confirmed" ? "border-[#a8dbc1] bg-[#f0faf4]" : interviewStatuses[item.id] === "partial" ? "border-[#ecd29a] bg-[#fff9ec]" : "bg-white"}`} onClick={() => setInterviewStudentId(item.id)}><span className="flex items-center gap-3"><StudentPhoto id={item.id} name={displayPersonName(item.name)}/><span>Entrevista de {displayPersonName(item.name)} →</span></span><FamilyInterviewStatusBadge status={interviewStatuses[item.id]} /></button>)}</div>
      {classroomContext && <div className="rounded-2xl bg-[#eef8fb] p-4 text-sm text-[#294b64]" aria-label="Panorama del grupo">
        <h3 className="font-bold text-[#172b52]">Así vamos conociendo al grupo</h3>
        <p className="mt-1">{classroomContext.confirmed_interviews} de {classroomContext.students_total} entrevistas confirmadas. Las respuestas de cada familia permanecen en el perfil de su niño.</p>
        {classroomContext.common_interests.length > 0 && <p className="mt-2">Intereses frecuentes: {classroomContext.common_interests.map((item) => item.label.toLowerCase()).join(", ")}.</p>}
        {classroomContext.languages.length > 0 && <p className="mt-1">Lenguas informadas por varias familias: {classroomContext.languages.map((item) => item.label).join(", ")}.</p>}
        {classroomContext.primary_languages.length > 0 && <p className="mt-1">Lenguas principales frecuentes: {classroomContext.primary_languages.map((item) => item.label).join(", ")}.</p>}
        {classroomContext.confirmed_diagnostic_summary && <p className="mt-2">Síntesis diagnóstica confirmada: {classroomContext.confirmed_diagnostic_summary}</p>}
        <p className="mt-2 text-xs">Se muestran solo patrones suficientemente frecuentes. Las entrevistas aportan contexto; no son observaciones de la docente ni niveles de logro.</p>
      </div>}
      <div className="flex justify-end"><Button className="min-h-12" onClick={() => setStep(2)}>Continuar a observar <ArrowRight /></Button></div>
    </section>}

    {step === 2 && matrixOpen && matrixCoverage && <ObservationCoverageMatrix data={data} counts={matrixCoverage.counts} unclassified={matrixCoverage.unclassified} competencies={matrixCompetencies} records={matrixCoverage.records}
      onBack={()=>setMatrixOpen(false)} onContinue={()=>setBriefReview(true)}
      onRecord={(id,competencyId)=>{setMatrixOpen(false);setExperienceId(null);setFreeStudentId(id);setFreeCompetencyId(competencyId);setObservationMode("spontaneous");}}
      onGuided={(id,experience)=>{setMatrixOpen(false);setObservationMode("guided");selectExperience(experience);selectStudent(id);}} />}
    {step === 2 && matrixOpen && !matrixCoverage && <section className="diagnostic-panel space-y-4 p-5">{matrixError?<p role="alert">{matrixError}</p>:<LoadingState label="Consultando las observaciones de tu aula…" />}<Button variant="outline" onClick={()=>setMatrixOpen(false)}>Volver a observar</Button><Button onClick={()=>onPlan?.()}>Continuar de todas formas →</Button></section>}
    {step === 2 && !matrixOpen && !experience && !freeCompetencyId && <div className="space-y-2">
      <div role="group" aria-label="Forma de observar" className="grid gap-2 rounded-2xl border border-[#c9dce9] bg-white p-2 sm:grid-cols-2">{([["spontaneous","Registrar algo que observé"],["guided","Probar una experiencia para conocer mejor"]] as const).map(([mode,label])=><button key={mode} type="button" aria-pressed={observationMode===mode} onClick={()=>{setFreeCompetencyId("");setObservationMode(mode);}} className={`min-h-14 rounded-xl px-4 py-3 text-sm font-bold sm:text-base ${observationMode===mode?"bg-[#e4f3f7] text-[#075d70]":"text-[#526b87] hover:bg-[#f5f8fb]"}`}>{label}</button>)}</div>
      <p className="px-1 text-sm text-[#526b87]">{observationMode === "guided" ? "Elige un juego sugerido y anota lo que observaste." : "Anota algo que ocurrió durante el juego o la jornada."}</p>
    </div>}
    {step === 2 && !matrixOpen && !experience && observationMode === "spontaneous" && <SpontaneousDiagnostic key={`${freeStudentId}:${freeCompetencyId}`} initialStudentId={freeStudentId} initialCompetencyId={freeCompetencyId} onBack={()=>{setFreeCompetencyId("");openMatrix();}} students={data.students} onDecisionSaved={() => void refreshPendingSpontaneous()} onSaved={() => void refreshObservationProgress()} />}
    {step === 2 && !matrixOpen && !experience && observationMode === "guided" && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <div><h2 className="text-xl font-bold">¿Qué experiencia realizaste?</h2><p className="mt-1 text-sm text-[#526b87]">Son ideas para observar en el juego y la jornada; puedes volver a cualquiera otro día.</p></div>
      {data.experiences.some((item) => item.catalog_status === "development_fixture") && <p className="rounded-xl bg-[#fff5df] p-3 text-sm">Guías de desarrollo: todavía no son la batería pedagógica definitiva de Ayni.</p>}
      {spontaneousRecords && <p className="rounded-xl bg-[#edf8f4] p-3 text-sm text-[#246554]">Las experiencias marcadas ofrecen oportunidades para competencias con menos registros. La ausencia de observaciones no indica una dificultad del niño.</p>}
      <div className="grid gap-3 md:grid-cols-2">{data.experiences.map((item) => {
        const progress = data.experience_coverage.find((value) => value.experience_id === item.id);
        const score = experienceGapScore(item.competencies.map((card) => card.id));
        const recommended = spontaneousRecords && score > 0 && score === highestGapScore;
        return <button key={item.id} type="button" onClick={() => selectExperience(item.id)} className={`min-h-28 rounded-2xl border-2 bg-white p-4 text-left hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96] ${recommended ? "border-[#54a98a]" : "border-[#dce9f2] hover:border-[#087d96]"}`}><span className="font-bold text-[#172b52]">{item.title}</span>{recommended && <span className="ml-2 inline-block rounded-full bg-[#e0f5e9] px-2 py-1 text-xs font-bold text-[#176442]">Recomendada para observar</span>}<span className="mt-1 block text-sm text-[#526b87]">{item.explanation}</span><span className="mt-2 block text-xs font-semibold text-[#087d96]">{progress?.students_with_records ?? 0} de {data.students.length} niños con registros</span></button>;
      })}</div>
    </section>}

    {step === 2 && !matrixOpen && experience && !student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" onClick={() => { setExperienceId(null); setFilter("all"); }}><ArrowLeft /> Volver a experiencias</Button>
      <h2 className="text-2xl font-extrabold">{experience.title}</h2>
      {experience.pedagogical_blocks?.map(block => <PedagogicalBlock key={block.id} block={block} onObserve={(aspect) => { setAspectId(aspect); document.getElementById("diagnostic-students")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />)}
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">3. Elige a un niño y anota lo que viste</h3><p className="text-sm text-[#526b87]">Toca su nombre cuando ocurra algo que quieras recordar. {coverage?.students_with_records ?? 0} de {data.students.length} con algún registro.</p>{spontaneousRecords && <p className="mt-1 text-sm text-[#176442]">Primero aparecen quienes aún no tienen registros de las competencias de esta experiencia.</p>}</div><Button variant="outline" className="min-h-12" onClick={() => goToStep(3)}>Revisar matriz y continuar <ArrowRight /></Button></div>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar niños">{([
        ["all", "Todos"], ["without", "Sin observaciones"], ["with", "Con observaciones"], ["today", "Observados hoy"],
      ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${filter === value ? "border-[#087d96] bg-[#dff3f7] text-[#075d70]" : "border-[#dbe6ef] bg-white text-[#435a78]"}`}>{label}</button>)}</div>
      {feedback && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm text-[#1e6040]">✓ {feedback}</p>}
      <div id="diagnostic-students" className="grid scroll-mt-24 gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleStudents.map((item) => {
        const own = records.filter((record) => record.student_id === item.id);
        const today = own.some((record) => isToday(record.observed_at));
        const missing = missingFor(item.id, experience.competencies.map((card) => card.id));
        return <button key={item.id} type="button" onClick={() => selectStudent(item.id)} className={`min-h-20 rounded-2xl border bg-white p-4 text-left hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96] ${spontaneousRecords && missing.length ? "border-[#54a98a]" : "border-[#dce9f2] hover:border-[#087d96]"}`}><span className="block text-base font-bold">{displayPersonName(item.name)}</span><span className="mt-1 block text-sm text-[#526b87]">{own.length === 0 ? "Sin observaciones en esta experiencia" : `${own.length} ${own.length === 1 ? "observación" : "observaciones"}`}</span>{spontaneousRecords && missing.length > 0 && <span className="mt-1 block text-xs font-semibold text-[#176442]">Por observar: {experience.competencies.filter((card) => missing.includes(card.id)).map((card) => card.name).join(" · ")}</span>}{today && <span className="mt-1 block text-xs font-semibold text-[#087d96]">✓ Observación registrada hoy</span>}</button>;
      })}</div>
      {visibleStudents.length === 0 && <p className="rounded-xl bg-[#f3f7fb] p-4 text-sm">No hay niños en este filtro. Puedes volver a “Todos”.</p>}
      <details className="border-t border-[#e3ebf2] pt-3 text-sm"><summary className="cursor-pointer font-semibold text-[#426079]">Relación curricular · {experience.competencies.length} {experience.competencies.length === 1 ? "competencia" : "competencias"}</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-[#526b87]">{experience.competencies.map((item) => <li key={item.id}>{item.name}</li>)}</ul></details>
    </section>}

    {step === 2 && !matrixOpen && experience && student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" disabled={working || audioBusy} onClick={() => setStudentId(null)}><ArrowLeft /> Volver a todos los niños</Button>
      <div><p className="text-sm font-semibold text-[#087d96]">{experience.title}</p><h2 className="text-2xl font-extrabold">{displayPersonName(student.name)}</h2><p className="mt-1 text-sm text-[#526b87]">Registra solo lo que observaste. Puedes añadir más de una observación de este niño.</p></div>
      <fieldset className="space-y-2" disabled={working || audioBusy}><legend className="font-bold">¿Qué quieres observar?</legend><p className="text-sm text-[#526b87]">Esto solo te ayuda a enfocar la observación. No estás calificando al niño.</p>{experience.aspects.map((aspect) => <label key={aspect.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${aspectId === aspect.id ? "border-[#087d96] bg-[#e8f7fa]" : "border-[#dce9f2]"}`}><input type="radio" name="diagnostic-aspect" checked={aspectId === aspect.id} onChange={() => setAspectId(aspect.id)} /><span className="font-semibold">{aspect.label}</span></label>)}</fieldset>
      <label className="block text-sm font-semibold">¿Qué hizo o dijo?<span className="mt-1 block font-normal text-[#526b87]">Puedes anotar qué hizo, qué dijo, cómo lo hizo o si necesitó ayuda.</span><Textarea className="mt-2 min-h-24" disabled={working} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Probó saltar los bloques varias veces y cambió la distancia después de no lograrlo." /></label>
      <DictationRecorder key={`${student.id}:${experience.id}`} studentId={student.id} context={`${experience.title}: ${experience.aspects.find((aspect) => aspect.id === aspectId)?.prompt ?? "observación durante el juego"}`} currentText={note} disabled={working} onBusyChange={setAudioBusy} onTranscribed={(text) => setNote(text)} />
      <p className="text-xs text-[#526b87]">Es una nota de observación. Podrás interpretarla más adelante.</p>
      {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
      <AsyncButton className="min-h-12 w-full sm:w-auto" busy={working} busyLabel="Guardando..." disabled={audioBusy || !aspectId || !note.trim()} onClick={() => void save()}><Save /> Guardar observación</AsyncButton>
    </section>}
    {step === 2 && !matrixOpen && !student && <section className="rounded-xl border border-[#c9dce9] bg-[#edf5fa] p-5"><h2 className="text-xl font-bold">¿Listo para preparar tu año?</h2><p className="mt-2 text-[#526b87]">No necesitas observar todas las competencias para continuar. Podrás seguir conociendo al grupo durante todo el año.</p><div className="mt-4 flex flex-wrap gap-3"><Button onClick={()=>goToStep(3)}>Revisar matriz y continuar →</Button><Button variant="outline" onClick={openMatrix}>Ver niños × competencias</Button></div></section>}

    {step === 3 && <section className="diagnostic-panel space-y-4 p-5"><h2 className="text-xl font-bold">Ayni organizará lo que ya conoces</h2>
      <p className="text-sm text-[#526b87]">En «Así entendí tu aula» verás una propuesta basada en entrevistas y observaciones. Puedes corregirla antes de crear Mi año. Seguirás observando durante el año.</p>
      {onPlan && <Button className="min-h-12" onClick={onPlan}>Revisar matriz y continuar <ArrowRight /></Button>}
      <details open={legacyReviewOpen} onToggle={(event) => setLegacyReviewOpen(event.currentTarget.open)} className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-semibold">Ver revisiones diagnósticas anteriores y registros individuales</summary>
        {legacyReviewOpen && <DiagnosticReview onObserve={() => { setStep(2); setStudentId(null); }} onPlan={onPlan} onObservationSaved={() => void refreshObservationProgress()} onGroupConfirmed={() => setData((current) => current ? { ...current, step_progress: { ...current.step_progress, group_review_confirmed: true } } : current)} />}
      </details></section>}
  </div>;
}
