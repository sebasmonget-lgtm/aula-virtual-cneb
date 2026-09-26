import { createHash } from "node:crypto";

const string = { type: "string", minLength: 1 };
const strings = { type: "array", items: string };
const entry = { type: "object", additionalProperties: false,
  required: ["competency_id", "assessment_focus", "relevant_evidence", "patterns_to_consider", "progress_signals",
    "support_signals", "insufficient_information_rules", "contradiction_handling", "context_considerations",
    "teacher_questions", "prohibited_inferences", "assessment_guidance"],
  properties: { competency_id: string, assessment_focus: string, relevant_evidence: strings,
    patterns_to_consider: strings, progress_signals: strings, support_signals: strings,
    insufficient_information_rules: strings, contradiction_handling: string, context_considerations: strings,
    teacher_questions: strings, prohibited_inferences: strings, assessment_guidance: string } };

export const ASSESSMENT_MASTER_OUTPUT_SCHEMA = { id: "assessment-master-v1", type: "object", additionalProperties: false,
  required: ["period_summary", "competencies"], properties: { period_summary: string,
    competencies: { type: "array", minItems: 1, items: entry } } };

const normalized = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
export function assessmentMasterSourceSnapshot(source) {
  const canonical = { evaluation_period_id: source.evaluation_period_id, starts_on: source.starts_on, ends_on: source.ends_on,
    competency_ids: [...new Set(source.competency_ids ?? [])].sort(),
    experience_revisions: [...(source.experience_revisions ?? [])].sort(),
    activity_revisions: [...(source.activity_revisions ?? [])].sort(),
    criterion_revisions: [...(source.criterion_revisions ?? [])].sort(),
    classroom_context_fingerprint: source.classroom_context_fingerprint ?? null };
  return { ...canonical, fingerprint: createHash("sha256").update(normalized(canonical)).digest("hex") };
}

export function validateAssessmentMaster(value, competencyIds) {
  if (!value || typeof value.period_summary !== "string" || !value.period_summary.trim() || !Array.isArray(value.competencies))
    throw new Error("El marco de evaluación no está completo.");
  const allowed = new Set(competencyIds), seen = new Set();
  if (value.competencies.length !== allowed.size) throw new Error("El marco debe incluir cada competencia trabajada una sola vez.");
  for (const row of value.competencies) {
    if (!allowed.has(row?.competency_id) || seen.has(row.competency_id)) throw new Error("El marco contiene una competencia inválida o repetida.");
    seen.add(row.competency_id);
    for (const key of ["assessment_focus", "contradiction_handling", "assessment_guidance"])
      if (typeof row[key] !== "string" || !row[key].trim()) throw new Error(`Falta ${key} en el marco de evaluación.`);
    for (const key of ["relevant_evidence", "patterns_to_consider", "progress_signals", "support_signals",
      "insufficient_information_rules", "context_considerations", "teacher_questions", "prohibited_inferences"])
      if (!Array.isArray(row[key]) || row[key].some((item) => typeof item !== "string" || !item.trim()))
        throw new Error(`El campo ${key} del marco es inválido.`);
  }
  return value;
}

export function assessmentMasterEntry(master, competencyId) {
  return master?.details?.competencies?.find((item) => item.competency_id === competencyId) ?? null;
}

export function buildAssessmentMasterInput({ age, competencyIds, classroomContext, calendar, sources }) {
  return { workflow: "assessment_master", age,
    teacher_request: "Construye un marco reutilizable para interpretar las evidencias del período. No analices estudiantes ni asignes niveles.",
    competency_ids: competencyIds, classroom_context: { ...classroomContext, assessment_master_sources: sources },
    assessment_master_sources: sources, calendar_context: calendar };
}
