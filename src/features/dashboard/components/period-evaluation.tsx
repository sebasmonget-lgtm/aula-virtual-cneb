"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, FileDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { FamilyReportGenerator } from "./family-report-generator";
import { PedagogicalCoverage } from "./pedagogical-coverage";

type Year = { id: string; year: number };
type Classroom = { id: string; school_year_id: string; section: string; age: number };
type Period = { id: string; school_year_id: string; kind: "bimester" | "trimester"; ordinal: number; label: string; starts_on: string; ends_on: string };
type Student = { id: string; first_name: string; last_name: string; preferred_name: string | null };
type Row = { student_id: string; competency_id: string; competency_name: string; evidence_count: number; level: string | null; conclusion: string | null; state: string };
type Overview = { students: Student[]; scope: { id: string; name: string }[]; available_competencies: { id: string; name: string }[]; rows: Row[]; progress: { students_complete: number; students_total: number; competencies_complete: number; competencies_total: number }; closure: { closed: boolean; current: boolean } };
type TimelineItem = { id: string; observed_on: string; registered_at: string; activity_id: string; activity_title: string; criterion_id: string; criterion_text: string; performance_id: string | null; observation_text: string | null; media_available: boolean };
type Detail = { classroom_id: string; period_id: string; student_id: string; competency_id: string; state: string; evidence_count: number; evidence_fingerprint: string; timeline: TimelineItem[]; reference: { kind: "official"; items: { id: string; official_text: string; source_ref: string }[] } | { kind: "orientative"; text: string }; assessment: { achievement_level: string | null; suggested_level: string | null; suggestion_reason: string | null; teacher_justification: string | null; details: { evidence_overview?: string } } | null; draft: { id:string; current:boolean; teacher_analysis:string; conclusion_text:string; provisional_level:string|null; teacher_justification:string; suggested_level:string|null; suggestion_reason:string|null; details:{ information_status:"sufficient"|"insufficient"; evidence_overview:string; insufficiency_reason:string|null } } | null; insufficiency_reason: string | null; conclusion: string | null };
type Workspace = { years: Year[]; classrooms: Classroom[]; periods: Period[] };
type Suggestion = { generation_id: string; evidence_fingerprint: string; analysis: { information_status: "sufficient" | "insufficient"; evidence_overview: string; insufficiency_reason: string | null; suggested_level?: string | null; suggestion_reason?: string | null }; conclusion: { conclusion_text: string } | null };
type Consolidated = { rows: { student_id: string; student_name: string; competency_id: string; competency_name: string; achievement_level: string | null; conclusion: string; state: string }[] };

const stateText: Record<string, string> = { confirmed: "✓ Confirmada", needs_review: "Requiere revisión", level_pending: "Falta nivel", conclusion_pending: "Falta conclusión", no_evidence: "Sin observaciones", insufficient_information: "Información insuficiente", draft:"Borrador guardado", pending: "Por evaluar" };
const formSnapshot=(analysis:string,level:string,conclusion:string,justification:string)=>JSON.stringify({analysis:analysis.trim(),level,conclusion:conclusion.trim(),justification:justification.trim()});
const studentName = (student: Student) => [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" ");
const formatDate = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE");

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${localDatabaseApiUrl}${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo completar la acción.");
  return payload;
}

export function PeriodEvaluation({ initialStudentId = "", initialCompetencyId = "", onPlan, onPrepareActivity }: { initialStudentId?: string; initialCompetencyId?: string; onPlan?:()=>void; onPrepareActivity?:()=>void }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [yearId, setYearId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [studentId, setStudentId] = useState(initialStudentId);
  const [competencyId, setCompetencyId] = useState(initialCompetencyId);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [view, setView] = useState<"student" | "classroom" | "report" | "family" | "coverage">("student");
  const [showSustento, setShowSustento] = useState(false);
  const [teacherAnalysis, setTeacherAnalysis] = useState("");
  const [achievementLevel, setAchievementLevel] = useState("");
  const [conclusionText, setConclusionText] = useState("");
  const [teacherJustification, setTeacherJustification] = useState("");
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [addingCompetencyId, setAddingCompetencyId] = useState("");
  const [excludingId, setExcludingId] = useState("");
  const [exclusionReason, setExclusionReason] = useState("");
  const [consolidated, setConsolidated] = useState<Consolidated | null>(null);
  const [report, setReport] = useState<Consolidated | null>(null);
  const [classroomStudentFilter, setClassroomStudentFilter] = useState("");
  const [classroomCompetencyFilter, setClassroomCompetencyFilter] = useState("");
  const [classroomStatusFilter, setClassroomStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void api<Workspace>("/api/period-evaluations/workspace").then((result) => {
    setWorkspace(result);
    const year = result.years[0], classroom = result.classrooms.find((item) => item.school_year_id === year?.id);
    const periods = result.periods.filter((item) => item.school_year_id === year?.id);
    const today = new Date().toISOString().slice(0, 10);
    setYearId(year?.id ?? ""); setClassroomId(classroom?.id ?? ""); setPeriodId(periods.find((item) => item.starts_on <= today && item.ends_on >= today)?.id ?? periods[0]?.id ?? "");
  }).catch((error) => setMessage(error.message)); }, []);

  const applyOverview = useCallback((result: Overview) => {
    setOverview(result);
    setConsolidated(null); setReport(null);
    setStudentId((current) => result.students.some((student) => student.id === current) ? current : result.students[0]?.id ?? "");
    setCompetencyId((current) => result.scope.some((item) => item.id === current) ? current : result.scope[0]?.id ?? "");
  }, []);
  async function reloadOverview() {
    if (!classroomId || !periodId) return;
    applyOverview(await api<Overview>(`/api/period-evaluations/overview?classroomId=${classroomId}&periodId=${periodId}`));
  }
  useEffect(() => {
    if (!classroomId || !periodId) return;
    let active = true;
    void api<Overview>(`/api/period-evaluations/overview?classroomId=${classroomId}&periodId=${periodId}`).then((result) => { if (active) applyOverview(result); }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [classroomId, periodId, applyOverview]);

  function applyDetail(result: Detail) {
    setDetail(result); setShowSustento(false);
    const draft=result.draft,analysis=draft?.teacher_analysis ?? (result.state === "needs_review" ? "" : result.assessment?.details?.evidence_overview ?? "");
    const level=draft?.provisional_level ?? (result.state === "needs_review" ? "" : result.assessment?.achievement_level ?? "");
    const conclusion=draft?.conclusion_text ?? (result.state === "needs_review" ? "" : result.conclusion ?? "");
    const justification=draft?.teacher_justification ?? "";
    setTeacherAnalysis(analysis); setAchievementLevel(level); setConclusionText(conclusion); setTeacherJustification(justification);
    setSavedDraftSnapshot(draft?.current ? formSnapshot(analysis,level,conclusion,justification) : null);
    setSuggestion(draft?.current && draft.suggested_level ? {generation_id:"",evidence_fingerprint:result.evidence_fingerprint,
      analysis:{...draft.details,suggested_level:draft.suggested_level,suggestion_reason:draft.suggestion_reason},conclusion:null} : null);
  }
  async function reloadDetail() {
    if (!classroomId || !periodId || !studentId || !competencyId) return;
    applyDetail(await api<Detail>(`/api/period-evaluations/detail?classroomId=${classroomId}&periodId=${periodId}&studentId=${studentId}&competencyId=${competencyId}`));
  }
  useEffect(() => {
    if (!classroomId || !periodId || !studentId || !competencyId) return;
    let active = true;
    void api<Detail>(`/api/period-evaluations/detail?classroomId=${classroomId}&periodId=${periodId}&studentId=${studentId}&competencyId=${competencyId}`).then((result) => { if (active) applyDetail(result); }).catch((error) => { if (active) { setDetail(null); setMessage(error.message); } });
    return () => { active = false; };
  }, [classroomId, periodId, studentId, competencyId]);

  async function act(work: () => Promise<void>) { setBusy(true); setMessage(""); try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : "Ocurrió un problema."); } finally { setBusy(false); } }
  const classrooms = workspace?.classrooms.filter((item) => item.school_year_id === yearId) ?? [];
  const periods = workspace?.periods.filter((item) => item.school_year_id === yearId) ?? [];
  const selectedStudent = overview?.students.find((item) => item.id === studentId);
  const selectedCompetency = overview?.scope.find((item) => item.id === competencyId);
  const studentRows = overview?.rows.filter((item) => item.student_id === studentId) ?? [];
  const missing = overview?.available_competencies.filter((item) => !overview.scope.some((scope) => scope.id === item.id)) ?? [];
  const currentPeriod = periods.find((item) => item.id === periodId);
  const closureReady = overview && overview.progress.competencies_total > 0 && overview.progress.competencies_complete === overview.progress.competencies_total;
  const classroomRows = overview?.rows.filter((row) => (!classroomStudentFilter || row.student_id === classroomStudentFilter) && (!classroomCompetencyFilter || row.competency_id === classroomCompetencyFilter) && (!classroomStatusFilter || (classroomStatusFilter === "complete" ? row.state === "confirmed" : row.state !== "confirmed"))) ?? [];
  const filterQuery = `${classroomStudentFilter ? `&studentId=${classroomStudentFilter}` : ""}${classroomCompetencyFilter ? `&competencyId=${classroomCompetencyFilter}` : ""}${classroomStatusFilter ? `&status=${classroomStatusFilter}` : ""}`;
  const hasUnsavedDraft=formSnapshot(teacherAnalysis,achievementLevel,conclusionText,teacherJustification)!==savedDraftSnapshot;

  if (!workspace) return <p className="rounded-2xl border bg-white p-6">{message || "Cargando evaluación del período…"}</p>;
  return <section className="space-y-5">
    <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Evaluación del período</h2><p className="mt-1 text-sm text-[#526b87]">Revisa lo observado y confirma una valoración por niño y competencia.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Año escolar<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={yearId} onChange={(event) => { const id = event.target.value; setOverview(null); setDetail(null); setYearId(id); setClassroomId(workspace.classrooms.find((item) => item.school_year_id === id)?.id ?? ""); setPeriodId(workspace.periods.find((item) => item.school_year_id === id)?.id ?? ""); }}><option value="">Selecciona un año</option>{workspace.years.map((item) => <option key={item.id} value={item.id}>{item.year}</option>)}</select></label>
        <label className="text-sm font-semibold">Aula<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={classroomId} onChange={(event) => { setOverview(null); setDetail(null); setClassroomId(event.target.value); }}><option value="">Selecciona un aula</option>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.section} · {item.age} años</option>)}</select></label>
        <label className="text-sm font-semibold">Período<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={periodId} onChange={(event) => { setOverview(null); setDetail(null); setPeriodId(event.target.value); }}><option value="">Selecciona un período</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.label} · {formatDate(item.starts_on)} a {formatDate(item.ends_on)}</option>)}</select></label>
      </div>
      {periods.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-[#087d96]">Organización de períodos</summary><p className="mt-2 text-[#526b87]">Este año está organizado por {periods[0].kind === "bimester" ? "bimestres" : "trimestres"}. Puedes cambiarlo antes de registrar evaluaciones.</p><Button className="mt-2" size="sm" variant="outline" disabled={busy} onClick={() => void act(async () => { const result = await api<{ periods: Period[] }>("/api/period-evaluations/configure", { yearId, kind: periods[0].kind === "bimester" ? "trimester" : "bimester" }); setWorkspace({ ...workspace, periods: [...workspace.periods.filter((item) => item.school_year_id !== yearId), ...result.periods] }); setPeriodId(result.periods[0]?.id ?? ""); })}>Cambiar a {periods[0].kind === "bimester" ? "trimestres" : "bimestres"}</Button></details>}
    </div>
    {message && <p role="status" className="rounded-xl bg-[#eaf7fb] px-4 py-3 text-sm text-[#17475d]">{message}</p>}
    {!overview ? <p>{classroomId && periodId ? "Cargando registros…" : "Selecciona un aula y un período para comenzar."}</p> : <>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#eaf7fb] p-4"><b>{overview.progress.students_complete}/{overview.progress.students_total} niños completos</b></div><div className="rounded-2xl bg-[#eff8f2] p-4"><b>{overview.progress.competencies_complete}/{overview.progress.competencies_total} valoraciones confirmadas</b></div></div>
      <div className="flex flex-wrap gap-2"><Button variant={view === "student" ? "default" : "outline"} onClick={() => setView("student")}>Revisar un niño</Button><Button variant={view === "classroom" ? "default" : "outline"} onClick={() => setView("classroom")}>Revisar aula</Button><Button variant={view === "coverage" ? "default" : "outline"} onClick={() => setView("coverage")}>Cobertura</Button><Button variant={view === "report" ? "default" : "outline"} onClick={() => setView("report")}>Informe de progreso</Button><Button variant={view === "family" ? "default" : "outline"} onClick={() => setView("family")}>Informe a familias</Button></div>
      {view === "coverage" && <PedagogicalCoverage classroomId={classroomId} periodId={periodId} onPlan={onPlan} onPrepareActivity={onPrepareActivity} />}
      {view === "family" && currentPeriod && <FamilyReportGenerator key={`${classroomId}:${periodId}`} classroomId={classroomId} period={currentPeriod} students={overview.students.map((student) => ({ id:student.id,name:studentName(student) }))} initialStudentId={studentId} onConclusion={(id) => { setStudentId(id); setView("student"); }} />}
      {view === "student" && <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border bg-white p-3"><h3 className="px-2 py-2 font-bold">Niños</h3><div className="space-y-1">{overview.students.map((student) => { const complete = overview.scope.length > 0 && overview.scope.every((item) => overview.rows.some((row) => row.student_id === student.id && row.competency_id === item.id && row.state === "confirmed")); return <button key={student.id} type="button" onClick={() => setStudentId(student.id)} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${studentId === student.id ? "bg-[#e8f6fb] font-bold text-[#07516a]" : "hover:bg-[#f4f8fb]"}`}>{studentName(student)}{complete && <Check className="size-4 text-green-700" />}</button>; })}</div></aside>
        <div className="space-y-4"><div className="rounded-2xl border bg-white p-5"><h3 className="text-lg font-bold">{selectedStudent ? `Revisar a ${studentName(selectedStudent)}` : "Selecciona un niño"}</h3><p className="mt-1 text-sm text-[#526b87]">Elige una competencia y revisa sus registros.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{studentRows.map((row) => <button key={row.competency_id} type="button" onClick={() => setCompetencyId(row.competency_id)} className={`min-h-20 rounded-xl border p-3 text-left ${competencyId === row.competency_id ? "border-[#087d96] bg-[#eaf7fb]" : "bg-white hover:bg-[#f5f9fc]"}`}><b className="block text-sm">{row.competency_name}</b><span className="mt-1 block text-xs text-[#526b87]">{row.evidence_count} registros · {stateText[row.state] ?? row.state}</span></button>)}</div>{!studentRows.length && <p className="mt-3 text-sm">Aún no hay competencias previstas para este período. Revisa las actividades o añade una competencia en “Revisar aula”.</p>}</div>
          {selectedCompetency && detail && detail.classroom_id === classroomId && detail.period_id === periodId && detail.student_id === studentId && detail.competency_id === competencyId && <article className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold">{selectedCompetency.name}</h3><p className="mt-1 text-sm text-[#526b87]">{detail.evidence_count} registros · {stateText[detail.state] ?? detail.state}</p></div>{detail.state === "confirmed" && <span className="rounded-full bg-[#e6f9ef] px-3 py-1 text-sm font-semibold text-green-800">✓ Confirmada</span>}</div>
            {detail.state === "needs_review" && <p className="mt-4 rounded-xl bg-[#fff2d9] p-3 text-sm">Hay observaciones nuevas o modificadas. Revisa el sustento y confirma una nueva versión.</p>}
            {detail.state === "insufficient_information" && detail.insufficiency_reason && <p className="mt-4 rounded-xl bg-[#fff2d9] p-3 text-sm">Información insuficiente: {detail.insufficiency_reason}</p>}
            {detail.assessment?.teacher_justification && <p className="mt-4 rounded-xl bg-[#f2f8fb] p-3 text-sm"><b>Motivo de la decisión docente:</b> {detail.assessment.teacher_justification}</p>}
            <button type="button" onClick={() => setShowSustento(!showSustento)} className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border bg-[#f5f9fc] px-4 text-left font-semibold text-[#07516a]">Ver sustento <ChevronDown className={`size-4 ${showSustento ? "rotate-180" : ""}`} /></button>
            {showSustento && <div className="mt-3 space-y-4"><section className="rounded-xl bg-[#f2f8fb] p-4 text-sm"><b>{detail.reference.kind === "official" ? "Desempeño curricular" : "Referente por edad · síntesis orientativa"}</b>{detail.reference.kind === "official" ? detail.reference.items.map((item) => <p key={item.id} className="mt-1">{item.official_text}</p>) : <p className="mt-1">{detail.reference.text}</p>}</section><ul className="space-y-3">{detail.timeline.map((item) => <li key={item.id} className="rounded-xl border p-4 text-sm"><b>{formatDate(item.observed_on)} · {item.activity_title}</b><p className="mt-1 text-[#526b87]">Criterio: {item.criterion_text}</p><p className="mt-2">{item.observation_text || "Se adjuntó una evidencia visual; no hay nota escrita."}</p>{item.media_available && <a className="mt-2 inline-block font-semibold text-[#087d96] underline" target="_blank" rel="noreferrer" href={`${localDatabaseApiUrl}/api/period-evaluations/evidence/${item.id}/media`}>Abrir evidencia adjunta</a>}</li>)}</ul>{!detail.timeline.length && <p className="text-sm">Todavía no hay observaciones de esta competencia en el período.</p>}</div>}
            <div className="mt-5 border-t pt-5"><h4 className="font-bold">Tu valoración del período</h4><p className="mt-1 text-sm text-[#526b87]">El nivel se refiere al conjunto de registros. Ninguna observación individual recibe una nota.</p>
              <Button className="mt-4" variant="outline" disabled={busy || detail.evidence_count === 0} onClick={() => void act(async () => { const result = await api<Suggestion>("/api/period-evaluations/suggest", { classroomId, periodId, studentId, competencyId }); setSuggestion(result); setTeacherAnalysis(result.analysis.evidence_overview); setConclusionText(result.conclusion?.conclusion_text ?? ""); setAchievementLevel(""); setTeacherJustification(""); setSavedDraftSnapshot(formSnapshot(result.analysis.evidence_overview,"",result.conclusion?.conclusion_text ?? "","")); await reloadOverview(); await reloadDetail(); setMessage(result.analysis.information_status === "insufficient" ? "La IA encontró información insuficiente para sugerir un nivel. Puedes seguir observando o explicar tu criterio docente." : "Sugerencia lista. Revisa los textos y decide el nivel antes de confirmar."); })}><Sparkles className="mr-2 size-4" /> Pedir sugerencia</Button>
              {suggestion?.analysis.suggested_level && <div className="mt-3 rounded-xl bg-[#eaf7fb] p-3 text-sm"><b>La IA sugiere: {suggestion.analysis.suggested_level}</b><p>{suggestion.analysis.suggestion_reason}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => setAchievementLevel(suggestion.analysis.suggested_level ?? "")}>Usar esta sugerencia</Button></div>}
              {suggestion?.analysis.information_status === "insufficient" && <p className="mt-3 rounded-xl bg-[#fff2d9] p-3 text-sm">Información insuficiente: {suggestion.analysis.insufficiency_reason}</p>}
              <label className="mt-4 block text-sm font-semibold">¿Qué muestran las observaciones?<Textarea className="mt-1 min-h-24" value={teacherAnalysis} onChange={(event) => setTeacherAnalysis(event.target.value)} placeholder="Ej.: En distintos juegos explicó sus ideas y pidió ayuda cuando la necesitó." /></label>
              <label className="mt-4 block text-sm font-semibold">Nivel que confirmas<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={achievementLevel} onChange={(event) => setAchievementLevel(event.target.value)}><option value="">Elige después de revisar</option><option value="AD">AD · Logro destacado</option><option value="A">A · Logro esperado</option><option value="B">B · En proceso</option><option value="C">C · En inicio</option></select></label>
              <label className="mt-4 block text-sm font-semibold">Conclusión descriptiva {achievementLevel === "AD" && <span className="font-normal">(opcional para AD)</span>}<Textarea className="mt-1 min-h-28" value={conclusionText} onChange={(event) => setConclusionText(event.target.value)} placeholder="Describe avances observados, apoyos necesarios y próximos pasos." /></label>
              {(detail.evidence_count < 2 || suggestion?.analysis.information_status === "insufficient" || Boolean(suggestion?.analysis.suggested_level && achievementLevel && suggestion.analysis.suggested_level !== achievementLevel)) && <label className="mt-4 block text-sm font-semibold">Explica el criterio de tu decisión<Textarea className="mt-1 min-h-20" value={teacherJustification} onChange={(event) => setTeacherJustification(event.target.value)} placeholder="¿Qué sustento te permite tomar esta decisión?" /></label>}
              {detail.draft && !detail.draft.current && <p className="mt-3 rounded-xl bg-[#fff2d9] p-3 text-sm">Las observaciones cambiaron desde este borrador. Revisa lo nuevo y guarda otra vez; la sugerencia anterior no se usará.</p>}
              <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void act(async () => { await api("/api/period-evaluations/save-draft", { classroomId, periodId, studentId, competencyId, evidenceFingerprint: detail.evidence_fingerprint, provisionalLevel: achievementLevel || null, teacherAnalysis, conclusionText, teacherJustification }); await reloadOverview(); await reloadDetail(); setMessage("Borrador guardado. Puedes salir y volver más tarde."); })}>Guardar borrador</Button>
              <Button disabled={busy || hasUnsavedDraft || !detail.evidence_count || !achievementLevel || !teacherAnalysis.trim() || (achievementLevel !== "AD" && !conclusionText.trim())} onClick={() => void act(async () => { await api("/api/period-evaluations/confirm", { classroomId, periodId, studentId, competencyId, evidenceFingerprint: detail.evidence_fingerprint, achievementLevel, teacherAnalysis, conclusionText, teacherJustification }); await reloadOverview(); await reloadDetail(); setMessage("Valoración confirmada. Se reflejará en el cierre del aula."); })}>Confirmar valoración <ArrowRight className="ml-2 size-4" /></Button></div>{hasUnsavedDraft && <p className="mt-2 text-sm text-[#526b87]">Guarda los cambios antes de confirmar.</p>}
            </div>
          </article>}
        </div>
      </div>}
      {view === "classroom" && <div className="space-y-4"><div className="rounded-2xl border bg-white p-5"><h3 className="text-lg font-bold">Revisar aula · {currentPeriod?.label}</h3><p className="mt-1 text-sm text-[#526b87]">Aparecen también las competencias previstas sin observaciones.</p><div className="mt-4 flex flex-wrap gap-2">{overview.scope.map((item) => <span key={item.id} className="rounded-full bg-[#eaf7fb] px-3 py-2 text-sm">{item.name}</span>)}</div>
          <details className="mt-4"><summary className="cursor-pointer font-semibold text-[#087d96]">Ajustar competencias trabajadas</summary><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Competencia para incluir" className="min-h-11 flex-1 rounded-xl border bg-white px-3" value={addingCompetencyId} onChange={(event) => setAddingCompetencyId(event.target.value)}><option value="">Elige una competencia</option>{missing.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button disabled={busy || !addingCompetencyId} onClick={() => void act(async () => { await api("/api/period-evaluations/scope", { classroomId, periodId, competencyId: addingCompetencyId, included: true }); setAddingCompetencyId(""); await reloadOverview(); })}>Añadir</Button></div><p className="mt-3 text-sm">Si una competencia prevista no se trabajó ni evaluó en este período, puedes retirarla con una explicación.</p><select aria-label="Competencia para retirar" className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" value={excludingId} onChange={(event) => setExcludingId(event.target.value)}><option value="">Elige una competencia para retirar</option>{overview.scope.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{excludingId && <><Textarea className="mt-2" value={exclusionReason} onChange={(event) => setExclusionReason(event.target.value)} placeholder="¿Por qué no se desarrolló ni evaluó en este período?" /><Button variant="outline" className="mt-2" disabled={busy || !exclusionReason.trim()} onClick={() => void act(async () => { await api("/api/period-evaluations/scope", { classroomId, periodId, competencyId: excludingId, included: false, reason: exclusionReason }); setExcludingId(""); setExclusionReason(""); await reloadOverview(); })}>Retirar de este período</Button></>}</details>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select aria-label="Filtrar por niño" className="min-h-11 rounded-xl border bg-white px-3" value={classroomStudentFilter} onChange={(event) => { setClassroomStudentFilter(event.target.value); setConsolidated(null); }}><option value="">Todos los niños</option>{overview.students.map((item) => <option key={item.id} value={item.id}>{studentName(item)}</option>)}</select>
          <select aria-label="Filtrar por competencia" className="min-h-11 rounded-xl border bg-white px-3" value={classroomCompetencyFilter} onChange={(event) => { setClassroomCompetencyFilter(event.target.value); setConsolidated(null); }}><option value="">Todas las competencias</option>{overview.scope.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Filtrar por estado" className="min-h-11 rounded-xl border bg-white px-3" value={classroomStatusFilter} onChange={(event) => { setClassroomStatusFilter(event.target.value); setConsolidated(null); }}><option value="">Todos los estados</option><option value="pending">Pendientes</option><option value="complete">Completas</option></select>
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#eaf7fb]"><tr><th className="p-3">Niño</th><th className="p-3">Competencia</th><th className="p-3">Registros</th><th className="p-3">Nivel</th><th className="p-3">Estado</th></tr></thead><tbody>{classroomRows.map((row) => <tr key={`${row.student_id}:${row.competency_id}`} className="border-t"><td className="p-3">{studentName(overview.students.find((item) => item.id === row.student_id)!)}</td><td className="p-3">{row.competency_name}</td><td className="p-3">{row.evidence_count}</td><td className="p-3">{row.level ?? "—"}</td><td className="p-3"><button className="font-semibold text-[#087d96] underline" onClick={() => { setStudentId(row.student_id); setCompetencyId(row.competency_id); setView("student"); }}>{stateText[row.state] ?? row.state}</button></td></tr>)}</tbody></table></div>
        {overview.closure.closed && !overview.closure.current && <p className="rounded-xl bg-[#fff2d9] p-4 text-sm">Se añadieron o modificaron registros después del cierre. Revisa las valoraciones y vuelve a cerrar.</p>}
        <Button disabled={busy || !closureReady || (overview.closure.closed && overview.closure.current)} onClick={() => void act(async () => { await api("/api/period-evaluations/close", { classroomId, periodId }); await reloadOverview(); setMessage("Período cerrado. El informe y el consolidado ya usan las valoraciones confirmadas."); })}>{overview.closure.closed && overview.closure.current ? "✓ Período cerrado" : "Cerrar período"}</Button>
        <div><h4 className="font-bold">Consolidado para SIAGIE</h4><p className="mt-1 text-sm text-[#526b87]">Revisa aquí lo confirmado y lo pendiente. Tras cerrar el período podrás descargar los datos para ingresarlos manualmente.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void act(async () => { setConsolidated(await api<Consolidated>(`/api/period-evaluations/consolidated?classroomId=${classroomId}&periodId=${periodId}${filterQuery}`)); })}>Ver consolidado</Button>{overview.closure.closed && overview.closure.current && <a href={`${localDatabaseApiUrl}/api/period-evaluations/consolidated.csv?classroomId=${classroomId}&periodId=${periodId}${filterQuery}`} className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[#07516a]"><FileDown className="mr-2 size-4" /> Descargar consolidado CSV</a>}</div>
        {consolidated && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr><th className="p-3">Niño</th><th className="p-3">Competencia</th><th className="p-3">Nivel</th><th className="p-3">Conclusión</th><th className="p-3">Estado</th></tr></thead><tbody>{consolidated.rows.map((row) => <tr className="border-t" key={`${row.student_id}:${row.competency_id}`}><td className="p-3">{row.student_name}</td><td className="p-3">{row.competency_name}</td><td className="p-3">{row.achievement_level ?? "—"}</td><td className="p-3">{row.conclusion || "—"}</td><td className="p-3">{stateText[row.state] ?? row.state}</td></tr>)}</tbody></table></div>}
      </div>}
      {view === "report" && <div className="rounded-2xl border bg-white p-5"><h3 className="text-lg font-bold">Datos del Informe de Progreso</h3><p className="mt-1 text-sm text-[#526b87]">Se preparan desde las valoraciones confirmadas; el Word y PDF se añadirán con una plantilla posterior.</p>{overview.closure.closed && overview.closure.current ? <><label className="mt-4 block text-sm font-semibold">Niño<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={studentId} onChange={(event) => { setStudentId(event.target.value); setReport(null); }}>{overview.students.map((item) => <option key={item.id} value={item.id}>{studentName(item)}</option>)}</select></label><Button className="mt-3" onClick={() => void act(async () => { const result = await api<{ competencies: Consolidated["rows"] }>(`/api/period-evaluations/progress-report?classroomId=${classroomId}&periodId=${periodId}&studentId=${studentId}`); setReport({ rows: result.competencies }); })}>Ver datos del informe</Button>{report && <ul className="mt-4 space-y-3">{report.rows.map((row) => <li key={row.competency_id} className="rounded-xl bg-[#f2f8fb] p-4"><b>{row.competency_name} · {row.achievement_level}</b><p className="mt-1 text-sm">{row.conclusion || "Sin conclusión opcional para AD."}</p></li>)}</ul>}</> : <p className="mt-4 rounded-xl bg-[#fff2d9] p-4 text-sm">Primero confirma las valoraciones y cierra el período en “Revisar aula”.</p>}</div>}
    </>}
  </section>;
}
