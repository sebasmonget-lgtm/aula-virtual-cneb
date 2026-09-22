export type AIActivityProposal = {
  title: string;
  purpose: string;
  meaningful_situation: string;
  teacher_preparation: string;
  child_actions: string;
  mediation: string;
  evidence_opportunities: string;
  closure_or_continuity: string;
  competency_status: "confirmed" | "unconfirmed";
  competency_id: string | null;
};

export type AIActivityCompetencyOption = { id: string; name: string };

const apiUrl = process.env.NEXT_PUBLIC_LOCAL_DATABASE_URL ?? "http://127.0.0.1:8788";

export async function loadAIActivityCompetencyOptions() {
  const response = await fetch(`${apiUrl}/api/ai/activity/options`, { cache: "no-store" });
  const payload = await response.json() as { competencies?: AIActivityCompetencyOption[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las competencias.");
  return payload.competencies ?? [];
}

export async function generateLocalAIActivity(input: {
  activityPurpose: string;
  context: string;
  materials: string[];
  competencyId?: string | null;
}) {
  const response = await fetch(`${apiUrl}/api/ai/activity/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { proposal?: AIActivityProposal; error?: string };
  if (!response.ok || !payload.proposal) throw new Error(payload.error ?? "No pudimos generar una propuesta válida. Inténtalo nuevamente.");
  return payload.proposal;
}
