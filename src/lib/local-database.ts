import { apiFetch } from "./ayni-api-fetch";
export type LocalStudent = { age_years?: number; id: string; name: string; full_name?: string; evidence_count?: number; competency_count?: number; last_observed_at?: string | null };
export type TeacherConfirmedAssessment = { id: string; period_start: string; period_end: string; information_status: "sufficient" | "insufficient"; evidence_overview: string; strengths_and_advances: string[]; support_needs: string[]; next_opportunities: string[]; teacher_confirmed_at: string };
export type TeacherConfirmedConclusion = { id: string; period_start: string; period_end: string; information_status: "sufficient" | "insufficient"; conclusion_text: string; support_or_conditions: string[]; next_steps: string[]; teacher_confirmed_at: string };
export type StudentPedagogicalProfile = {
  student: { id: string; name: string; first_name: string; last_name: string; birth_date: string | null; section: string; age_years: number; school_year: number };
  diagnosis: { competency_id: string; teacher_interpretation: string | null; teacher_confirmed: boolean; updated_at: string }[];
  family_interview_context: ({ version: number; teacher_confirmed_at: string } & Record<string, string | number>) | null;
  diagnostic_observations: { id: string; experience_id: string; aspect_id: string; competency_v4_id: string | null; competency_name: string | null; observation_status: DiagnosticObservationStatus; observation_text: string | null; observed_at: string; context_label?: string; classification_status?: string; classification_source?: string }[];
  confirmed_diagnostic_reviews: { id: string; competency_v4_id: string; competency_name: string; version: number; information_status: "information_available" | "insufficient_information"; summary_text: string; next_observation: string; teacher_confirmed_at: string; source: "diagnostic" }[];
  confirmed_student_diagnostic_review: { id: string; version: number; information_status: "information_available" | "insufficient_information"; comment_text: string; teacher_confirmed_at: string; is_current: boolean } | null;
  competencies: { competency_key: string; competency_id: string | null; competency_v4_id: string | null; competency_text: string; evidence_count: number; last_observed_at: string | null; observations: Record<ObservationStatus, number>; recent_evidence: LocalEvidence[]; teacher_confirmed_assessment: TeacherConfirmedAssessment | null; teacher_confirmed_conclusion: TeacherConfirmedConclusion | null }[];
  recent_relevant_observations: (LocalEvidence & { activity_title: string; criterion_text: string; competency_id: string | null; competency_v4_id: string | null; competency_key: string; media_available: boolean })[];
  confirmed_period_assessments: (TeacherConfirmedAssessment & { competency_v4_id: string })[];
  confirmed_period_conclusions: (TeacherConfirmedConclusion & { competency_v4_id: string })[];
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
  assignment_revision?: number;
  media_path?: string | null;
};
export type PrivateMediaUpload = { base64: string; mimeType: string; name?: string };

export type ObservationStatus = "demonstrated" | "with_support" | "not_yet_demonstrated" | "insufficient_information";
export type DiagnosticObservationStatus = ObservationStatus | "observed_without_judgment";
export type EvidenceKind = "observation" | "oral" | "drawing" | "production" | "photo" | "movement";
export type ActivityCriterion = { id: string; criterion_text: string; competency_id: string | null; competency_v4_id: string | null; competency_text: string; performance_id: string | null; evidence_kind: EvidenceKind | null; details?: { competency_id?: string; expected_evidence?: string; acceptable_evidence_variations?: string[]; observation_focus?: string[]; evidence_scope?: "individual" | "group" | "mixed"; teacher_caution?: string } };

export type LocalDashboard = {
  activity: {
    id: string;
    title: string;
    purpose: string;
    occurs_on: string;
    experience_title: string;
    criteria: ActivityCriterion[];
  } | null;
  students: LocalStudent[];
  metrics: { students_total: number; evidences_week: number; students_observed: number };
  today: {
    past_pending?: {id:string;title:string;date:string;display_status:string}[];
    qa_clock?: { date: string; time: string };
    date: string; now: string;
    attendance: { recorded: boolean; recorded_count: number };
    calendar_exception: { type: string; label: string; is_instructional: boolean } | null;
    journey: { mode: string; current_block_id: string | null; next_block_id: string | null; primary_action: string; pending_items: string[] };
    blocks: { day_progress?:{position:number;total:number}|null; pedagogical_blocks?: import("../features/dashboard/components/pedagogical-block").PedagogicalBlockData[]; id: string; start_time: string; end_time: string; block_type: string; title: string; activity_id: string | null; purpose: string | null; activity_details: { opening?: string; development?: string; closure?: string; workshop_type?: string } | null; experience_title: string | null; materials: string[]; steps: string[]; criteria: ActivityCriterion[]; status: string; display_status: string; current_override: boolean; current_step_index: number; closure_type: string | null }[];
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
  reviewed: boolean;
  step_progress: { observed_student_count: number; group_review_confirmed: boolean };
  entries: { id: string; student_id: string; competency_id: string; teacher_confirmed: boolean; teacher_interpretation: string | null }[];
  observations: { id: string; student_id: string; competency_id: string; reference_id: string; status: string; note: string | null }[];
  experiences: {
    id: string; title: string; explanation: string; pedagogical_blocks?: import("../features/dashboard/components/pedagogical-block").PedagogicalBlockData[]; teacher_instructions: string; examples: string[]; catalog_version: string; catalog_status: string;
    competencies: { id: string; name: string }[];
    aspects: { id: string; competency_id: string; competency_name: string; area_name: string; label: string; prompt: string; examples: string[]; age_reference: string }[];
  }[];
  experience_observations: {
    id: string; student_id: string; experience_id: string; aspect_id: string;
    competency_v4_id: string; observation_status: DiagnosticObservationStatus;
    observation_text: string | null; observed_at: string;
  }[];
  experience_coverage: {
    experience_id: string; students_with_records: number; students_with_information: number;
    competency_coverage: { competency_id: string; students_with_information: number }[];
  }[];
};

export type DiagnosticSynthesisDetails = { information_status: "information_available" | "insufficient_information"; summary_text: string; next_observation: string };
export type DiagnosticStudentReviewDetails = { information_status: "information_available" | "insufficient_information"; comment_text: string };
export type DiagnosticCompetencyPriority = { competency_id: string; emphasis: "prioritize" | "maintain" | "observe_more"; reason: string };
export type DiagnosticGroupDetails = { strengths: string; needs: string; planning_priorities: string; competency_priorities?: DiagnosticCompetencyPriority[] };
export type DiagnosticAnnualPriority = { title: string; reason: string; related_competency_ids: string[]; importance: "higher" | "normal" | "observe_more" };
export type DiagnosticPriorityDetails = { priorities: DiagnosticAnnualPriority[] };
export type DiagnosticReviewWorkspace = {
  students: (LocalStudent & { initial_context: string | null; family_context: ({ version: number } & Record<string, string | number>) | null; unclassified_observations: number })[];
  observations: { id: string; student_id: string; competency_v4_id: string | null; experience_id: string; aspect_id: string; catalog_version: string; experience_title: string; aspect_prompt: string; observation_status: DiagnosticObservationStatus; observation_text: string | null; observed_at: string; has_media?: boolean }[];
  reviews: { id: string; student_id: string; competency_v4_id: string; version: number; status: "draft" | "confirmed"; details: DiagnosticSynthesisDetails; teacher_confirmed_at: string | null; updated_at: string }[];
  student_reviews: { id: string; student_id: string; version: number; status: "draft" | "confirmed"; details: DiagnosticStudentReviewDetails; teacher_confirmed_at: string | null; is_current: boolean }[];
  pending_observations: { id: string; student_id: string; context_label: string; observation_text: string | null; observed_at: string; has_media?: boolean }[];
  group_reviews: { id: string; version: number; status: "draft" | "confirmed"; details: DiagnosticGroupDetails; teacher_confirmed_at: string | null; is_current: boolean }[];
  priority_reviews: { id: string; group_review_id: string; version: number; status: "draft" | "confirmed"; details: DiagnosticPriorityDetails; teacher_confirmed_at: string | null }[];
  group_coverage: { competency_id: string; competency_name: string; children_with_observations: number; confirmed_with_information: number; confirmed_insufficient: number; children_without_observations: number }[];
  derived_group_information: { confirmed_interviews: number; interests: { key: string; label: string; count: number }[]; observation_gaps: { competency_id: string; competency_name: string; children_with_observations: number; children_without_observations: number }[] };
};

export type FamilyInterviewAnswerKey = "family_context" | "language_context" | "interests" | "autonomy_context" | "communication_emotional_context" | "social_context" | "adaptation_context" | "previous_education" | "daily_routine_context" | "family_expectations";
export type FamilyInterviewDetails = Partial<Record<FamilyInterviewAnswerKey, string>> & {
  language_tags?: string[]; primary_language_tag?: string; other_language_text?: string;
  interest_tags?: string[]; other_interest_text?: string;
  communication_context?: string; emotional_support_context?: string;
  home_activity_example?: string; family_community_context?: string; family_community_enjoyed?: string;
  participation_support_context?: string; family_expectation?: string;
  autonomy_routines?: { id: string; level: "alone" | "sometimes" | "much_help" }[];
  home_language_uses?: { language_tag: string; with_whom: string }[];
  communication_tags?: string[]; emotional_support_tags?: string[]; social_play_tags?: string[];
  home_activity_tags?: string[]; community_tags?: string[]; other_community_text?: string;
  participation_support_tags?: string[];
  previous_education_status?: "yes" | "no" | "unknown";
  previous_education_type?: "nursery" | "kindergarten" | "daycare" | "other";
  structured_options_version?: number;
};
export const familyContextLabels: Record<string, string> = {
  language_context: "Lenguas en casa", interests: "Intereses", autonomy_context: "Autonomía",
  communication_emotional_context: "Comunicación y emociones", social_context: "Relación con otros",
  adaptation_context: "Rutinas que dan seguridad", previous_education: "Experiencias educativas anteriores",
  communication_context: "Comunicación según la familia", emotional_support_context: "Qué le ayuda a sentirse mejor",
  home_activity_example: "Ejemplo de juego en casa", family_community_context: "Vida familiar y comunitaria",
  family_community_enjoyed: "Experiencia que disfruta", participation_support_context: "Apoyos para participar",
  family_expectation: "Expectativa familiar",
};
export type AiUsageSummary = {
  month: string; pricingVersion: string;
  total: { calls: number; unpricedCalls: number; estimatedCalls: number; costUsd: number };
  currentMonth: { calls: number; unpricedCalls: number; estimatedCalls: number; costUsd: number };
  breakdown: { provider: string; workflow: string; model: string; calls: number; unpricedCalls: number; estimatedCalls: number;
    costUsd: number; monthCalls: number; monthUnpricedCalls: number; monthEstimatedCalls: number; monthCostUsd: number }[];
};
export type FamilyInterview = { id: string; student_id: string; version: number; status: "draft" | "confirmed"; details: FamilyInterviewDetails; has_attachment: boolean; updated_at: string; teacher_confirmed_at: string | null };
export type FamilyInterviewStatus = "not_started" | "partial" | "confirmed";
export type ObservationRecommendationState = "pending" | "suggested" | "privacy_blocked" | "missing_text" | "insufficient_information" | "unavailable" | "teacher_confirmed" | "teacher_unclassified";
export type SpontaneousObservation = { source_revision: number; id: string; student_id: string; context_label: string; observation_text: string | null; support_status: "yes" | "no" | "unknown" | null; observed_at: string; classification_status: "pending" | "classified" | "needs_review"; classification_source: "jev" | "openai" | "teacher" | null; classifier_version: string | null; classifier_status: "pending" | "suggested" | "abstained" | "missing_text" | "failed" | "disabled" | null; recommendation_state: ObservationRecommendationState; competency_v4_id: string | null; secondary_competency_v4_id: string | null; competency_v4_ids: string[]; suggested_competency_v4_ids: string[]; has_media: boolean; media_mime_type: string | null };

export const localDatabaseApiUrl = process.env.NEXT_PUBLIC_AYNI_API_URL || process.env.NEXT_PUBLIC_LOCAL_DATABASE_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8788");
const apiUrl = localDatabaseApiUrl;

export async function loadLocalDashboard(signal?: AbortSignal): Promise<LocalDashboard> {
  const response = await apiFetch(`${apiUrl}/api/dashboard`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("La base local no está disponible.");
  return response.json();
}

export async function loadAiUsageSummary(): Promise<AiUsageSummary> {
  const response = await apiFetch(`${apiUrl}/api/ai-usage`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar el uso de IA.");
  return response.json();
}

export async function loadPilotSetup(): Promise<{ configured: boolean }> {
  const response = await apiFetch(`${apiUrl}/api/pilot/setup`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar la configuración del aula.");
  return response.json();
}

export async function savePilotSetup(input: { teacherName: string; institutionName: string; section: string; institutionCode?: string; district?: string; ugel?: string; directorName?: string; age: number; year: number; startsOn: string; endsOn: string; castellanoL2Applicable: boolean; religionApplicable: boolean; createLogo?: boolean; logoInitials?: string; logoPrimary?: string; logoAccent?: string; logoUpload?: { mimeType: "image/png" | "image/jpeg" | "image/webp"; base64: string } }): Promise<LocalDashboard> {
  const response = await apiFetch(`${apiUrl}/api/pilot/setup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json() as { dashboard?: LocalDashboard; error?: string };
  if (!response.ok || !result.dashboard) throw new Error(result.error ?? "No se pudo configurar el aula.");
  return result.dashboard;
}

export async function importPilotStudents(input: { csv: string } | { students: { firstName: string; lastName: string; preferredName?: string; birthDate?: string }[] }): Promise<LocalDashboard> {
  const response = await apiFetch(`${apiUrl}/api/students/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json() as { dashboard?: LocalDashboard; error?: string };
  if (!response.ok || !result.dashboard) throw new Error(result.error ?? "No se pudieron cargar los niños.");
  return result.dashboard;
}

export async function loadStudentPedagogicalProfile(studentId: string): Promise<StudentPedagogicalProfile> {
  const response = await apiFetch(`${apiUrl}/api/students/${studentId}`, { cache: "no-store" });
  const payload = await response.json() as StudentPedagogicalProfile & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el perfil del niño.");
  return payload;
}

export async function loadLocalStatistics(): Promise<LocalStatistics> {
  const response = await apiFetch(`${apiUrl}/api/statistics`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron calcular las estadísticas locales.");
  return response.json();
}

export type PublicClassroomContext = {
  version: string; age_group: number; students_total: number; confirmed_interviews: number;
  languages: { key: string; label: string; count: number }[];
  primary_languages: { key: string; label: string; count: number }[];
  common_interests: { key: string; label: string; count: number }[];
  community_opportunities?: { key: string; label: string; count: number }[];
  planning_interests?: string[]; planning_opportunities?: string[]; planning_language_context?: string | null;
  previous_education: Record<string, number>;
  confirmed_diagnostic_summary: string | null;
  diagnostic_coverage: { students_with_observations: number };
  diagnostic_review_current: boolean;
  observation_gaps: { competency_id: string; competency_name: string; children_with_observations: number; children_without_observations: number }[];
  source_fingerprint: string;
};

export async function loadClassroomContext(): Promise<PublicClassroomContext> {
  const response = await apiFetch(`${apiUrl}/api/classroom/context`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el panorama del grupo.");
  return response.json();
}

export async function createLocalEvidence(input: {
  studentId: string;
  activityId: string;
  criterionId: string;
  observationStatus?: ObservationStatus | null;
  observationText?: string;
  photo?: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" };
  media?: PrivateMediaUpload;
}) {
  const response = await apiFetch(`${apiUrl}/api/evidences`, {
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
  const response = await apiFetch(`${apiUrl}${path}`, {
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
  logoUpload?: { mimeType: "image/png" | "image/jpeg" | "image/webp"; base64: string };
}): Promise<LocalDashboard> {
  const response = await apiFetch(`${apiUrl}/api/profile`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; dashboard?: LocalDashboard };
  if (!response.ok || !payload.dashboard) throw new Error(payload.error ?? "No se pudo guardar el perfil.");
  return payload.dashboard;
}

export async function loadDiagnostics(): Promise<DiagnosticWorkspace> {
  const response = await apiFetch(`${apiUrl}/api/diagnostics`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el diagnóstico local.");
  return response.json();
}

export async function completeDiagnosticReview(): Promise<DiagnosticWorkspace> {
  const response = await apiFetch(`${apiUrl}/api/diagnostics/complete`, { method: "POST" });
  const payload = await response.json() as { error?: string; workspace?: DiagnosticWorkspace };
  if (!response.ok || !payload.workspace) throw new Error(payload.error ?? "No se pudo guardar la revisión diagnóstica.");
  return payload.workspace;
}

export async function saveDiagnosticObservation(input: {
  studentId: string; competencyId: string; referenceId: string; referenceStatus: string;
  observationContext: string; observationText: string;
  teacherInterpretation: string; teacherConfirmed: boolean;
}): Promise<DiagnosticWorkspace> {
  const response = await apiFetch(`${apiUrl}/api/diagnostics`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; workspace?: DiagnosticWorkspace };
  if (!response.ok || !payload.workspace) throw new Error(payload.error ?? "No se pudo guardar el diagnóstico.");
  return payload.workspace;
}

export async function saveDiagnosticExperienceObservation(input: {
  studentId: string; experienceId: string; aspectId: string;
  observationStatus: DiagnosticObservationStatus; observationText?: string;
}): Promise<DiagnosticWorkspace> {
  const response = await apiFetch(`${apiUrl}/api/diagnostics/experience-observations`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const payload = await response.json() as { error?: string; workspace?: DiagnosticWorkspace };
  if (!response.ok || !payload.workspace) throw new Error(payload.error ?? "No se pudo guardar la observación.");
  return payload.workspace;
}

async function diagnosticRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await apiFetch(`${apiUrl}/api/diagnostics/${path}`, {
    method, cache: "no-store", ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo completar la revisión diagnóstica.");
  return payload;
}
export const loadDiagnosticReview = () => diagnosticRequest<DiagnosticReviewWorkspace>("reviews");
export const prepareDiagnosticSynthesis = (studentId: string, competencyId: string) => diagnosticRequest<{ id: string; details: DiagnosticSynthesisDetails }>("reviews/prepare", "POST", { studentId, competencyId });
export const saveDiagnosticSynthesis = (id: string, details: DiagnosticSynthesisDetails) => diagnosticRequest(`reviews/${encodeURIComponent(id)}`, "PUT", { details });
export const confirmDiagnosticSynthesis = (id: string) => diagnosticRequest(`reviews/${encodeURIComponent(id)}/confirm`, "POST");
export const prepareDiagnosticStudentReview = (studentId: string) => diagnosticRequest<{ id: string; student_id: string; details: DiagnosticStudentReviewDetails }>("student-reviews/prepare", "POST", { studentId });
export const suggestDiagnosticStudentReview = (draftId: string) => diagnosticRequest<{ details: DiagnosticStudentReviewDetails; supporting_observation_ids: string[] }>("student-reviews/suggest", "POST", { draftId });
export const saveDiagnosticStudentReview = (id: string, details: DiagnosticStudentReviewDetails) => diagnosticRequest(`student-reviews/${encodeURIComponent(id)}`, "PUT", { details });
export const confirmDiagnosticStudentReview = (id: string) => diagnosticRequest(`student-reviews/${encodeURIComponent(id)}/confirm`, "POST");
export const prepareDiagnosticGroup = () => diagnosticRequest<{ id: string; details: DiagnosticGroupDetails }>("group-review/prepare", "POST");
export const suggestDiagnosticGroup = (draftId: string) => diagnosticRequest<{ details: DiagnosticGroupDetails }>("group-review/suggest", "POST", { draftId });
export const saveDiagnosticGroup = (id: string, details: DiagnosticGroupDetails) => diagnosticRequest(`group-review/${encodeURIComponent(id)}`, "PUT", { details });
export const confirmDiagnosticGroup = (id: string) => diagnosticRequest(`group-review/${encodeURIComponent(id)}/confirm`, "POST");
export const prepareDiagnosticPriorities = () => diagnosticRequest<{ id: string; group_review_id: string; details: DiagnosticPriorityDetails }>("priorities/prepare", "POST");
export const suggestDiagnosticPriorities = (draftId: string) => diagnosticRequest<{ details: DiagnosticPriorityDetails }>("priorities/suggest", "POST", { draftId });
export const saveDiagnosticPriorities = (id: string, details: DiagnosticPriorityDetails) => diagnosticRequest(`priorities/${encodeURIComponent(id)}`, "PUT", { details });
export const confirmDiagnosticPriorities = (id: string) => diagnosticRequest(`priorities/${encodeURIComponent(id)}/confirm`, "POST");
export const saveDiagnosticInitialContext = (studentId: string, initialContext: string) => diagnosticRequest(`students/${encodeURIComponent(studentId)}/initial-context`, "PUT", { initialContext });

export const loadFamilyInterview = (studentId: string) => diagnosticRequest<{ draft: FamilyInterview | null; confirmed: FamilyInterview | null }>(`students/${encodeURIComponent(studentId)}/family-interview`);
export const loadFamilyInterviewStatuses = () => diagnosticRequest<{ students: { student_id: string; status: FamilyInterviewStatus }[] }>("family-interview-status");
export const saveFamilyInterview = (studentId: string, details: FamilyInterviewDetails) => diagnosticRequest<FamilyInterview>(`students/${encodeURIComponent(studentId)}/family-interview`, "PUT", { details });
export const saveAndConfirmFamilyInterview = (studentId: string, details: FamilyInterviewDetails) => diagnosticRequest<FamilyInterview>(`students/${encodeURIComponent(studentId)}/family-interview/save-and-confirm`, "POST", { details });
export const confirmFamilyInterview = (studentId: string) => diagnosticRequest<FamilyInterview>(`students/${encodeURIComponent(studentId)}/family-interview/confirm`, "POST");
export const attachFamilyInterview = (studentId: string, mimeType: string, base64: string) => diagnosticRequest<FamilyInterview>(`students/${encodeURIComponent(studentId)}/family-interview/attachment`, "POST", { mimeType, base64 });
export const familyInterviewAttachmentUrl = (studentId: string) => `${apiUrl}/api/diagnostics/students/${encodeURIComponent(studentId)}/family-interview/attachment`;
export const loadSpontaneousObservations = () => diagnosticRequest<{ observations: SpontaneousObservation[]; competencies: { id: string; name: string }[]; classifier_enabled: boolean }>("spontaneous-observations");
export const saveSpontaneousObservation = (input: { studentId: string; contextLabel: string; observationText: string; supportStatus?: "yes" | "no" | "unknown"; media?: PrivateMediaUpload; competencyIds?: string[]; observedAt?: string; clientRequestId?: string }) => diagnosticRequest<{ id: string; student_id: string; classification_status: "pending" }>("spontaneous-observations", "POST", input);
export const saveMatrixDiagnosticObservation = (input: { studentId: string; competencyId: string; contextLabel: string; observationText: string }) => diagnosticRequest<{ id: string; student_id: string; competency_v4_id: string }>("spontaneous-observations/matrix", "POST", input);
export const correctSpontaneousClassification = (id: string, competencyIds: string[]) => diagnosticRequest<{ id: string; student_id: string; classification_status: "classified" | "needs_review"; competency_v4_id: string | null; competency_v4_ids: string[] }>(`spontaneous-observations/${encodeURIComponent(id)}/classification`, "PUT", { competencyIds });
export const suggestSpontaneousCompetenciesWithAyni = (id: string) => diagnosticRequest<{ id: string; status: string; recommendation_state: ObservationRecommendationState }>(`spontaneous-observations/${encodeURIComponent(id)}/suggest`, "POST");
export const spontaneousObservationMediaUrl = (id: string) => `${apiUrl}/api/diagnostics/spontaneous-observations/${encodeURIComponent(id)}/media`;
export const evidenceMediaUrl = (id: string) => `${apiUrl}/api/period-evaluations/evidence/${encodeURIComponent(id)}/media`;
export async function transcribeShortAudio(input: { studentId?: string; scope?: "classroom"; context: string; audio: PrivateMediaUpload; purpose?: "observation" | "raw_observation" | "interview" | "teacher_comment" | "group_summary" }) {
  const response = await apiFetch(`${apiUrl}/api/audio/transcribe`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const result = await response.json() as { transcript?: string; improved_text?: string; error?: string };
  if (!response.ok || !result.improved_text) throw new Error(result.error ?? "No se pudo transcribir el audio.");
  return { transcript: result.transcript ?? "", improvedText: result.improved_text };
}
