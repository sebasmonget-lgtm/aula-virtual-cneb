"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateLocalAIActivity, loadAIActivityCompetencyOptions, type AIActivityCompetencyOption, type AIActivityProposal } from "@/src/lib/ai-activity-client";
import type { LocalDashboard } from "@/src/lib/local-database";

const fields: { key: keyof Pick<AIActivityProposal, "title" | "purpose" | "meaningful_situation" | "teacher_preparation" | "child_actions" | "mediation" | "evidence_opportunities" | "closure_or_continuity">; label: string; rows: number }[] = [
  { key: "title", label: "Título", rows: 2 },
  { key: "purpose", label: "Propósito", rows: 3 },
  { key: "meaningful_situation", label: "Situación significativa", rows: 4 },
  { key: "teacher_preparation", label: "Preparación docente", rows: 4 },
  { key: "child_actions", label: "Acciones de los niños", rows: 5 },
  { key: "mediation", label: "Mediación", rows: 5 },
  { key: "evidence_opportunities", label: "Oportunidades de evidencia", rows: 4 },
  { key: "closure_or_continuity", label: "Cierre o continuidad", rows: 4 },
];

export function AIActivityGenerator({ dashboard, initialMaterials }: { dashboard: LocalDashboard; initialMaterials: string[] }) {
  const [purpose, setPurpose] = useState(dashboard.activity?.purpose ?? "");
  const [context, setContext] = useState("");
  const [materialsText, setMaterialsText] = useState(initialMaterials.join(", "));
  const [competencies, setCompetencies] = useState<AIActivityCompetencyOption[]>([]);
  const [competencyId, setCompetencyId] = useState("");
  const [proposal, setProposal] = useState<AIActivityProposal | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    loadAIActivityCompetencyOptions().then(setCompetencies).catch(() => setCompetencies([]));
  }, []);

  async function generate() {
    setWorking(true); setError(""); setReviewMessage("");
    try {
      const next = await generateLocalAIActivity({
        activityPurpose: purpose,
        context,
        materials: materialsText.split(",").map((item) => item.trim()).filter(Boolean),
        competencyId: competencyId || null,
      });
      setProposal(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos preparar la actividad.");
    } finally { setWorking(false); }
  }

  function discard() {
    setProposal(null); setReviewMessage(""); setError("");
  }

  return <section className="mx-auto max-w-4xl space-y-6">
    <header><p className="text-sm font-semibold text-[#087d96]">Planificar</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Nueva actividad</h1><p className="mt-2 text-muted-foreground">Prepara una propuesta editable para tu aula. La IA no guarda ni confirma decisiones pedagógicas.</p></header>
    <section className="diagnostic-panel space-y-5 p-5 md:p-7">
      <div className="rounded-xl bg-[#eef8fb] px-4 py-3 text-sm text-[#315a78]"><strong>Aula precargada:</strong> {dashboard.profile?.section} · {dashboard.profile?.age_label}</div>
      <label className="block text-sm font-semibold">Propósito de la actividad <span className="text-destructive">*</span><Textarea className="mt-2 bg-white" rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="¿Qué quieres que exploren, expresen o construyan los niños?" /></label>
      <label className="block text-sm font-semibold">Contexto o situación que motivó la actividad <span className="font-normal text-muted-foreground">(opcional)</span><Textarea className="mt-2 bg-white" rows={3} value={context} onChange={(event) => setContext(event.target.value)} placeholder="Por ejemplo, una pregunta, interés o experiencia reciente del grupo." /></label>
      <label className="block text-sm font-semibold">Materiales <span className="font-normal text-muted-foreground">(separados por comas)</span><Input className="mt-2 h-11 bg-white" value={materialsText} onChange={(event) => setMaterialsText(event.target.value)} placeholder="Materiales disponibles en el aula" /></label>
      <label className="block text-sm font-semibold">Competencia confirmada <span className="font-normal text-muted-foreground">(opcional)</span><select className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm" value={competencyId} onChange={(event) => setCompetencyId(event.target.value)}><option value="">Aún no confirmar una competencia</option>{competencies.map((competency) => <option key={competency.id} value={competency.id}>{competency.name}</option>)}</select></label>
      {error && <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#9f2d28]">{error}</p>}
      <Button className="h-11" disabled={working || !purpose.trim()} onClick={() => void generate()}><Sparkles /> {working ? "Preparando tu actividad..." : proposal ? "Regenerar actividad" : "Generar actividad con IA"}</Button>
    </section>
    {proposal && <section className="space-y-5 rounded-2xl border border-[#d9ccef] bg-[#fbf9ff] p-5 md:p-7"><div><p className="text-sm font-bold text-[#7652bc]">Propuesta generada con IA</p><p className="mt-1 text-sm text-muted-foreground">Edita todo lo necesario antes de revisarla. No se guardará automáticamente.</p></div>{fields.map((field) => <label key={field.key} className="block text-sm font-semibold">{field.label}<Textarea className="mt-2 bg-white" rows={field.rows} value={proposal[field.key]} onChange={(event) => setProposal({ ...proposal, [field.key]: event.target.value })} /></label>)}<p className="text-sm text-muted-foreground">Competencia: {proposal.competency_status === "confirmed" ? "confirmada por la docente" : "sin confirmar"}</p><div className="flex flex-wrap gap-3"><Button onClick={() => setReviewMessage("La propuesta quedó revisada. Aún no se guarda porque la base local no cuenta con una operación de creación de actividades aprobada.")}><Check /> Revisar y guardar</Button><Button variant="outline" onClick={discard}><Trash2 /> Descartar</Button><Button variant="ghost" onClick={() => void generate()} disabled={working}><RefreshCw /> Regenerar posteriormente</Button></div>{reviewMessage && <p role="status" className="rounded-xl bg-white px-4 py-3 text-sm text-[#315a78]">{reviewMessage}</p>}</section>}
  </section>;
}
