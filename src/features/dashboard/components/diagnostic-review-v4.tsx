"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDiagnosticGroup, confirmDiagnosticSynthesis,
  loadDiagnosticReview, prepareDiagnosticGroup, prepareDiagnosticSynthesis,
  saveDiagnosticGroup, saveDiagnosticSynthesis, saveDiagnosticInitialContext,
  type DiagnosticGroupDetails, type DiagnosticReviewWorkspace, type DiagnosticSynthesisDetails,
  type ObservationStatus,
} from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";

const statusText: Record<ObservationStatus, string> = {
  demonstrated: "Lo mostró", with_support: "Lo mostró con apoyo",
  not_yet_demonstrated: "Aún no se observó", insufficient_information: "Información insuficiente",
};

export function DiagnosticReview({ onObserve, onPlan }: { onObserve: () => void; onPlan?: () => void }) {
  const [workspace, setWorkspace] = useState<DiagnosticReviewWorkspace | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [competencyId, setCompetencyId] = useState<string | null>(null);
  const [view, setView] = useState<"individual" | "group">("individual");
  const [draft, setDraft] = useState<DiagnosticSynthesisDetails | null>(null);
  const [groupDraft, setGroupDraft] = useState<DiagnosticGroupDetails | null>(null);
  const [initialContext, setInitialContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() { setWorkspace(await loadDiagnosticReview()); }
  useEffect(() => { loadDiagnosticReview().then(setWorkspace).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la revisión.")); }, []);
  const student = workspace?.students.find((item) => item.id === studentId);
  const observations = useMemo(() => workspace?.observations.filter((item) => item.student_id === studentId && item.competency_v4_id === competencyId) ?? [], [workspace, studentId, competencyId]);
  const reviews = workspace?.reviews.filter((item) => item.student_id === studentId && item.competency_v4_id === competencyId) ?? [];
  const currentDraft = reviews.find((item) => item.status === "draft");
  const confirmed = reviews.find((item) => item.status === "confirmed");
  const groupReview = workspace?.group_reviews.find((item) => item.status === "draft");
  const groupConfirmed = workspace?.group_reviews.find((item) => item.status === "confirmed");
  const card = workspace?.group_coverage.find((item) => item.competency_id === competencyId);

  function selectCompetency(id: string) {
    setCompetencyId(id); setError(""); setMessage("");
    setDraft(workspace?.reviews.find((item) => item.student_id === studentId && item.competency_v4_id === id && item.status === "draft")?.details ?? null);
  }
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  if (!workspace) return error ? <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error} <Button variant="outline" onClick={() => { setError(""); void reload().catch((cause) => setError(cause.message)); }}>Reintentar</Button></p> : <LoadingState label="Cargando revisión diagnóstica..." />;
  return <section className="diagnostic-panel space-y-5 p-4 md:p-7">
    <div><h2 className="text-2xl font-bold">Revisar diagnóstico</h2><p className="text-sm text-[#526b87]">Las observaciones son información inicial. Tú decides qué interpretar y confirmar.</p></div>
    <div className="flex flex-wrap gap-2"><Button variant={view === "individual" ? "default" : "outline"} onClick={() => setView("individual")}>Por niño</Button><Button variant={view === "group" ? "default" : "outline"} onClick={() => setView("group")}>Vista del grupo</Button></div>
    {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}

    {view === "individual" && !student && <div className="space-y-3"><h3 className="font-bold">Elige un niño</h3><div className="grid gap-2 sm:grid-cols-2">{workspace.students.map((item) => {
      const count = workspace.observations.filter((row) => row.student_id === item.id).length;
      const confirmedCount = new Set(workspace.reviews.filter((row) => row.student_id === item.id && row.status === "confirmed").map((row) => row.competency_v4_id)).size;
      return <button key={item.id} type="button" onClick={() => { setStudentId(item.id); setCompetencyId(null); setDraft(null); setInitialContext(item.initial_context ?? ""); }} className="min-h-16 rounded-xl border p-3 text-left hover:border-[#087d96]"><span className="block font-semibold">{item.name}</span><span className="text-xs text-[#526b87]">{count} registros · {confirmedCount} competencias revisadas</span></button>;
    })}</div></div>}

    {view === "individual" && student && !competencyId && <div className="space-y-3"><Button variant="ghost" onClick={() => setStudentId(null)}><ArrowLeft /> Todos los niños</Button><h3 className="text-xl font-bold">{student.name}</h3><p className="text-sm text-[#526b87]">Revisa las competencias con observaciones. Puedes confirmar unas y seguir observando otras.</p><div className="rounded-xl border p-4"><label className="block text-sm font-semibold">Información inicial del niño (opcional)<Textarea className="mt-2" maxLength={2000} value={initialContext} onChange={(event) => setInitialContext(event.target.value)} placeholder="Intereses, formas de participar o apoyos que la familia y la docente conocen" /></label><p className="mt-1 text-xs text-[#526b87]">Sirve como contexto; no cuenta como observación ni se envía a la síntesis automática.</p><AsyncButton className="mt-2" variant="outline" busy={busy} busyLabel="Guardando..." onClick={() => void action(async () => { await saveDiagnosticInitialContext(studentId!, initialContext); setMessage("Información inicial guardada."); })}>Guardar información inicial</AsyncButton></div>{workspace.group_coverage.filter((item) => workspace.observations.some((row) => row.student_id === studentId && row.competency_v4_id === item.competency_id)).map((item) => {
      const own = workspace.observations.filter((row) => row.student_id === studentId && row.competency_v4_id === item.competency_id);
      const latest = workspace.reviews.find((row) => row.student_id === studentId && row.competency_v4_id === item.competency_id);
      return <button key={item.competency_id} type="button" onClick={() => selectCompetency(item.competency_id)} className="block min-h-16 w-full rounded-xl border p-4 text-left hover:border-[#087d96]"><span className="block font-semibold">{item.competency_name}</span><span className="text-sm text-[#526b87]">{own.length} {own.length === 1 ? "observación" : "observaciones"} · {latest?.status === "confirmed" ? "Diagnóstico revisado" : latest?.status === "draft" ? "Borrador por revisar" : "Disponible para revisar o seguir observando"}</span></button>;
    })}{!workspace.observations.some((row) => row.student_id === studentId) && <p className="rounded-xl bg-[#f1f6fb] p-4 text-sm">Todavía no hay observaciones. Esto no indica dificultad.</p>}</div>}

    {view === "individual" && student && competencyId && <div className="space-y-4"><Button variant="ghost" onClick={() => { setCompetencyId(null); setDraft(null); }}><ArrowLeft /> Competencias de {student.name}</Button><h3 className="text-xl font-bold">{card?.competency_name}</h3><p className="text-sm text-[#526b87]">{observations.length} registros cronológicos. El número orienta la revisión; no determina un nivel de logro.</p><div className="space-y-2">{observations.map((item) => <article key={item.id} className="rounded-xl bg-[#f1f6fb] p-3 text-sm"><p className="font-semibold">{new Date(item.observed_at).toLocaleDateString("es-PE")} · {item.experience_title}</p><p>{item.aspect_prompt} · {statusText[item.observation_status]}</p>{item.observation_text && <p className="mt-1 text-[#526b87]">“{item.observation_text}”</p>}</article>)}</div>
      <p className="text-xs text-[#526b87]">“Aún no se observó”: hubo oportunidad, pero esa actuación no apareció. “Información insuficiente”: lo registrado no permite interpretarla. Ninguna marca asigna un nivel.</p>
      {confirmed && <div className="rounded-xl border border-[#b5dfc8] bg-[#f0faf4] p-4"><p className="font-bold">Diagnóstico confirmado · versión {confirmed.version}</p><p className="mt-2 text-sm">{confirmed.details.summary_text}</p><p className="mt-2 text-xs">{confirmed.details.information_status === "insufficient_information" ? "Información insuficiente" : "Información inicial disponible"}</p></div>}
      {!draft && <Button variant="outline" disabled={busy} onClick={() => {
        if (currentDraft) { setDraft(currentDraft.details); return; }
        void action(async () => { const prepared = await prepareDiagnosticSynthesis(studentId!, competencyId); setDraft(prepared.details); setMessage("Propuesta factual preparada. Revisa y edita antes de confirmar."); });
      }}>{currentDraft ? "Abrir borrador" : confirmed ? "Preparar nueva versión" : "Preparar síntesis"}</Button>}
      {draft && <div className="space-y-3 rounded-xl border p-4"><h4 className="font-bold">Síntesis para revisión docente</h4><p className="text-xs text-[#526b87]">Esta propuesta solo organiza conteos reales. Escribe tu interpretación a partir de las observaciones anteriores.</p><fieldset className="space-y-1"><legend className="text-sm font-semibold">Estado de la información</legend>{([ ["information_available", "Información inicial disponible"], ["insufficient_information", "Información insuficiente"] ] as const).map(([value,label]) => <label key={value} className="flex min-h-10 items-center gap-2"><input type="radio" name="diagnostic-information" checked={draft.information_status === value} onChange={() => setDraft({ ...draft, information_status: value })} />{label}</label>)}</fieldset><label className="block text-sm font-semibold">Interpretación docente<Textarea className="mt-1 min-h-28" value={draft.summary_text} maxLength={3000} onChange={(event) => setDraft({ ...draft, summary_text: event.target.value })} /></label><label className="block text-sm font-semibold">Qué conviene observar después (opcional)<Textarea className="mt-1" value={draft.next_observation} maxLength={1000} onChange={(event) => setDraft({ ...draft, next_observation: event.target.value })} /></label><div className="flex flex-wrap gap-2"><AsyncButton busy={busy} busyLabel="Guardando..." onClick={() => void action(async () => { await saveDiagnosticSynthesis(currentDraft!.id, draft); setMessage("Borrador guardado."); })} disabled={!currentDraft}>Guardar borrador</AsyncButton><AsyncButton variant="outline" busy={busy} busyLabel="Confirmando..." onClick={() => void action(async () => { await saveDiagnosticSynthesis(currentDraft!.id, draft); await confirmDiagnosticSynthesis(currentDraft!.id); setDraft(null); setMessage("Diagnóstico confirmado. Las fuentes y esta versión quedan conservadas."); })} disabled={!currentDraft}>Confirmar diagnóstico</AsyncButton><Button variant="ghost" disabled={busy} onClick={() => void action(async () => { const prepared = await prepareDiagnosticSynthesis(studentId!, competencyId); setDraft(prepared.details); setMessage("Propuesta actualizada con las observaciones actuales."); })}>Regenerar propuesta</Button></div></div>}
    </div>}

    {view === "group" && <div className="space-y-4"><div><h3 className="text-xl font-bold">Lo que conocemos del grupo</h3><p className="text-sm text-[#526b87]">Cobertura por competencia, sin comparar niños ni calcular logros. Puedes seguir observando en cualquier momento.</p></div><GroupCoverage items={workspace.group_coverage} studentCount={workspace.students.length} />
      {groupConfirmed && <div className="rounded-xl border border-[#b5dfc8] bg-[#f0faf4] p-4"><p className="font-bold">Diagnóstico grupal confirmado · versión {groupConfirmed.version}</p><p className="mt-1 text-sm">{groupConfirmed.details.strengths}</p><p className="text-sm">{groupConfirmed.details.needs}</p><p className="text-sm">{groupConfirmed.details.planning_priorities}</p></div>}
      {!groupDraft && <Button variant="outline" disabled={busy || !workspace.reviews.some((item) => item.status === "confirmed")} onClick={() => {
        if (groupReview) { setGroupDraft(groupReview.details); return; }
        void action(async () => { const prepared = await prepareDiagnosticGroup(); setGroupDraft(prepared.details); setMessage("Revisión grupal preparada con las síntesis confirmadas."); });
      }}>{groupReview ? "Abrir revisión grupal" : groupConfirmed ? "Preparar nueva revisión grupal" : "Preparar diagnóstico grupal"}</Button>}
      {!workspace.reviews.some((item) => item.status === "confirmed") && <p className="text-sm text-[#526b87]">Confirma primero al menos una síntesis individual; puedes seguir observando las demás competencias.</p>}
      {groupDraft && <div className="space-y-3 rounded-xl border p-4"><p className="text-sm text-[#526b87]">Escribe tendencias del grupo sin nombres propios. Estas prioridades solo llegarán a la planificación tras tu confirmación.</p>{([ ["strengths", "Fortalezas que aparecen"], ["needs", "Dónde necesitamos observar o acompañar más"], ["planning_priorities", "Prioridades que deseas considerar al planificar"] ] as const).map(([field,label]) => <label key={field} className="block text-sm font-semibold">{label}<Textarea className="mt-1" maxLength={3000} value={groupDraft[field]} onChange={(event) => setGroupDraft({ ...groupDraft, [field]: event.target.value })} /></label>)}<div className="flex flex-wrap gap-2"><AsyncButton busy={busy} busyLabel="Guardando..." disabled={!groupReview} onClick={() => void action(async () => { await saveDiagnosticGroup(groupReview!.id, groupDraft); setMessage("Borrador grupal guardado."); })}>Guardar borrador</AsyncButton><AsyncButton variant="outline" busy={busy} busyLabel="Confirmando..." disabled={!groupReview} onClick={() => void action(async () => { await saveDiagnosticGroup(groupReview!.id, groupDraft); await confirmDiagnosticGroup(groupReview!.id); setGroupDraft(null); setMessage("Diagnóstico grupal confirmado. Sus prioridades pueden orientar la planificación."); })}>Confirmar diagnóstico grupal</AsyncButton><Button variant="ghost" disabled={busy} onClick={() => void action(async () => { await prepareDiagnosticGroup(); setMessage("Fuentes grupales actualizadas."); })}>Actualizar fuentes</Button></div></div>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onObserve}><ArrowLeft /> Seguir observando</Button>{groupConfirmed && onPlan && <Button onClick={onPlan}>Continuar al plan anual <ArrowRight /></Button>}</div>
    </div>}
    {view === "individual" && <Button variant="outline" onClick={onObserve}><ArrowLeft /> Seguir observando</Button>}
  </section>;
}

function GroupCoverage({ items, studentCount }: { items: DiagnosticReviewWorkspace["group_coverage"]; studentCount: number }) {
  const observed = items.filter((item) => item.children_with_observations > 0);
  const missing = items.filter((item) => item.children_with_observations === 0);
  const cards = (rows: typeof items) => <div className="grid gap-2 sm:grid-cols-2">{rows.map((item) => <div key={item.competency_id} className="rounded-xl bg-[#f1f6fb] p-3"><p className="font-semibold">{item.competency_name}</p><p className="mt-1 text-xs text-[#526b87]">{item.children_with_observations}/{studentCount} con observaciones · {item.confirmed_with_information} síntesis con información · {item.confirmed_insufficient} síntesis insuficientes · {item.children_without_observations} sin registro</p></div>)}</div>;
  return <div className="space-y-3">
    {observed.length ? cards(observed) : <p className="rounded-xl bg-[#f1f6fb] p-4 text-sm">Aún no hay observaciones diagnósticas. Esto no significa que los niños tengan dificultades.</p>}
    {missing.length > 0 && <details className="rounded-xl border p-3"><summary className="cursor-pointer font-semibold">Ver {missing.length} competencias aún sin observaciones</summary><div className="mt-3">{cards(missing)}</div></details>}
  </div>;
}
