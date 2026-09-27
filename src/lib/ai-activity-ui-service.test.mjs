import test from "node:test";
import assert from "node:assert/strict";
import { buildTeacherActivityGenerationInput, generateTeacherActivity, ActivityGenerationUIError, teacherMessageForActivityGenerationError } from "./ai-activity-ui-service.mjs";

const classroom = { id: "classroom-5", section: "Sala Amarilla", age: 5 };
const request = { activityPurpose: "Explorar cambios de sombra.", context: "El grupo juega con linternas.", materials: ["linternas", "papel"] };
const proposal = { title: "Sombras", purpose: "Explorar", meaningful_situation: "Situación", teacher_preparation: "Preparar", child_actions: "Explorar", mediation: "Preguntar", evidence_opportunities: "Observar", closure_or_continuity: "Cerrar", competency_status: "unconfirmed", competency_id: null };
const plan = { execution: "generation", provider: "openai", model: "gpt-6-luna", reasoning_effort: "medium" };

test("A y H: prepara activity sin competencia con aula y materiales precargados", () => {
  const input = buildTeacherActivityGenerationInput({ request, classroom });
  assert.equal(input.age, 5);
  assert.equal(input.classroom_context.section, "Sala Amarilla");
  assert.deepEqual(input.classroom_context.materials, ["linternas", "papel"]);
  assert.equal(input.competency_ids, undefined);
});

test("B: conserva exactamente una competencia confirmada", () => {
  const input = buildTeacherActivityGenerationInput({ request: { ...request, competencyId: "CYT_INDAGA" }, classroom });
  assert.deepEqual(input.competency_ids, ["CYT_INDAGA"]);
});

test("D-G: conserva el contexto pedagógico mínimo del parent y su continuidad", () => {
  const learningExperience = {
    id: "project-1", type: "project", title: "Sombras", purpose: "Indagar", prior_activities: [{ occurs_on: "2026-04-01", title: "Luz", purpose: "Observar", closure_or_continuity: "Cambiar distancia" }],
    details: { trigger_or_interest: "¿Por qué cambia?", primary_competency_ids: ["CYT_INDAGA"], possible_pathways: ["Mover luz"], spaces_and_materials: ["linternas"], family_or_community_links: ["Conversar"], adjustment_points: ["Parejas"], flexibility_notes: "Seguir preguntas" },
  };
  const input = buildTeacherActivityGenerationInput({ request: { ...request, materials: ["papel"] }, classroom, learningExperience });
  assert.equal(input.learning_experience_context.title, "Sombras");
  assert.deepEqual(input.learning_experience_context.possible_pathways, ["Mover luz"]);
  assert.equal(input.learning_experience_context.prior_activities[0].closure_or_continuity, "Cambiar distancia");
  assert.deepEqual(input.classroom_context.materials, ["linternas", "papel"]);
});

test("la actividad de una fila recibe el Project Master confirmado, sus vecinas y su posición", () => {
  const route = [
    { id: "route-1", number: 1, date: "2026-04-13", title: "Preguntamos", specific_purpose: "Recoger preguntas", competency_id: "CYT_INDAGA", evaluation_criterion: "Formula preguntas", expected_evidence: "Pregunta registrada" },
    { id: "route-2", number: 2, date: "2026-04-14", title: "Observamos", specific_purpose: "Comparar cambios", competency_id: "CYT_INDAGA", evaluation_criterion: "Compara cambios", expected_evidence: "Explicación" },
    { id: "route-3", number: 3, date: "2026-04-15", title: "Compartimos", specific_purpose: "Comunicar hallazgos", competency_id: "CYT_INDAGA", evaluation_criterion: "Comunica hallazgos", expected_evidence: "Relato" },
  ];
  const learningExperience = { id: "project-2", type: "project", title: "Plantas", purpose: "Indagar cambios",
    details: { flow_version: "project-master-v1", decisions: { purpose: "Indagar cambios" }, dependents: { guiding_questions: ["¿Qué cambia?"] },
      project_master: { foundation: "Pregunta del grupo" }, activity_route: route } };
  const input = buildTeacherActivityGenerationInput({ request: { ...request, routeItemId: "route-2", context: "Hoy apareció una hoja nueva." }, classroom, learningExperience });
  assert.equal(input.activity_purpose, "Comparar cambios");
  assert.equal(input.learning_experience_context.confirmed_project_master.project_master.foundation, "Pregunta del grupo");
  assert.equal(input.learning_experience_context.confirmed_project_master.activity_route, undefined);
  assert.deepEqual(input.learning_experience_context.route_position, { number: 2, total: 3 });
  assert.equal(input.learning_experience_context.previous_map_item.id, "route-1");
  assert.equal(input.learning_experience_context.next_map_item.id, "route-3");
  assert.match(input.classroom_context.group_context, /hoja nueva/);
});

test("genera solo activity, conserva metadata interna y no envía datos privados", async () => {
  let providerRequest;
  const result = await generateTeacherActivity({
    request: { ...request, photo_path: "/private/photo.jpg", evidence: { media: "binary" } },
    classroom,
    resolvePlan: () => plan,
    createProvider: (receivedPlan) => ({ id: receivedPlan.provider }),
    generate: async (input, options) => {
      providerRequest = input;
      assert.equal(options.executionPlan.model, "gpt-6-luna");
      return { output: proposal, metadata: { workflow: "activity", model: "gpt-6-luna", response_id: "resp_mock", usage: { input_tokens: 1 }, execution_plan: plan }, provenance: { knowledge_unit_ids: ["unit-1"] } };
    },
  });
  assert.equal(result.proposal.competency_status, "unconfirmed");
  assert.equal(result.internalMetadata.response_id, "resp_mock");
  assert.doesNotMatch(JSON.stringify(providerRequest), /private|binary|photo_path/);
});

test("rechaza propósito ausente, workflows alternos y mapea errores amigables", async () => {
  assert.throws(() => buildTeacherActivityGenerationInput({ request: {}, classroom }), ActivityGenerationUIError);
  await assert.rejects(
    () => generateTeacherActivity({ request, classroom, resolvePlan: () => ({ execution: "code" }) }),
    (error) => error instanceof ActivityGenerationUIError,
  );
  assert.equal(teacherMessageForActivityGenerationError({ reason: "rate_limited" }), "El servicio está ocupado. Inténtalo nuevamente en unos momentos.");
  assert.equal(teacherMessageForActivityGenerationError({ reason: "authentication_failed" }), "No se pudo acceder al servicio de IA.");
});
