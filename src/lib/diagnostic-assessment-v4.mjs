import { createHash, randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { buildDiagnosticExperienceCatalog } from "./diagnostic-experiences-v4.mjs";
import { completeDiagnosticReviewForTeacher } from "./diagnostic-review-service.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

export class DiagnosticAssessmentError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticAssessmentError"; this.reason = reason; }
}

const fail = (reason, message) => { throw new DiagnosticAssessmentError(reason, message); };
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value, limit = 3000) => typeof value === "string" && value.trim().length <= limit ? value.trim() : null;

export function diagnosticSourceSnapshot(rows) {
  return rows.map((row) => ({ id: row.id, fingerprint: hash([
    row.student_id, row.competency_v4_id, row.experience_id, row.aspect_id,
    row.catalog_version, row.observation_status, row.observation_text ?? "",
    new Date(row.observed_at).toISOString(),
  ]) })).sort((a, b) => a.id.localeCompare(b.id));
}
export const sameDiagnosticSources = (a, b) => {
  const stable = (rows) => JSON.stringify((Array.isArray(rows) ? rows : [])
    .map((row) => [row.id, row.fingerprint]).sort((left, right) => left[0].localeCompare(right[0])));
  return stable(a) === stable(b);
};

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
  if (!summary || next === null) fail("invalid_details", "Escribe una síntesis breve y una orientación para seguir observando, si corresponde.");
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

async function scope(db, teacherId) {
  const classroom = (await db.query(`select c.id, c.section, ag.age_years, c.castellano_l2_applicable,
      c.religion_applicable from classrooms c join age_grades ag on ag.id = c.age_grade_id
      where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0];
  if (!classroom) fail("no_classroom", "No hay un aula activa.");
  const students = (await db.query(`select id, coalesce(preferred_name, first_name) as name, initial_context
    from students where classroom_id = $1 and status = 'active'
    order by coalesce(preferred_name, first_name), id`, [classroom.id])).rows;
  const catalog = buildDiagnosticExperienceCatalog(await loadKnowledgeBaseV4(), {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  });
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
  return (await db.query(`select o.id, o.student_id, o.competency_v4_id, o.experience_id,
      o.aspect_id, o.catalog_version, o.experience_title_snapshot, o.aspect_prompt_snapshot,
      o.observation_status, o.observation_text, o.observed_at
    from diagnostic_experience_observations o join students s on s.id = o.student_id
    where o.classroom_id = $1 and o.student_id = $2 and o.competency_v4_id = $3
      and s.classroom_id = $1 and s.status = 'active'
    order by o.observed_at, o.id`, [classroomId, studentId, competencyId])).rows;
}

async function scopedSources(db, teacherId, studentId, competencyId) {
  const { classroom, students, catalog } = await scope(db, teacherId);
  if (!students.some((student) => student.id === studentId)) fail("invalid_student", "El niño no pertenece al aula activa.");
  if (!catalog.some((experience) => experience.aspects.some((aspect) => aspect.competency_id === competencyId)))
    fail("invalid_competency", "Esta competencia no es aplicable al aula.");
  const rows = await sourceRows(db, classroom.id, studentId, competencyId);
  if (!rows.length) fail("no_observations", "Primero registra una observación real de esta competencia.");
  return { classroom, students, catalog, rows, snapshot: diagnosticSourceSnapshot(rows) };
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
  const observations = (await db.query(`select o.id, o.student_id, o.competency_v4_id,
      o.experience_id, o.aspect_id, o.catalog_version, o.experience_title_snapshot,
      o.aspect_prompt_snapshot, o.observation_status, o.observation_text, o.observed_at
    from diagnostic_experience_observations o join students s on s.id = o.student_id
    where o.classroom_id = $1 and s.classroom_id = $1 and s.status = 'active'
    order by o.observed_at, o.id`, [classroom.id])).rows;
  const reviews = (await db.query(`select r.* from diagnostic_competency_reviews r join students s on s.id = r.student_id
    where r.classroom_id = $1 and s.classroom_id = $1 and s.status = 'active'
    order by r.student_id, r.competency_v4_id, r.version desc`, [classroom.id])).rows;
  const groupReviews = (await db.query(`select * from diagnostic_group_reviews where classroom_id = $1 order by version desc`, [classroom.id])).rows;
  const aspects = new Map(catalog.flatMap((experience) => experience.aspects.map((aspect) => [`${experience.id}:${aspect.id}`, { experience_title: experience.title, aspect_prompt: aspect.prompt }])));
  return { students, observations: observations.map((row) => ({ ...row,
    experience_title: row.experience_title_snapshot ?? aspects.get(`${row.experience_id}:${row.aspect_id}`)?.experience_title ?? "Experiencia diagnóstica",
    aspect_prompt: row.aspect_prompt_snapshot ?? aspects.get(`${row.experience_id}:${row.aspect_id}`)?.aspect_prompt ?? "Aspecto observado",
  })), reviews: reviews.map(publicReview), group_reviews: groupReviews.map((row) => ({ id: row.id, version: row.version, status: row.status, details: row.details, teacher_confirmed_at: row.teacher_confirmed_at })),
  group_coverage: summarizeDiagnosticGroup(students, observations, reviews, catalog) };
}

export async function prepareDiagnosticSynthesis(db, teacherId, { studentId, competencyId }) {
  const { classroom, rows, snapshot } = await scopedSources(db, teacherId, studentId, competencyId);
  const factual = rows.filter((row) => ["demonstrated", "with_support"].includes(row.observation_status));
  const marks = { demonstrated: 0, with_support: 0, not_yet_demonstrated: 0, insufficient_information: 0 };
  for (const row of rows) marks[row.observation_status] += 1;
  const noted = rows.filter((row) => row.observation_text).slice(0, 3)
    .map((row) => `«${row.observation_text}»`).join("; ");
  const details = { information_status: factual.length ? "information_available" : "insufficient_information",
    summary_text: factual.length
      ? `Se registraron ${rows.length} observaciones diagnósticas: ${marks.demonstrated} "lo mostró", ${marks.with_support} "con apoyo", ${marks.not_yet_demonstrated} "aún no se observó" y ${marks.insufficient_information} con información insuficiente.${noted ? ` Notas docentes: ${noted}.` : ""} Revisa estas actuaciones y redacta tu interpretación.`.slice(0, 3000)
      : "Información insuficiente para una síntesis diagnóstica. Conviene seguir observando.",
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

async function confirmedSnapshot(db, classroomId) {
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
  const confirmed = await db.query(`update diagnostic_group_reviews set status = 'confirmed',
    teacher_confirmed_at = now(), updated_at = now() where id = $1 and status = 'draft'
    returning id,version,status,details,teacher_confirmed_at`, [id]);
  await completeDiagnosticReviewForTeacher(db, teacherId);
  return confirmed.rows[0];
}
