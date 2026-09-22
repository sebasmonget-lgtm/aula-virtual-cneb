import { createHash } from "node:crypto";

const fields = ["competency_id", "information_status", "evidence_overview", "observable_patterns", "strengths_and_advances", "support_needs", "next_opportunities", "teacher_questions", "insufficiency_reason", "caution"];
const listFields = ["observable_patterns", "strengths_and_advances", "support_needs", "next_opportunities", "teacher_questions"];

export function validateAssessmentProposal(value, competencyId, evidenceCount) {
  if (!value || typeof value !== "object" || Array.isArray(value) || fields.some((key) => !(key in value)) || Object.keys(value).some((key) => !fields.includes(key))) throw new Error("La propuesta de análisis no cumple assessment-v1.");
  if (value.competency_id !== competencyId || !["sufficient", "insufficient"].includes(value.information_status)) throw new Error("La competencia o el estado informativo del análisis no coincide.");
  if (!["evidence_overview", "caution"].every((key) => typeof value[key] === "string" && value[key].trim())) throw new Error("Falta texto obligatorio del análisis.");
  if (listFields.some((key) => !Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string" || !item.trim()))) throw new Error("Las listas del análisis deben contener solo texto no vacío.");
  if (value.information_status === "insufficient" ? typeof value.insufficiency_reason !== "string" || !value.insufficiency_reason.trim() : value.insufficiency_reason !== null) throw new Error("La razón de información insuficiente no coincide con el estado.");
  if (evidenceCount < 2 && value.information_status !== "insufficient") throw new Error("Con una sola evidencia la información debe declararse insuficiente.");
  const prose = [value.evidence_overview, value.caution, value.insufficiency_reason, ...listFields.flatMap((key) => value[key])].filter(Boolean).join(" ");
  if (/\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|nota\s*(?:num[eé]rica|\d{1,2}(?:\/20)?)|ranking)\b|\d{1,3}\s*%\s*de\s*logro/i.test(prose)) throw new Error("El análisis no puede asignar niveles, notas ni porcentajes de logro.");
  return value;
}

export function neutralizeAssessmentText(value, names) {
  if (typeof value !== "string") return value;
  return names.filter((name) => typeof name === "string" && name.trim().length > 1).sort((a, b) => b.length - a.length).reduce((text, name) => text.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[estudiante]"), value);
}

export function sanitizeEvidenceForAssessment(evidence, knownNames = []) {
  return { observed_on: new Date(evidence.observed_at).toISOString(), activity_title: neutralizeAssessmentText(evidence.activity_title, knownNames), criterion_text: neutralizeAssessmentText(evidence.criterion_text, knownNames), observation_status: evidence.observation_status, observation_note: neutralizeAssessmentText(evidence.observation_text, knownNames) ?? null, media_available: Boolean(evidence.media_available) };
}

export function buildAssessmentInput({ age, competencyId, evidenceHistory, criteriaHistory = [], priorTeacherConclusions, contextChanges }) {
  return { workflow: "assessment", age, student_id: "current_student", competency_ids: [competencyId], teacher_request: "Analizar evidencias observadas para orientar la revisión docente.", evidence_history: evidenceHistory, criteria_history: criteriaHistory, ...(priorTeacherConclusions ? { prior_teacher_conclusions: priorTeacherConclusions } : {}), ...(contextChanges ? { context_changes: contextChanges } : {}) };
}

export function validateAssessmentPeriod(start, end, calendar) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  const calendarStart = calendar.starts_on instanceof Date ? calendar.starts_on.toISOString().slice(0, 10) : String(calendar.starts_on).slice(0, 10);
  const calendarEnd = calendar.ends_on instanceof Date ? calendar.ends_on.toISOString().slice(0, 10) : String(calendar.ends_on).slice(0, 10);
  if (!valid(start) || !valid(end) || start > end || start < calendarStart || end > calendarEnd) throw new Error("El periodo debe estar dentro del año escolar y en orden válido.");
}

export function evidenceFingerprint(evidence) {
  const normalized = [evidence.id, new Date(evidence.observed_at).toISOString(), evidence.observation_status, evidence.observation_text ?? "", Boolean(evidence.media_available), evidence.activity_title ?? "", evidence.criterion_text ?? "", evidence.details ?? null];
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function normalizeEvidenceSourceSnapshot(rows) {
  return rows.map((row) => ({ id: row.id, fingerprint: row.fingerprint ?? evidenceFingerprint(row) })).sort((a, b) => a.id.localeCompare(b.id));
}

export function sameEvidenceSourceSnapshot(previous = [], current = []) {
  return JSON.stringify(normalizeEvidenceSourceSnapshot(previous)) === JSON.stringify(normalizeEvidenceSourceSnapshot(current));
}

export const sameEvidenceSnapshot = sameEvidenceSourceSnapshot;
export const assessmentSourceSnapshot = normalizeEvidenceSourceSnapshot;

export async function loadAssessmentEvidence(db, { studentId, competencyId, periodStart, periodEnd }) {
  return (await db.query(`select e.id,e.observed_at,e.observation_status,e.observation_text,(e.media_path is not null) as media_available,a.title as activity_title,ac.criterion_text,ac.details from evidences e join activities a on a.id=e.activity_id join activity_criteria ac on ac.id=e.criterion_id where e.student_id=$1 and ac.competency_v4_id=$2 and e.observed_at >= $3::date and e.observed_at < ($4::date + interval '1 day') order by e.observed_at,e.id`, [studentId, competencyId, periodStart, periodEnd])).rows;
}
