import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  KNOWLEDGE_BASE_V4_0_ROOT,
  KNOWLEDGE_BASE_V4_ROOT,
  loadKnowledgeBaseV4,
} from "./knowledge-base-v4.mjs";
import { retrieveKnowledgeV4 } from "./knowledge-retrieval-v4.mjs";
import { buildAIContext } from "./ai-context-builder-v4.mjs";

const readJson = async (root, relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

async function listedFiles(root, directory = "") {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(directory.replaceAll("\\", "/"), entry.name);
    return entry.isDirectory() ? listedFiles(root, relative) : [relative];
  }))).flat();
}

test("el manifest cubre todos los archivos de v4.1 y conserva v4.0 cargable", async () => {
  const current = await loadKnowledgeBaseV4();
  const legacy = await loadKnowledgeBaseV4(KNOWLEDGE_BASE_V4_0_ROOT);
  const files = (await listedFiles(KNOWLEDGE_BASE_V4_ROOT)).filter((file) => file !== "manifest.json").sort();
  assert.deepEqual(Object.keys(current.manifest.integrity.files).sort(), files);
  assert.deepEqual(current.manifest.counts, {
    sources: 36, competencies: 14, semantic_progression_candidates: 140,
    v3_semantic_units: 176, source_claims: 22, combined_retrieval_units: 374,
    workflows: 16, benchmark_cases: 50,
  });
  assert.equal(legacy.version, "4.0.0");
  assert.equal(legacy.knowledgeUnits.length, 245);
});

test("ejecuta los diez casos de recuperación entregados para v4.1", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const quality = await readJson(KNOWLEDGE_BASE_V4_ROOT, "07_quality/retrieval_cases.json");
  assert.equal(quality.cases.length, 10);
  for (const item of quality.cases) {
    const result = await retrieveKnowledgeV4({
      workflow: item.workflow,
      age: item.age,
      teacherRequest: item.teacher_request,
      confirmedCompetencyId: item.competency_id ?? null,
      applicabilityContext: item.context ?? {},
    }, knowledgeBase);
    const ids = new Set(result.units.map((unit) => unit.id));
    const domains = new Set(result.units.map((unit) => unit.domain));
    const sourceRefs = new Set(result.units.flatMap((unit) => unit.source_refs));
    if (item.must_include_any) {
      assert.ok(item.must_include_any.some((id) => ids.has(id)), `${item.id}: falta una unidad esperada`);
    }
    for (const domain of item.expected_domains ?? []) assert.ok(domains.has(domain), `${item.id}: falta ${domain}`);
    for (const id of item.must_exclude_ids ?? []) {
      assert.ok(!ids.has(id) && !sourceRefs.has(id), `${item.id}: no debe recuperar ${id}`);
    }
    for (const competencyId of item.must_exclude_competencies ?? []) {
      assert.ok(result.units.every((unit) => unit.competency_id !== competencyId
        && !unit.applicable_competency_ids?.includes(competencyId)), `${item.id}: filtró otra competencia`);
    }
    for (const domain of item.must_not_include_domains_by_default ?? []) {
      assert.ok(!domains.has(domain), `${item.id}: incluyó ${domain}`);
    }
  }
});

test("activa conocimiento intercultural solamente con aplicabilidad confirmada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const input = { workflow: "annual_plan", age: 4, teacherRequest: "Plan para contexto rural.", confirmedCompetencyId: null };
  const withoutContext = await retrieveKnowledgeV4(input, knowledgeBase);
  const withContext = await retrieveKnowledgeV4({ ...input, applicabilityContext: { intercultural_context: true } }, knowledgeBase);
  assert.ok(withoutContext.units.every((unit) => unit.domain !== "intercultural_context"));
  assert.ok(withContext.units.some((unit) => unit.id === "KB41_INTERCULTURAL_CONTEXT"));
});

test("una actividad confirmada conserva íntegro su Project Master y recibe solo didáctica pertinente", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const confirmedProject = {
    project_master: { foundation: "Organizar la tienda acordada por el grupo." },
    activity_route: [
      { id: "a-1", position: 1, title: "Organizamos los productos" },
      { id: "a-2", position: 2, title: "Repartimos materiales para la tienda", specific_purpose: "Resolver cómo repartir para que alcance." },
      { id: "a-3", position: 3, title: "Revisamos cómo funciona la tienda" },
    ],
    current_activity: { id: "a-2", position: 2, title: "Repartimos materiales para la tienda" },
  };
  const bundle = await buildAIContext({
    workflow: "activity", age: 4, competency_ids: ["MAT_CANTIDAD"],
    teacher_request: "Desarrolla la segunda actividad sin cambiar el mapa confirmado.",
    activity_purpose: "Resolver cómo repartir materiales para que alcancen.",
    learning_experience_context: { confirmed_project_master: confirmedProject },
  }, knowledgeBase);
  assert.deepEqual(bundle.context.workflow_inputs.learning_experience_context.confirmed_project_master, confirmedProject);
  assert.ok(bundle.knowledge.semantic_units.some((unit) => unit.id === "SIT_MAT_Q_DISTRIBUTE"));
  assert.ok(bundle.knowledge.semantic_units.every((unit) => unit.competency_id === null
    || unit.competency_id === "MAT_CANTIDAD"));
  assert.ok(bundle.constraints.must.some((rule) => rule.includes("actividad") || rule.includes("competencia")));
  assert.ok(bundle.constraints.must_not.some((rule) => rule.includes("situación nueva")));
});

test("assessment recibe cautela didáctica pero no situaciones hipotéticas", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const bundle = await buildAIContext({
    workflow: "assessment", age: 4, competency_ids: ["MAT_CANTIDAD"], student_id: "student-1",
    teacher_request: "Analiza únicamente las actuaciones registradas.", evidence_history: [{ id: "e-1", observation: "Repartió uno a cada compañero." }],
  }, knowledgeBase);
  assert.ok(bundle.knowledge.semantic_units.some((unit) => ["evidence_pattern", "age_didactic_adaptation"].includes(unit.kind)));
  assert.ok(bundle.knowledge.semantic_units.every((unit) => unit.domain !== "situation_families" && unit.domain !== "exemplar_patterns"));
  assert.ok(bundle.constraints.must_not.some((rule) => rule.includes("nunca convierte actuaciones esperadas")));
});

test("evidence_capture recibe solo patrones observables de la competencia confirmada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const result = await retrieveKnowledgeV4({ workflow: "evidence_capture", age: 4,
    teacherRequest: "¿Qué actuación concreta puedo registrar?", confirmedCompetencyId: "MAT_CANTIDAD" }, knowledgeBase);
  assert.ok(result.units.some((unit) => unit.id === "DIDACTICS_MATH_QUANTITY_EVIDENCE"));
  assert.ok(result.units.every((unit) => unit.domain !== "situation_families" && unit.domain !== "exemplar_patterns"));
});

test("v4.1 enriquece los benchmarks representativos sin alterar v4.0", async () => {
  const current = await loadKnowledgeBaseV4();
  const legacy = await loadKnowledgeBaseV4(KNOWLEDGE_BASE_V4_0_ROOT);
  const specification = await readJson(KNOWLEDGE_BASE_V4_ROOT, "07_quality/generation_benchmarks.json");
  const cases = {
    "GEN-ANNUAL-01": { workflow: "annual_plan", age: 4, teacherRequest: "Prioridad MAT_CANTIDAD y convivencia", domains: ["situation_families"] },
    "GEN-PROJECT-01": { workflow: "project", age: 5, teacherRequest: "Apareció un insecto y surgieron preguntas", competency: "CYT_INDAGA", domains: ["situation_families", "exemplar_patterns"] },
    "GEN-ACT-MATH-01": { workflow: "activity", age: 4, teacherRequest: "Repartir materiales", competency: "MAT_CANTIDAD", domains: ["domain_didactics", "situation_families"] },
    "GEN-ACT-READ-01": { workflow: "activity", age: 4, teacherRequest: "Investigar un animal del proyecto", competency: "COM_LECTURA", domains: ["domain_didactics", "situation_families"] },
    "GEN-WORKSHOP-PSY-01": { workflow: "workshop", age: 3, teacherRequest: "Taller psicomotor", competency: "PSICO_MOTRICIDAD", domains: ["domain_didactics"] },
    "GEN-ART-01": { workflow: "activity", age: 5, teacherRequest: "Crear con materiales", competency: "COM_ARTE", domains: ["domain_didactics", "situation_families"] },
    "GEN-ASSESS-01": { workflow: "assessment", age: 5, teacherRequest: "Analizar evidencias MAT_FORMA", competency: "MAT_FORMA", domains: ["domain_didactics"] },
  };
  assert.equal(specification.benchmarks.length, 7);
  assert.deepEqual(new Set(specification.benchmarks.map((item) => item.id)), new Set(Object.keys(cases)));
  for (const benchmark of specification.benchmarks) {
    const item = cases[benchmark.id];
    const input = { workflow: item.workflow, age: item.age, teacherRequest: item.teacherRequest,
      confirmedCompetencyId: item.competency ?? null };
    const before = await retrieveKnowledgeV4(input, legacy);
    const after = await retrieveKnowledgeV4(input, current);
    for (const domain of item.domains) {
      assert.ok(before.units.every((unit) => unit.domain !== domain), `${item.workflow}: v4.0 no contiene ${domain}`);
      assert.ok(after.units.some((unit) => unit.domain === domain), `${item.workflow}: v4.1 debe contener ${domain}`);
    }
    const contextInput = {
      workflow: item.workflow, age: item.age, teacher_request: item.teacherRequest,
      competency_ids: item.competency ? [item.competency] : [],
      classroom_context: { id: "test-classroom", group_context: "Grupo ficticio" },
      calendar_context: { school_year: 2026 },
      project_trigger_or_interest: "Pregunta expresada por el grupo",
      activity_purpose: "Desarrollar la actividad acordada en el mapa",
      workshop_purpose: "Explorar mediante el lenguaje del taller",
      frequency_or_time: "Una oportunidad semanal",
      student_id: "test-student",
      evidence_history: [{ observation_note: "Actuación ficticia registrada" }],
    };
    const beforeBundle = await buildAIContext(contextInput, legacy);
    const afterBundle = await buildAIContext(contextInput, current);
    assert.deepEqual(afterBundle.curriculum.confirmed_competency_ids, beforeBundle.curriculum.confirmed_competency_ids);
    assert.equal(afterBundle.curriculum.target_age, beforeBundle.curriculum.target_age);
    for (const domain of item.domains) {
      assert.ok(afterBundle.knowledge.semantic_units.some((unit) => unit.domain === domain),
        `${benchmark.id}: el bundle v4.1 debe incluir ${domain}`);
    }
    assert.ok(afterBundle.provenance.knowledge_unit_ids.length >= beforeBundle.provenance.knowledge_unit_ids.length,
      `${benchmark.id}: se perdió conocimiento del benchmark`);
  }
});

test("preserva los guardrails de regresión y la separación de autoridad", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const guardrails = await readJson(KNOWLEDGE_BASE_V4_ROOT, "07_quality/regression_guardrails.json");
  assert.equal(guardrails.target_base_version, "4.0.0");
  assert.equal(guardrails.must_preserve.length, 9);
  assert.equal(guardrails.must_not.length, 6);
  assert.equal(knowledgeBase.competencyCards.length, 14);
  for (const card of knowledgeBase.competencyCards) {
    assert.ok(["3", "4", "5"].every((age) => card.ages[age]));
  }
  const historical = knowledgeBase.sourceRegistry.sources.filter((source) => source.year <= 2015);
  assert.ok(historical.filter((source) => source.id.startsWith("SCIENCE_") || source.id.startsWith("PSYCHOMOTOR_")
    || source.id === "ART_LANGUAGES_2013" || source.id === "PERSONAL_SOCIAL_ROUTES_2013")
    .every((source) => source.status.includes("didactic") || source.status.includes("supplemental")));
  const historicalIds = new Set(historical.map((source) => source.id));
  assert.ok(knowledgeBase.knowledgeUnits.filter((unit) => unit.source_refs.some((id) => historicalIds.has(id)))
    .every((unit) => unit.layer !== "official_reference"));
  assert.ok(knowledgeBase.knowledgeUnits.every((unit) => unit.workflow_scope === undefined
    || unit.workflow_scope.every((workflow) => Object.hasOwn(knowledgeBase.workflows, workflow))));
  const runtimeText = JSON.stringify({ sources: knowledgeBase.sourceRegistry, units: knowledgeBase.knowledgeUnits });
  assert.doesNotMatch(runtimeText, /Juega, crea, resuelve y aprende/i);
});

test("cada fuente condicionada respeta la edad y competencia de sus unidades", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const sourceById = new Map(knowledgeBase.sourceRegistry.sources.map((source) => [source.id, source]));
  for (const unit of knowledgeBase.knowledgeUnits) {
    for (const sourceId of unit.source_refs) {
      const condition = sourceById.get(sourceId).runtime_condition;
      if (condition?.age?.length) {
        assert.ok(unit.age_scope.every((age) => condition.age.includes(age)), `${unit.id}: edad incompatible con ${sourceId}`);
      }
      if (condition?.competency_ids?.length) {
        const scopedIds = unit.competency_id ? [unit.competency_id] : unit.applicable_competency_ids;
        assert.ok(scopedIds?.length && scopedIds.every((id) => condition.competency_ids.includes(id)),
          `${unit.id}: competencia incompatible con ${sourceId}`);
      }
    }
  }
});
