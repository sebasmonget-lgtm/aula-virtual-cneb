import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { cardIsApplicable } from "./ai-context-builder-v4.mjs";
import { OBSERVATION_STATUSES } from "./evidence-capture-v4.mjs";

export const DIAGNOSTIC_CATALOG_VERSION = "diagnostic-v4.1";

// These are observation opportunities, not tests or a required checklist.
// The competency names and age references always come from Knowledge Base v4.
const templates = Object.freeze([
  {
    id: "getting_to_know_us", title: "Nos conocemos y organizamos el juego",
    explanation: "Ofrece espacios de juego, deja que elijan y conversa brevemente sobre cómo jugar juntos.",
    aspects: [
      { id: "choice", competencyId: "PS_IDENTIDAD", prompt: "¿Elige y cuenta qué le interesa?", patternIndex: 0 },
      { id: "conversation", competencyId: "COM_ORAL", prompt: "¿Cuenta sus ideas y escucha a otros?", patternIndex: 1 },
      { id: "agreements", competencyId: "PS_CONVIVE", prompt: "¿Propone o acepta acuerdos para jugar?", patternIndex: 1 },
    ],
  },
  {
    id: "movement_and_art", title: "Nos movemos y creamos",
    explanation: "Invita a jugar con movimientos y materiales de expresión; observa lo que cada niño decide hacer.",
    aspects: [
      { id: "movement", competencyId: "PSICO_MOTRICIDAD", prompt: "¿Explora movimientos y adapta su cuerpo al juego?", patternIndex: 0 },
      { id: "creation", competencyId: "COM_ARTE", prompt: "¿Explora materiales y expresa una idea al crear?", patternIndex: 0 },
    ],
  },
  {
    id: "count_and_locate", title: "Contamos y encontramos lugares",
    explanation: "Ofrece objetos y recorridos para que los niños resuelvan situaciones de juego a su manera.",
    aspects: [
      { id: "quantity", competencyId: "MAT_CANTIDAD", prompt: "¿Cuenta, compara o reúne objetos para resolver algo?", patternIndex: 0 },
      { id: "space", competencyId: "MAT_FORMA", prompt: "¿Ubica objetos o explica un recorrido?", patternIndex: 0 },
    ],
  },
  {
    id: "explore_our_world", title: "Exploramos nuestro entorno",
    explanation: "Deja que exploren materiales o elementos cercanos, hagan preguntas y cuenten lo que descubren.",
    aspects: [
      { id: "question", competencyId: "CYT_INDAGA", prompt: "¿Pregunta, observa o compara algo que descubrió?", patternIndex: 0 },
      { id: "tell_discovery", competencyId: "COM_ORAL", prompt: "¿Cuenta a otros lo que hizo o descubrió?", patternIndex: 0 },
    ],
  },
  {
    id: "stories_and_marks", title: "Escuchamos y contamos historias",
    explanation: "Comparte un cuento y ofrece papel o materiales para que expresen sus ideas libremente.",
    aspects: [
      { id: "reading", competencyId: "COM_LECTURA", prompt: "¿Comenta o anticipa algo del cuento?", patternIndex: 0 },
      { id: "writing", competencyId: "COM_ESCRITURA", prompt: "¿Hace trazos o marcas para comunicar una idea?", patternIndex: 0 },
      { id: "retelling", competencyId: "COM_ORAL", prompt: "¿Relata con sus palabras algo de la historia?", patternIndex: 2 },
    ],
  },
  {
    id: "spanish_second_language", title: "Jugamos y conversamos en castellano",
    explanation: "Si el castellano es segunda lengua del aula, observa la participación oral en un juego cercano.",
    aspects: [{ id: "l2_oral", competencyId: "CAST_L2_ORAL", prompt: "¿Comprende o participa oralmente en castellano durante el juego?", patternIndex: 0 }],
  },
  {
    id: "beliefs_and_care", title: "Compartimos creencias y cuidado",
    explanation: "Cuando corresponde al contexto del aula, conversa con respeto sobre el cuidado y las creencias familiares.",
    aspects: [{ id: "religion", competencyId: "PS_RELIGION", prompt: "¿Comparte una vivencia o acción de cuidado relacionada con sus creencias?", patternIndex: 0 }],
  },
]);

export class DiagnosticExperienceError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticExperienceError"; this.reason = reason; }
}

export function buildDiagnosticExperienceCatalog(knowledgeBase, { age, castellanoL2Applicable = false, religionApplicable = false }) {
  if (![3, 4, 5].includes(Number(age))) throw new DiagnosticExperienceError("invalid_age", "El aula debe ser de 3, 4 o 5 años.");
  const cards = new Map(knowledgeBase.competencyCards.map((card) => [card.id, card]));
  const applicability = { castellanoL2Applicable, religionApplicable };
  return templates.map((template) => {
    const aspects = template.aspects.flatMap((aspect) => {
      const card = cards.get(aspect.competencyId);
      if (!card || !card.runtime_selectable_by_age?.[String(age)] || !cardIsApplicable(card, applicability)) return [];
      const ageReference = card.ages?.[String(age)]?.observable_patterns?.[aspect.patternIndex];
      if (!ageReference) throw new DiagnosticExperienceError("missing_age_reference", "Falta un referente para esta edad.");
      return [{ id: aspect.id, competency_id: card.id, competency_name: card.official_name,
        area_name: card.area_name, prompt: aspect.prompt, age_reference: ageReference }];
    });
    return { id: template.id, catalog_version: DIAGNOSTIC_CATALOG_VERSION, title: template.title, explanation: template.explanation,
      aspects, competencies: [...new Map(aspects.map((aspect) => [aspect.competency_id,
        { id: aspect.competency_id, name: aspect.competency_name }])).values()] };
  }).filter((experience) => experience.aspects.length > 0);
}

export function summarizeDiagnosticExperience(students, observations, experience) {
  const studentIds = new Set(students.map((student) => student.id));
  const entries = observations.filter((item) => item.experience_id === experience.id && studentIds.has(item.student_id));
  const meaningful = entries.filter((item) => ["demonstrated", "with_support"].includes(item.observation_status));
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
  const students = (await db.query(`select id, coalesce(preferred_name, first_name) as name
    from students where classroom_id = $1 and status = 'active'
    order by coalesce(preferred_name, first_name), id`, [classroom.id])).rows;
  const knowledgeBase = await loadKnowledgeBaseV4();
  const experiences = buildDiagnosticExperienceCatalog(knowledgeBase, {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  });
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
  if (!OBSERVATION_STATUSES.includes(status)) throw new DiagnosticExperienceError("invalid_status", "Selecciona una marca observacional válida.");
  if (note != null && (typeof note !== "string" || note.trim().length > 4000)) throw new DiagnosticExperienceError("invalid_note", "La observación no puede superar 4000 caracteres.");
  const student = (await db.query(`select id from students where id = $1 and classroom_id = $2 and status = 'active'`,
    [input?.studentId, classroom.id])).rows[0];
  if (!student) throw new DiagnosticExperienceError("invalid_student", "El niño no pertenece al aula activa.");
  const knowledgeBase = await loadKnowledgeBaseV4();
  const experiences = buildDiagnosticExperienceCatalog(knowledgeBase, {
    age: classroom.age_years, castellanoL2Applicable: classroom.castellano_l2_applicable,
    religionApplicable: classroom.religion_applicable,
  });
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
    status, note?.trim() || null, teacherId, DIAGNOSTIC_CATALOG_VERSION, experience.title, aspect.prompt]);
  return { id, studentId: student.id, competencyId: aspect.competency_id };
}
