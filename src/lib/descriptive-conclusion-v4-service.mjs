import { neutralizeAssessmentText, sanitizeEvidenceForAssessment } from "./assessment-v4-service.mjs";
import { stableFingerprint } from "./source-fingerprint-v4.mjs";

export const CONCLUSION_FIELDS = ["competency_id", "information_status", "conclusion_text", "progress_examples", "support_or_conditions", "next_steps", "insufficiency_reason", "caution"];

export function validateDescriptiveConclusion(value, competencyId, informationStatus) {
  if (!value || typeof value !== "object" || Array.isArray(value) || CONCLUSION_FIELDS.some((field) => !(field in value)) || Object.keys(value).some((field) => !CONCLUSION_FIELDS.includes(field))) throw new Error("La propuesta no cumple descriptive-conclusion-v1.");
  if (value.competency_id !== competencyId || value.information_status !== informationStatus) throw new Error("La competencia o el estado de información no coincide con el análisis confirmado.");
  if (typeof value.conclusion_text !== "string" || !value.conclusion_text.trim() || typeof value.caution !== "string" || !value.caution.trim()) throw new Error("La conclusión y la cautela son obligatorias.");
  for (const field of ["progress_examples", "support_or_conditions", "next_steps"]) if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== "string" || !item.trim())) throw new Error(`El campo ${field} debe ser una lista de texto.`);
  if (informationStatus === "insufficient" ? typeof value.insufficiency_reason !== "string" || !value.insufficiency_reason.trim() : value.insufficiency_reason !== null) throw new Error("La razón de información insuficiente no coincide con el análisis confirmado.");
  const prose = [value.conclusion_text, value.caution, value.insufficiency_reason, ...value.progress_examples, ...value.support_or_conditions, ...value.next_steps].filter(Boolean).join(" ");
  if (/\b(?:AD|A|B|C)\b/.test(prose) || /\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|nota\s*(?:num[eé]rica|\d{1,2}(?:\/20)?)|ranking)\b|\b\d{1,2}\/20\b|\d{1,3}\s*%|comparad[oa]\s+con\s+(?:sus\s+)?compa[ñn]er|m[aá]s\s+que\s+(?:otros\s+)?(?:ni[ñn]os|compa[ñn]eros)/i.test(prose)) throw new Error("La conclusión no puede asignar niveles, notas ni comparaciones entre niños.");
  if (/texto oficial (?:del\s*)?(?:minedu|cneb)/i.test(prose)) throw new Error("Una conclusión contextual no es texto oficial.");
  if (/\b(?:tiene d[eé]ficit|es incapaz|no puede|siempre|nunca)\b/i.test(value.conclusion_text)) throw new Error("La conclusión debe describir situaciones sin etiquetas personales ni absolutos.");
  if (informationStatus === "insufficient" && /\b(?:logr[oó]|domina|plenamente)\b/i.test([value.conclusion_text, ...value.progress_examples].join(" "))) throw new Error("No puede afirmarse un progreso firme con información insuficiente.");
  return value;
}

const dateTime = (value) => new Date(value).toISOString();
export function sourceAssessmentSnapshot(row) {
  const details = row.details ?? {};
  return { assessment_id: row.id, version: Number(row.version), updated_at: dateTime(row.updated_at), teacher_confirmed_at: dateTime(row.teacher_confirmed_at), information_status: details.information_status, achievement_level: row.achievement_level ?? null, details_hash: stableFingerprint(details) };
}

export function sameAssessmentSnapshot(previous, current) {
  return Boolean(previous && current) && ["assessment_id", "version", "updated_at", "teacher_confirmed_at", "information_status", "achievement_level", "details_hash"].every((field) => previous[field] === current[field]);
}

export function safeConfirmedAssessment(row, names = []) {
  const details = row.details;
  const clean = (value) => neutralizeAssessmentText(value, names);
  const cleanArray = (value) => (value ?? []).map(clean);
  return { information_status: details.information_status, evidence_overview: clean(details.evidence_overview), observable_patterns: cleanArray(details.observable_patterns), strengths_and_advances: cleanArray(details.strengths_and_advances), support_needs: cleanArray(details.support_needs), next_opportunities: cleanArray(details.next_opportunities) };
}

export function buildDescriptiveConclusionInput({ age, competencyId, assessment, assessmentMaster, analysisStatus, evidenceRows, knownNames = [], priorConclusion, teacherNotes }) {
  const confirmedFindings = assessment ? safeConfirmedAssessment(assessment, knownNames) : null;
  if (assessment && !assessment.achievement_level) throw new Error("La conclusión requiere una valoración confirmada por la docente.");
  return { workflow: "descriptive_conclusion", age, student_id: "current_student", competency_ids: [competencyId], teacher_request: confirmedFindings ? "Redacta una conclusión breve, concreta y comprensible, coherente con la valoración confirmada por la docente y sustentada únicamente en evidencias reales. No escribas la letra de la valoración dentro del texto." : `Proponer una conclusión descriptiva solo desde las evidencias. El análisis preliminar indica información ${analysisStatus === "sufficient" ? "suficiente" : "insuficiente"}; ninguna interpretación está confirmada por la docente.`, analysis_status: analysisStatus ?? confirmedFindings?.information_status, confirmed_achievement_level: assessment?.achievement_level ?? null, assessment_master: assessmentMaster, multiple_evidence_records: evidenceRows.map((row) => sanitizeEvidenceForAssessment(row, knownNames)), student_context: { id: "current_student", ...(confirmedFindings ? { teacher_confirmed_findings: confirmedFindings } : {}) }, ...(priorConclusion ? { prior_conclusion: neutralizeAssessmentText(priorConclusion, knownNames) } : {}), ...(teacherNotes?.trim() ? { teacher_notes: neutralizeAssessmentText(teacherNotes.trim(), knownNames) } : {}) };
}
