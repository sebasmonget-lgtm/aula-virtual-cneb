"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

type Attribution = { version: number; state: string; source: string; candidate_competency_ids: string[];
  confirmed_competency_ids: string[]; confirmed_criterion_ids: string[]; raw_revision: number };
type ReviewRow = { id: string; student_id: string; raw_text: string | null; corrected_text?: string | null; captured_criterion_id: string | null;
  attribution_version: number | null; attribution_state: string | null };
type Detail = { observation: { id: string; student_id: string; raw_text: string | null; captured_criterion_id: string | null;
  context_snapshot: { captured_competency_id?: string; captured_criterion_text?: string }; source_revision: number;
  effective_text: string | null }; history: Attribution[];
  latest: Attribution | null; competencies: { id: string; name: string }[];
  criteria: { id: string; competency_v4_id: string; criterion_text: string }[] };

export function OrdinaryReviewDialog({ students, onClose }: { students: LocalStudent[]; onClose: () => void }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [savedRows, setSavedRows] = useState<ReviewRow[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [criterionIds, setCriterionIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async () => {
    const [queueResponse, allResponse] = await Promise.all([
      apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/queue`, { cache: "no-store" }),
      apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations`, { cache: "no-store" }),
    ]);
    const queue = await queueResponse.json() as { error?: string; observations?: ReviewRow[] };
    const all = await allResponse.json() as { error?: string; observations?: ReviewRow[] };
    if (!queueResponse.ok || !allResponse.ok) throw new Error(queue.error ?? all.error ?? "No se pudo cargar la cola.");
    const pending = queue.observations ?? [];
    const pendingIds = new Set(pending.map(item => item.id));
    setRows(pending);
    setSavedRows((all.observations ?? []).filter(item => !pendingIds.has(item.id)).slice(0, 20));
  }, []);

  async function openRow(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/${id}/attributions`, { cache: "no-store" });
      const data = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo abrir la observación.");
      setDetail(data);
      const initial = data.latest?.state === "confirmed" ? data.latest.confirmed_competency_ids
        : data.observation.context_snapshot?.captured_competency_id ? [data.observation.context_snapshot.captured_competency_id]
          : data.latest?.candidate_competency_ids.slice(0, 1) ?? [];
      setSelectedIds(initial);
      setCriterionIds(data.latest?.state === "confirmed" ? data.latest.confirmed_criterion_ids
        : data.observation.captured_criterion_id ? [data.observation.captured_criterion_id] : []);
      setEditing(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    void Promise.resolve().then(loadQueue).catch((error) =>
      setMessage(error instanceof Error ? error.message : "No se pudo cargar."));
  }, [loadQueue]);

  async function act(kind: "suggest" | "confirm" | "unclassified") {
    if (!detail || busy) return;
    setBusy(true); setMessage("");
    try {
      const url = `${localDatabaseApiUrl}/api/ordinary-observations/${detail.observation.id}/${kind === "suggest" ? "suggest" : "attributions"}`;
      const response = await apiFetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "suggest" ? {} : { expectedVersion: detail.latest?.version ?? 0,
          competencyIds: kind === "unclassified" ? [] : selectedIds,
          criterionIds: kind === "unclassified" ? [] : criterionIds.filter(id =>
            selectedIds.includes(detail.criteria.find(item => item.id === id)?.competency_v4_id ?? "")) }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la revisión.");
      await loadQueue();
      if (kind === "suggest") await openRow(detail.observation.id);
      else { setDetail(null); setMessage(kind === "unclassified" ? "Observación dejada sin clasificar." : "Atribución confirmada por ti."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo completar la acción."); }
    finally { setBusy(false); }
  }

  const name = (id: string) => students.find(student => student.id === id)?.name ?? "Alumno";
  const label = (id: string) => detail?.competencies.find(item => item.id === id)?.name ?? id;
  const suggested = detail?.latest?.state === "suggested" ? detail.latest.candidate_competency_ids : [];
  const capturedCriterion = detail?.observation.captured_criterion_id
    ? detail.criteria.find(item => item.id === detail.observation.captured_criterion_id) : null;

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5"><DialogTitle>Revisar observaciones</DialogTitle>
        <DialogDescription>Las propuestas de Ayni no se confirman solas. El texto original y el alumno no cambian.</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
        {!detail ? <><p className="font-semibold">Pendientes: {rows.length}</p>
          {rows.length === 0 ? <p>No hay observaciones pendientes de revisión.</p> : rows.map(row =>
            <button key={row.id} type="button" onClick={() => void openRow(row.id)}
              className="block min-h-14 w-full rounded-xl border bg-white p-3 text-left hover:border-[#087d96]">
              <span className="block font-semibold">{name(row.student_id)}</span>
              <span className="block whitespace-pre-wrap text-sm">{row.raw_text ?? "Foto sin texto"}</span>
              {row.corrected_text && <span className="block text-xs">Corrección docente: {row.corrected_text}</span>}
              <span className="text-xs text-muted-foreground">{row.attribution_state === "suggested" ? "Propuesta lista para revisar" : "Por revisar"}</span>
            </button>)}
          {savedRows.length > 0 && <section className="space-y-2 border-t pt-4"><h3 className="font-semibold">Otras observaciones guardadas</h3>
            {savedRows.map(row => <button key={row.id} type="button" onClick={() => void openRow(row.id)}
              className="block min-h-11 w-full rounded-xl border bg-white p-3 text-left text-sm hover:border-[#087d96]">
              <span className="font-semibold">{name(row.student_id)}</span> · {row.raw_text ?? "Foto sin texto"}</button>)}
          </section>}</> : <>
          <p className="font-semibold">{name(detail.observation.student_id)}</p>
          <p className="whitespace-pre-wrap rounded-xl border bg-[#f6f9fd] p-3 text-sm">{detail.observation.raw_text ?? "Foto sin texto"}</p>
          {detail.observation.effective_text !== detail.observation.raw_text && <p className="whitespace-pre-wrap rounded-xl border p-3 text-sm">
            Corrección docente vigente: {detail.observation.effective_text}</p>}
          {detail.observation.captured_criterion_id && <p className="rounded-xl border border-[#9bcbd7] bg-[#e8f6fb] p-3 text-sm">
            Criterio elegido al registrar: {capturedCriterion?.criterion_text ??
              detail.observation.context_snapshot?.captured_criterion_text ?? "criterio histórico"}
            <span className="block">Esa atribución ya fue decisión docente.</span></p>}
          <div className="space-y-2"><p className="font-semibold">Propuesta de Ayni</p>
            {suggested?.length ? suggested.map(id => <p key={id} className="rounded-lg bg-[#f6f9fd] px-3 py-2 text-sm">{label(id)}</p>)
              : <p className="text-sm text-muted-foreground">Sin propuesta disponible. Puedes elegir una competencia o dejarla sin clasificar.</p>}
          </div>
          <Button variant="outline" disabled={busy} onClick={() => setEditing(value => !value)}>
            {editing ? "Ocultar opciones" : "Cambiar o agregar competencia"}</Button>
          {editing && <fieldset className="space-y-2 rounded-xl border p-3"><legend className="font-semibold">Competencias aplicables</legend>
            {detail.competencies.map(item => <label key={item.id} className="flex min-h-11 items-center gap-2 rounded-lg border bg-white p-2 text-sm">
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds(previous =>
                event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.name}</label>)}
          </fieldset>}
          {selectedIds.length > 0 && detail.criteria.length > 0 && <fieldset className="space-y-2 rounded-xl border p-3">
            <legend className="font-semibold">Criterios de esta actividad <span className="font-normal">(opcional)</span></legend>
            {detail.criteria.filter(item => selectedIds.includes(item.competency_v4_id)).map(item =>
              <label key={item.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox"
                checked={criterionIds.includes(item.id)} onChange={(event) => setCriterionIds(previous =>
                  event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.criterion_text}</label>)}
          </fieldset>}
          {detail.history.length > 0 && <p className="text-xs text-muted-foreground">Historial: {detail.history.length} versión(es); la última es {detail.latest?.state}.</p>}
        </>}
        {message && <WorkflowFeedback tone={detail ? "error" : "success"}>{message}</WorkflowFeedback>}
      </div>
      <DialogFooter className="shrink-0 flex-wrap border-t px-6 py-4">
        {detail ? <><Button variant="outline" disabled={busy} onClick={() => setDetail(null)}>Volver a la cola</Button>
          {(!["confirmed", "unclassified"].includes(detail.latest?.state ?? "") ||
            detail.latest?.raw_revision !== detail.observation.source_revision) &&
            <AsyncButton variant="outline" busy={busy} busyLabel="Consultando…" onClick={() => void act("suggest")}>Reintentar Ayni</AsyncButton>}
          <Button variant="outline" disabled={busy} onClick={() => void act("unclassified")}>Dejar sin clasificar</Button>
          <AsyncButton busy={busy} busyLabel="Guardando…" disabled={!selectedIds.length}
            onClick={() => void act("confirm")}>Confirmar selección</AsyncButton></> : <Button onClick={onClose}>Cerrar</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
