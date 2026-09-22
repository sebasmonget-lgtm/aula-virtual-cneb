export type LocalStudent = { id: string; name: string };
export type StudentPedagogicalProfile = {
  student: { id: string; name: string; first_name: string; last_name: string; section: string; age_years: number; school_year: number };
  diagnosis: { competency_id: string; teacher_interpretation: string | null; teacher_confirmed: boolean; updated_at: string }[];
  competencies: { competency_id: string; competency_text: string; evidence_count: number; last_observed_at: string | null; observations: Record<ObservationStatus, number>; recent_evidence: LocalEvidence[]; teacher_confirmed_assessment: null }[];
  recent_relevant_observations: (LocalEvidence & { activity_title: string; criterion_text: string; competency_id: string; media_available: boolean })[];
  confirmed_period_assessments: [];
  snapshot: { generated_at: string; source_updated_at: string } | null;
};
export type LocalStatistics = {
  classroom: { students_active: number; students_observed: number; coverage: string };
  competencies: { competency_id: string; competency_text: string; planning: { activities_last_28_days: number }; coverage: { total_students: number; students_observed: number; students_with_sufficient_information: number; students_insufficient_information: number }; students: { demonstrated: number; with_support: number; not_yet_demonstrated: number }; evidence_count: number; last_observed_at: string | null; insight: "low_planning_presence" | "insufficient_information" | "observed_support_need" | "enough_information" }[];
};
export type LocalEvidence = {
  id: string;
  student_id: string;
  observation_text: string | null;
  observation_status: ObservationStatus | null;
  observed_at: string;
};

export type ObservationStatus = "demonstrated" | "with_support" | "not_yet_demonstrated" | "insufficient_information";
export type ActivityCriterion = { id: string; criterion_text: string; competency_id: string; competency_text: string; performance_id: string | null };

export type LocalDashboard = {
  activity: {
    id: string;
    title: string;
    purpose: string;
    occurs_on: string;
    experience_title: string;
    criteria: ActivityCriterion[];
  };
  students: LocalStudent[];
  metrics: { students_total: number; evidences_week: number; students_observed: number };
  today: {
    date: string; now: string;
    attendance: { recorded: boolean; recorded_count: number };
    calendar_exception: { type: string; label: string; is_instructional: boolean } | null;
    journey: { mode: string; current_block_id: string | null; next_block_id: string | null; primary_action: string; pending_items: string[] };
    blocks: { id: string; start_time: string; end_time: string; block_type: string; title: string; activity_id: string | null; purpose: string | null; experience_title: string | null; materials: string[]; steps: string[]; criteria: ActivityCriterion[]; status: string; display_status: string; current_override: boolean; current_step_index: number; closure_type: string | null }[];
  };
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

export async function loadStudentPedagogicalProfile(studentId: string): Promise<StudentPedagogicalProfile> {
  const response = await fetch(`${apiUrl}/api/students/${studentId}`, { cache: "no-store" });
  const payload = await response.json() as StudentPedagogicalProfile & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el perfil del niño.");
  return payload;
}

export async function loadLocalStatistics(): Promise<LocalStatistics> {
  const response = await fetch(`${apiUrl}/api/statistics`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron calcular las estadísticas locales.");
  return response.json();
}

export async function createLocalEvidence(input: {
  studentId: string;
  activityId: string;
  criterionId: string;
  observationStatus: ObservationStatus;
  observationText?: string;
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

async function postDashboard(path: string, input: Record<string, unknown>): Promise<LocalDashboard> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; dashboard?: LocalDashboard };
  if (!response.ok || !payload.dashboard) throw new Error(payload.error ?? "No se pudo actualizar la jornada.");
  return payload.dashboard;
}

export function saveLocalAttendance(records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) {
  return postDashboard("/api/attendance", { records });
}

export function updateLocalExecution(input: {
  scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step";
  stepIndex?: number;
  closureType?: "as_planned" | "note"; closureNote?: string;
}) {
  return postDashboard("/api/today/execution", input);
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
