"use client";
import { AttendanceSummary } from "./attendance-summary";
import { newAyniFeatureEnabled } from "@/src/lib/new-ayni-feature-flag.mjs";

import { StudentPhoto, StudentPhotoEditor, EnrollmentPhoto, uploadStudentPhoto } from "./student-photo";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ListPlus, Plus, Search, Users, NotebookPen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { importPilotStudents, loadStudentPedagogicalProfile, loadLocalDashboard, type LocalDashboard, type LocalStudent, type PrivateMediaUpload, type StudentPedagogicalProfile } from "@/src/lib/local-database";
import { recommendedStudentGuidance, studentCompetencyGuidance } from "@/src/lib/student-guidance.mjs";
import { AsyncButton, EmptyState, NextStepCard, PageIntro, ScreenSkeleton, WorkflowFeedback, WorkflowTabs, WorkflowTabPanel } from "./workflow-ui";
import { FamilyInformationPanel, FamilyInterviewStatusBadge, useFamilyInterviewStatusMap } from "./family-interview-v4";
import { EvidenceStudentCorrection } from "./evidence-student-correction";
import { StudentEnrollment } from "./student-enrollment";
import { StudentTrajectory } from "./student-trajectory";
import { parseStudentCsv, validateStudentsForImport } from "@/src/lib/student-import.mjs";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";

import styles from "./classroom-surfaces.module.css";

const f8TrajectoryEnabled = newAyniFeatureEnabled(process.env.NEXT_PUBLIC_AYNI_F8_TRAJECTORY);

const statusLabels = {
  demonstrated: "Lo demostró",
  with_support: "Con apoyo",
  not_yet_demonstrated: "Aún no",
  insufficient_information: "No pude determinarlo",
  observed_without_judgment: "Descripción docente",
} as const;

export function StudentsScreen({ students, onImported, onEvaluate, onPlan, onDiagnostic, initialEnrollment = students.length === 0, classroomLabel, onRegistrationComplete }: { students: LocalStudent[]; onImported: (dashboard: LocalDashboard) => void; onEvaluate?: (studentId: string, competencyId: string) => void; onPlan?: () => void; onDiagnostic?: () => void; initialEnrollment?: boolean; classroomLabel?: string; onRegistrationComplete?: () => Promise<void> }) {
  const [completionBusy, setCompletionBusy] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const completionLock = useRef(false);
  async function finishRegistration() {
    if (completionLock.current || !allowLeave()) return;
    completionLock.current = true; setCompletionBusy(true); setCompletionError("");
    try { if (onRegistrationComplete) await onRegistrationComplete(); else onDiagnostic?.(); }
    catch (error) { setCompletionError(error instanceof Error ? error.message : "No pudimos confirmar la matrícula. Tus niños siguen guardados; vuelve a intentarlo."); }
    finally { completionLock.current = false; setCompletionBusy(false); }
  }
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentPedagogicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const importIntent = useRef<{payload:string;id:string}|null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photo,setPhoto]=useState<PrivateMediaUpload|null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoRetry,setPhotoRetry]=useState<{id:string;media:PrivateMediaUpload}|null>(null);
  const [photoRevisions,setPhotoRevisions]=useState<Record<string,number>>({});
  const [csv, setCsv] = useState("");
  const [csvReview, setCsvReview] = useState<{firstName:string;lastName:string;preferredName:string|null;birthDate:string|null}[] | null>(null);
  const [namesReviewed, setNamesReviewed] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importAction, setImportAction] = useState<"single" | "csv" | "photo">("single");
  const [importMessage, setImportMessage] = useState("");
  const [importTone, setImportTone] = useState<"success" | "error">("success");
  const [addOpen, setAddOpen] = useState(students.length === 0);
  const [importOpen, setImportOpen] = useState(false);
  const csvFileInput = useRef<HTMLInputElement>(null);
  const singleDirty = Boolean(firstName.trim() || lastName.trim() || preferredName.trim() || birthDate || photo);
  const dirty = singleDirty || Boolean(csv.trim());
  const allowLeave = useUnsavedWork(dirty || Boolean(photoRetry), importBusy || photoBusy || completionBusy);
  const [filter, setFilter] = useState<"all" | "unobserved" | "evidence">("all");
  const { statuses: interviewStatuses } = useFamilyInterviewStatusMap(`${selectedId ?? "list"}:${students.map((item) => item.id).join(",")}`, students.length > 0 && !initialEnrollment);
  const visibleStudents = useMemo(() => students.filter((student) =>
    (student.full_name ?? student.name).toLocaleLowerCase("es-PE").includes(query.toLocaleLowerCase("es-PE")) &&
    (filter === "all" || (filter === "unobserved" ? !student.evidence_count : Boolean(student.evidence_count))),
  ), [students, query, filter]);
  const observedCount = students.filter((student) => Boolean(student.evidence_count)).length;
  const sameName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
  const duplicateNames = (csvReview ?? []).map(row => sameName(`${row.firstName} ${row.lastName}`)).filter((name,index,all) =>
    all.indexOf(name) !== index || students.some(student => sameName(student.full_name ?? student.name) === name));
  function reviewCsv() {
    try { setCsvReview(validateStudentsForImport(parseStudentCsv(csv))); setNamesReviewed(false); setImportMessage(""); }
    catch (cause) { setImportTone("error"); setImportMessage(cause instanceof Error ? cause.message : "Revisa las columnas de la lista."); }
  }
  const recordSummary = (student: LocalStudent) => {
    const records = student.evidence_count ?? 0;
    const competencies = student.competency_count ?? 0;
    if (!records) return "";
    return `${records} ${records === 1 ? "evidencia" : "evidencias"} · ${competencies ? `${competencies} ${competencies === 1 ? "competencia" : "competencias"}` : "sin competencia vinculada"}`;
  };

  const { confirmation, confirm } = useSaveConfirmation();
  const [lastSaveMs, setLastSaveMs] = useState<number | null>(null);
  const firstNameInput = useRef<HTMLInputElement>(null);
  const savingStudent = useRef(false);
  async function addStudents(useCsv: boolean) {
    if (savingStudent.current || importBusy || photoBusy || photoRetry) return;
    if (useCsv && (!csvReview?.length || duplicateNames.length > 0 && !namesReviewed || initialEnrollment && singleDirty)) return;
    savingStudent.current = true;
    setImportAction(useCsv ? "csv" : "single"); setImportBusy(true); setImportMessage("");
    const started = performance.now();
    const savedName = firstName.trim();
    try {
      const input = useCsv ? { students: csvReview!.map(row=>({...row,preferredName:row.preferredName??undefined,birthDate:row.birthDate??undefined})) } : { students: [{ firstName, lastName, preferredName, birthDate }] };
      const payload = JSON.stringify(input);
      if(importIntent.current?.payload!==payload)importIntent.current={payload,id:crypto.randomUUID()};
      const dashboard = await importPilotStudents(input, importIntent.current.id);
      importIntent.current=null;
      setLastSaveMs(Math.round(performance.now() - started));
      onImported(dashboard);
      let photoSaved=true;
      if (useCsv) { setCsv(""); setCsvReview(null); }
      else { setFirstName(""); setLastName(""); setPreferredName(""); setBirthDate(""); }
      setImportMessage(useCsv ? "Lista de niños importada al aula." : "Niño añadido al aula."); setImportTone("success");
      if(!useCsv && photo){const added=dashboard.students.find(s=>!students.some(old=>old.id===s.id));if(added){setPhoto(null);setImportAction("photo");try{await uploadStudentPhoto(added.id,photo);setPhotoRevisions(current => ({...current, [added.id]: (current[added.id] ?? 0) + 1}));setPhotoRetry(null);}catch{photoSaved=false;setPhotoRetry({id:added.id,media:photo});setImportMessage("Niño añadido. La foto aún no se guardó; puedes reintentar sin inscribirlo de nuevo.");setImportTone("error");}}}
      if(photoSaved)confirm(useCsv ? "¡Lista registrada!" : `¡${savedName} ya está en tu aula!`, "Registro guardado.");
      setNamesReviewed(false);
    } catch (error) { setImportMessage(error instanceof Error ? error.message : "No se pudieron añadir los niños."); setImportTone("error"); }
    finally { savingStudent.current = false; setImportBusy(false); window.setTimeout(() => firstNameInput.current?.focus(), 0); }
  }

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    loadStudentPedagogicalProfile(selectedId).then((nextProfile) => {
      if (active) setProfile(nextProfile);
    }).catch(() => {
      if (active) setProfileError("No se pudo cargar el perfil. Vuelve a intentarlo.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [selectedId]);

  if (selectedId) return <><StudentEnrollment studentId={selectedId} onSaved={async()=>{onImported(await loadLocalDashboard());setSelectedId(null);setProfile(null);}}/><EvidenceStudentCorrection profile={profile} students={students} onCorrected={async () => { setProfile(await loadStudentPedagogicalProfile(selectedId)); }} /><StudentProfile profile={profile} loading={loading} error={profileError} onBack={() => { setSelectedId(null); setProfile(null); setProfileError(""); }} onEvaluate={onEvaluate} onPlan={onPlan} /></>;
  const optionalFields = <div className="grid gap-4 sm:grid-cols-2">
      <label htmlFor="student-preferred-name" className="block text-sm font-semibold text-[#244260]">Nombre preferido <span className="font-normal text-[#526b87]">(opcional)</span><Input id="student-preferred-name" className="mt-2" disabled={completionBusy || importBusy || photoBusy} value={preferredName} onChange={(event) => setPreferredName(event.target.value)} autoComplete="off" /></label>
      <label htmlFor="student-birth-date" className="block text-sm font-semibold text-[#244260]">Fecha de nacimiento <span className="font-normal text-[#526b87]">(opcional)</span><Input id="student-birth-date" type="date" className="mt-2" disabled={completionBusy || importBusy || photoBusy} max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
    </div>;
  const importPanel = <div className="mt-3 rounded-xl border border-[#a9bdce] bg-[#f7faff] p-4">
          <label htmlFor="students-csv" className="block text-sm font-semibold text-[#244260]">Lista de niños en CSV</label>
          <p id="students-csv-help" className="mt-1 text-sm text-[#526b87]">Encabezado: first_name,last_name,preferred_name. Puedes añadir birth_date como cuarta columna (AAAA-MM-DD). Máximo 40 niños.</p>
          <Textarea disabled={completionBusy || importBusy || photoBusy} id="students-csv" className="mt-2 min-h-32" aria-describedby="students-csv-help" value={csv} onChange={(event) => { setCsv(event.target.value); setCsvReview(null); setNamesReviewed(false); }} placeholder={'first_name,last_name,preferred_name\nMaría,López,María'} />
          <div className="mt-3 text-sm"><p>O abre un archivo CSV</p>{initialEnrollment && <Button type="button" variant="outline" className="mt-2" disabled={completionBusy || importBusy || photoBusy} onClick={() => csvFileInput.current?.click()}>Seleccionar archivo CSV</Button>}<input ref={csvFileInput} hidden={initialEnrollment} aria-label="Archivo CSV de niños" type="file" accept=".csv,text/csv" disabled={completionBusy || importBusy || photoBusy} className="mt-2 block max-w-full text-sm" onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>20000){setImportTone("error");setImportMessage("El CSV admite hasta 20 KB.");return;}void file.text().then(value=>{setCsv(value);setCsvReview(null);setNamesReviewed(false);}).catch(()=>{setImportTone("error");setImportMessage("No pude leer el archivo. Puedes pegar la lista.");});}}/></div>
          <Button type="button" className="mt-3 min-h-11" variant="outline" disabled={importBusy || !csv.trim()} onClick={reviewCsv}>Revisar lista antes de añadir</Button>
          {csvReview&&<section className="mt-4 space-y-3" aria-label="Revisión de niños por añadir"><h3 className="font-semibold">Revisa {csvReview.length} {csvReview.length === 1 ? "niño" : "niños"} antes de guardar</h3><ul className="divide-y">{csvReview.map((row,index)=><li key={index} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm"><span>{row.firstName} {row.lastName}{row.birthDate&&<small className="block">Nacimiento: {row.birthDate}</small>}</span><Button variant="ghost" disabled={completionBusy || importBusy || photoBusy} aria-label={"Quitar de la lista a "+row.firstName+" "+row.lastName} onClick={()=>{setCsvReview(csvReview.filter((_,i)=>i!==index));setNamesReviewed(false);}}>Quitar</Button></li>)}</ul>{duplicateNames.length>0&&<label className="flex items-start gap-3 rounded-lg bg-[#fff4df] p-3 text-sm"><input type="checkbox" disabled={completionBusy || importBusy || photoBusy} checked={namesReviewed} onChange={event=>setNamesReviewed(event.target.checked)}/><span>Hay nombres repetidos en la lista o que ya aparecen en el aula. Revisé que se trata de niños distintos y quiero añadirlos. Ayni no combinará sus registros.</span></label>}<AsyncButton variant={initialEnrollment ? "outline" : "default"} busy={importBusy&&importAction==="csv"} busyLabel="Añadiendo lista…" disabled={importBusy||photoBusy||Boolean(photoRetry)||initialEnrollment&&singleDirty||!csvReview.length||duplicateNames.length>0&&!namesReviewed} onClick={()=>void addStudents(true)}>Añadir {csvReview.length} {csvReview.length === 1 ? "niño" : "niños"} al aula</AsyncButton></section>}
        </div>;
  return <section data-ayni-screen={initialEnrollment ? "initial-enrollment" : undefined} className={`mx-auto max-w-5xl space-y-5 ${styles.surface}`}>
    {initialEnrollment ? <header>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Añade a tus niños</h1>{classroomLabel && <p className="text-sm text-[#526b87]">{classroomLabel}</p>}</div>
      <p className="mt-2 text-[#566883]">Estás preparando tu aula. Registra a tus niños uno por uno o importa una lista.</p>
    </header> : <div className={styles.intro}><PageIntro title="Mi aula" description="Tus niños y sus registros" icon={Users} illustration="/ayni-classroom-welcome.png" /><button type="button" onClick={() => setAddOpen((open) => !open)} aria-expanded={addOpen} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#0b7891] bg-white px-4 font-bold text-[#07576c]"><Plus className="size-4" /> Añadir niño</button></div>}
    {!initialEnrollment && <AttendanceSummary/>}
    {!initialEnrollment && <>
      <div className={styles.summary} aria-label="Resumen del aula"><span><Users aria-hidden="true"/><strong>{students.length}</strong> niños</span><span><NotebookPen aria-hidden="true"/><strong>{observedCount}</strong> con evidencias de actividad</span><span><Eye aria-hidden="true"/><strong>{students.length-observedCount}</strong> por observar</span></div>
      <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-input bg-white px-4 text-[#60718a] focus-within:ring-[3px] focus-within:ring-ring/50"><Search className="size-5" aria-hidden="true" /><span className="sr-only">Buscar niño</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar niño" className="min-w-0 flex-1 border-0 bg-transparent text-[#1c2e50] outline-none" /></label>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar niños">{([["all", "Todos"], ["unobserved", "Por observar"], ["evidence", "Con evidencias"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)} className={"min-h-11 rounded-full px-4 text-sm font-semibold " + (filter === id ? "bg-[#0b7891] text-white" : "border border-input bg-white text-[#315575]")}>{label}</button>)}</div>
    </>}
    {(initialEnrollment || addOpen) && <section className="rounded-[1.3rem] border border-[var(--ayni-panel-border)] bg-white p-5 sm:p-6" aria-labelledby="add-students-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="add-students-title" className="text-lg font-extrabold text-[#1c2e50]">{initialEnrollment ? "Datos del niño" : "Añadir niños al aula"}</h2>{initialEnrollment && <Button type="button" variant="outline" className="min-h-11" disabled={completionBusy || importBusy || photoBusy} aria-expanded={importOpen} aria-controls="initial-students-import" onClick={() => setImportOpen(open => !open)}><ListPlus className="size-4" aria-hidden="true" />Importar lista</Button>}</div>
      {!initialEnrollment && <p className="mt-1 text-sm text-[#526b87]">Escribe el nombre y apellido. El nombre preferido y la fecha de nacimiento son opcionales.</p>}
      <form className="mt-5" data-last-save-ms={lastSaveMs ?? undefined} aria-busy={importBusy && importAction === "single"} onSubmit={(event) => { event.preventDefault(); void addStudents(false); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="student-first-name" className="block text-sm font-semibold text-[#244260]">Nombre <span className="text-[#9a4050]" aria-hidden="true">*</span><Input ref={firstNameInput} id="student-first-name" className="mt-2" disabled={completionBusy || importBusy || photoBusy} value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="off" required /></label>
          <label htmlFor="student-last-name" className="block text-sm font-semibold text-[#244260]">Apellido <span className="text-[#9a4050]" aria-hidden="true">*</span><Input id="student-last-name" className="mt-2" disabled={completionBusy || importBusy || photoBusy} value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="off" required /></label>
        </div>
        {initialEnrollment ? <div className="mt-4">{optionalFields}</div> : <details className="mt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[#244260]">Nombre preferido, nacimiento y foto (opcionales)</summary><div className="mt-3">{optionalFields}<EnrollmentPhoto media={photo} onChange={setPhoto} onBusy={setPhotoBusy} disabled={completionBusy||importBusy||photoBusy}/></div></details>}
        {initialEnrollment && <EnrollmentPhoto media={photo} onChange={setPhoto} onBusy={setPhotoBusy} disabled={completionBusy||importBusy||photoBusy} initialEnrollment/>}
        <AsyncButton type="submit" className={"mt-4 min-h-11 " + (initialEnrollment ? "w-full" : "")} aria-live="polite" busy={importBusy && (importAction === "single" || importAction === "photo" && !photoRetry)} busyLabel={importAction === "photo" ? "Guardando foto…" : "Guardando…"} disabled={completionBusy || importBusy || photoBusy || Boolean(photoRetry) || !firstName.trim() || !lastName.trim()}>{importTone === "error" && !photoRetry ? "Reintentar guardado" : initialEnrollment ? "Guardar niño" : importMessage && importTone === "success" ? "Añadir otro niño" : "Guardar niño"}</AsyncButton>
      </form>
      {initialEnrollment ? <div id="initial-students-import" hidden={!importOpen}>{importPanel}{singleDirty && <p className="mt-2 text-sm text-[#526b87]">Guarda el niño que estás preparando antes de importar la lista.</p>}</div> : <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#244260]">Añadir varios niños desde una lista</summary>{importPanel}</details>}
      <SaveConfirmation confirmation={confirmation}/>{importMessage && importTone === "error" && <div className="mt-4"><WorkflowFeedback tone={importTone}>{importMessage}</WorkflowFeedback></div>}
      {photoRetry && <AsyncButton type="button" disabled={completionBusy || importBusy || photoBusy} busy={importBusy && importAction === "photo"} busyLabel="Guardando foto…" className="mt-3" variant="outline" onClick={() => { setImportAction("photo"); setImportBusy(true); void uploadStudentPhoto(photoRetry.id, photoRetry.media).then(() => { setPhotoRevisions(current => ({...current, [photoRetry.id]: (current[photoRetry.id] ?? 0) + 1})); setPhotoRetry(null); setImportTone("success"); setImportMessage("Foto privada guardada."); confirm("¡Foto guardada!", "El registro del niño se conserva."); }).catch(() => setImportMessage("La foto sigue pendiente. El alumno ya está inscrito.")).finally(() => setImportBusy(false)); }}>Reintentar guardar foto</AsyncButton>}
    </section>}
    {initialEnrollment && <section aria-labelledby="registered-children-title" className="space-y-4">
      <h2 id="registered-children-title" className="flex items-center gap-2 text-lg font-extrabold text-[#1c2e50]"><Users className="size-5" aria-hidden="true" />Niños registrados: {students.length}</h2>
      {students.length ? <ul className="divide-y divide-[#d4e1ed] rounded-xl border border-[var(--ayni-panel-border)] bg-white px-4">{students.map(student => <li key={student.id} className="flex items-center gap-3 py-3"><StudentPhoto id={student.id} name={student.full_name ?? student.name} revision={photoRevisions[student.id] ?? 0}/><p className="min-w-0 break-words font-semibold text-[#244260]">{student.full_name ?? student.name}</p></li>)}</ul> : <p className="text-sm text-[#526b87]">Aquí aparecerán los niños que vayas agregando.</p>}
      <AsyncButton type="button" variant="outline" className="min-h-12 w-full whitespace-normal" busy={completionBusy} busyLabel="Confirmando matrícula…" disabled={!students.length || importBusy || photoBusy || dirty || Boolean(photoRetry) || !(onRegistrationComplete || onDiagnostic)} aria-describedby="registration-finish-help" onClick={() => void finishRegistration()}>Terminé de registrar a mis niños<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></AsyncButton>
      {completionError && <WorkflowFeedback tone="error">{completionError}</WorkflowFeedback>}
      <p id="registration-finish-help" className="text-sm text-[#526b87]">{!students.length ? "Se habilitará cuando registres al menos un niño." : dirty || photoRetry ? "Guarda los datos o la foto pendiente antes de continuar." : "Continuarás al diagnóstico para conocer a tu grupo."}</p>
    </section>}
    {!initialEnrollment && students.length > 0 && (onDiagnostic||onPlan) && <details className="rounded-xl bg-[#eaf8f2] p-4"><summary className="min-h-11 cursor-pointer font-semibold text-[#246554]">Ya registré a mis niños · ¿Cómo sigo?</summary><p className="mt-2 text-sm text-[#246554]">Puedes conocer a tu grupo con entrevistas y observaciones, o crear Mi año y seguir observando después.</p><div className="mt-3 flex flex-wrap gap-3">{onDiagnostic&&<Button onClick={()=>{if(allowLeave())onDiagnostic();}}>Comenzar diagnóstico</Button>}{onPlan&&<Button variant="outline" onClick={()=>{if(allowLeave())onPlan();}}>Crear Mi año</Button>}</div></details>}
    <StudentEnrollment onSaved={async()=>onImported(await loadLocalDashboard())}/>
    {!initialEnrollment && <div className="grid gap-3 lg:grid-cols-2">{visibleStudents.length ? visibleStudents.map((student) => <button key={student.id} type="button" onClick={() => { if(!allowLeave())return; setProfile(null); setLoading(true); setSelectedId(student.id); }} className={`${styles.studentCard} flex min-h-24 w-full items-center gap-3 rounded-[1.3rem] border border-[var(--ayni-panel-border)] bg-white p-4 text-left hover:border-[#8acbd8]`}><StudentPhoto id={student.id} name={student.full_name ?? student.name}/><span className="min-w-0 flex-1"><strong className="block break-words text-[#1c2e50]">{student.full_name ?? student.name}</strong>{student.age_years != null && <small className="mt-1 block text-[#566883]">{student.age_years} años</small>}{Boolean(student.evidence_count) && <small className="mt-1 block text-[#566883]">{recordSummary(student)}</small>}<FamilyInterviewStatusBadge status={interviewStatuses[student.id]} /></span><span className={`${styles.studentStatus} shrink-0 text-center`}><span className={`block rounded-full px-2 py-1 text-xs font-bold ${student.evidence_count ? "bg-[#eaf8f2] text-[#287561]" : "bg-[#fff4df] text-[#9a641a]"}`}>{student.evidence_count ? "Con evidencias" : "Sin evidencias de actividad"}</span><span className="mt-2 block text-xs font-bold text-[#07576c]">Ver perfil →</span></span></button>) : <EmptyState title={students.length ? "No encontramos niños" : "Aún no hay niños en el aula"} description={students.length ? "Prueba con otro nombre o filtro." : "Añade un niño para empezar a acompañar su progreso."} />}</div>}
  </section>;
}

function StudentProfile({ profile, loading, error, onBack, onEvaluate, onPlan }: { profile: StudentPedagogicalProfile | null; loading: boolean; error: string; onBack: () => void; onEvaluate?: (studentId: string, competencyId: string) => void; onPlan?: () => void }) {
  const [tab, setTab] = useState<"Trayectoria" | "Resumen" | "Familia" | "Competencias" | "Evidencias" | "Diagnóstico">(f8TrajectoryEnabled ? "Trayectoria" : "Resumen");
  if (loading || !profile) return <section className="mx-auto max-w-4xl space-y-3"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Volver a Niños</Button>{error ? <WorkflowFeedback tone="error">{error}</WorkflowFeedback> : <ScreenSkeleton />}</section>;
  const { student, competencies, recent_relevant_observations: evidence, diagnosis, diagnostic_observations: diagnosticObservations } = profile;
  const recommendation = recommendedStudentGuidance(competencies);
  function continueFrom(competency: StudentPedagogicalProfile["competencies"][number]) {
    const guidance = studentCompetencyGuidance(competency);
    if (guidance.action === "evidence") { setTab("Evidencias"); return; }
    if (guidance.action && competency.competency_v4_id) onEvaluate?.(student.id, competency.competency_v4_id);
  }
  return <section className={`${styles.surface} mx-auto max-w-4xl space-y-5`}><Button variant="ghost" className="-ml-3" onClick={onBack}><ArrowLeft /> Volver a Niños</Button><header className={styles.profileHeader}><div><h1 className="text-3xl font-extrabold">{student.name}</h1><p className={styles.profileMeta}><span>{student.section}</span><span>{student.age_years} años</span><span>{student.school_year}</span></p></div><StudentPhotoEditor id={student.id} name={student.name}/>{student.birth_date && <p className="mt-1 text-sm text-[#526b87]">Fecha de nacimiento: {student.birth_date.split("-").reverse().join("/")}</p>}</header>{recommendation ? <NextStepCard title={recommendation.action === "evidence" ? "Sigue observando" : "Revisar evaluación del período"} description={recommendation.competency.competency_text} action={recommendation.action === "evidence" ? "Ver observaciones" : "Abrir evaluación"} onAction={() => continueFrom(recommendation.competency)} /> : onPlan && <EmptyState title="Prepara nuevas observaciones" description="Puedes revisar el diagnóstico o preparar una actividad para seguir observando y reunir evidencias de actividad." action={<Button onClick={onPlan}>Ir a Planificar</Button>} />}<WorkflowTabs id="student-profile" label="Secciones del perfil" value={tab} onChange={setTab} tabs={[...(f8TrajectoryEnabled ? [{ id: "Trayectoria" as const, label: "Trayectoria" }] : []), { id: "Resumen", label: "Resumen" }, { id: "Familia", label: "Familia" }, { id: "Competencias", label: f8TrajectoryEnabled ? "Vista avanzada" : "Competencias" }, { id: "Evidencias", label: "Evidencias" }, { id: "Diagnóstico", label: "Diagnóstico" }]} /><WorkflowTabPanel id="student-profile" value={tab}>{tab === "Trayectoria" && <StudentTrajectory studentId={student.id} diagnosticCount={diagnosticObservations.length} />}{tab === "Resumen" && <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Evidencias de actividad de {student.name}</h2><p className="mt-2 text-sm text-[#526b87]">{evidence.length ? `${evidence.length} ${evidence.length === 1 ? "evidencia de actividad disponible" : "evidencias de actividad disponibles"}. Puedes revisarlas antes de continuar.` : "Aún no hay evidencias de actividad registradas."}</p>{profile.family_interview_context && <p className="mt-2 text-sm">Entrevista familiar confirmada · versión {profile.family_interview_context.version}</p>}{diagnosticObservations.length > 0 && <p className="mt-2 text-sm">{diagnosticObservations.length} observaciones diagnósticas disponibles.</p>}{profile.confirmed_student_diagnostic_review && <p className="mt-2 text-sm font-semibold text-[#17653d]">{profile.confirmed_student_diagnostic_review.is_current ? "✓ Comentario diagnóstico confirmado por la docente" : "Comentario diagnóstico anterior · hay información nueva por revisar"}</p>}{evidence.length > 0 && <Button variant="outline" className="mt-4" onClick={() => setTab("Evidencias")}>Ver observaciones</Button>}</article>}{tab === "Familia" && <div className="space-y-3"><FamilyInformationPanel studentId={student.id} studentName={student.name} context={profile.family_interview_context} /></div>}{tab === "Competencias" && <div className="space-y-3">{competencies.length ? competencies.map((competency) => <article key={competency.competency_key} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{competency.competency_text}</h2><p className="mt-2 text-sm text-[#526b87]">{competency.evidence_count} {competency.evidence_count === 1 ? "evidencia" : "evidencias"} · Última observación: {competency.last_observed_at ? new Date(competency.last_observed_at).toLocaleDateString("es-PE") : "—"}</p><p className="mt-2 text-sm font-semibold text-[#287163]">{studentCompetencyGuidance(competency).label}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.values(competency.observations).some((count) => count > 0) && Object.entries(competency.observations).map(([status, count]) => <p key={status}><span className="font-semibold">{statusLabels[status as keyof typeof statusLabels]}</span> {count}</p>)}</div>{studentCompetencyGuidance(competency).action && <Button variant="outline" className="mt-4" onClick={() => continueFrom(competency)}>{studentCompetencyGuidance(competency).action === "evidence" ? "Ver observaciones" : "Abrir evaluación"}</Button>}</article>) : <Empty message="Aún no hay evidencias de actividad registradas." />}</div>}{tab === "Evidencias" && <div className="space-y-2">{evidence.length ? evidence.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{item.activity_title}</p><p className="mt-1 text-sm text-[#526b87]">{item.criterion_text} · {item.observation_status ? statusLabels[item.observation_status] : "Observación registrada"}</p>{item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.observed_at).toLocaleDateString("es-PE")}{item.media_available ? " · recurso adjunto disponible" : ""}</p></article>) : <Empty message="Aún no hay evidencias de actividad registradas." />}</div>}{tab === "Diagnóstico" && <DiagnosticHistory observations={diagnosticObservations} diagnosis={diagnosis} confirmed={profile.confirmed_diagnostic_reviews} studentReview={profile.confirmed_student_diagnostic_review} />}</WorkflowTabPanel></section>;
}

function Empty({ message }: { message: string }) { return <EmptyState title="Sin información registrada" description={message} />; }

function DiagnosticHistory({ observations, diagnosis, confirmed, studentReview }: {
  observations: StudentPedagogicalProfile["diagnostic_observations"];
  diagnosis: StudentPedagogicalProfile["diagnosis"];
  confirmed: StudentPedagogicalProfile["confirmed_diagnostic_reviews"];
  studentReview: StudentPedagogicalProfile["confirmed_student_diagnostic_review"];
}) {
  if (!observations.length && !diagnosis.length && !confirmed.length && !studentReview) return <Empty message="No hay registros de diagnóstico para este niño." />;
  return <div className="space-y-2">
    {studentReview && <article className="rounded-2xl border border-[#b5dfc8] bg-[#f0faf4] p-4">
      <p className="font-bold">Comentario diagnóstico de la docente · versión {studentReview.version}{studentReview.is_current ? "" : " · requiere actualización"}</p>
      <p className="mt-1 text-xs text-[#526b87]">{studentReview.information_status === "insufficient_information" ? "Necesita más observación" : "Primera idea disponible"} · Confirmado el {new Date(studentReview.teacher_confirmed_at).toLocaleDateString("es-PE")}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{studentReview.comment_text}</p>
    </article>}
    {confirmed.length > 0 && <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Revisiones anteriores por competencia</summary><div className="mt-3 space-y-2">{confirmed.map((item) => <article key={item.id} className="rounded-2xl border border-[#b5dfc8] bg-[#f0faf4] p-4">
      <p className="font-semibold">{item.competency_name} · Diagnóstico revisado</p>
      <p className="mt-1 text-xs text-[#526b87]">{item.information_status === "insufficient_information" ? "Información insuficiente" : "Información inicial disponible"} · Confirmado por la docente el {new Date(item.teacher_confirmed_at).toLocaleDateString("es-PE")}</p>
      <p className="mt-2 text-sm">{item.summary_text}</p>
      {item.next_observation && <p className="mt-2 text-sm text-[#526b87]">Para seguir observando: {item.next_observation}</p>}
    </article>)}</div></details>}
    {observations.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4">
      <p className="font-semibold">{item.competency_name ?? "Competencia por revisar"}</p>
      <p className="mt-1 text-sm text-[#526b87]">{statusLabels[item.observation_status]} · {new Date(item.observed_at).toLocaleDateString("es-PE")}</p>
      {item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}
    </article>)}
    {diagnosis.map((item) => <article key={`${item.competency_id}-${item.updated_at}`} className="rounded-2xl border bg-white p-4">
      <p className="font-semibold">{item.teacher_confirmed ? "Confirmado por la docente" : "Borrador de diagnóstico anterior"}</p>
      {item.teacher_interpretation && <p className="mt-2 text-sm text-[#526b87]">{item.teacher_interpretation}</p>}
    </article>)}
  </div>;
}
