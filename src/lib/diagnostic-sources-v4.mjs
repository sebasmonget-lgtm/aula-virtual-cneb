import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { versionTransaction, VersionConflictError } from "./version-integrity.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { cardIsApplicable } from "./ai-context-builder-v4.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { buildClassifierOptions } from "./openai-competency-classifier.mjs";
import { anonymousDecisionText } from "./jev-competency-suggestion.mjs";
import { observationRecommendationState } from "./observation-recommendation.mjs";
import { summarizeSpontaneousV24Pilot } from "./observation-v24-pilot-metrics.mjs";
import { familyInterviewCategories, familyInterviewStructuredOptionsVersion, interviewLanguageOptions, interviewInterestOptions, interviewAutonomyOptions, interviewAutonomyLevels, interviewCommunicationOptions, interviewEmotionalSupportOptions, interviewSocialPlayOptions, interviewHomeActivityOptions, interviewCommunityOptions, interviewParticipationSupportOptions, interviewPreviousEducationOptions, interviewPreviousEducationTypeOptions } from "./family-interview-contract.mjs";

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
  const tagFields = [
    ["language_tags", interviewLanguageOptions], ["interest_tags", interviewInterestOptions],
    ["communication_tags", interviewCommunicationOptions], ["emotional_support_tags", interviewEmotionalSupportOptions],
    ["social_play_tags", interviewSocialPlayOptions], ["home_activity_tags", interviewHomeActivityOptions],
    ["community_tags", interviewCommunityOptions], ["participation_support_tags", interviewParticipationSupportOptions],
  ];
  if (Object.keys(value).some((key) => ![...familyInterviewCategories, ...legacyInterviewFields,
    ...tagFields.map(([field]) => field), "primary_language_tag", "other_language_text", "other_interest_text",
    "other_community_text", "home_language_uses", "autonomy_routines",
    "previous_education_status", "previous_education_type", "structured_options_version"].includes(key))) fail("invalid_interview", "La entrevista contiene un campo no permitido.");
  if (value.structured_options_version != null && ![1, familyInterviewStructuredOptionsVersion].includes(value.structured_options_version))
    fail("invalid_interview", "La versión de opciones de la entrevista no es compatible.");
  const result = {};
  for (const field of [...familyInterviewCategories, ...legacyInterviewFields]) {
    const answer = value[field];
    if (answer == null || answer === "") continue;
    if (typeof answer !== "string" || answer.trim().length > 2000) fail("invalid_interview", `Revisa la respuesta de ${field}.`);
    if (answer.trim()) result[field] = answer.trim();
  }
  for (const [field, options] of tagFields) {
    if (value[field] == null) continue;
    const allowed = new Set(options.map((item) => item.id));
    if (!Array.isArray(value[field]) || value[field].length > options.length || value[field].some((tag) => !allowed.has(tag)))
      fail("invalid_interview", `Revisa las opciones de ${field}.`);
    const tags = [...new Set(value[field])].sort();
    if (tags.length) result[field] = tags;
  }
  if (value.autonomy_routines != null) {
    const allowed = new Set(interviewAutonomyOptions.map((item) => item.id));
    const levels = new Set(interviewAutonomyLevels.map((item) => item.id));
    if (!Array.isArray(value.autonomy_routines) || value.autonomy_routines.length > allowed.size ||
      value.autonomy_routines.some((row) => !row || !allowed.has(row.id) || !levels.has(row.level)) ||
      new Set(value.autonomy_routines.map((row) => row.id)).size !== value.autonomy_routines.length)
      fail("invalid_interview", "Revisa las rutinas cotidianas.");
    if (value.autonomy_routines.length) result.autonomy_routines = value.autonomy_routines.map(({ id, level }) => ({ id, level }));
  }
  if (value.home_language_uses != null) {
    const allowed = new Set(interviewLanguageOptions.map((item) => item.id));
    if (!Array.isArray(value.home_language_uses) || value.home_language_uses.length > 8 ||
      value.home_language_uses.some((row) => !row || !allowed.has(row.language_tag) ||
        !result.language_tags?.includes(row.language_tag) || typeof row.with_whom !== "string" ||
        !row.with_whom.trim() || row.with_whom.trim().length > 100))
      fail("invalid_interview", "Revisa con quién usa cada idioma.");
    if (value.home_language_uses.length) result.home_language_uses = value.home_language_uses.map((row) =>
      ({ language_tag: row.language_tag, with_whom: row.with_whom.trim() }));
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
  for (const [field, tagField] of [["other_language_text", "language_tags"], ["other_interest_text", "interest_tags"],
    ["other_community_text", "community_tags"]]) {
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
  const newFields = ["communication_context", "emotional_support_context", "home_activity_example",
    "family_community_context", "family_community_enjoyed", "participation_support_context", "family_expectation",
    "communication_tags", "emotional_support_tags", "social_play_tags", "home_activity_tags", "community_tags",
    "participation_support_tags", "other_community_text", "home_language_uses", "autonomy_routines"];
  const hasNewFields = newFields.some((field) => result[field] != null);
  if (value.structured_options_version === 1 && hasNewFields)
    fail("invalid_interview", "La entrevista anterior no admite los campos nuevos.");
  if ([...tagFields.map(([field]) => field), "primary_language_tag", "other_language_text", "other_interest_text",
    "other_community_text", "home_language_uses", "autonomy_routines", "previous_education_status",
    "previous_education_type"].some((field) => result[field] != null) || hasNewFields)
    result.structured_options_version = value.structured_options_version ?? (hasNewFields ? familyInterviewStructuredOptionsVersion : 1);
  return normalizeFamilyInterviewDetails(result);
}

export function safeFamilyContext(details) {
  const normalized = normalizeFamilyInterviewDetails(details ?? {});
  return Object.fromEntries([...permittedContextFields, "communication_context", "emotional_support_context",
    "home_activity_example", "family_community_context", "family_community_enjoyed",
    "participation_support_context", "family_expectation", "language_tags", "primary_language_tag",
    "other_language_text", "home_language_uses", "interest_tags", "other_interest_text",
    "autonomy_routines", "communication_tags", "emotional_support_tags", "social_play_tags",
    "home_activity_tags", "community_tags", "other_community_text", "participation_support_tags",
    "previous_education_status", "previous_education_type", "structured_options_version"]
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
const interviewVersionKey = (teacherId, studentId) => `family-interview:${teacherId}:${studentId}`;
async function saveFamilyInterviewWithin(db, teacherId, studentId, details) {
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
async function confirmFamilyInterviewWithin(db, teacherId, studentId) {
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
export async function saveFamilyInterview(db, teacherId, studentId, details) {
  return versionTransaction(db, interviewVersionKey(teacherId, studentId),
    (tx) => saveFamilyInterviewWithin(tx, teacherId, studentId, details));
}
export async function confirmFamilyInterview(db, teacherId, studentId) {
  return versionTransaction(db, interviewVersionKey(teacherId, studentId),
    (tx) => confirmFamilyInterviewWithin(tx, teacherId, studentId));
}
/** The teacher's Save action is the confirmation; no model evaluates family answers. */
export async function saveAndConfirmFamilyInterview(db, teacherId, studentId, details) {
  const validated = validateFamilyInterviewDetails(details);
  if (!Object.keys(validated).length) fail("empty_interview", "Añade al menos una respuesta antes de guardar la entrevista.");
  return versionTransaction(db, interviewVersionKey(teacherId, studentId), async (tx) => {
    const classroom = await scope(tx, teacherId);
    await studentInScope(tx, classroom.id, studentId);
    const draft = await interviewRow(tx, classroom.id, studentId, "draft");
    const confirmed = await interviewRow(tx, classroom.id, studentId, "confirmed");
    if (!draft && confirmed && isDeepStrictEqual(validateFamilyInterviewDetails(confirmed.details), validated))
      return publicInterview(confirmed);
    await saveFamilyInterviewWithin(tx, teacherId, studentId, validated);
    return confirmFamilyInterviewWithin(tx, teacherId, studentId);
  });
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
    competencyApplicability(card, classroom.age_years).belongs_to_cycle && cardIsApplicable(card, {
      castellanoL2Applicable: classroom.castellano_l2_applicable,
      religionApplicable: classroom.religion_applicable,
    })).map((card) => ({ id: card.id, name: card.official_name }));
}

export async function recordSpontaneousObservation(db, teacherId, input) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, input?.studentId);
  const { context, note } = validatedSpontaneousNote(input, Boolean(input?.mediaPath), input?.classifierEnabled === true);
  if (input.supportStatus != null && !["no", "yes", "unknown"].includes(input.supportStatus))
    fail("invalid_observation", "Indica dónde ocurrió y qué hizo o dijo el niño.");
  const id = randomUUID();
  await db.query(`insert into diagnostic_spontaneous_observations
    (id,classroom_id,student_id,context_label,observation_text,support_status,created_by,media_path,media_mime_type,
      classification_status,classifier_version,classifier_status)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id,classroom.id,input.studentId,context,note || null,
      input.supportStatus ?? null,teacherId,input.mediaPath ?? null,input.mediaMimeType ?? null,
      input.classifierEnabled === false ? "needs_review" : "pending",
      input.classifierEnabled ? "CURRENT_V2_4_RAW" : null,
      input.classifierEnabled === false ? "disabled" : input.classifierEnabled ? "pending" : null]);
  return { id, student_id: input.studentId, classification_status: input.classifierEnabled === false ? "needs_review" : "pending",
    classifier_version: input.classifierEnabled ? "CURRENT_V2_4_RAW" : null };
}

/** Atomic capture + teacher attribution. Client UUID makes a retried save idempotent. */
export async function recordConfirmedSpontaneousObservation(db, teacherId, input) {
  const classroom = await scope(db, teacherId);
  await studentInScope(db, classroom.id, input?.studentId);
  const allowed = new Set((await applicableDiagnosticCompetencies(classroom)).map(c=>c.id));
  const ids = input.competencyIds;
  if (!Array.isArray(ids) || ids.length>2 || new Set(ids).size!==ids.length || ids.some(id=>!allowed.has(id))) fail("invalid_competency","Elige hasta dos competencias aplicables o guarda sin competencia.");
  const {context,note}=validatedSpontaneousNote(input,Boolean(input.mediaPath),true);
  if (input.supportStatus!=null && !["yes","no","unknown"].includes(input.supportStatus)) fail("invalid_observation","Apoyo inválido.");
  if (input.observedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(input.observedAt) || !Number.isFinite(Date.parse(input.observedAt)) || new Date(input.observedAt).toISOString().slice(0,10)!==input.observedAt)) fail("invalid_observation","Elige una fecha válida.");
  const id=input.clientRequestId??randomUUID();
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail("invalid_observation","Solicitud inválida.");
  return versionTransaction(db,`spontaneous-decision:${id}`,async tx=>{
    const old=(await tx.query('select * from diagnostic_spontaneous_observations where id=$1',[id])).rows[0];
    if(old){if(old.created_by!==teacherId||old.student_id!==input.studentId||old.context_label!==context||old.observation_text!==(note||null)||old.support_status!==(input.supportStatus??null)||(input.observedAt&&new Date(old.observed_at).toISOString().slice(0,10)!==input.observedAt)||JSON.stringify([...(old.competency_v4_ids??[])].sort())!==JSON.stringify([...ids].sort())) fail("invalid_observation","La solicitud ya corresponde a otro registro. Recarga para revisar lo guardado.");return {id,student_id:old.student_id,classification_status:old.classification_status,competency_v4_ids:old.competency_v4_ids,replayed:true};}
    await tx.query(`insert into diagnostic_spontaneous_observations(id,classroom_id,student_id,context_label,observation_text,support_status,created_by,media_path,media_mime_type,classifier_status,observed_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,'disabled',coalesce($10::timestamptz,now()))`,[id,classroom.id,input.studentId,context,note||null,input.supportStatus??null,teacherId,input.mediaPath??null,input.mediaMimeType??null,input.observedAt?input.observedAt+'T12:00:00-05:00':null]);
    return writeTeacherClassification(tx,teacherId,classroom,id,ids);
  });
}

function validatedSpontaneousNote(input, hasMedia = false, preserveRaw = false) {
  const context = typeof input?.contextLabel === "string" ? input.contextLabel.trim() : "";
  const raw = typeof input?.observationText === "string" ? input.observationText : "";
  const note = preserveRaw ? raw : raw.trim();
  if (!context || context.length > 120 || (!note.trim() && !hasMedia) || note.length > 4000)
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
      classification_status,classification_source,competency_v4_id,competency_v4_ids,classified_at)
    values($1,$2,$3,$4,$5,$6,'classified','teacher',$7,array[$7]::text[],now())
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

/** Historical Jev entrypoint kept only to fail closed; productive suggestions use suggestSpontaneousCompetencies. */
export async function classifySpontaneousObservation(db, teacherId, id, classifier) {
  void classifier;
  const classroom = await scope(db, teacherId);
  const observation = (await db.query(`select * from diagnostic_spontaneous_observations where id=$1 and classroom_id=$2 and created_by=$3`, [id,classroom.id,teacherId])).rows[0];
  if (!observation) fail("not_found", "Observación no encontrada.");
  if (observation.classification_source === "teacher") return { id, status: "teacher_preserved" };
  if (observation.classification_status !== "pending") return { id, status: observation.classification_status };
  fail("classifier_unavailable", "El clasificador Jev no está disponible. La docente puede clasificar manualmente la observación.");
}

export async function markSpontaneousNeedsReview(db, teacherId, id, reason = "unavailable") {
  if (!["unavailable", "privacy_blocked", "missing_text"].includes(reason))
    throw new TypeError("Estado de recomendación inválido.");
  const classroom = await scope(db, teacherId);
  await db.query(`update diagnostic_spontaneous_observations set classification_status='needs_review',
    classification_reason=$4
    where id=$1 and classroom_id=$2 and created_by=$3 and classification_source is distinct from 'teacher'
      and classification_status in ('pending','needs_review')`, [id,classroom.id,teacherId,reason]);
}

export async function suggestSpontaneousCompetencies(db, teacherId, id, classifier, { allowReview = false } = {}) {
  const classroom = await scope(db, teacherId);
  const observation = (await db.query(`select * from diagnostic_spontaneous_observations
    where id=$1 and classroom_id=$2 and created_by=$3`, [id,classroom.id,teacherId])).rows[0];
  if (!observation) fail("not_found", "Observación no encontrada.");
  if (observation.classification_source === "teacher") return { id, status: "teacher_preserved",
    recommendation_state: observationRecommendationState(observation) };
  if (observation.classification_status !== "pending" &&
      !(allowReview && observation.classification_status === "needs_review"))
    return { id, status: observation.classification_status, recommendation_state: observationRecommendationState(observation) };
  if (!observation.observation_text?.trim()) {
    await markSpontaneousNeedsReview(db, teacherId, id, "missing_text");
    return { id, status: "needs_review", recommendation_state: "missing_text" };
  }
  const applicable = await applicableDiagnosticCompetencies(classroom);
  const options = buildClassifierOptions((await loadKnowledgeBaseV4()).competencyCards,
    classroom.age_years, applicable.map((item) => item.id));
  const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [classroom.id])).rows
    .flatMap((row) => [row.first_name, row.last_name, row.preferred_name]).filter(Boolean);
  const anonymousText = anonymousDecisionText(observation.observation_text, names);
  if (!anonymousText) {
    await markSpontaneousNeedsReview(db, teacherId, id, "privacy_blocked");
    return { id, status: "needs_review", recommendation_state: "privacy_blocked" };
  }
  const decision = await classifier.classify({ observation: anonymousText,
    context: anonymousDecisionText(observation.context_label, names) ?? "", age: classroom.age_years, options });
  const allowed = new Set(options.map((item) => item.id));
  const candidateIds = decision?.candidate_ids;
  if (!Array.isArray(candidateIds) || candidateIds.length > 4 || candidateIds.some((item) => !allowed.has(item)))
    fail("invalid_classification", "El clasificador devolvió competencias inválidas.");
  const updated = await db.query(`update diagnostic_spontaneous_observations set classification_status='needs_review',
    classification_source=$2,suggested_competency_v4_ids=$1::text[],classification_reason=null,classified_at=now()
    where id=$3 and classroom_id=$4 and created_by=$5 and classification_source is distinct from 'teacher'
      and classification_status=$6 returning id`, [[...new Set(candidateIds)],decision?.source === "jev" ? "jev" : "openai",
      id,classroom.id,teacherId,observation.classification_status]);
  return { id, status: updated.rows.length ? "needs_review" : "teacher_preserved",
    recommendation_state: updated.rows.length ? (candidateIds.length ? "suggested" : "insufficient_information")
      : observationRecommendationState((await db.query(`select classification_source,classification_status,
        competency_v4_ids,suggested_competency_v4_ids,classification_reason from diagnostic_spontaneous_observations
        where id=$1 and classroom_id=$2 and created_by=$3`, [id,classroom.id,teacherId])).rows[0] ?? {}) };
}

/** Frozen V2.4 pilot: only new flagged observations, never a historical backfill. */
export async function suggestSpontaneousV24(db, teacherId, id, classifier, { allowRetry = false } = {}) {
  const classroom = await scope(db, teacherId);
  const observation = (await db.query(`select * from diagnostic_spontaneous_observations
    where id=$1 and classroom_id=$2 and created_by=$3`, [id,classroom.id,teacherId])).rows[0];
  if (!observation) fail("not_found", "Observación no encontrada.");
  if (observation.classifier_version !== "CURRENT_V2_4_RAW" || observation.classification_source === "teacher")
    return { id, status: "teacher_preserved", recommendation_state: observationRecommendationState(observation) };
  if (observation.classifier_status !== "pending" && !(allowRetry && observation.classifier_status === "failed"))
    return { id, status: observation.classifier_status, recommendation_state: observationRecommendationState(observation) };
  const persist = async (status, ids = [], latency = null, errorCode = null) => {
    const updated = await db.query(`update diagnostic_spontaneous_observations set classification_status='needs_review',
      classification_source=$1,suggested_competency_v4_ids=$2::text[],classification_reason=$3,
      classifier_status=$4,classifier_latency_ms=$5,classifier_error_code=$6,classified_at=now(),
      classifier_technical_failure_count=classifier_technical_failure_count+case when $4='failed' then 1 else 0 end
      where id=$7 and classroom_id=$8 and created_by=$9 and classifier_version='CURRENT_V2_4_RAW'
        and classification_source is distinct from 'teacher' and classifier_status=$10 returning id`,
    [["suggested", "abstained"].includes(status) ? "jev" : null, ids,
      status === "missing_text" ? "missing_text" : status === "failed" ? "unavailable" : null,
      status, latency, errorCode, id,classroom.id,teacherId,observation.classifier_status]);
    if (!updated.rows.length && status === "failed") await db.query(`update diagnostic_spontaneous_observations
      set classifier_technical_failure_count=classifier_technical_failure_count+1
      where id=$1 and classroom_id=$2 and created_by=$3 and classifier_version='CURRENT_V2_4_RAW'`,
    [id,classroom.id,teacherId]);
    return { id, status: updated.rows.length ? "needs_review" : "teacher_preserved",
      recommendation_state: updated.rows.length ? status === "suggested" ? "suggested" : status === "abstained" ? "insufficient_information" :
        status === "missing_text" ? "missing_text" : "unavailable" : "teacher_confirmed" };
  };
  if (!observation.observation_text?.trim()) return persist("missing_text");
  const allowed = new Set((await applicableDiagnosticCompetencies(classroom)).map((item) => item.id));
  const started = await db.query(`update diagnostic_spontaneous_observations
    set classifier_attempt_count=classifier_attempt_count+1
    where id=$1 and classroom_id=$2 and created_by=$3 and classifier_version='CURRENT_V2_4_RAW'
      and classifier_status=$4 and classifier_attempt_count=$5
      and classification_source is distinct from 'teacher' returning id`,
  [id,classroom.id,teacherId,observation.classifier_status,observation.classifier_attempt_count]);
  if (!started.rows.length) return { id, status: "teacher_preserved", recommendation_state: "unavailable" };
  try {
    const result = await classifier.classify({ observation: observation.observation_text, age: classroom.age_years,
      applicability: { castellano_as_second_language: classroom.castellano_l2_applicable,
        religion_applicable: classroom.religion_applicable } });
    const latency = Number.isInteger(result?.latency_ms) && result.latency_ms >= 0 ? result.latency_ms : null;
    if (result.status === "classification_failed") return persist("failed", [], latency,
      /^[a-z_]{1,60}$/u.test(result.error_code ?? "") ? result.error_code : "provider_error");
    const additional = Array.isArray(result.additional) ? result.additional : null;
    const ids = [result.primary, ...(additional ?? [])].filter(Boolean);
    if (!["review", "unclassified"].includes(result.status) || !additional || ids.length > 4 ||
        ids.some((item) => !allowed.has(item)) || (result.status === "review") !== Boolean(result.primary) ||
        (result.status === "unclassified" && ids.length))
      return persist("failed", [], latency, "invalid_classification");
    return persist(result.primary ? "suggested" : "abstained", [...new Set(ids)], latency);
  } catch (error) {
    const code = /^[a-z_]{1,60}$/u.test(error?.code ?? "") ? error.code : "unexpected";
    return persist("failed", [], null, code);
  }
}

export async function correctSpontaneousClassification(db, teacherId, id, competencyIds) {
  const classroom = await scope(db, teacherId);
  const allowed = new Set((await applicableDiagnosticCompetencies(classroom)).map((item) => item.id));
  const selected = competencyIds == null ? [] : typeof competencyIds === "string" ? [competencyIds] : competencyIds;
  if (!Array.isArray(selected) || selected.length > allowed.size || selected.some((item) => !allowed.has(item)))
    fail("invalid_competency", "La competencia no es aplicable al aula.");
  const ids = [...new Set(selected)];
  return versionTransaction(db, `spontaneous-decision:${id}`, async (tx) => {
    return writeTeacherClassification(tx, teacherId, classroom, id, ids);
  });
}

async function writeTeacherClassification(tx, teacherId, classroom, id, ids) {
    const updated = await tx.query(`update diagnostic_spontaneous_observations set classification_status=$1,
      classification_source='teacher',competency_v4_id=$2,secondary_competency_v4_id=$3,
      competency_v4_ids=$4::text[],
      classification_confidence=null,classification_reason=null,classified_at=now(),
      classifier_status=case when classifier_status='pending' then 'disabled' else classifier_status end,
      teacher_action=case
        when cardinality($4::text[])=0 and cardinality(suggested_competency_v4_ids)>0 then 'rejected'
        when cardinality($4::text[])=0 then 'saved_without_competency'
        when cardinality(suggested_competency_v4_ids)>0 and $4::text[]=array[suggested_competency_v4_ids[1]]::text[] then 'confirmed'
        else 'changed' end
      where id=$5 and classroom_id=$6 and created_by=$7
      returning id,student_id,classroom_id,classification_status,competency_v4_id,competency_v4_ids,
        suggested_competency_v4_ids,classifier_version,teacher_action`,
      [ids.length ? "classified" : "needs_review",ids[0] ?? null,ids[1] ?? null,ids,id,classroom.id,teacherId]);
    const row = updated.rows[0];
    if (!row) fail("not_found", "Observación no encontrada.");
    const next = (await tx.query(`select coalesce(max(decision_number),0)+1 as value
      from diagnostic_spontaneous_observation_decision_events where observation_id=$1`, [id])).rows[0].value;
    await tx.query(`insert into diagnostic_spontaneous_observation_decision_events
      (id,observation_id,classroom_id,actor_id,decision_number,classifier_version,
        suggested_competency_v4_ids_snapshot,suggested_primary_competency_id,action,
        selected_competency_v4_ids_snapshot,selected_primary_competency_id)
      values($1,$2,$3,$4,$5,$6,$7::text[],$8,$9,$10::text[],$11)`,
    [randomUUID(),id,row.classroom_id,teacherId,next,row.classifier_version,
      row.suggested_competency_v4_ids,row.suggested_competency_v4_ids[0] ?? null,row.teacher_action,
      row.competency_v4_ids,row.competency_v4_id]);
    return { id: row.id, student_id: row.student_id, classification_status: row.classification_status,
      competency_v4_id: row.competency_v4_id, competency_v4_ids: row.competency_v4_ids };
}

export async function reviseSpontaneousObservation(db, teacherId, id, input, withdraw=false) {
  const classroom=await scope(db,teacherId);
  const allowed=new Set((await applicableDiagnosticCompetencies(classroom)).map(c=>c.id));
  const ids=input.competencyIds??[];
  if(!withdraw&&(!Array.isArray(ids)||ids.length>2||ids.some(c=>!allowed.has(c))))fail('invalid_competency','Elige hasta dos competencias aplicables.');
  if(!withdraw&&(typeof input.observationText!=='string'||input.observationText.length>4000))fail('invalid_observation','La observación debe tener hasta 4000 caracteres.');
  return versionTransaction(db,`spontaneous-decision:${id}`,async tx=>{
    const row=(await tx.query(`select o.* from effective_diagnostic_spontaneous_observations o join students s on s.id=o.student_id
      where o.id=$1 and o.classroom_id=$2 and o.created_by=$3 and s.status='active'`,[id,classroom.id,teacherId])).rows[0];
    if(!row)fail('not_found','Observación no disponible.');
    if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==Number(row.source_revision))throw new VersionConflictError('La observación cambió. Actualiza la lista antes de editar.',row.source_revision);
    const text=withdraw?row.observation_text??'':input.observationText.trim();
    if(!withdraw&&!text&&!row.media_path)fail('invalid_observation','Conserva un texto o una evidencia.');
    await tx.query(`insert into diagnostic_spontaneous_observation_revisions(id,observation_id,actor_id,revision,state,corrected_text)
      values($1,$2,$3,$4,$5,$6)`,[randomUUID(),id,teacherId,Number(row.source_revision)+1,withdraw?'withdrawn':'active',text]);
    if(!withdraw)await writeTeacherClassification(tx,teacherId,classroom,id,[...new Set(ids)]);
    return {id,student_id:row.student_id,source_revision:Number(row.source_revision)+1};
  });
}

export async function loadSpontaneousObservations(db, teacherId) {
  const classroom = await scope(db, teacherId);
  const observations = (await db.query(`select o.id,o.student_id,o.context_label,o.observation_text,o.support_status,
    o.observed_at,o.classification_status,o.classification_source,o.competency_v4_id,o.secondary_competency_v4_id,
    o.competency_v4_ids,o.suggested_competency_v4_ids,o.classification_reason,o.classifier_version,o.classifier_status,
    o.media_path is not null as has_media,o.media_mime_type,o.source_revision
    from effective_diagnostic_spontaneous_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    where o.classroom_id=$1 and s.status='active' order by o.observed_at desc,o.id desc`, [classroom.id])).rows;
  return { observations: observations.map((row) => {
    const publicRow = { ...row };
    delete publicRow.classification_reason;
    return { ...publicRow, recommendation_state: observationRecommendationState(row) };
  }), competencies: await applicableDiagnosticCompetencies(classroom) };
}

/** Classroom-scoped aggregate only; no observation text or provider payloads. */
export async function loadSpontaneousV24Metrics(db, teacherId) {
  const classroom = await scope(db, teacherId);
  const rows = (await db.query(`select id,classifier_status,teacher_action,classifier_latency_ms,
    classifier_attempt_count,classifier_technical_failure_count,classifier_error_code,
    suggested_competency_v4_ids[1] as suggested,competency_v4_id as confirmed
    from diagnostic_spontaneous_observations where classroom_id=$1 and created_by=$2
      and classifier_version='CURRENT_V2_4_RAW'`, [classroom.id,teacherId])).rows;
  const events = (await db.query(`select observation_id from diagnostic_spontaneous_observation_decision_events
    where classroom_id=$1 and actor_id=$2 and classifier_version='CURRENT_V2_4_RAW'`,
  [classroom.id,teacherId])).rows;
  return summarizeSpontaneousV24Pilot(rows,events);
}
