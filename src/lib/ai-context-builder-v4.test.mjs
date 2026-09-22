import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { buildAIContext, MissingWorkflowContextError } from "./ai-context-builder-v4.mjs";

const activityFive = {
  workflow: "activity", age: 5,
  teacher_request: "Preparar una actividad para explicar oralmente un descubrimiento.",
  activity_purpose: "Explicar oralmente lo descubierto al explorar semillas.",
  competency_ids: ["COM_ORAL"],
  classroom_context: { id: "class-5", group_context: "grupo pequeño", materials: ["semillas"], private_note: "omit" },
  evidence: { criterion_id: "criterion-1", observed_status: "with_support", raw_photo: "omit" },
};

function assertBoundedAndTraceable(bundle, workflow) {
  assert.ok(bundle.knowledge.semantic_units.length <= workflow.max_semantic_units);
  assert.ok(bundle.knowledge.source_claims.length <= workflow.max_source_claims);
  assert.equal(new Set(bundle.provenance.knowledge_unit_ids).size, bundle.provenance.knowledge_unit_ids.length);
  assert.equal(new Set(bundle.provenance.source_claim_ids).size, bundle.provenance.source_claim_ids.length);
  assert.equal(new Set(bundle.provenance.source_refs).size, bundle.provenance.source_refs.length);
}

test("A: activity de 5 años confirmada produce un bundle reducido, estable y trazable", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const first = await buildAIContext(activityFive, knowledgeBase);
  const second = await buildAIContext(activityFive, knowledgeBase);
  assert.deepEqual(first, second);
  assert.deepEqual(first.curriculum.competency_cards.map((card) => card.id), ["COM_ORAL"]);
  assert.deepEqual(first.curriculum.age_reference.map((reference) => reference.age), [5]);
  assert.deepEqual(first.knowledge.pedagogical_modules.map((module) => module.id), ["activity_design", "teacher_interaction_and_mediation", "evidence_and_criteria"]);
  assert.deepEqual(first.context.classroom, { id: "class-5", group_context: "grupo pequeño", materials: ["semillas"] });
  assert.equal(first.context.student, null);
  assert.deepEqual(first.context.evidence, { criterion_id: "criterion-1", observed_status: "with_support" });
  assertBoundedAndTraceable(first, knowledgeBase.workflows.activity);
});

test("B: activity de 4 años sin competencia confirmada no rellena L2 ni Religión", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({ workflow: "activity", age: 4, teacher_request: "Proponer una actividad de exploración.", activity_purpose: "Explorar materiales y compartir hallazgos." }, knowledgeBase);
  const ids = bundle.curriculum.competency_cards.map((card) => card.id);
  assert.ok(ids.length <= 3);
  assert.ok(!ids.includes("CAST_L2_ORAL") && !ids.includes("PS_RELIGION"));
  assert.equal(Object.hasOwn(bundle.curriculum, "primary_competency_id"), false);
  assertBoundedAndTraceable(bundle, knowledgeBase.workflows.activity);
});

test("C: criterion_and_evidence conserva una competencia confirmada y su referencia de edad", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "criterion_and_evidence", age: 5, teacher_request: "Redactar un criterio contextual para una indagación.",
    competency_ids: ["CYT_INDAGA"], learning_situation: "Las niñas y niños comparan qué semillas germinan con agua.",
    evidence: { criterion_id: "criterion-2", expected_evidence: "explicación de la comparación" },
  }, knowledgeBase);
  assert.deepEqual(bundle.curriculum.competency_cards.map((card) => card.id), ["CYT_INDAGA"]);
  assert.deepEqual(bundle.curriculum.age_reference.map((reference) => reference.age), [5]);
  assert.ok(bundle.context.evidence);
  assertBoundedAndTraceable(bundle, knowledgeBase.workflows.criterion_and_evidence);
});

test("D: diagnostic de 3 años conserva lenguaje relevante y excluye tarjetas especiales no aplicables", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "diagnostic", age: 3, teacher_request: "Organizar observaciones iniciales del aula.", classroom_or_student_scope: "aula completa",
    language_context: { home_languages: ["quechua", "castellano"] },
  }, knowledgeBase);
  assert.deepEqual(bundle.context.classroom, { classroom_or_student_scope: "aula completa", language_context: { home_languages: ["quechua", "castellano"] } });
  assert.ok(bundle.curriculum.competency_cards.every((card) => !["CAST_L2_ORAL", "PS_RELIGION"].includes(card.id)));
  assertBoundedAndTraceable(bundle, knowledgeBase.workflows.diagnostic);
});

test("E: material_generation de 5 años entrega reglas y restricciones completas", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "material_generation", age: 5, teacher_request: "Diseñar tarjetas para clasificar hojas durante una exploración.",
    activity_purpose: "Clasificar hojas según atributos observables.", requested_material_type: "tarjetas ilustradas",
  }, knowledgeBase);
  assert.equal(bundle.knowledge.generation_rules.version, "3.0.0");
  assert.ok(bundle.curriculum.competency_cards.every((card) => !["CAST_L2_ORAL", "PS_RELIGION"].includes(card.id)));
  assert.ok(bundle.constraints.must_not.includes("Pick competency from topic keyword only."));
  assertBoundedAndTraceable(bundle, knowledgeBase.workflows.material_generation);
});

test("detecta exactamente required_user_context faltante sin construir un bundle", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(
    () => buildAIContext({ workflow: "evidence_capture", age: 5, teacher_request: "Registrar evidencia." }, knowledgeBase),
    (error) => error instanceof MissingWorkflowContextError && error.code === "MISSING_REQUIRED_USER_CONTEXT"
      && error.workflow === "evidence_capture" && error.missing_fields.join(",") === "student_id,criterion_id,observed_status",
  );
});

test("preserva calendario, lenguaje y tiempo solo cuando el workflow los requiere", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "annual_plan", age: 5, teacher_request: "Preparar el plan anual.", calendar_context: { start: "2026-03-16", weeks: 36 },
    classroom_context: { id: "class-5", calendar: { ignored: true }, language_context: { home_languages: ["asháninka"] } },
    temporal_context: { year: 2026, event: "school_year_start" },
  }, knowledgeBase);
  assert.deepEqual(bundle.context.classroom.calendar_context, { start: "2026-03-16", weeks: 36 });
  assert.deepEqual(bundle.context.classroom.language_context, { home_languages: ["asháninka"] });
  assert.deepEqual(bundle.context.classroom.temporal_context, { year: 2026, event: "school_year_start" });
  assert.ok(bundle.provenance.knowledge_unit_ids.some((id) => id.includes("2026")));
});

test("aplicabilidad especial confirmada exige contexto válido", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(() => buildAIContext({ ...activityFive, competency_ids: ["CAST_L2_ORAL"] }, knowledgeBase), /L2 no es aplicable/);
  await assert.rejects(() => buildAIContext({ ...activityFive, competency_ids: ["PS_RELIGION"] }, knowledgeBase), /Religión no es aplicable/);
});

const workflowCases = [
  ["diagnostic", { age: 3, classroom_or_student_scope: "aula-diagnóstico" }, "classroom_or_student_scope", "aula-diagnóstico"],
  ["annual_plan", { age: 4, calendar_context: { term: "2026-I" }, classroom_context: { id: "aula-anual" } }, "calendar_context", "2026-I"],
  ["project", { age: 4, classroom_context: { id: "aula-proyecto" }, project_trigger_or_interest: "¿Por qué caen las hojas?" }, "classroom_context", "¿Por qué caen las hojas?"],
  ["unit", { age: 4, classroom_context: { id: "aula-unidad" }, learning_need_or_context: "ordenar colecciones" }, "classroom_context", "ordenar colecciones"],
  ["workshop", { age: 4, workshop_purpose: "explorar arcilla", frequency_or_time: "viernes 30 minutos" }, "workshop_purpose", "explorar arcilla"],
  ["activity", { age: 5, activity_purpose: "comparar sonidos" }, "activity_purpose", "comparar sonidos"],
  ["criterion_and_evidence", { age: 5, competency_ids: ["COM_ORAL"], learning_situation: "Conversan sobre una visita." }, "competency_ids", "Conversan sobre una visita."],
  ["evidence_capture", { age: 5, student_id: "student-capture", criterion_id: "criterion-capture", observed_status: "demonstrated" }, "student_id", "student-capture"],
  ["assessment", { age: 5, student_id: "student-assessment", competency_ids: ["COM_ORAL"], evidence_history: ["record-1"] }, "student_id", "record-1"],
  ["descriptive_conclusion", { age: 5, student_id: "student-conclusion", competency_ids: ["COM_ORAL"], multiple_evidence_records: ["record-1", "record-2"] }, "student_id", "record-2"],
  ["family_report", { age: 5, competency_ids: ["COM_ORAL"], student_context: { id: "student-family" }, teacher_confirmed_findings: "Avanza al conversar con pares." }, "student_context", "Avanza al conversar con pares."],
  ["material_generation", { age: 5, activity_purpose: "explorar semillas", requested_material_type: "tarjetas de clasificación" }, "activity_purpose", "tarjetas de clasificación"],
  ["today_mode", { age: 5, current_schedule_block: "actividad de exploración", active_plan: "plan semanal 1" }, "current_schedule_block", "actividad de exploración"],
];

test("contrato mínimo y determinista de los 13 workflows", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  for (const [workflow, values, missingField, expectedValue] of workflowCases) {
    const input = { workflow, teacher_request: `Solicitud de ${workflow}.`, ...values, unrelated: "never-send", classroom_context: values.classroom_context ? { ...values.classroom_context, unrelated: "never-send" } : values.classroom_context };
    const first = await buildAIContext(input, knowledgeBase);
    const second = await buildAIContext(input, knowledgeBase);
    assert.deepEqual(first, second, `${workflow} debe ser determinista`);
    assert.ok(JSON.stringify(first).includes(expectedValue), `${workflow} debe conservar su contexto obligatorio relevante`);
    assert.equal(JSON.stringify(first.context).includes("never-send"), false, `${workflow} no debe enviar contexto irrelevante`);

    const incomplete = { ...input };
    delete incomplete[missingField];
    await assert.rejects(() => buildAIContext(incomplete, knowledgeBase), `${workflow} debe rechazar un required_user_context faltante`);
  }
});

test("preserva inputs de workflow sin depender de teacher_request", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const project = await buildAIContext({ workflow: "project", age: 5, teacher_request: "Crear propuesta.", classroom_context: { id: "project-class" }, project_trigger_or_interest: "Una pregunta sobre sombras." }, knowledgeBase);
  const activity = await buildAIContext({ workflow: "activity", age: 5, teacher_request: "Crear propuesta.", activity_purpose: "Explorar sombras." }, knowledgeBase);
  const criterion = await buildAIContext({ workflow: "criterion_and_evidence", age: 5, teacher_request: "Crear propuesta.", competency_ids: ["CYT_INDAGA"], learning_situation: "Prueban luz y sombra." }, knowledgeBase);
  const materials = await buildAIContext({ workflow: "material_generation", age: 5, teacher_request: "Crear propuesta.", activity_purpose: "Explorar sombras.", requested_material_type: "linternas y tarjetas" }, knowledgeBase);
  const today = await buildAIContext({ workflow: "today_mode", age: 5, teacher_request: "Crear propuesta.", current_schedule_block: "exploración", active_plan: "plan de lunes" }, knowledgeBase);
  assert.equal(project.context.workflow_inputs.project_trigger_or_interest, "Una pregunta sobre sombras.");
  assert.equal(activity.context.workflow_inputs.activity_purpose, "Explorar sombras.");
  assert.equal(criterion.context.workflow_inputs.learning_situation, "Prueban luz y sombra.");
  assert.equal(materials.context.workflow_inputs.requested_material_type, "linternas y tarjetas");
  assert.deepEqual(today.context.workflow_inputs, { current_schedule_block: "exploración", active_plan: "plan de lunes" });
});

test("objetos vacíos no satisfacen contexto obligatorio y el shortlist no se rellena", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(() => buildAIContext({ workflow: "annual_plan", age: 5, teacher_request: "Plan.", calendar_context: {}, classroom_context: {} }, knowledgeBase), MissingWorkflowContextError);
  await assert.rejects(() => buildAIContext({ workflow: "family_report", age: 5, teacher_request: "Informe.", student_context: {}, teacher_confirmed_findings: {} }, knowledgeBase), MissingWorkflowContextError);
  const bundle = await buildAIContext({ workflow: "activity", age: 5, teacher_request: "Actividad.", activity_purpose: "Explorar." }, knowledgeBase);
  assert.deepEqual(bundle.curriculum.competency_cards, []);
});
