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
  assert.ok(ids.length > 0 && ids.length <= 3);
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
