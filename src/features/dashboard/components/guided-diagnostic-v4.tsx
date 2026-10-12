"use client";
import { limaToday } from "@/src/lib/display-date";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Eye, MessageCircle, Save, Sparkles } from "lucide-react";
import { PedagogicalBlock } from "./pedagogical-block";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDiagnostics, loadSpontaneousObservations, saveDiagnosticExperienceObservation,
  type DiagnosticWorkspace, type LocalDashboard, type SpontaneousObservation,
} from "@/src/lib/local-database";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import { DiagnosticProgress } from "./diagnostic-progress";
import { initialDiagnosticProgress } from "@/src/lib/initial-diagnostic-progress.mjs";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { DiagnosticReview } from "./diagnostic-review-v4";
import { DiagnosticBriefReview } from "./diagnostic-brief-review";
import { FamilyInterviewEditor, FamilyInterviewStatusBadge, useFamilyInterviewStatusMap } from "./family-interview-v4";
import { SpontaneousDiagnostic } from "./spontaneous-diagnostic-v4";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { DictationRecorder } from "./dictation-recorder";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { canLeaveWorkspace, useWorkspaceSubview } from "@/src/lib/workspace-location";
import { StudentPhoto } from "./student-photo";
import { ObservationCoverageMatrix } from "./observation-coverage-matrix";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

type Filter = "all" | "without" | "with" | "today";
const diagnosticStepValues = [0, 1, 2, 3] as const;
const observationModes = ["choose", "guided", "spontaneous"] as const;
function isToday(value: string) { const date = new Date(value); return !Number.isNaN(date.valueOf()) && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) === limaToday(); }

export function GuidedDiagnostic({ dashboard, onPlan, onStudents, initialStep = 1 }: {
  dashboard: LocalDashboard; onPlan?: () => void; onStudents?: () => void; initialStep?: 1 | 2 | 3;
}) {
  const [data, setData] = useState<DiagnosticWorkspace | null>(null);
  const [step, setStep] = useWorkspaceSubview("Planificar", "step", diagnosticStepValues, initialStep === 1 ? 0 : initialStep, false);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [interviewStudentId, setInterviewStudentId] = useState<string | null>(null);
  const [observationMode, setObservationMode] = useWorkspaceSubview("Planificar", "mode", observationModes, "choose", false);
  const [, setPendingSpontaneous] = useState<number | null>(null);
  const [observationsError, setObservationsError] = useState("");
  const [spontaneousRecords, setSpontaneousRecords] = useState<SpontaneousObservation[] | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [aspectId, setAspectId] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [working, setWorking] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewRevision, setInterviewRevision] = useState(0);
  const { confirmation, confirm } = useSaveConfirmation();
  const savingObservation = useRef(false);
  const [legacyReviewOpen, setLegacyReviewOpen] = useState(false);
  const [matrixOpen,setMatrixOpen]=useState(false);
  const [matrixCompetencies,setMatrixCompetencies]=useState<{id:string;name:string}[]>([]);
  const [matrixCoverage,setMatrixCoverage]=useState<{counts:Record<string,number>;unclassified:number;observed_students:number;records?:{student_id:string;text:string;date:string;competency_ids:string[]}[]}|null>(null);
  const [matrixError,setMatrixError]=useState("");
  const [briefReview,setBriefReview]=useState(false);
  const [freeStudentId,setFreeStudentId]=useState("");
  const [freeCompetencyId,setFreeCompetencyId]=useState("");
  async function refreshObservationProgress(){await refreshPendingSpontaneous();try{setData(await loadDiagnostics());setError("");}catch{setFeedback("Observación guardada. El resumen se actualizará al abrir la matriz.");}}
  const { statuses: interviewStatuses, confirmedIds, loaded: interviewsLoaded, error: interviewStatusError } = useFamilyInterviewStatusMap(`${interviewRevision}:${data?.students.map((item) => item.id).join(",") ?? ""}`, Boolean(data?.students.length));

  useEffect(() => { loadDiagnostics().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el diagnóstico.")); }, []);
  useEffect(()=>{if(!matrixOpen)return;let live=true;
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
      setObservationsError("");
      setPendingSpontaneous(result.observations.filter((item) => item.classification_source !== "teacher").length);
    } catch { setPendingSpontaneous(null); setObservationsError("No se pudo actualizar el progreso de observaciones."); }
  }
  useEffect(() => { loadSpontaneousObservations().then((result) => {
    setSpontaneousRecords(result.observations);
      setObservationsError("");
    const count = result.observations.filter((item) => item.classification_source !== "teacher").length;
    setPendingSpontaneous(count);
    if (initialStep === 3) setStep(3);
  }).catch(() => { setPendingSpontaneous(null); setObservationsError("No se pudo actualizar el progreso de observaciones."); if (initialStep === 3) setStep(3); }); }, [initialStep, setStep]);
  function openMatrix(){if(!canLeaveWorkspace())return;setMatrixCoverage(null);setMatrixError("");setMatrixOpen(true);}
  function goToStep(next: 0 | 1 | 2 | 3) {
    if(!canLeaveWorkspace())return;
    if (next === 3) { setBriefReview(true); return; }
    setMatrixOpen(false); setBriefReview(false); setStep(next);
  }
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
  const rankedExperiences = [...(data?.experiences ?? [])].sort((a,b)=>experienceGapScore(b.competencies.map(card=>card.id))-experienceGapScore(a.competencies.map(card=>card.id)));
  const allowLeave=useUnsavedWork(Boolean(studentId&&note.trim()),working||audioBusy);
  const visibleStudents = (data?.students ?? []).filter((item) => {
    const own = records.filter((record) => record.student_id === item.id);
    if (filter === "without") return missingFor(item.id, experience?.competencies.map((card) => card.id) ?? []).length > 0;
    if (filter === "with") return own.length > 0;
    if (filter === "today") return own.some((record) => isToday(record.observed_at));
    return true;
  }).sort((a, b) => missingFor(b.id, experience?.competencies.map((card) => card.id) ?? []).length -
    missingFor(a.id, experience?.competencies.map((card) => card.id) ?? []).length);

  function selectExperience(id: string) {
    if(!canLeaveWorkspace())return;
    setExperienceId(id); setStudentId(null); setFilter("all"); setFeedback(""); setError("");
  }
  function selectStudent(id: string) {
    if(!allowLeave())return;
    setStudentId(id); setNote(""); setError(""); setFeedback("");
  }
  async function save() {
    if (!studentId || !experienceId || !aspectId || !note.trim() || savingObservation.current || working || audioBusy) return;
    savingObservation.current = true;
    setWorking(true); setError("");
    try {
      const updated = await saveDiagnosticExperienceObservation({ studentId, experienceId, aspectId, observationStatus: "observed_without_judgment", observationText: note });
      setData(updated); setStudentId(null); setFilter("all");
      setNote("");
      confirm("¡Observación guardada!", "Puedes seguir observando a tus niños.");
      setFeedback("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { savingObservation.current = false; setWorking(false); }
  }

  if (error && !data) return <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error}</p>;
  if (!data) return <LoadingState label="Cargando diagnóstico..." />;

  if (!data.students.length) return <section className="diagnostic-panel space-y-3 p-5"><h1 className="text-2xl font-bold">Primero, conoce a tu grupo</h1><p className="text-sm text-[#526b87]">Agrega a las niñas y los niños del aula para comenzar.</p>{onStudents && <Button onClick={onStudents}>Agregar niños <ArrowRight className="size-4" /></Button>}</section>;

  const classroomData=data;
  function renderExperience(item: DiagnosticWorkspace["experiences"][number]) {
        const progress = classroomData.experience_coverage.find((value) => value.experience_id === item.id);
        const score = experienceGapScore(item.competencies.map((card) => card.id));
        const recommended = item.id===rankedExperiences[0]?.id && score>0;
        return <button key={item.id} type="button" onClick={() => selectExperience(item.id)} className={`min-h-28 w-full rounded-2xl border-2 bg-white p-4 text-left hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96] ${recommended ? "border-[#54a98a]" : "border-[#dce9f2] hover:border-[#087d96]"}`}><span className="font-bold text-[#172b52]">{item.title}</span>{recommended && <span className="ml-2 inline-block rounded-full bg-[#e0f5e9] px-2 py-1 text-xs font-bold text-[#176442]">Recomendada para observar</span>}<span className="mt-1 block text-sm text-[#526b87]">{item.explanation}</span><span className="mt-2 block text-xs font-semibold text-[#087d96]">{progress?.students_with_records ?? 0} de {classroomData.students.length} niños con registros</span></button>;
  }
  const progressReady = interviewsLoaded && !interviewStatusError && !observationsError && spontaneousRecords !== null;
  const progress = initialDiagnosticProgress({students:data.students, interviews:confirmedIds.map(student_id=>({student_id,has_confirmed_answers:true})), spontaneous:spontaneousRecords ?? [], guided:data.experience_observations, legacy:data.observations});
  const allInitial = progressReady && progress.complete;
  return <div data-ayni-screen="initial-diagnostic" className="diagnostic-shell space-y-6">
    <SaveConfirmation confirmation={confirmation}/>
    <header>
      {step !== 0 && <Button variant="outline" className="mb-4 min-h-11" onClick={() => goToStep(0)}><ArrowLeft aria-hidden="true"/>Conoce a tu grupo</Button>}
      <h1 className="text-2xl font-extrabold text-[#172b52] sm:text-3xl">{step === 0 ? "Conoce a tu grupo" : step === 1 ? "Entrevistas a las familias" : step === 2 ? "Observa a tus niños" : "Información inicial del grupo"}</h1>
      <p className="mt-2 max-w-2xl text-[#526b87]">{step === 0 ? "Antes de preparar tu año, conoce a tus niños conversando con sus familias y observándolos mientras juegan" : step === 1 ? "Elige a un niño para conversar con su familia. Todas las preguntas son opcionales y puedes continuar después." : "Observa durante los juegos y las actividades. Anota lo que hizo o dijo cada niño."}</p>
    </header>
    {(observationsError || interviewStatusError) && <Button variant="outline" onClick={() => {setInterviewRevision(value=>value+1);void refreshObservationProgress();}}>Reintentar consultar progreso</Button>}
    {step === 0 && <>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="diagnostic-panel flex flex-col gap-4 p-5 sm:p-6">
          <MessageCircle aria-hidden="true" className="size-7 text-[#087d96]"/>
          <h2 className="text-xl font-bold text-[#172b52]">Entrevista a las familias</h2>
          <p className="text-sm text-[#526b87]">Conversa sobre sus gustos, su familia y lo que les ayuda a participar.</p>
          <DiagnosticProgress label="Familias entrevistadas" count={progress.interviewed} total={progress.total} loading={!interviewsLoaded} error={interviewStatusError}/>
          <Button className="mt-auto min-h-12 w-full whitespace-normal" onClick={() => goToStep(1)}>Realizar entrevistas<ArrowRight aria-hidden="true"/></Button>
        </section>
        <section className="diagnostic-panel flex flex-col gap-4 p-5 sm:p-6">
          <Eye aria-hidden="true" className="size-7 text-[#087d96]"/>
          <h2 className="text-xl font-bold text-[#172b52]">Observa a tus niños</h2>
          <p className="text-sm text-[#526b87]">Conoce cómo juegan, se comunican y exploran, a su propio ritmo.</p>
          <DiagnosticProgress label="Niños con observaciones iniciales" count={progress.observed} total={progress.total} loading={spontaneousRecords === null} error={observationsError}/>
          <Button className="mt-auto min-h-12 w-full whitespace-normal" onClick={() => goToStep(2)}>Registrar observaciones<ArrowRight aria-hidden="true"/></Button>
        </section>
      </div>
      <section className="border-t border-[#d4e1ed] pt-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#172b52]"><CalendarDays aria-hidden="true" className="size-6"/>3. Prepara Mi año</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#526b87]">{allInitial ? "Ya tienes información inicial de todos tus niños. Podrás seguir conociéndolos durante todo el año" : "Te recomendamos conocer primero a tus niños. Puedes continuar ahora y completar las entrevistas y observaciones después"}.</p>
        {onPlan && <Button variant={allInitial ? "default" : "outline"} className="mt-4 min-h-12 whitespace-normal" onClick={() => {if(canLeaveWorkspace()) onPlan();}}>{allInitial ? "Preparar Mi año" : "Crear Mi año con lo que tengo"}<ArrowRight aria-hidden="true"/></Button>}
      </section>
    </>}
    {step === 1 && <>
      <DiagnosticProgress label="Familias entrevistadas" count={progress.interviewed} total={progress.total} loading={!interviewsLoaded} error={interviewStatusError}/>
      {interviewStudentId ? <FamilyInterviewEditor key={interviewStudentId} studentId={interviewStudentId} studentName={data.students.find(item=>item.id === interviewStudentId)?.name ?? "este niño"} printContext={{institution:dashboard.profile.institution_name,classroom:data.classroom.section}} onSaved={() => setInterviewRevision(value=>value+1)} onBack={() => setInterviewStudentId(null)} onNext={() => {const next=data.students.find(item=>item.id!==interviewStudentId && interviewStatuses[item.id]!=="confirmed");setInterviewStudentId(next?.id ?? null);}}/> : <>
        <ul className="grid gap-3 sm:grid-cols-2">{data.students.map(item => <li key={item.id} className="rounded-xl border border-[#d4e1ed] bg-white p-4">
          <div className="flex items-center gap-3"><StudentPhoto id={item.id} name={displayPersonName(item.name)}/><h2 className="min-w-0 break-words font-bold text-[#172b52]">{displayPersonName(item.name)}</h2></div>
          <div className="mt-3"><FamilyInterviewStatusBadge status={interviewStatuses[item.id]}/></div>
          <Button variant="outline" className="mt-4 min-h-11 w-full" disabled={!interviewStatuses[item.id]} onClick={() => setInterviewStudentId(item.id)}>{interviewStatuses[item.id] === "not_started" ? "Comenzar" : interviewStatuses[item.id] === "partial" ? "Continuar entrevista" : "Ver entrevista"}<ArrowRight aria-hidden="true"/></Button>
        </li>)}</ul>
        {progressReady && progress.interviewed === progress.total && <div className="border-t border-[#d4e1ed] pt-4"><p className="text-sm text-[#526b87]">Ya conversaste con todas las familias. Sigue conociendo a tus niños mientras juegan.</p><Button variant="outline" className="mt-3 min-h-11" onClick={() => goToStep(2)}>Continuar con las observaciones<ArrowRight/></Button></div>}
      </>}
    </>}
    {briefReview&&<DiagnosticBriefReview onBack={()=>setBriefReview(false)} onContinue={()=>onPlan?.()}/>}
    {step === 2 && !briefReview && <>
    <DiagnosticProgress label="Niños con observaciones iniciales" count={progress.observed} total={progress.total} loading={spontaneousRecords === null} error={observationsError}/>
    <p className="text-sm text-[#526b87]">Esta barra muestra a cuántos niños observaste inicialmente. Seguirás observando durante todo el año.</p>
    {error && !student && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}

    {matrixOpen && matrixCoverage && <ObservationCoverageMatrix data={data} counts={matrixCoverage.counts} unclassified={matrixCoverage.unclassified} competencies={matrixCompetencies} records={matrixCoverage.records}
      onBack={()=>setMatrixOpen(false)} onContinue={()=>setBriefReview(true)}
      onRecord={(id,competencyId)=>{setMatrixOpen(false);setExperienceId(null);setFreeStudentId(id);setFreeCompetencyId(competencyId);setObservationMode("spontaneous");}}
      onGuided={(id,experience)=>{setMatrixOpen(false);setObservationMode("guided");selectExperience(experience);selectStudent(id);}} />}
    {matrixOpen && !matrixCoverage && <section className="diagnostic-panel space-y-4 p-5">{matrixError?<p role="alert">{matrixError}</p>:<LoadingState label="Consultando las observaciones de tu aula…" />}<Button variant="outline" onClick={()=>setMatrixOpen(false)}>Volver a observar</Button><Button onClick={()=>onPlan?.()}>Continuar de todas formas →</Button></section>}
    {!matrixOpen && !experience && !freeCompetencyId && <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Forma de observar">
      {([{mode:"spontaneous",title:"Observación espontánea",description:"Registra algo que ocurrió naturalmente durante el juego o la jornada.",icon:Eye},{mode:"guided",title:"Experiencia guiada",description:"Realiza un juego preparado y observa cómo participan los niños.",icon:Sparkles}] as const).map(({mode,title,description,icon:Icon}) => <button key={mode} type="button" aria-pressed={observationMode===mode} onClick={()=>{if(!canLeaveWorkspace())return;setFreeCompetencyId("");setObservationMode(mode);}} className={`min-h-32 rounded-xl border-2 p-5 text-left ${observationMode===mode ? "border-[#087d96] bg-[#e8f6f8]" : "border-[#d4e1ed] bg-white hover:border-[#087d96]"}`}><Icon aria-hidden="true" className="mb-3 size-5 text-[#087d96]"/><span className="block font-bold text-[#172b52]">{title}</span><span className="mt-2 block text-sm text-[#526b87]">{description}</span></button>)}
    </div>}
    {!matrixOpen && !experience && observationMode === "spontaneous" && <SpontaneousDiagnostic key={`${freeStudentId}:${freeCompetencyId}`} initialStudentId={freeStudentId} initialCompetencyId={freeCompetencyId} onBack={()=>{setFreeCompetencyId("");openMatrix();}} students={data.students} onDecisionSaved={() => void refreshPendingSpontaneous()} onSaved={() => void refreshObservationProgress()} />}
    {!matrixOpen && !experience && observationMode === "guided" && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <div><h2 className="text-xl font-bold">Experiencias para observar</h2><p className="mt-1 text-sm text-[#526b87]">Puedes realizar un juego sugerido o volver a uno que ya realizaste.</p></div>
      {data.experiences.some((item) => item.catalog_status === "development_fixture") && <p className="rounded-xl bg-[#fff5df] p-3 text-sm">Guías de desarrollo: todavía no son la batería pedagógica definitiva de Ayni.</p>}
      {spontaneousRecords && <p className="rounded-xl bg-[#edf8f4] p-3 text-sm text-[#246554]">Las experiencias marcadas ofrecen oportunidades para competencias con menos registros. La ausencia de observaciones no indica una dificultad del niño.</p>}
      <div>{rankedExperiences[0]&&renderExperience(rankedExperiences[0])}</div>
      {rankedExperiences.length>1&&<details><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#075d70]">Ver otras {rankedExperiences.length-1} experiencias</summary><div className="grid gap-3 md:grid-cols-2">{rankedExperiences.slice(1).map(renderExperience)}</div></details>} </section>}

    {!matrixOpen && experience && !student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" onClick={() => { setExperienceId(null); setFilter("all"); }}><ArrowLeft /> Volver a experiencias</Button>
      <h2 className="text-2xl font-extrabold">{experience.title}</h2>
      {experience.pedagogical_blocks?.map(block => <PedagogicalBlock key={block.id} block={block} onObserve={(aspect) => { setAspectId(aspect); document.getElementById("diagnostic-students")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />)}
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">Elige a un niño y anota lo que viste</h3><p className="text-sm text-[#526b87]">Toca su nombre cuando ocurra algo que quieras recordar. {coverage?.students_with_records ?? 0} de {data.students.length} con algún registro.</p>{spontaneousRecords && <p className="mt-1 text-sm text-[#176442]">Primero aparecen quienes aún no tienen registros de las competencias de esta experiencia.</p>}</div><Button variant="outline" className="min-h-12" onClick={() => goToStep(3)}>Revisar matriz y continuar <ArrowRight /></Button></div>
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

    {!matrixOpen && experience && student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" disabled={working || audioBusy} onClick={() => { if (allowLeave()) setStudentId(null); }}><ArrowLeft /> Volver a todos los niños</Button>
      <div><p className="text-sm font-semibold text-[#087d96]">{experience.title}</p><h2 className="text-2xl font-extrabold">{displayPersonName(student.name)}</h2><p className="mt-1 text-sm text-[#526b87]">Registra solo lo que observaste. Puedes añadir más de una observación de este niño.</p></div>
      <fieldset className="space-y-2" disabled={working || audioBusy}><legend className="font-bold">¿Qué quieres observar?</legend><p className="text-sm text-[#526b87]">Esto solo te ayuda a enfocar la observación. No estás calificando al niño.</p>{experience.aspects.map((aspect) => <label key={aspect.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${aspectId === aspect.id ? "border-[#087d96] bg-[#e8f7fa]" : "border-[#dce9f2]"}`}><input type="radio" name="diagnostic-aspect" checked={aspectId === aspect.id} onChange={() => setAspectId(aspect.id)} /><span className="font-semibold">{aspect.label}</span></label>)}</fieldset>
      <label className="block text-sm font-semibold">¿Qué hizo o dijo?<span className="mt-1 block font-normal text-[#526b87]">Puedes anotar qué hizo, qué dijo, cómo lo hizo o si necesitó ayuda.</span><Textarea className="mt-2 min-h-24" disabled={working} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Probó saltar los bloques varias veces y cambió la distancia después de no lograrlo." /></label>
      <DictationRecorder key={`${student.id}:${experience.id}`} studentId={student.id} context={`${experience.title}: ${experience.aspects.find((aspect) => aspect.id === aspectId)?.prompt ?? "observación durante el juego"}`} currentText={note} disabled={working} onBusyChange={setAudioBusy} onTranscribed={(text) => setNote(text)} />
      <p className="text-xs text-[#526b87]">Es una nota de observación. Podrás interpretarla más adelante.</p>
      {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
      <AsyncButton className="min-h-12 w-full sm:w-auto" busy={working} busyLabel="Guardando..." disabled={audioBusy || !aspectId || !note.trim()} onClick={() => void save()}><Save /> Guardar observación</AsyncButton>
    </section>}
    {!matrixOpen && !student && <div className="flex flex-wrap gap-3 border-t border-[#d4e1ed] pt-4"><Button variant="outline" onClick={openMatrix}>Ver niños × competencias</Button><Button variant="outline" onClick={() => {if(canLeaveWorkspace())setStep(3);}}>Consultar revisiones anteriores</Button></div>}
    </>}
    {step === 3 && <section className="diagnostic-panel space-y-4 p-5"><h2 className="text-xl font-bold">Ayni organizará lo que ya conoces</h2>
      <p className="text-sm text-[#526b87]">En «Así entendí tu aula» verás una propuesta basada en entrevistas y observaciones. Puedes corregirla antes de crear Mi año. Seguirás observando durante el año.</p>
      {onPlan && <Button className="min-h-12" onClick={onPlan}>Revisar matriz y continuar <ArrowRight /></Button>}
      <details open={legacyReviewOpen} onToggle={(event) => setLegacyReviewOpen(event.currentTarget.open)} className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-semibold">Ver revisiones diagnósticas anteriores y registros individuales</summary>
        {legacyReviewOpen && <DiagnosticReview onObserve={() => { setStep(2); setStudentId(null); }} onPlan={onPlan} onObservationSaved={() => void refreshObservationProgress()} onGroupConfirmed={() => setData((current) => current ? { ...current, step_progress: { ...current.step_progress, group_review_confirmed: true } } : current)} />}
      </details></section>}
  </div>;
}
