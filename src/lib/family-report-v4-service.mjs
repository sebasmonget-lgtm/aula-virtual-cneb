import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { stableFingerprint } from "./source-fingerprint-v4.mjs";

export const FAMILY_REPORT_FIELDS = ["introduction", "sections", "closing_note"];
export const FAMILY_REPORT_SECTION_FIELDS = ["competency_id", "information_status", "progress_summary", "examples", "support_or_conditions", "next_steps", "family_suggestions", "insufficiency_note"];
const listFields = ["examples", "support_or_conditions", "next_steps", "family_suggestions"];
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

export function validateFamilyReportPeriod(start, end, calendar) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const first = dateOnly(calendar.starts_on), last = dateOnly(calendar.ends_on);
  if (!valid(start) || !valid(end) || start > end || start < first || end > last) throw new Error("El periodo del informe debe estar dentro del año escolar y en orden válido.");
}

export function selectConfirmedConclusions(rows, competencyIds, periodStart, periodEnd) {
  const selected = [...new Set(competencyIds)];
  if (!selected.length || selected.length !== competencyIds.length || selected.some((id) => typeof id !== "string" || !id.trim())) throw new Error("Selecciona al menos una competencia confirmada sin duplicados.");
  const sources = rows.filter((row) => row.status === "active" && row.teacher_confirmed_at && selected.includes(row.competency_v4_id) && dateOnly(row.period_start) >= periodStart && dateOnly(row.period_end) <= periodEnd)
    .sort((a, b) => a.competency_v4_id.localeCompare(b.competency_v4_id) || dateOnly(a.period_start).localeCompare(dateOnly(b.period_start)) || a.id.localeCompare(b.id));
  if (selected.some((id) => !sources.some((row) => row.competency_v4_id === id))) throw new Error("Cada competencia seleccionada necesita una conclusión descriptiva confirmada dentro del periodo.");
  return sources;
}

export function conclusionSourceSnapshot(rows) {
  return rows.map((row) => ({ id: row.id, competency_id: row.competency_v4_id, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), version: Number(row.version), updated_at: new Date(row.updated_at).toISOString(), teacher_confirmed_at: new Date(row.teacher_confirmed_at).toISOString(), information_status: row.details.information_status, has_progress_examples: Array.isArray(row.details.progress_examples) && row.details.progress_examples.length > 0, details_hash: stableFingerprint(row.details) }))
    .sort((a, b) => a.competency_id.localeCompare(b.competency_id) || a.period_start.localeCompare(b.period_start) || a.id.localeCompare(b.id));
}

export function sameConclusionSourceSnapshot(previous, current) {
  if (!Array.isArray(previous) || !Array.isArray(current) || previous.length !== current.length) return false;
  const sort = (rows) => [...rows].sort((a, b) => a.competency_id.localeCompare(b.competency_id) || a.period_start.localeCompare(b.period_start) || a.id.localeCompare(b.id));
  const sortedCurrent = sort(current);
  return sort(previous).every((row, index) => ["id", "competency_id", "period_start", "period_end", "version", "updated_at", "teacher_confirmed_at", "information_status", "has_progress_examples", "details_hash"].every((field) => row[field] === sortedCurrent[index][field]));
}

export function reportInformationStatus(snapshot, competencyId) {
  return snapshot.some((source) => source.competency_id === competencyId && source.information_status === "insufficient") ? "insufficient" : "sufficient";
}

export function validateFamilyReport(output, competencyIds, sourceSnapshot) {
  if (!output || typeof output !== "object" || Array.isArray(output) || FAMILY_REPORT_FIELDS.some((field) => !(field in output)) || Object.keys(output).some((field) => !FAMILY_REPORT_FIELDS.includes(field))) throw new Error("El informe no cumple family-report-v1.");
  if (!["introduction", "closing_note"].every((field) => typeof output[field] === "string" && output[field].trim())) throw new Error("La introducción y la nota final son obligatorias.");
  if (!Array.isArray(output.sections) || output.sections.length !== competencyIds.length) throw new Error("El informe debe incluir exactamente las competencias seleccionadas.");
  const seen = new Set();
  for (const section of output.sections) {
    if (!section || typeof section !== "object" || Array.isArray(section) || FAMILY_REPORT_SECTION_FIELDS.some((field) => !(field in section)) || Object.keys(section).some((field) => !FAMILY_REPORT_SECTION_FIELDS.includes(field))) throw new Error("Una sección no cumple family-report-v1.");
    if (!competencyIds.includes(section.competency_id) || seen.has(section.competency_id)) throw new Error("El informe introduce una competencia no seleccionada o duplicada.");
    seen.add(section.competency_id);
    const expected = reportInformationStatus(sourceSnapshot, section.competency_id);
    if (section.information_status !== expected) throw new Error("El informe no conserva el estado de información confirmado.");
    if (typeof section.progress_summary !== "string" || !section.progress_summary.trim() || listFields.some((field) => !Array.isArray(section[field]) || section[field].some((item) => typeof item !== "string" || !item.trim()))) throw new Error("La sección contiene texto obligatorio inválido.");
    if (sourceSnapshot.some((source) => source.competency_id === section.competency_id && source.has_progress_examples) && section.examples.length === 0) throw new Error("La sección omite los ejemplos confirmados disponibles.");
    if (expected === "insufficient" ? typeof section.insufficiency_note !== "string" || !section.insufficiency_note.trim() : section.insufficiency_note !== null) throw new Error("La nota de información insuficiente no coincide con la fuente.");
    if (section.family_suggestions.some((item) => /\b(?:terapia|tratamiento|diagn[oó]stico|evaluar formalmente)\b/i.test(item))) throw new Error("Las sugerencias familiares no pueden prescribir tratamiento o evaluación formal.");
    if (expected === "insufficient" && /\b(?:logr[oó]|domina|plenamente|siempre)\b/i.test([section.progress_summary, ...section.examples].join(" "))) throw new Error("La información insuficiente no permite afirmar progreso firme.");
  }
  const prose = [output.introduction, output.closing_note, ...output.sections.flatMap((section) => [section.progress_summary, section.insufficiency_note, ...listFields.flatMap((field) => section[field])])].filter(Boolean).join(" ");
  const forbiddenGrades = /\bAD\b|\b(?:nivel|obtuvo|alcanz[oó]|recibi[oó])\s+(?:AD|A|B|C)\b|\b(?:nota\s*\d{1,2}|calificaci[oó]n|ranking|percentil(?:es)?|aprobado|desaprobado)\b|\b\d{1,2}\/20\b|\b(?:[0-9]|1[0-9]|20)\s*(?:puntos|sobre\s+20)\b|\d{1,3}\s*%|\bpor ciento\b/i;
  const forbiddenComparisons = /\bcomparad[oa]\s+con\s+(?:sus\s+)?compa[ñn]er|\b(?:m[aá]s|menos|mejor|peor|igual|por\s+encima|por\s+debajo)\s+que\s+(?:otros\s+|sus\s+)?(?:ni[ñn]os|compa[ñn]eros)|\b(?:promedio\s+del?\s+(?:sal[oó]n|aula)|(?:sal[oó]n|aula)\s+promedio)\b/i;
  if (forbiddenGrades.test(prose) || forbiddenComparisons.test(prose) || /\b(?:terapia|tratamiento|diagn[oó]stico)\b/i.test(prose)) throw new Error("El informe no puede incluir notas, rankings, porcentajes, diagnósticos ni comparaciones.");
  if (/\b(?:tiene d[eé]ficit|es incapaz|no puede|siempre|nunca)\b/i.test(prose)) throw new Error("El informe debe evitar etiquetas y afirmaciones absolutas.");
  return output;
}

export function buildFamilyReportInput({ age, competencyIds, conclusions, knownNames = [], castellanoL2Applicable = false, religionApplicable = false }) {
  const clean = (value) => neutralizeAssessmentText(value, knownNames);
  const findings = conclusions.filter((row) => competencyIds.includes(row.competency_v4_id)).map((row) => ({ competency_id: row.competency_v4_id, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), information_status: row.details.information_status, conclusion_text: clean(row.details.conclusion_text), progress_examples: (row.details.progress_examples ?? []).map(clean), support_or_conditions: (row.details.support_or_conditions ?? []).map(clean), next_steps: (row.details.next_steps ?? []).map(clean), insufficiency_reason: clean(row.details.insufficiency_reason), caution: clean(row.details.caution) }));
  return { workflow: "family_report", age, competency_ids: competencyIds, castellano_l2_applicable: castellanoL2Applicable, religion_applicable: religionApplicable, teacher_request: "Comunicar a la familia solo las conclusiones descriptivas confirmadas seleccionadas, con lenguaje claro y prudente.", student_context: { id: "current_student", teacher_confirmed_findings: findings } };
}
