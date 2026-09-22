import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { buildAIContext } from "./ai-context-builder-v4.mjs";

const activityInput = {
  workflow: "activity",
  age: 5,
  teacher_request: "Preparar una actividad para que expliquen oralmente lo que descubrieron.",
  competency_ids: ["COM_ORAL"],
  classroom_context: { id: "class-5", group_context: "grupo pequeño", materials: ["láminas"], private_note: "omit" },
  student_context: { id: "student-1", observations: ["explica con apoyo"], private_photo_path: "omit" },
  evidence: { criterion_id: "criterion-1", observed_status: "with_support", raw_photo: "omit" },
};

test("construye un bundle completo y reducido para una competencia confirmada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext(activityInput, knowledgeBase);

  assert.equal(bundle.workflow, "activity");
  assert.deepEqual(bundle.curriculum.competency_cards.map((card) => card.id), ["COM_ORAL"]);
  assert.deepEqual(bundle.curriculum.age_reference.map((reference) => reference.age), [5]);
  assert.ok(bundle.knowledge.semantic_units.length <= knowledgeBase.workflows.activity.max_semantic_units);
  assert.ok(bundle.knowledge.source_claims.length <= knowledgeBase.workflows.activity.max_source_claims);
  assert.deepEqual(bundle.knowledge.pedagogical_modules.map((module) => module.id), ["activity_design", "teacher_interaction_and_mediation", "evidence_and_criteria"]);
  assert.equal(bundle.knowledge.generation_rules.version, "3.0.0");
  assert.deepEqual(bundle.context.classroom, { id: "class-5", group_context: "grupo pequeño", materials: ["láminas"] });
  assert.deepEqual(bundle.context.student, { id: "student-1", observations: ["explica con apoyo"] });
  assert.deepEqual(bundle.context.evidence, { criterion_id: "criterion-1", observed_status: "with_support" });
  assert.equal(bundle.provenance.knowledge_base_version, "4.0.0");
  assert.deepEqual(bundle.provenance.competency_ids, ["COM_ORAL"]);
  assert.equal(new Set(bundle.provenance.knowledge_unit_ids).size, bundle.provenance.knowledge_unit_ids.length);
  assert.equal(new Set(bundle.provenance.source_refs).size, bundle.provenance.source_refs.length);
  assert.ok(bundle.constraints.must.length && bundle.constraints.must_not.length);
});

test("sin competencia confirmada entrega una shortlist y no una ganadora", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "diagnostic",
    age: 4,
    teacher_request: "Organizar observaciones iniciales del aula.",
  }, knowledgeBase);

  assert.ok(bundle.curriculum.competency_cards.length > 0 && bundle.curriculum.competency_cards.length <= 3);
  assert.ok(bundle.curriculum.competency_cards.every((card) => card.ages["4"]));
  assert.equal(Object.hasOwn(bundle.curriculum, "primary_competency_id"), false);
  assert.equal(Object.hasOwn(bundle.curriculum, "winner"), false);
});

test("incluye las reglas especiales relevantes y rechaza aplicabilidad inválida", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const l2 = await buildAIContext({
    ...activityInput,
    competency_ids: ["CAST_L2_ORAL"],
    language_context: { castellano_l2_applicable: true },
  }, knowledgeBase);
  const religion = await buildAIContext({
    ...activityInput,
    competency_ids: ["PS_RELIGION"],
    religion_applicable: true,
  }, knowledgeBase);

  assert.equal(l2.curriculum.special_applicability[0].competency_id, "CAST_L2_ORAL");
  assert.equal(religion.curriculum.special_applicability[0].competency_id, "PS_RELIGION");
  await assert.rejects(() => buildAIContext({ ...activityInput, competency_ids: ["CAST_L2_ORAL"] }, knowledgeBase), /L2 no es aplicable/);
  await assert.rejects(() => buildAIContext({ ...activityInput, competency_ids: ["PS_RELIGION"] }, knowledgeBase), /Religión no es aplicable/);
});

test("solo incorpora overlay 2026 ante un contexto temporal aplicable", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const common = { workflow: "annual_plan", age: 5, teacher_request: "Preparar un plan anual." };
  const yearOnly = await buildAIContext({ ...common, temporal_context: { year: 2026 } }, knowledgeBase);
  const schoolStart = await buildAIContext({ ...common, temporal_context: { year: 2026, event: "school_year_start" } }, knowledgeBase);

  assert.ok(yearOnly.provenance.knowledge_unit_ids.every((id) => !id.includes("2026")));
  assert.ok(schoolStart.provenance.knowledge_unit_ids.some((id) => id.includes("2026")));
});

test("valida el contrato de entrada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(() => buildAIContext({ workflow: "activity", age: 5 }, knowledgeBase), /teacher_request es obligatorio/);
  await assert.rejects(() => buildAIContext({ ...activityInput, competency_ids: ["COM_ORAL", "COM_LECTURA"] }, knowledgeBase), /una sola competencia/);
});
