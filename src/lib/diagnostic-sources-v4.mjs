import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { cardIsApplicable } from "./ai-context-builder-v4.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { familyInterviewCategories, familyInterviewStructuredOptionsVersion, interviewLanguageOptions, interviewInterestOptions, interviewPreviousEducationOptions, interviewPreviousEducationTypeOptions } from "./family-interview-contract.mjs";

export class DiagnosticSourceError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticSourceError"; this.reason = reason; }
}
const fail = (reason, message) => { throw new DiagnosticSourceError(reason, message); };
const legacyInterviewFields = Object.freeze(["home_languages", "routines", "autonomy", "communication",
  "food_routine", "sleep_routine", "prior_education", "living_together", "family_notes"]);
const permittedContextFields = Object.freeze([
  "language_context", "interests", "autonomy_context", "communication_emotional_context",
  "social_context", "adaptation_context", "previous_education",
]);

export function normalizeFamilyInterviewDetails(value) {
  const result = { ...value };
  const move = (oldKey, newKey) => { if (!result[newKey] && result[oldKey]) result[newKey] = result[oldKey]; delete result[oldKey]; };
  move("home_languages", "language_context");
  move("routines", "adaptation_context");
  move("autonomy", "autonomy_context");
  move("communication", "communication_emotional_context");
  move("prior_education", "previous_education");
  move("living_together", "social_context");
  if (!result.daily_routine_context) result.daily_routine_context = [
    result.food_routine && `Alimentación: ${result.food_routine}`,
    result.sleep_routine && `Descanso: ${result.sleep_routine}`,
  ].filter(Boolean).join("\n");
  if (result.family_notes) result.family_expectations = [result.family_expectations, `Comentario adicional: ${result.family_notes}`].filter(Boolean).join("\n");
  delete result.food_routine; delete result.sleep_routine; delete result.family_notes;
  return Object.fromEntries(Object.entries(result).filter(([, answer]) => answer));
}

export function validateFamilyInterviewDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_interview", "La entrevista debe contener respuestas por campo.");
  if (Object.keys(value).some((key) => ![...familyInterviewCategories, ...legacyInterviewFields,
    "language_tags", "primary_language_tag", "other_language_text", "interest_tags", "other_interest_text",
    "previous_education_status", "previous_education_type", "structured_options_version"].includes(key))) fail("invalid_interview", "La entrevista contiene un campo no permitido.");
  if (value.structured_options_version != null && value.structured_options_version !== familyInterviewStructuredOptionsVersion)
    fail("invalid_interview", "La versión de opciones de la entrevista no es compatible.");
  const result = {};
  for (const field of [...familyInterviewCategories, ...legacyInterviewFields]) {
    const answer = value[field];
    if (answer == null || answer === "") continue;
    if (typeof answer !== "string" || answer.trim().length > 2000) fail("invalid_interview", `Revisa la respuesta de ${field}.`);
    if (answer.trim()) result[field] = answer.trim();
  }
  for (const [field, options] of [["language_tags", interviewLanguageOptions], ["interest_tags", interviewInterestOptions]]) {
    if (value[field] == null) continue;
    const allowed = new Set(options.map((item) => item.id));
    if (!Array.isArray(value[field]) || value[field].length > options.length || value[field].some((tag) => !allowed.has(tag)))
      fail("invalid_interview", `Revisa las opciones de ${field}.`);
    const tags = [...new Set(value[field])].sort();
    if (tags.length) result[field] = tags;
  }
  if (value.previous_education_status != null) {
    if (!interviewPreviousEducationOptions.some((option) => option.id === value.previous_education_status))
      fail("invalid_interview", "Revisa la experiencia educativa previa.");
    result.previous_education_status = value.previous_education_status;
  }
  if (value.primary_language_tag != null) {
    if (typeof value.primary_language_tag !== "string" || !result.language_tags?.includes(value.primary_language_tag))
      fail("invalid_interview", "La lengua principal debe estar entre las lenguas seleccionadas.");
    result.primary_language_tag = value.primary_language_tag;
  }
  for (const [field, tagField] of [["other_language_text", "language_tags"], ["other_interest_text", "interest_tags"]]) {
    const answer = value[field];
    if (answer == null || answer === "") continue;
    if (typeof answer !== "string" || answer.trim().length > 200 || !result[tagField]?.includes("other"))
      fail("invalid_interview", `Selecciona «Otro» antes de completar ${field}.`);
    if (answer.trim()) result[field] = answer.trim();
  }
  if (value.previous_education_type != null) {
    if (result.previous_education_status !== "yes" || !interviewPreviousEducationTypeOptions.some((option) => option.id === value.previous_education_type))
      fail("invalid_interview", "El tipo de experiencia previa requiere la respuesta «Sí».");
    result.previous_education_type = value.previous_education_type;
  }
  if (["language_tags", "primary_language_tag", "other_language_text", "interest_tags", "other_interest_text",
    "previous_education_status", "previous_education_type"].some((field) => result[field] != null))
    result.structured_options_version = familyInterviewStructuredOptionsVersion;
  return normalizeFamilyInterviewDetails(result);
}

export function safeFamilyContext(details) {
  const normalized = normalizeFamilyInterviewDetails(details ?? {});
  return Object.fromEntries([...permittedContextFields, "language_tags", "primary_language_tag", "other_language_text",
    "interest_tags", "other_interest_text", "previous_education_status", "previous_education_type", "structured_options_version"]
    .filter((field) => normalized[field]).map((field) => [field, normalized[field]]));
}

async function scope(db, teacherId) {
  const classroom = (await db.query(`select c.id, ag.age_years, c.castellano_l2_applicable, c.religion_applicable
    from classrooms c join age_grades ag on ag.id = c.age_grade_id
    where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0];
  if (!classroom) fail("no_classroom", "No hay un aula activa.");
  return classroom;
}
async function studentInScope(db, classroomId, studentId) {
  const row = (await db.query(`select id from students where id = $1 and classroom_id = $2 and status = 'active'`, [studentId, classroomId])).rows[0];
  if (!row) fail("invalid_student", "El niño no pertenece al aula activa.");
  return row;
}
async function interviewRow(db, classroomId, studentId, status) {
  return (await db.query(`select i.*,exists(select 1 from student_family_interview_attachments a where a.interview_id=i.id) as has_attachment
    from student_family_interviews i where i.classroom_id = $1 and i.student_id = $2
    ${status ? "and status = $3" : ""} order by version desc limit 1`, status ? [classroomId, studentId, status] : [classroomId, studentId])).rows[0] ?? null;
}
export function publicInterview(row) {
  return row && { id: row.id, student_id: row.student_id, version: row.version, status: row.status,
    details: normalizeFamilyInterviewDetails(row.details ?? {}), has_attachment: Boolean(row.has_attachment), updated_at: row.updated_at,
    teacher_confirmed_at: row.teacher_confirmed_at };
}
export async function loadFamilyInterview(db, teacherId, studentId) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, studentId);
  return { draft: publicInterview(await interviewRow(db, classroom.id, studentId, "draft")),
    confirmed: publicInterview(await interviewRow(db, classroom.id, studentId, "confirmed")) };
}
export async function listFamilyInterviewStatuses(db, teacherId) {
  const classroom = await scope(db, teacherId);
  const rows = (await db.query(`select s.id as student_id,
      case when bool_or(i.status = 'draft' and i.details <> '{}'::jsonb) then 'partial'
           when bool_or(i.status = 'confirmed' and i.details <> '{}'::jsonb) then 'confirmed'
           else 'not_started' end as status
    from students s left join student_family_interviews i
      on i.student_id = s.id and i.classroom_id = s.classroom_id
    where s.classroom_id = $1 and s.status = 'active'
    group by s.id order by s.id`, [classroom.id])).rows;
  return { students: rows };
}
export async function saveFamilyInterview(db, teacherId, studentId, details) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, studentId);
  const validated = validateFamilyInterviewDetails(details);
  const draft = await interviewRow(db, classroom.id, studentId, "draft");
  if (draft) {
    const updated = await db.query(`update student_family_interviews set details=$1::jsonb,updated_at=now()
      where id=$2 and classroom_id=$3 and created_by=$4 and status='draft' returning *`,
      [JSON.stringify(validated), draft.id, classroom.id, teacherId]);
    return publicInterview({ ...updated.rows[0], has_attachment: draft.has_attachment });
  }
  const version = (await db.query(`select coalesce(max(version),0)::int+1 as next from student_family_interviews where student_id=$1`, [studentId])).rows[0].next;
  const saved = await db.query(`insert into student_family_interviews(id,classroom_id,student_id,version,status,details,created_by)
    values($1,$2,$3,$4,'draft',$5::jsonb,$6) returning *`, [randomUUID(), classroom.id, studentId, version, JSON.stringify(validated), teacherId]);
  return publicInterview(saved.rows[0]);
}
export async function confirmFamilyInterview(db, teacherId, studentId) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, studentId);
  const draft = await interviewRow(db, classroom.id, studentId, "draft");
  if (!draft) fail("missing_draft", "Guarda la entrevista antes de confirmarla.");
  validateFamilyInterviewDetails(draft.details);
  const confirmed = await db.query(`update student_family_interviews set status='confirmed',teacher_confirmed_at=now(),updated_at=now()
    where id=$1 and classroom_id=$2 and created_by=$3 and status='draft' returning *`, [draft.id, classroom.id, teacherId]);
  if (!confirmed.rows.length) fail("not_editable", "La entrevista ya no es editable.");
  return publicInterview({ ...confirmed.rows[0], has_attachment: draft.has_attachment });
}
export async function attachFamilyInterview(db, teacherId, studentId, storagePath, mimeType) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, studentId);
  const interview = await interviewRow(db, classroom.id, studentId, "draft") ?? await interviewRow(db, classroom.id, studentId, "confirmed");
  const extension = storagePath?.split(".").at(-1)?.toLowerCase();
  if (!interview || !/^family-interview\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.(pdf|jpg|png)$/i.test(storagePath)
    || !storagePath.startsWith(`family-interview/${teacherId}/${studentId}/`)
    || ({ pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" })[extension] !== mimeType) fail("invalid_attachment", "Guarda primero la entrevista.");
  await db.query("begin");
  try {
    const replaced = (await db.query(`delete from student_family_interview_attachments
      where interview_id=$1 and classroom_id=$2 and student_id=$3 and created_by=$4 returning storage_path`,
      [interview.id,classroom.id,studentId,teacherId])).rows.map((row) => row.storage_path);
    await db.query(`insert into student_family_interview_attachments
      (id,classroom_id,student_id,interview_id,storage_path,mime_type,created_by)
      values($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(),classroom.id,studentId,interview.id,storagePath,mimeType,teacherId]);
    await db.query("commit");
    return { ...publicInterview({ ...interview, has_attachment: true }), replaced_storage_paths: replaced };
  } catch (error) { await db.query("rollback"); throw error; }
}
export async function familyInterviewAttachmentPath(db, teacherId, studentId) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, studentId);
  return (await db.query(`select storage_path from student_family_interview_attachments
    where classroom_id=$1 and student_id=$2 order by created_at desc,id desc limit 1`, [classroom.id, studentId])).rows[0]?.storage_path ?? null;
}

export async function applicableDiagnosticCompetencies(classroom) {
  return (await loadKnowledgeBaseV4()).competencyCards.filter((card) =>
    card.runtime_selectable_by_age?.[String(classroom.age_years)] && cardIsApplicable(card, {
      castellanoL2Applicable: classroom.castellano_l2_applicable,
      religionApplicable: classroom.religion_applicable,
    })).map((card) => ({ id: card.id, name: card.official_name }));
}

export async function recordSpontaneousObservation(db, teacherId, input) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, input?.studentId);
  const { context, note } = validatedSpontaneousNote(input);
  if (input.supportStatus != null && !["no", "yes", "unknown"].includes(input.supportStatus))
    fail("invalid_observation", "Indica dónde ocurrió y qué hizo o dijo el niño.");
  const id = randomUUID();
  await db.query(`insert into diagnostic_spontaneous_observations
    (id,classroom_id,student_id,context_label,observation_text,support_status,created_by)
    values($1,$2,$3,$4,$5,$6,$7)`, [id,classroom.id,input.studentId,context,note,input.supportStatus ?? null,teacherId]);
  return { id, student_id: input.studentId, classification_status: "pending" };
}

function validatedSpontaneousNote(input) {
  const context = typeof input?.contextLabel === "string" ? input.contextLabel.trim() : "";
  const note = typeof input?.observationText === "string" ? input.observationText.trim() : "";
  if (!context || context.length > 120 || !note || note.length > 4000)
    fail("invalid_observation", "Indica dónde ocurrió y qué hizo o dijo el niño.");
  return { context, note };
}

/** A matrix cell records a factual observation with the competency explicitly chosen by the teacher. */
export async function recordMatrixDiagnosticObservation(db, teacherId, input) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, input?.studentId);
  const allowed = new Set((await applicableDiagnosticCompetencies(classroom)).map((item) => item.id));
  if (!allowed.has(input?.competencyId)) fail("invalid_competency", "La competencia no es aplicable al aula.");
  const { context, note } = validatedSpontaneousNote(input);
  const id = randomUUID();
  const saved = (await db.query(`insert into diagnostic_spontaneous_observations
    (id,classroom_id,student_id,context_label,observation_text,created_by,
      classification_status,classification_source,competency_v4_id,classified_at)
    values($1,$2,$3,$4,$5,$6,'classified','teacher',$7,now())
    returning id,student_id,competency_v4_id,context_label,observation_text,observed_at`,
    [id,classroom.id,input.studentId,context,note,teacherId,input.competencyId])).rows[0];
  return saved;
}

export function validateClassifierDecision(decision, allowedIds) {
  const ids = new Set(allowedIds);
  const primary = decision?.primary_competency ?? null;
  const secondary = decision?.optional_secondary_candidate ?? null;
  const confidence = decision?.confidence;
  const valid = (primary === null || ids.has(primary)) && (secondary === null || (ids.has(secondary) && secondary !== primary))
    && typeof confidence === "number" && confidence >= 0 && confidence <= 1 && typeof decision?.needs_review === "boolean";
  if (!valid) fail("invalid_classification", "El clasificador devolvió una competencia o confianza inválida.");
  return { status: "needs_review",
    primary, secondary, confidence };
}

/** Only a TypeSafe/Jev-compatible decision adapter is accepted; it never evaluates achievement. */
export async function classifySpontaneousObservation(db, teacherId, id, classifier) {
  const classroom = await scope(db, teacherId);
  const observation = (await db.query(`select * from diagnostic_spontaneous_observations where id=$1 and classroom_id=$2 and created_by=$3`, [id,classroom.id,teacherId])).rows[0];
  if (!observation) fail("not_found", "Observación no encontrada.");
  if (observation.classification_source === "teacher") return { id, status: "teacher_preserved" };
  const options = await applicableDiagnosticCompetencies(classroom);
  const plan = resolveAIExecutionPlan({ workflow: "diagnostic", task: "workflow_classification" });
  if (plan.provider !== "typesafe" || plan.capability !== "decision") fail("invalid_routing", "La clasificación requiere el router de decisiones.");
  const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [classroom.id])).rows
    .flatMap((row) => [row.first_name, row.last_name, row.preferred_name]).filter(Boolean);
  const decision = await classifier.classify({ plan, observation: neutralizeAssessmentText(observation.observation_text, names),
    context: observation.context_label, age: classroom.age_years, options });
  const validated = validateClassifierDecision(decision, options.map((item) => item.id));
  const updated = await db.query(`update diagnostic_spontaneous_observations set
    classification_status=$1,classification_source='jev',competency_v4_id=$2,
    secondary_competency_v4_id=$3,classification_confidence=$4,classification_reason=$5,classified_at=now()
    where id=$6 and classroom_id=$7 and created_by=$8 and classification_source is distinct from 'teacher' returning id`,
    [validated.status,validated.primary,validated.secondary,validated.confidence,
      validated.status === "needs_review" ? "Clasificación ambigua o con baja confianza" : null,
      id,classroom.id,teacherId]);
  return { id, status: updated.rows.length ? validated.status : "teacher_preserved" };
}

export async function markSpontaneousNeedsReview(db, teacherId, id) {
  const classroom = await scope(db, teacherId);
  await db.query(`update diagnostic_spontaneous_observations set classification_status='needs_review',
    classification_reason='Clasificador no disponible o respuesta inválida'
    where id=$1 and classroom_id=$2 and created_by=$3 and classification_source is distinct from 'teacher'
      and classification_status='pending'`, [id,classroom.id,teacherId]);
}

export async function correctSpontaneousClassification(db, teacherId, id, competencyId) {
  const classroom = await scope(db, teacherId);
  const allowed = new Set((await applicableDiagnosticCompetencies(classroom)).map((item) => item.id));
  if (competencyId !== null && !allowed.has(competencyId)) fail("invalid_competency", "La competencia no es aplicable al aula.");
  const updated = await db.query(`update diagnostic_spontaneous_observations set classification_status=$1,
    classification_source='teacher',competency_v4_id=$2,secondary_competency_v4_id=null,
    classification_confidence=null,classification_reason=null,classified_at=now()
    where id=$3 and classroom_id=$4 and created_by=$5 returning id,student_id,classification_status,competency_v4_id`,
    [competencyId ? "classified" : "needs_review",competencyId,id,classroom.id,teacherId]);
  if (!updated.rows.length) fail("not_found", "Observación no encontrada.");
  return updated.rows[0];
}

export async function loadSpontaneousObservations(db, teacherId) {
  const classroom = await scope(db, teacherId);
  const observations = (await db.query(`select o.id,o.student_id,o.context_label,o.observation_text,o.support_status,
    o.observed_at,o.classification_status,o.classification_source,o.competency_v4_id,o.secondary_competency_v4_id
    from diagnostic_spontaneous_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    where o.classroom_id=$1 and s.status='active' order by o.observed_at desc,o.id desc`, [classroom.id])).rows;
  return { observations, competencies: await applicableDiagnosticCompetencies(classroom) };
}
