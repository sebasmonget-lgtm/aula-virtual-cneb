export type LocalStudent = { id: string; name: string };
export type LocalEvidence = {
  id: string;
  student_id: string;
  observation_text: string;
  observed_at: string;
};

export type LocalDashboard = {
  activity: {
    id: string;
    title: string;
    purpose: string;
    occurs_on: string;
    experience_title: string;
    criterion_id: string;
    criterion_text: string;
    competency_text: string;
  };
  students: LocalStudent[];
  metrics: { students_total: number; evidences_week: number; students_observed: number };
  today: { date: string; now: string; blocks: { id: string; start_time: string; end_time: string; block_type: string; title: string; activity_id: string | null; purpose: string | null; experience_title: string | null; materials: string[]; criterion_id: string | null; status: string }[] };
  profile: {
    teacher_name: string; institution_name: string; section: string; age_label: string;
    age_years: number; school_year: number; institution_code: string | null; district: string | null;
    ugel: string | null; director_name: string | null; logo_url: string | null;
  };
};

export type DiagnosticWorkspace = {
  classroom: { id: string; section: string; age_years: number };
  students: LocalStudent[];
  guides: {
    id: string; competency_id: string; competency_text: string; area_name: string;
    short_meaning: string; suggested_contexts: string[]; observe_for: string[];
    suggested_actions: string[]; caution_text: string | null;
  }[];
  references: {
    id: string; guide_id: string; competency_id: string; short_observable_text: string;
    performance_ids: string[]; evidence_recommendation: string; official_verified: boolean;
  }[];
  session: { id: string; title: string; status: string } | null;
  entries: { id: string; student_id: string; competency_id: string; teacher_confirmed: boolean; teacher_interpretation: string | null }[];
  observations: { id: string; student_id: string; competency_id: string; reference_id: string; status: string; note: string | null }[];
};

const apiUrl = process.env.NEXT_PUBLIC_LOCAL_DATABASE_URL ?? "http://127.0.0.1:8788";

export async function loadLocalDashboard(signal?: AbortSignal): Promise<LocalDashboard> {
  const response = await fetch(`${apiUrl}/api/dashboard`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("La base local no está disponible.");
  return response.json();
}

export async function createLocalEvidence(input: {
  studentId: string;
  activityId: string;
  criterionId: string;
  observationText: string;
}) {
  const response = await fetch(`${apiUrl}/api/evidences`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; evidence?: LocalEvidence };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar la evidencia.");
  if (!payload.evidence) throw new Error("La base local devolvió una respuesta incompleta.");
  return payload.evidence;
}

export async function saveLocalProfile(input: {
  teacherName: string; institutionName: string; section: string;
  institutionCode: string; district: string; ugel: string; directorName: string;
  createLogo: boolean; logoInitials: string; logoPrimary: string; logoAccent: string;
}): Promise<LocalDashboard> {
  const response = await fetch(`${apiUrl}/api/profile`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; dashboard?: LocalDashboard };
  if (!response.ok || !payload.dashboard) throw new Error(payload.error ?? "No se pudo guardar el perfil.");
  return payload.dashboard;
}

export async function loadDiagnostics(): Promise<DiagnosticWorkspace> {
  const response = await fetch(`${apiUrl}/api/diagnostics`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el diagnóstico local.");
  return response.json();
}

export async function saveDiagnosticObservation(input: {
  studentId: string; competencyId: string; referenceId: string; referenceStatus: string;
  observationContext: string; observationText: string;
  teacherInterpretation: string; teacherConfirmed: boolean;
}): Promise<DiagnosticWorkspace> {
  const response = await fetch(`${apiUrl}/api/diagnostics`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; workspace?: DiagnosticWorkspace };
  if (!response.ok || !payload.workspace) throw new Error(payload.error ?? "No se pudo guardar el diagnóstico.");
  return payload.workspace;
}
