"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, LoadingState, ReadOnlyField, WorkflowFeedback } from "./workflow-ui";

type Proposal = {
  competency_id: string;
  criterion_text: string;
  expected_evidence: string;
  acceptable_evidence_variations: string[];
  observation_focus: string[];
  evidence_scope: "individual" | "group" | "mixed";
  teacher_caution: string;
};
type StoredCriterion = { id: string; details: Proposal; status: "draft" | "active" };

export function CriterionEvidenceGenerator({ activityId, activityTitle, competencyName }: { activityId: string; activityTitle: string; competencyName: string }) {
  const [stored, setStored] = useState<StoredCriterion | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadedActivityId, setLoadedActivityId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [opened, setOpened] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [operation, setOperation] = useState<"generate" | "save" | "confirm" | null>(null);
  const readOnly = stored?.status === "active";
  const hasUnsavedChanges = Boolean(proposal && stored && (generationId || JSON.stringify(proposal) !== JSON.stringify(stored.details)));

  useEffect(() => {
    let cancelled = false;
    void fetch(`${localDatabaseApiUrl}/api/activity-criteria?activityId=${activityId}`)
      .then((response) => { if (!response.ok) throw new Error("No se pudo cargar el criterio de esta actividad."); return response.json() as Promise<{ criteria?: StoredCriterion[] }>; })
      .then((data) => {
        if (cancelled) return;
        const criterion = data.criteria?.[0] ?? null;
        setStored(criterion);
        setProposal(criterion?.details ?? null);
        setGenerationId(null);
        setOpened(false);
        setLoadedActivityId(activityId);
        setLoadError(false);
        setMessage("");
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) { setStored(null); setProposal(null); setLoadedActivityId(activityId); setLoaded(true); setLoadError(true); setMessage("No se pudo cargar el criterio de esta actividad."); setMessageTone("error"); } });
    return () => { cancelled = true; };
  }, [activityId, reload]);

  async function generate() {
    if (operation) return;
    setOperation("generate"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/ai/activity-criteria/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ activityId, note }) });
      const data = await response.json() as { error?: string; proposal?: Proposal; generation_id?: string };
      if (!response.ok || !data.proposal) throw new Error(data.error ?? "No pudimos generar un criterio válido.");
      setProposal(data.proposal); setGenerationId(data.generation_id ?? null); setOpened(true);
      setMessage("Propuesta lista. Revísala antes de guardar."); setMessageTone("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos generar un criterio válido."); setMessageTone("error"); }
    finally { setOperation(null); }
  }

  async function save() {
    if (!proposal || operation) return;
    setOperation("save"); setMessage("");
    try {
    const response = await fetch(stored ? `${localDatabaseApiUrl}/api/activity-criteria/${stored.id}` : `${localDatabaseApiUrl}/api/activity-criteria`, {
      method: stored ? "PUT" : "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(stored ? { proposal, generationId } : { activityId, generationId, proposal }),
    });
    const data = await response.json() as { error?: string; id?: string };
    if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
    setStored({ id: data.id ?? stored?.id ?? "", details: proposal, status: "draft" });
    setGenerationId(null);
    setMessage("Borrador guardado."); setMessageTone("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); setMessageTone("error"); }
    finally { setOperation(null); }
  }

  async function confirm() {
    if (!stored || operation || hasUnsavedChanges) return;
    setOperation("confirm"); setMessage("");
    try {
    const response = await fetch(`${localDatabaseApiUrl}/api/activity-criteria/${stored.id}/confirm`, { method: "POST" });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar.");
    setStored({ ...stored, status: "active" });
    setMessage("Criterio confirmado."); setMessageTone("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo confirmar."); setMessageTone("error"); }
    finally { setOperation(null); }
  }

  if (!loaded || loadedActivityId !== activityId) return <LoadingState label="Cargando criterio y evidencia..." />;
  if (loadError) return <section className="ayni-panel mt-3 space-y-3 p-4 sm:p-5"><WorkflowFeedback tone="error">No se pudo cargar el criterio de esta actividad.</WorkflowFeedback><Button variant="outline" onClick={() => { setLoaded(false); setReload((value) => value + 1); }}>Reintentar carga</Button></section>;
  if (!opened) return <section className="ayni-panel mt-3 space-y-3 p-4 sm:p-5"><div><h3 className="font-bold">{activityTitle}</h3><p className="mt-1 text-sm text-[#526b87]">Competencia: {competencyName}</p></div>{message && <WorkflowFeedback tone={messageTone}>{message}</WorkflowFeedback>}{stored && <p className="text-sm font-semibold text-[#126177]">{stored.status === "active" ? "Criterio: Confirmado" : "Criterio: Borrador"}</p>}<Button variant={stored ? "outline" : "default"} onClick={() => setOpened(true)}>{!stored ? "Preparar criterio y evidencia" : stored.status === "active" ? "Ver criterio" : "Abrir criterio"}</Button></section>;

  return <section className="ayni-workflow ayni-panel mt-3 space-y-4 p-4 sm:p-6"><div><h3 className="font-bold">{activityTitle}</h3><p className="mt-1 text-sm text-[#526b87]">Competencia: {competencyName}</p></div>{message && <WorkflowFeedback tone={messageTone}>{message}</WorkflowFeedback>}{!proposal ? <><label className="block">Nota contextual opcional<Textarea disabled={Boolean(operation)} value={note} onChange={(event) => setNote(event.target.value)} /></label><AsyncButton busy={operation === "generate"} busyLabel="Preparando criterio..." onClick={() => void generate()}>Preparar criterio y evidencia</AsyncButton></> : <><WorkflowFeedback tone={readOnly ? "success" : "info"}>{readOnly ? "Criterio confirmado · solo lectura" : "Borrador de criterio. Revísalo antes de confirmar."}</WorkflowFeedback>{([ ["criterion_text", "Criterio"], ["expected_evidence", "Evidencia esperada"], ["teacher_caution", "Nota para la docente"] ] as const).map(([key, label]) => readOnly ? <ReadOnlyField key={key} label={label} value={proposal[key]} /> : <label className="block" key={key}>{label}<Textarea disabled={Boolean(operation)} value={proposal[key]} onChange={(event) => setProposal({ ...proposal, [key]: event.target.value })} /></label>)}{readOnly ? <ReadOnlyField label="Variaciones válidas" value={proposal.acceptable_evidence_variations} /> : <label className="block">Variaciones válidas<Textarea disabled={Boolean(operation)} value={proposal.acceptable_evidence_variations.join("\n")} onChange={(event) => setProposal({ ...proposal, acceptable_evidence_variations: event.target.value.split("\n").filter(Boolean) })} /></label>}{readOnly ? <ReadOnlyField label="En qué observar" value={proposal.observation_focus} /> : <label className="block">En qué observar<Textarea disabled={Boolean(operation)} value={proposal.observation_focus.join("\n")} onChange={(event) => setProposal({ ...proposal, observation_focus: event.target.value.split("\n").filter(Boolean) })} /></label>}{readOnly ? <ReadOnlyField label="Alcance" value={proposal.evidence_scope === "individual" ? "Individual" : proposal.evidence_scope === "group" ? "Grupal" : "Mixto"} /> : <label className="block">Alcance<select disabled={Boolean(operation)} value={proposal.evidence_scope} onChange={(event) => setProposal({ ...proposal, evidence_scope: event.target.value as Proposal["evidence_scope"] })}><option value="individual">Individual</option><option value="group">Grupal</option><option value="mixed">Mixto</option></select></label>}{!readOnly && hasUnsavedChanges && stored && <p className="text-sm text-[#526b87]">Guarda los cambios antes de confirmar.</p>}{!readOnly && <div className="flex flex-wrap gap-2"><AsyncButton busy={operation === "save"} busyLabel="Guardando..." disabled={Boolean(operation)} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</AsyncButton><AsyncButton variant="outline" busy={operation === "generate"} busyLabel="Regenerando..." disabled={Boolean(operation)} onClick={() => void generate()}>Regenerar</AsyncButton>{stored && <AsyncButton busy={operation === "confirm"} busyLabel="Confirmando..." disabled={Boolean(operation) || hasUnsavedChanges} onClick={() => void confirm()}>Confirmar criterio</AsyncButton>}</div>}</>}</section>;
}
