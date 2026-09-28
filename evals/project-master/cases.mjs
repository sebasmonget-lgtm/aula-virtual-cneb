import { createHash } from "node:crypto";

export const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export function stableUuid(value) {
  const hex = sha256(value);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const periodStart = { 1: "2026-03-30", 2: "2026-06-01", 3: "2026-08-17", 4: "2026-11-02" };
function datesFrom(start, exception = null) {
  const dates = [];
  let day = new Date(`${start}T00:00:00Z`);
  while (dates.length < 8) {
    const date = day.toISOString().slice(0, 10);
    if (day.getUTCDay() > 0 && day.getUTCDay() < 6 && date !== exception) dates.push(date);
    day = new Date(day.getTime() + 86_400_000);
  }
  return dates;
}

const topics = [
  { title: "Preguntas sobre plantas del patio", competency_ids: ["CYT_INDAGA", "COM_ORAL"],
    context: "El grupo mira brotes del patio y pregunta por cambios visibles; no se presupone que todos observaron lo mismo.",
    purpose: "Comparar cambios observables en plantas y comunicar preguntas y hallazgos." },
  { title: "Organizamos materiales para jugar", competency_ids: ["MAT_CANTIDAD", "PS_CONVIVE"],
    context: "Se necesitan acuerdos para repartir materiales reutilizables en juegos compartidos.",
    purpose: "Resolver repartos concretos y acordar el uso compartido de materiales." },
  { title: "Rutas por espacios conocidos", competency_ids: ["MAT_FORMA", "COM_ORAL"],
    context: "Los espacios del aula permiten recorrer rutas distintas y explicar trayectos.",
    purpose: "Explorar posiciones y desplazamientos mientras comunican cómo siguieron una ruta." },
  { title: "Contamos historias para otros", competency_ids: ["COM_ORAL", "COM_LECTURA"],
    context: "El grupo disfruta escuchar relatos y observar libros de la biblioteca del aula.",
    purpose: "Compartir narraciones y explorar indicios de textos sin exigir lectura convencional." },
];

function makeCase(id, kind, age, period, variant, topic, overrides = {}) {
  const dates = datesFrom(overrides.starts_on ?? periodStart[period], overrides.exception_date);
  const context = variant === "baseline" ? "No hay información nueva; usar la propuesta anual." :
    overrides.changed_context ?? "La docente observó un nuevo interés grupal y dispone de menos materiales; ajustar mediación sin inventar hechos individuales.";
  const competencyIds = overrides.competency_ids ?? topic.competency_ids;
  return { id, kind, age, period, context_variant: variant,
    split: kind === "base" && period <= 2 ? "development" : "blind_test",
    legacy: overrides.legacy === true,
    qa_source: overrides.qa_source ?? null, expected_outcome: overrides.expected_outcome ?? null,
    provisional_case_rationale: overrides.provisional_case_rationale ?? null,
    title: overrides.title ?? topic.title, dates, exception_date: overrides.exception_date ?? null,
    classroom_context: { age, group_context: topic.context, available_resources: overrides.resources ?? ["papel", "material reutilizable", "patio"],
      castellano_l2_applicable: overrides.bilingual === true, religion_applicable: false },
    annual_proposal: { title: overrides.title ?? topic.title, purpose: topic.purpose,
      primary_competency_ids: competencyIds, rationale: topic.context },
    teacher_decisions: { context_summary: `${topic.context} ${context}`, purpose: overrides.purpose ?? topic.purpose,
      competency_ids: competencyIds, additional_context: variant === "baseline" ? "" : context },
    source: { annual_plan_id: stableUuid(`${id}:plan`), annual_plan_version: overrides.legacy ? 1 : 2,
      proposal_id: stableUuid(`${id}:proposal`), slot_id: stableUuid(`${id}:slot`) },
  };
}

/** Fictional evaluation cases. They contain no child record or personal observations. */
export function projectMasterCases() {
  const cases = [];
  for (const age of [3, 4, 5]) for (const period of [1, 2, 3, 4])
    for (const variant of ["baseline", "changed"])
      cases.push(makeCase(`base-${age}-p${period}-${variant}`, "base", age, period, variant, topics[period - 1]));

  const qa = [
    ["qa-p1-agreements", 5, 1, topics[1], "docs/qa/end-to-end-audit-2026/06_PROYECTOS_UNIDADES.md#P1", "Mapa de acuerdos y turnos, ocho días y criterios observables."],
    ["qa-p1-garden", 5, 1, topics[0], "docs/qa/end-to-end-audit-2026/06_PROYECTOS_UNIDADES.md#P1", "Indagación del huerto sin producto decorativo obligatorio."],
    ["qa-p2-sharing", 5, 2, topics[1], "docs/qa/end-to-end-audit-2026/06_PROYECTOS_UNIDADES.md#P2", "Reparto y acuerdos sin generalizar apoyos individuales."],
    ["qa-p3-routes", 5, 3, topics[2], "docs/qa/end-to-end-audit-2026/06_PROYECTOS_UNIDADES.md#P3", "Rutas variables y comunicación de posiciones."],
    ["qa-p4-stories", 5, 4, topics[3], "docs/qa/end-to-end-audit-2026/06_PROYECTOS_UNIDADES.md#P4", "Lectura por indicios y escritura emergente, no convencional."],
    ["qa-h45-feedback", 5, 2, topics[1], "docs/qa/end-to-end-audit-2026/12_REAJUSTES.md#H45", "Distinguir valoración docente previa de diagnóstico y no inferir nivel de ausencias."],
  ];
  for (const [id, age, period, topic, qa_source, expected_outcome] of qa)
    cases.push(makeCase(id, "qa_regression", age, period, "changed", topic, { qa_source, expected_outcome }));

  const hard = [
    ["hard-legacy", 4, 1, topics[0], { legacy: true,
      provisional_case_rationale: "Propuesta anual histórica sin proposal_id propio; conservar slot alias y versión." }],
    ["hard-bilingual", 3, 2, topics[3], { bilingual: true,
      changed_context: "En el aula se escuchan castellano y otra lengua; no asumir dominio uniforme ni convertir la diversidad en déficit.",
      provisional_case_rationale: "Pertinencia lingüística y CNEB aplicable, sin inferir lengua de cada niño." }],
    ["hard-scarce-resources", 5, 3, topics[2], { resources: ["cuerdas", "papel reutilizado"],
      changed_context: "El espacio exterior no está disponible y solo hay cuerdas y papel reutilizado.",
      provisional_case_rationale: "El mapa debe ser viable con materiales y espacio restringidos." }],
    ["hard-holiday", 4, 2, topics[1], { starts_on: "2026-06-22", exception_date: "2026-06-29",
      provisional_case_rationale: "Omisión obligatoria de día no lectivo institucional, sin duplicar otro día." }],
    ["hard-dual-competency", 5, 4, topics[3], { competency_ids: ["COM_ORAL", "COM_LECTURA", "PS_CONVIVE"],
      provisional_case_rationale: "Cada criterio y evidencia debe apuntar a una de varias competencias pertinentes." }],
    ["hard-changed-purpose", 3, 1, topics[0], {
      changed_context: "La docente aclara que el patio está cerrado; el grupo quiere investigar agua con recipientes disponibles.",
      purpose: "Explorar cambios observables con agua y recipientes, comunicando preguntas.",
      provisional_case_rationale: "El contexto nuevo cambia el propósito; no repetir el huerto como si aún estuviera disponible." }],
  ];
  for (const [id, age, period, topic, overrides] of hard)
    cases.push(makeCase(id, "expert_hard", age, period, "changed", topic, overrides));
  return cases;
}
