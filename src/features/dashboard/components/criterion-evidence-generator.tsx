"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

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
  const [opened, setOpened] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const readOnly = stored?.status === "active";

  useEffect(() => {
    let cancelled = false;
    void fetch(`${localDatabaseApiUrl}/api/activity-criteria?activityId=${activityId}`)
      .then((response) => response.json() as Promise<{ criteria?: StoredCriterion[] }>)
      .then((data) => {
        if (cancelled) return;
        const criterion = data.criteria?.[0] ?? null;
        setStored(criterion);
        setProposal(criterion?.details ?? null);
        setGenerationId(null);
        setOpened(false);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) { setStored(null); setProposal(null); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [activityId]);

  async function generate() {
    const response = await fetch(`${localDatabaseApiUrl}/api/ai/activity-criteria/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ activityId, note }) });
    const data = await response.json() as { error?: string; proposal?: Proposal; generation_id?: string };
    if (!response.ok || !data.proposal) { setMessage(data.error ?? "No pudimos generar un criterio válido."); return; }
    setProposal(data.proposal);
    setGenerationId(data.generation_id ?? null);
    setOpened(true);
  }

  async function save() {
    if (!proposal) return;
    const response = await fetch(stored ? `${localDatabaseApiUrl}/api/activity-criteria/${stored.id}` : `${localDatabaseApiUrl}/api/activity-criteria`, {
      method: stored ? "PUT" : "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(stored ? { proposal, generationId } : { activityId, generationId, proposal }),
    });
    const data = await response.json() as { error?: string; id?: string };
    if (!response.ok) { setMessage(data.error ?? "No se pudo guardar."); return; }
    setStored({ id: data.id ?? stored?.id ?? "", details: proposal, status: "draft" });
    setGenerationId(null);
    setMessage("Borrador guardado.");
  }

  async function confirm() {
    if (!stored) return;
    const response = await fetch(`${localDatabaseApiUrl}/api/activity-criteria/${stored.id}/confirm`, { method: "POST" });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "No se pudo confirmar."); return; }
    setStored({ ...stored, status: "active" });
    setMessage("Criterio confirmado.");
  }

  if (!loaded) return <section className="mt-3 rounded border p-3">Cargando criterio y evidencia…</section>;
  if (!opened) return <section className="mt-3 rounded border p-3"><p className="font-semibold">Actividad: {activityTitle}</p><p className="text-sm">Competencia: {competencyName}</p>{!stored ? <Button onClick={() => setOpened(true)}>Preparar criterio y evidencia</Button> : <><p>{stored.status === "active" ? "Criterio: Confirmado" : "Criterio: Borrador"}</p><Button variant="outline" onClick={() => setOpened(true)}>{stored.status === "active" ? "Ver criterio" : "Abrir criterio"}</Button></>}</section>;

  return <section className="mt-3 space-y-3 rounded border p-3"><p className="font-semibold">Actividad: {activityTitle}</p><p className="text-sm">Competencia: {competencyName}</p>{message && <p role="status">{message}</p>}{!proposal ? <><label>Nota contextual opcional<Textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><Button onClick={() => void generate()}>Preparar criterio y evidencia</Button></> : <><p>{readOnly ? "Criterio confirmado · solo lectura" : "Criterio: Borrador"}</p>{([ ["criterion_text", "Criterio"], ["expected_evidence", "Evidencia esperada"], ["teacher_caution", "Nota para la docente"] ] as const).map(([key, label]) => <label key={key}>{label}<Textarea disabled={readOnly} value={proposal[key]} onChange={(event) => setProposal({ ...proposal, [key]: event.target.value })} /></label>)}<label>Variaciones válidas<Textarea disabled={readOnly} value={proposal.acceptable_evidence_variations.join("\n")} onChange={(event) => setProposal({ ...proposal, acceptable_evidence_variations: event.target.value.split("\n").filter(Boolean) })} /></label><label>En qué observar<Textarea disabled={readOnly} value={proposal.observation_focus.join("\n")} onChange={(event) => setProposal({ ...proposal, observation_focus: event.target.value.split("\n").filter(Boolean) })} /></label><label>Alcance<select disabled={readOnly} value={proposal.evidence_scope} onChange={(event) => setProposal({ ...proposal, evidence_scope: event.target.value as Proposal["evidence_scope"] })}><option value="individual">Individual</option><option value="group">Grupal</option><option value="mixed">Mixto</option></select></label>{!readOnly && <><Button onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</Button><Button variant="outline" onClick={() => void generate()}>Regenerar</Button>{stored && <Button onClick={() => void confirm()}>Confirmar criterio</Button>}</>}</>}</section>;
}
