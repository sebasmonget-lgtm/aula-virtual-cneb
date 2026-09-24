import { createHash, randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { buildDiagnosticExperienceCatalog } from "./diagnostic-experiences-v4.mjs";
import { loadDiagnosticCatalog } from "./diagnostic-catalog-v4.mjs";
import { completeDiagnosticReviewForTeacher } from "./diagnostic-review-service.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { applicableDiagnosticCompetencies } from "./diagnostic-sources-v4.mjs";
import { safeFamilyContext } from "./diagnostic-sources-v4.mjs";
import { isDiagnosticScaffoldSummary } from "./diagnostic-review-copy.mjs";
import { interviewInterestOptions } from "./family-interview-contract.mjs";
import { normalizeFamilyInterviewDetails } from "./diagnostic-sources-v4.mjs";

export class DiagnosticAssessmentError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticAssessmentError"; this.reason = reason; }
}

const fail = (reason, message) => { throw new DiagnosticAssessmentError(reason, message); };
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value, limit = 3000) => typeof value === "string" && value.trim().length <= limit ? value.trim() : null;

export function diagnosticSourceSnapshot(rows) {
  return rows.map((row) => ({ id: row.id, fingerprint: hash([
    row.student_id, row.competency_v4_id, row.experience_id, row.aspect_id,
    row.catalog_version, row.observation_status, row.observation_text ?? "", row.classification_source ?? null,
    new Date(row.observed_at).toISOString(),
  ]) })).sort((a, b) => a.id.localeCompare(b.id));
}
export const sameDiagnosticSources = (a, b) => {
  const stable = (rows) => JSON.stringify((Array.isArray(rows) ? rows : [])
    .map((row) => [row.id, row.fingerprint]).sort((left, right) => left[0].localeCompare(right[0])));
  return stable(a) === stable(b);
};

export function derivedDiagnosticGroupInformation(familyRows, coverage) {
  const interests = interviewInterestOptions.map(({ id, label }) => ({ key: id, label,
    count: familyRows.filter((row) => normalizeFamilyInterviewDetails(row.details).interest_tags?.includes(id)).length }))
    .filter((item) => item.count >= 2 && item.count * 2 >= familyRows.length)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
  const observation_gaps = coverage.filter((item) => item.children_without_observations > 0)
    .map(({ competency_id, competency_name, children_with_observations, children_without_observations }) => ({
      competency_id, competency_name, children_with_observations, children_without_observations,
    })).sort((a, b) => b.children_without_observations - a.children_without_observations || a.competency_name.localeCompare(b.competency_name, "es"));
  return { confirmed_interviews: familyRows.length, interests, observation_gaps };
}

export function diagnosticPlanningSummary(confirmedGroupDetails, studentNames = []) {
  if (!confirmedGroupDetails) return undefined;
  return [confirmedGroupDetails.strengths, confirmedGroupDetails.needs, confirmedGroupDetails.planning_priorities]
    .filter(Boolean).map((item) => neutralizeAssessmentText(item, studentNames)).join(" ") || undefined;
}

function validateDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details) ||
      !["information_available", "insufficient_information"].includes(details.information_status))
    fail("invalid_details", "Selecciona si hay información para la síntesis.");
  const summary = clean(details.summary_text);
  const next = clean(details.next_observation, 1000);
  if (!summary || next === null || isDiagnosticScaffoldSummary(summary))
    fail("invalid_details", "Escribe con tus palabras una síntesis breve basada en lo que observaste.");
  if (/\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|ranking)\b/i.test(`${summary} ${next}`))
    fail("invalid_details", "El diagnóstico inicial no asigna niveles ni clasifica a los niños.");
  return { information_status: details.information_status, summary_text: summary, next_observation: next };
}

function validateGroupDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) fail("invalid_details", "Revisa el diagnóstico del grupo.");
  const strengths = clean(details.strengths, 3000);
  const needs = clean(details.needs, 3000);
  const planning = clean(details.planning_priorities, 3000);
  if (strengths === null || needs === null || planning === null || ![strengths, needs, planning].some(Boolean))
    fail("invalid_details", "Escribe al menos una observación del grupo antes de confirmarla.");
  return { strengths, needs, planning_priorities: planning };
}

function validateStudentReviewDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details) ||
      !["information_available", "insufficient_information"].includes(details.information_status))
    fail("invalid_details", "Indica si tienes información suficiente para comentar sobre este niño.");
  const comment = clean(details.comment_text);
  if (!comment || isDiagnosticScaffoldSummary(comment))
    fail("invalid_details", "Escribe con tus palabras un comentario diagnóstico sobre el niño.");
  if (/\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|ranking)\b/i.test(comment))
    fail("invalid_details", "El diagnóstico inicial no asigna niveles ni clasifica a los niños.");
  return { information_status: details.information_status, comment_text: comment };
}

const studentReviewSnapshot = (rows, interview) => [
  ...diagnosticSourceSnapshot(rows),
  ...(interview ? [{ id: `family:${interview.id}`, fingerprint: hash([interview.version, interview.details, interview.teacher_confirmed_at]) }] : []),
].sort((a, b) => a.id.localeCompare(b.id));

async function legacyDiagnosticObservations(db, classroomId, studentId = null) {
  return (await db.query(`select so.id, de.student_id, so.reference_id, so.status, so.note,
      so.observed_at, de.observation_context, de.observation_text,
      ref.short_observable_text
    from student_observations so join diagnostic_entries de on de.id=so.diagnostic_entry_id
    join diagnostic_sessions ds on ds.id=de.session_id
    join students s on s.id=de.student_id and s.classroom_id=ds.classroom_id
    join observation_references ref on ref.id=so.reference_id
    where ds.classroom_id=$1 and s.status='active' and ($2::uuid is null or s.id=$2)
    order by so.observed_at,so.id`, [classroomId, studentId])).rows.map((row) => ({
      id: `legacy:${row.id}`, student_id: row.student_id, competency_v4_id: null,
      experience_id: "legacy", aspect_id: row.reference_id, catalog_version: "legacy-v1",
      experience_title_snapshot: row.observation_context || "Registro diagnóstico anterior",
      aspect_prompt_snapshot: row.short_observable_text,
      observation_status: row.status === "with_support" ? "with_support" :
        row.status === "not_observed_yet" || row.status === "need_more_information" ? "insufficient_information" : "observed_without_judgment",
      observation_text: row.note || row.observation_text || null, observed_at: row.observed_at,
    }));
}

async function studentReviewSources(db, classroomId, studentId) {
  const guided = (await db.query(`select id,student_id,competency_v4_id,experience_id,aspect_id,catalog_version,
      observation_status,observation_text,observed_at from diagnostic_experience_observations
      where classroom_id=$1 and student_id=$2`, [classroomId, studentId])).rows;
  const spontaneous = (await db.query(`select id,student_id,competency_v4_id,context_label,observation_text,
      support_status,observed_at,classification_source,classification_status
      from diagnostic_spontaneous_observations where classroom_id=$1 and student_id=$2`, [classroomId, studentId])).rows
    .map((row) => ({ ...row, experience_id: "spontaneous", aspect_id: row.context_label,
      catalog_version: "spontaneous-v1", observation_status: row.support_status === "yes" ? "with_support" : "observed_without_judgment" }));
  const interview = (await db.query(`select id,version,details,teacher_confirmed_at from student_family_interviews
      where classroom_id=$1 and student_id=$2 and status='confirmed' order by version desc limit 1`, [classroomId, studentId])).rows[0];
  const rows = [...guided, ...spontaneous, ...await legacyDiagnosticObservations(db, classroomId, studentId)];
  return { rows, interview, snapshot: studentReviewSnapshot(rows, interview) };
}

export async function isCurrentDiagnosticStudentReview(db, classroomId, studentId, storedSnapshot) {
  const current = await studentReviewSources(db, classroomId, studentId);
  return sameDiagnosticSources(storedSnapshot, current.snapshot);
}

const publicStudentReview = (row, isCurrent = true) => ({ id: row.id, student_id: row.student_id,
  version: row.version, status: row.status, details: row.details,
  teacher_confirmed_at: row.teacher_confirmed_at, is_current: isCurrent });

async function scope(db, teacherId) {
  const classroom = (await db.query(`select c.id, c.section, ag.age_years, c.castellano_l2_applicable,
      c.religion_applicable from classrooms c join age_grades ag on ag.id = c.age_grade_id
      where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0];
  if (!classroom) fail("no_classroom", "No hay un aula activa.");
  const students = (await db.query(`select id, coalesce(preferred_name, first_name) as name, initial_context
    from students where classroom_id = $1 and status = 'active'
    order by coalesce(preferred_name, first_name), id`, [classroom.id])).rows;
  const knowledgeBase = await loadKnowledgeBaseV4();
  const catalog = buildDiagnosticExperienceCatalog(knowledgeBase, {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  }, await loadDiagnosticCatalog(knowledgeBase.competencyCards));
  return { classroom, students, catalog };
}

export async function saveStudentInitialContext(db, teacherId, studentId, value) {
  const { classroom, students } = await scope(db, teacherId);
  if (!students.some((student) => student.id === studentId)) fail("invalid_student", "El niño no pertenece al aula activa.");
  const note = clean(value, 2000);
  if (note === null) fail("invalid_context", "La información inicial no puede superar 2000 caracteres.");
  await db.query(`update students set initial_context = $1 where id = $2 and classroom_id = $3 and status = 'active'`,
    [note || null, studentId, classroom.id]);
  return { student_id: studentId, initial_context: note || null };
}

async function sourceRows(db, classroomId, studentId, competencyId) {
  const guided = (await db.query(`select o.id, o.student_id, o.competency_v4_id, o.experience_id,
      o.aspect_id, o.catalog_version, o.experience_title_snapshot, o.aspect_prompt_snapshot,
      o.observation_status, o.observation_text, o.observed_at
    from diagnostic_experience_observations o join students s on s.id = o.student_id
    where o.classroom_id = $1 and o.student_id = $2 and o.competency_v4_id = $3
      and s.classroom_id = $1 and s.status = 'active'
    order by o.observed_at, o.id`, [classroomId, studentId, competencyId])).rows;
  const spontaneous = (await db.query(`select o.id,o.student_id,o.competency_v4_id,o.context_label,
      o.observation_text,o.support_status,o.observed_at,o.classification_source
    from diagnostic_spontaneous_observations o join students s on s.id=o.student_id
    where o.classroom_id=$1 and o.student_id=$2 and o.classification_status='classified'
      and o.competency_v4_id=$3
      and s.classroom_id=$1 and s.status='active'`, [classroomId, studentId, competencyId])).rows.map((row) => ({
      ...row, competency_v4_id: competencyId, experience_id: "spontaneous", aspect_id: row.context_label,
      catalog_version: "spontaneous-v1", experience_title_snapshot: "Observación espontánea",
      aspect_prompt_snapshot: row.context_label,
      observation_status: row.support_status === "yes" ? "with_support" : "observed_without_judgment",
    }));
  return [...guided, ...spontaneous].sort((a,b) => new Date(a.observed_at) - new Date(b.observed_at) || a.id.localeCompare(b.id));
}

async function scopedSources(db, teacherId, studentId, competencyId) {
  const { classroom, students } = await scope(db, teacherId);
  if (!students.some((student) => student.id === studentId)) fail("invalid_student", "El niño no pertenece al aula activa.");
  if (!(await applicableDiagnosticCompetencies(classroom)).some((item) => item.id === competencyId))
    fail("invalid_competency", "Esta competencia no es aplicable al aula.");
  const rows = await sourceRows(db, classroom.id, studentId, competencyId);
  if (!rows.length) fail("no_observations", "Primero registra una observación real de esta competencia.");
  return { classroom, students, rows, snapshot: diagnosticSourceSnapshot(rows) };
}

function publicReview(row) {
  return { id: row.id, student_id: row.student_id, competency_v4_id: row.competency_v4_id,
    version: row.version, status: row.status, details: row.details,
    teacher_confirmed_at: row.teacher_confirmed_at, updated_at: row.updated_at };
}

export function summarizeDiagnosticGroup(students, observations, reviews, catalog) {
  const latest = new Map();
  for (const row of reviews.filter((item) => item.status === "confirmed")) {
    const key = `${row.student_id}:${row.competency_v4_id}`;
    if (!latest.has(key) || row.version > latest.get(key).version) latest.set(key, row);
  }
  const competencies = [...new Map(catalog.flatMap((experience) => experience.competencies).map((item) => [item.id, item])).values()];
  return competencies.map((competency) => {
    const observed = new Set(observations.filter((item) => item.competency_v4_id === competency.id).map((item) => item.student_id));
    const confirmed = students.map((student) => latest.get(`${student.id}:${competency.id}`)).filter(Boolean);
    return { competency_id: competency.id, competency_name: competency.name,
      children_with_observations: observed.size,
      confirmed_with_information: confirmed.filter((item) => item.details.information_status === "information_available").length,
      confirmed_insufficient: confirmed.filter((item) => item.details.information_status === "insufficient_information").length,
      children_without_observations: students.length - observed.size };
  });
}

export async function loadDiagnosticAssessmentWorkspace(db, teacherId) {
  const { classroom, students, catalog } = await scope(db, teacherId);
  const familyRows = (await db.query(`select distinct on (i.student_id) i.id,i.student_id,i.version,i.details,i.teacher_confirmed_at
    from student_family_interviews i join students s on s.id=i.student_id and s.classroom_id=i.classroom_id
    where i.classroom_id=$1 and i.status='confirmed' and s.status='active'
    order by i.student_id,i.version desc`, [classroom.id])).rows;
  const family = new Map(familyRows.map((row) => [row.student_id, { version: row.version, ...safeFamilyContext(row.details) }]));
  const unclassified = (await db.query(`select student_id,count(*)::int as total
    from diagnostic_spontaneous_observations where classroom_id=$1 and classification_status <> 'classified'
    group by student_id`, [classroom.id])).rows;
  const pending = new Map(unclassified.map((row) => [row.student_id, row.total]));
  const guided = (await db.query(`select o.id, o.student_id, o.competency_v4_id,
      o.experience_id, o.aspect_id, o.catalog_version, o.experience_title_snapshot,
      o.aspect_prompt_snapshot, o.observation_status, o.observation_text, o.observed_at
    from diagnostic_experience_observations o join students s on s.id = o.student_id
    where o.classroom_id = $1 and s.classroom_id = $1 and s.status = 'active'
    order by o.observed_at, o.id`, [classroom.id])).rows;
  const spontaneousAll = (await db.query(`select o.id,o.student_id,o.competency_v4_id,o.context_label,o.observation_text,
      o.support_status,o.observed_at,o.classification_source,o.classification_status
    from diagnostic_spontaneous_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    where o.classroom_id=$1 and s.status='active'`, [classroom.id])).rows.map((row) => ({ ...row,
      experience_id: "spontaneous", aspect_id: row.context_label, catalog_version: "spontaneous-v1",
      experience_title_snapshot: "Observación espontánea", aspect_prompt_snapshot: row.context_label,
      observation_status: row.support_status === "yes" ? "with_support" : "observed_without_judgment",
    }));
  const spontaneous = spontaneousAll.filter((row) => row.classification_status === "classified" && row.competency_v4_id);
  const legacy = await legacyDiagnosticObservations(db, classroom.id);
  const observations = [...guided, ...spontaneous, ...legacy].sort((a,b) => new Date(a.observed_at) - new Date(b.observed_at) || a.id.localeCompare(b.id));
  const reviews = (await db.query(`select r.* from diagnostic_competency_reviews r join students s on s.id = r.student_id
    where r.classroom_id = $1 and s.classroom_id = $1 and s.status = 'active'
    order by r.student_id, r.competency_v4_id, r.version desc`, [classroom.id])).rows;
  const groupReviews = (await db.query(`select * from diagnostic_group_reviews where classroom_id = $1 order by version desc`, [classroom.id])).rows;
  const studentReviews = (await db.query(`select r.* from diagnostic_student_reviews r join students s on s.id=r.student_id
    where r.classroom_id=$1 and s.classroom_id=$1 and s.status='active'
    order by r.student_id,r.version desc`, [classroom.id])).rows;
  const familyByStudent = new Map(familyRows.map((row) => [row.student_id, row]));
  const sourceSnapshots = new Map(students.map((student) => [student.id,
    studentReviewSnapshot([...guided, ...spontaneousAll, ...legacy].filter((row) => row.student_id === student.id), familyByStudent.get(student.id))]));
  let currentGroupSnapshot = null;
  try { currentGroupSnapshot = await confirmedSnapshot(db, classroom.id, sourceSnapshots); }
  catch (error) {
    if (!(error instanceof DiagnosticAssessmentError) || !["incomplete_children", "stale_sources"].includes(error.reason)) throw error;
  }
  const aspects = new Map(catalog.flatMap((experience) => experience.aspects.map((aspect) => [`${experience.id}:${aspect.id}`, { experience_title: experience.title, aspect_prompt: aspect.prompt }])));
  const availableCompetencies = await applicableDiagnosticCompetencies(classroom);
  const groupCoverage = summarizeDiagnosticGroup(students, observations, reviews,
    [{ competencies: availableCompetencies.map((item) => ({ id: item.id, name: item.name })) }]);
  return { students: students.map((item) => ({ ...item, family_context: family.get(item.id) ?? null,
    unclassified_observations: pending.get(item.id) ?? 0 })), observations: observations.map((row) => ({ ...row,
    experience_title: row.experience_title_snapshot ?? aspects.get(`${row.experience_id}:${row.aspect_id}`)?.experience_title ?? "Experiencia diagnóstica",
    aspect_prompt: row.aspect_prompt_snapshot ?? aspects.get(`${row.experience_id}:${row.aspect_id}`)?.aspect_prompt ?? "Aspecto observado",
  })), pending_observations: spontaneousAll.filter((row) => row.classification_status !== "classified" || !row.competency_v4_id)
    .map((row) => ({ id: row.id, student_id: row.student_id, context_label: row.context_label,
      observation_text: row.observation_text, observed_at: row.observed_at })),
  reviews: reviews.map(publicReview), student_reviews: studentReviews.map((row) => publicStudentReview(row,
    sameDiagnosticSources(row.source_snapshot, sourceSnapshots.get(row.student_id)))),
  group_reviews: groupReviews.map((row) => ({ id: row.id, version: row.version, status: row.status, details: row.details,
    teacher_confirmed_at: row.teacher_confirmed_at,
    is_current: currentGroupSnapshot !== null && sameDiagnosticSources(row.source_snapshot, currentGroupSnapshot) })),
  group_coverage: groupCoverage,
  derived_group_information: derivedDiagnosticGroupInformation(familyRows, groupCoverage) };
}

export async function prepareDiagnosticSynthesis(db, teacherId, { studentId, competencyId }) {
  const { classroom, rows, snapshot } = await scopedSources(db, teacherId, studentId, competencyId);
  const factual = rows.filter((row) => ["demonstrated", "with_support", "observed_without_judgment"].includes(row.observation_status));
  const details = { information_status: factual.length ? "information_available" : "insufficient_information",
    summary_text: "",
    next_observation: "" };
  const existing = (await db.query(`select id from diagnostic_competency_reviews
    where classroom_id = $1 and student_id = $2 and competency_v4_id = $3 and status = 'draft'`, [classroom.id, studentId, competencyId])).rows[0];
  if (existing) {
    await db.query(`update diagnostic_competency_reviews set details = $1::jsonb,
      source_snapshot = $2::jsonb, updated_at = now() where id = $3 and status = 'draft'`,
    [JSON.stringify(details), JSON.stringify(snapshot), existing.id]);
    return { id: existing.id, details, status: "draft" };
  }
  const version = (await db.query(`select coalesce(max(version),0)::int + 1 as next
    from diagnostic_competency_reviews where student_id = $1 and competency_v4_id = $2`, [studentId, competencyId])).rows[0].next;
  const id = randomUUID();
  await db.query(`insert into diagnostic_competency_reviews
    (id,classroom_id,student_id,competency_v4_id,version,status,details,source_snapshot,created_by)
    values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8)`,
  [id,classroom.id,studentId,competencyId,version,JSON.stringify(details),JSON.stringify(snapshot),teacherId]);
  return { id, details, status: "draft" };
}

export async function saveDiagnosticSynthesis(db, teacherId, id, details) {
  const { classroom } = await scope(db, teacherId);
  const validated = validateDetails(details);
  const result = await db.query(`update diagnostic_competency_reviews set details = $1::jsonb, updated_at = now()
    where id = $2 and classroom_id = $3 and created_by = $4 and status = 'draft' returning *`,
  [JSON.stringify(validated), id, classroom.id, teacherId]);
  if (!result.rows.length) fail("not_editable", "Este diagnóstico no es un borrador editable.");
  return publicReview(result.rows[0]);
}

export async function confirmDiagnosticSynthesis(db, teacherId, id) {
  const { classroom } = await scope(db, teacherId);
  const row = (await db.query(`select * from diagnostic_competency_reviews where id = $1
    and classroom_id = $2 and created_by = $3 and status = 'draft'`, [id, classroom.id, teacherId])).rows[0];
  if (!row) fail("not_editable", "Este diagnóstico no es un borrador editable.");
  validateDetails(row.details);
  const { snapshot } = await scopedSources(db, teacherId, row.student_id, row.competency_v4_id);
  if (!sameDiagnosticSources(row.source_snapshot, snapshot)) fail("stale_sources", "Hay observaciones nuevas o cambiadas. Vuelve a preparar la síntesis antes de confirmar.");
  const confirmed = await db.query(`update diagnostic_competency_reviews set status = 'confirmed',
    teacher_confirmed_at = now(), updated_at = now() where id = $1 and status = 'draft' returning *`, [id]);
  return publicReview(confirmed.rows[0]);
}

export async function prepareDiagnosticStudentReview(db, teacherId, studentId) {
  const { classroom, students } = await scope(db, teacherId);
  if (!students.some((student) => student.id === studentId)) fail("invalid_student", "El niño no pertenece al aula activa.");
  const { rows, snapshot } = await studentReviewSources(db, classroom.id, studentId);
  const existing = (await db.query(`select * from diagnostic_student_reviews where classroom_id=$1 and student_id=$2 and status='draft'`,
    [classroom.id, studentId])).rows[0];
  if (existing) {
    await db.query(`update diagnostic_student_reviews set source_snapshot=$1::jsonb,updated_at=now() where id=$2`,
      [JSON.stringify(snapshot), existing.id]);
    return publicStudentReview(existing);
  }
  const version = (await db.query(`select coalesce(max(version),0)::int+1 as next from diagnostic_student_reviews
    where classroom_id=$1 and student_id=$2`, [classroom.id, studentId])).rows[0].next;
  const details = { information_status: rows.length ? "information_available" : "insufficient_information", comment_text: "" };
  const id = randomUUID();
  await db.query(`insert into diagnostic_student_reviews
    (id,classroom_id,student_id,version,status,details,source_snapshot,created_by)
    values($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7)`,
    [id,classroom.id,studentId,version,JSON.stringify(details),JSON.stringify(snapshot),teacherId]);
  return { id, student_id: studentId, version, status: "draft", details, teacher_confirmed_at: null, is_current: true };
}

export async function saveDiagnosticStudentReview(db, teacherId, id, details) {
  const { classroom } = await scope(db, teacherId);
  const validated = validateStudentReviewDetails(details);
  const saved = (await db.query(`update diagnostic_student_reviews set details=$1::jsonb,updated_at=now()
    where id=$2 and classroom_id=$3 and created_by=$4 and status='draft' returning *`,
    [JSON.stringify(validated), id, classroom.id, teacherId])).rows[0];
  if (!saved) fail("not_editable", "El comentario no es un borrador editable de tu aula.");
  return publicStudentReview(saved);
}

export async function confirmDiagnosticStudentReview(db, teacherId, id) {
  const { classroom } = await scope(db, teacherId);
  const row = (await db.query(`select * from diagnostic_student_reviews
    where id=$1 and classroom_id=$2 and created_by=$3 and status='draft'`, [id, classroom.id, teacherId])).rows[0];
  if (!row) fail("not_editable", "El comentario no es un borrador editable de tu aula.");
  const details = validateStudentReviewDetails(row.details);
  const { rows, snapshot } = await studentReviewSources(db, classroom.id, row.student_id);
  if (!sameDiagnosticSources(row.source_snapshot, snapshot))
    fail("stale_sources", "La entrevista o las observaciones cambiaron. Actualiza el borrador antes de confirmar.");
  if (!rows.length && details.information_status !== "insufficient_information")
    fail("invalid_details", "Sin observaciones docentes, indica que aún necesitas observar más.");
  const confirmed = (await db.query(`update diagnostic_student_reviews set status='confirmed',teacher_confirmed_at=now(),updated_at=now()
    where id=$1 and status='draft' returning *`, [id])).rows[0];
  return publicStudentReview(confirmed);
}

async function confirmedSnapshot(db, classroomId, currentSnapshots = null) {
  const studentRows = (await db.query(`select r.id,r.student_id,r.version,r.details,r.source_snapshot,r.teacher_confirmed_at
    from diagnostic_student_reviews r join students s on s.id=r.student_id
    where r.classroom_id=$1 and s.classroom_id=$1 and s.status='active' and r.status='confirmed'
    order by r.student_id,r.version desc`, [classroomId])).rows;
  if (studentRows.length) {
    const latest = new Map();
    for (const row of studentRows) if (!latest.has(row.student_id)) latest.set(row.student_id, row);
    const activeCount = (await db.query(`select count(*)::int as total from students where classroom_id=$1 and status='active'`, [classroomId])).rows[0].total;
    if (latest.size < activeCount) fail("incomplete_children", "Revisa el comentario de cada niño antes de revisar el aula.");
    for (const row of latest.values()) {
      const snapshot = currentSnapshots?.get(row.student_id) ?? (await studentReviewSources(db, classroomId, row.student_id)).snapshot;
      if (!sameDiagnosticSources(row.source_snapshot, snapshot))
        fail("stale_sources", "Hay entrevistas u observaciones nuevas. Revisa de nuevo al niño antes de revisar el aula.");
    }
    return [...latest.values()].map((row) => ({ id: row.id,
      fingerprint: hash([row.version,row.details,row.teacher_confirmed_at]) })).sort((a,b) => a.id.localeCompare(b.id));
  }
  const rows = (await db.query(`select r.id, r.student_id, r.competency_v4_id, r.version,
      r.details, r.teacher_confirmed_at
    from diagnostic_competency_reviews r join students s on s.id = r.student_id
    where r.classroom_id = $1 and s.classroom_id = $1 and s.status = 'active'
      and r.status = 'confirmed'
    order by r.student_id, r.competency_v4_id, r.version desc`, [classroomId])).rows;
  const latest = new Map();
  for (const row of rows) {
    const key = `${row.student_id}:${row.competency_v4_id}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()].map((row) => ({ id: row.id, fingerprint: hash([row.version, row.details, row.teacher_confirmed_at]) })).sort((a,b) => a.id.localeCompare(b.id));
}

export async function prepareDiagnosticGroupReview(db, teacherId) {
  const { classroom } = await scope(db, teacherId);
  const snapshot = await confirmedSnapshot(db, classroom.id);
  if (!snapshot.length) fail("no_confirmations", "Confirma al menos una síntesis individual antes de revisar el grupo.");
  const existing = (await db.query(`select id,details from diagnostic_group_reviews where classroom_id = $1 and status = 'draft'`, [classroom.id])).rows[0];
  if (existing) {
    await db.query(`update diagnostic_group_reviews set source_snapshot = $1::jsonb, updated_at = now() where id = $2`, [JSON.stringify(snapshot), existing.id]);
    return { id: existing.id, details: existing.details, status: "draft" };
  }
  const version = (await db.query(`select coalesce(max(version),0)::int + 1 as next from diagnostic_group_reviews where classroom_id = $1`, [classroom.id])).rows[0].next;
  const id = randomUUID();
  const details = { strengths: "", needs: "", planning_priorities: "" };
  await db.query(`insert into diagnostic_group_reviews
    (id,classroom_id,version,status,details,source_snapshot,created_by)
    values($1,$2,$3,'draft',$4::jsonb,$5::jsonb,$6)`, [id,classroom.id,version,JSON.stringify(details),JSON.stringify(snapshot),teacherId]);
  return { id, details, status: "draft" };
}

/** Build a model-safe projection; known names are returned separately for output validation. */
export async function diagnosticGroupProposalSources(db, teacherId, draftId) {
  const { classroom, students } = await scope(db, teacherId);
  const draft = (await db.query(`select source_snapshot from diagnostic_group_reviews
    where id=$1 and classroom_id=$2 and created_by=$3 and status='draft'`, [draftId, classroom.id, teacherId])).rows[0];
  if (!draft) fail("not_editable", "Prepara primero el borrador del aula.");
  const sourceSnapshot = await confirmedSnapshot(db, classroom.id);
  if (!sameDiagnosticSources(draft.source_snapshot, sourceSnapshot))
    fail("stale_sources", "Los comentarios de los niños cambiaron. Actualiza el resumen del aula.");
  const comments = (await db.query(`select distinct on (r.student_id) r.details
    from diagnostic_student_reviews r join students s on s.id=r.student_id
    where r.classroom_id=$1 and s.classroom_id=$1 and s.status='active' and r.status='confirmed'
    order by r.student_id,r.version desc`, [classroom.id])).rows;
  if (comments.length !== students.length || !comments.length)
    fail("incomplete_children", "Revisa el comentario de cada niño antes de preparar el resumen del aula.");
  const names = (await db.query(`select first_name,last_name,preferred_name from students
    where classroom_id=$1 and status='active'`, [classroom.id])).rows
    .flatMap((row) => [row.first_name, row.last_name, row.preferred_name,
      [row.first_name, row.last_name].filter(Boolean).join(" ")]).filter(Boolean);
  return { age: classroom.age_years, student_count: students.length,
    comments: comments.map((row) => ({
      information_status: row.details.information_status,
      comment: neutralizeAssessmentText(row.details.comment_text, names).slice(0, 3000),
    })), known_names: names, source_snapshot: sourceSnapshot };
}

export async function saveDiagnosticGroupReview(db, teacherId, id, details) {
  const { classroom } = await scope(db, teacherId);
  const validated = validateGroupDetails(details);
  const result = await db.query(`update diagnostic_group_reviews set details = $1::jsonb, updated_at = now()
    where id = $2 and classroom_id = $3 and created_by = $4 and status = 'draft' returning id,version,status,details,teacher_confirmed_at`,
  [JSON.stringify(validated), id, classroom.id, teacherId]);
  if (!result.rows.length) fail("not_editable", "La revisión del grupo ya está confirmada o no pertenece a tu aula.");
  return result.rows[0];
}

export async function confirmDiagnosticGroupReview(db, teacherId, id) {
  const { classroom } = await scope(db, teacherId);
  const row = (await db.query(`select * from diagnostic_group_reviews where id = $1 and classroom_id = $2
    and created_by = $3 and status = 'draft'`, [id,classroom.id,teacherId])).rows[0];
  if (!row) fail("not_editable", "La revisión del grupo ya está confirmada o no pertenece a tu aula.");
  validateGroupDetails(row.details);
  if (!sameDiagnosticSources(row.source_snapshot, await confirmedSnapshot(db, classroom.id)))
    fail("stale_sources", "Cambiaron los diagnósticos individuales. Vuelve a preparar la revisión grupal.");
  const workspace = await loadDiagnosticAssessmentWorkspace(db, teacherId);
  const children = workspace.students.map((student) => {
    const review = workspace.student_reviews.find((item) => item.student_id === student.id && item.status === "confirmed" && item.is_current);
    return review ? { student_id: student.id, name: student.name, review_id: review.id,
      information_status: review.details.information_status, teacher_comment: review.details.comment_text,
      has_confirmed_interview: Boolean(student.family_context),
      family_context: student.family_context ? Object.fromEntries(["language_context", "interests", "autonomy_context", "adaptation_context", "communication_emotional_context", "social_context"]
        .filter((key) => typeof student.family_context[key] === "string" && student.family_context[key].trim())
        .map((key) => [key, student.family_context[key].slice(0, 500)])) : null } : null;
  });
  // Legacy group reviews were based on per-competency comments. They retain
  // their original exporter; only the current one-comment-per-child flow uses
  // the unified nominal report.
  const details = children.every(Boolean) ? { ...row.details, document_format: "diagnostic-unified-v1",
    report_snapshot: {
      version: "diagnostic-unified-v1", children,
      religion_applicable: classroom.religion_applicable === true,
      castellano_l2_applicable: classroom.castellano_l2_applicable === true,
      observations: workspace.observations.map((item) => ({ id: item.id, student_id: item.student_id,
        competency_id: item.competency_v4_id, observed_at: item.observed_at,
        observation_text: item.observation_text || "", aspect_prompt: item.aspect_prompt || "",
        observation_status: item.observation_status })),
      competency_coverage: workspace.group_coverage,
    } } : row.details;
  const confirmed = await db.query(`update diagnostic_group_reviews set status = 'confirmed', details=$2::jsonb,
    teacher_confirmed_at = now(), updated_at = now() where id = $1 and status = 'draft'
    returning id,version,status,details,teacher_confirmed_at`, [id, JSON.stringify(details)]);
  await completeDiagnosticReviewForTeacher(db, teacherId);
  return confirmed.rows[0];
}
