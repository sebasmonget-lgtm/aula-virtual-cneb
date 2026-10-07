import { randomUUID } from "node:crypto";
import { diagnosticPedagogicalBlocks } from "./pedagogical-blocks.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { cardIsApplicable } from "./ai-context-builder-v4.mjs";
import { loadDiagnosticCatalog } from "./diagnostic-catalog-v4.mjs";
import developmentCatalog from "../../knowledge/diagnostic-experiences/catalog.json" with { type: "json" };

export const DIAGNOSTIC_CATALOG_VERSION = "diagnostic-v4.4";

// The versioned JSON is the single editorial source; fixtures are explicitly marked development-only.
export const DIAGNOSTIC_DEVELOPMENT_TEMPLATES = Object.freeze(developmentCatalog.experiences);

export class DiagnosticExperienceError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticExperienceError"; this.reason = reason; }
}

export function buildDiagnosticExperienceCatalog(knowledgeBase, { age, castellanoL2Applicable = false, religionApplicable = false }, catalogDocument = null) {
  if (![3, 4, 5].includes(Number(age))) throw new DiagnosticExperienceError("invalid_age", "El aula debe ser de 3, 4 o 5 años.");
  const cards = new Map(knowledgeBase.competencyCards.map((card) => [card.id, card]));
  const applicability = { castellanoL2Applicable, religionApplicable };
  const document = catalogDocument ?? { version: DIAGNOSTIC_CATALOG_VERSION, status: "development_fixture", experiences: DIAGNOSTIC_DEVELOPMENT_TEMPLATES };
  return document.experiences.filter((template) => template.active && (!template.ages || template.ages.includes(Number(age))))
    .sort((a,b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)).map((template) => {
    const aspects = template.aspects.flatMap((aspect) => {
      const card = cards.get(aspect.competencyId);
      if (!card || !card.runtime_selectable_by_age?.[String(age)] || !cardIsApplicable(card, applicability)) return [];
      const ageReference = card.ages?.[String(age)]?.observable_patterns?.[aspect.patternIndex];
      if (!ageReference) throw new DiagnosticExperienceError("missing_age_reference", "Falta un referente para esta edad.");
      return [{ id: aspect.id, competency_id: card.id, competency_name: card.official_name,
        area_name: card.area_name, label: aspect.label, prompt: aspect.prompt,
        examples: aspect.examples, age_reference: ageReference }];
    });
    return { id: template.id, catalog_version: document.version, catalog_status: document.status, title: template.title,
      explanation: template.explanation, teacher_instructions: template.teacher_instructions, examples: template.examples,
      pedagogical_blocks: diagnosticPedagogicalBlocks({ teacher_instructions: template.teacher_instructions, aspects }),
      aspects, competencies: [...new Map(aspects.map((aspect) => [aspect.competency_id,
        { id: aspect.competency_id, name: aspect.competency_name }])).values()] };
  }).filter((experience) => experience.aspects.length > 0);
}

export function summarizeDiagnosticExperience(students, observations, experience) {
  const studentIds = new Set(students.map((student) => student.id));
  const entries = observations.filter((item) => item.experience_id === experience.id && studentIds.has(item.student_id));
  const meaningful = entries.filter((item) => ["demonstrated", "with_support", "observed_without_judgment"].includes(item.observation_status));
  return {
    experience_id: experience.id,
    students_with_records: new Set(entries.map((item) => item.student_id)).size,
    students_with_information: new Set(meaningful.map((item) => item.student_id)).size,
    competency_coverage: experience.competencies.map((competency) => ({
      competency_id: competency.id,
      students_with_information: new Set(meaningful.filter((item) => item.competency_v4_id === competency.id).map((item) => item.student_id)).size,
    })),
  };
}

async function classroomForTeacher(db, teacherId) {
  return (await db.query(`select c.id, c.section, ag.age_years, c.castellano_l2_applicable, c.religion_applicable
    from classrooms c join age_grades ag on ag.id = c.age_grade_id
    where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0] ?? null;
}

export async function loadDiagnosticExperienceWorkspace(db, teacherId) {
  const classroom = await classroomForTeacher(db, teacherId);
  if (!classroom) throw new DiagnosticExperienceError("no_classroom", "No hay un aula activa.");
  const students = (await db.query(`select id, concat_ws(' ', coalesce(nullif(trim(preferred_name), ''), first_name), last_name) as name
    from students where classroom_id = $1 and status = 'active'
    order by coalesce(preferred_name, first_name), id`, [classroom.id])).rows;
  const knowledgeBase = await loadKnowledgeBaseV4();
  const catalog = await loadDiagnosticCatalog(knowledgeBase.competencyCards);
  const experiences = buildDiagnosticExperienceCatalog(knowledgeBase, {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  }, catalog);
  const experience_observations = (await db.query(`select deo.id, deo.student_id, deo.experience_id,
      deo.aspect_id, deo.competency_v4_id, deo.observation_status, deo.observation_text, deo.observed_at,
      deo.catalog_version
    from diagnostic_experience_observations deo
    join students s on s.id = deo.student_id and s.classroom_id = deo.classroom_id and s.status = 'active'
    where deo.classroom_id = $1 order by deo.observed_at desc, deo.id desc`, [classroom.id])).rows;
  return { classroom, students, experiences, experience_observations,
    experience_coverage: experiences.map((experience) => summarizeDiagnosticExperience(students, experience_observations, experience)) };
}

export async function recordDiagnosticExperienceObservation(db, teacherId, input) {
  const classroom = await classroomForTeacher(db, teacherId);
  if (!classroom) throw new DiagnosticExperienceError("no_classroom", "No hay un aula activa.");
  const status = input?.observationStatus;
  const note = input?.observationText;
  if (!["demonstrated", "with_support", "not_yet_demonstrated", "insufficient_information", "observed_without_judgment"].includes(status)) throw new DiagnosticExperienceError("invalid_status", "Selecciona una marca observacional válida.");
  if (note != null && (typeof note !== "string" || note.trim().length > 4000)) throw new DiagnosticExperienceError("invalid_note", "La observación no puede superar 4000 caracteres.");
  if (status === "observed_without_judgment" && !note?.trim()) throw new DiagnosticExperienceError("missing_note", "Escribe qué hizo o dijo el niño.");
  const student = (await db.query(`select id from students where id = $1 and classroom_id = $2 and status = 'active'`,
    [input?.studentId, classroom.id])).rows[0];
  if (!student) throw new DiagnosticExperienceError("invalid_student", "El niño no pertenece al aula activa.");
  const knowledgeBase = await loadKnowledgeBaseV4();
  const catalog = await loadDiagnosticCatalog(knowledgeBase.competencyCards);
  const experiences = buildDiagnosticExperienceCatalog(knowledgeBase, {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  }, catalog);
  const experience = experiences.find((item) => item.id === input?.experienceId);
  const aspect = experience?.aspects.find((item) => item.id === input?.aspectId);
  if (!aspect) throw new DiagnosticExperienceError("invalid_aspect", "El aspecto no corresponde a una experiencia aplicable.");
  const id = randomUUID();
  await db.query(`insert into diagnostic_experience_observations
    (id, classroom_id, student_id, experience_id, aspect_id, competency_v4_id,
     observation_status, observation_text, created_by, catalog_version,
     experience_title_snapshot, aspect_prompt_snapshot)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [id, classroom.id, student.id, experience.id, aspect.id, aspect.competency_id,
    status, note?.trim() || null, teacherId, experience.catalog_version, experience.title, aspect.prompt]);
  return { id, studentId: student.id, competencyId: aspect.competency_id };
}
