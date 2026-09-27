import test from "node:test";
import assert from "node:assert/strict";
import { nationalCalendarBlocks2026, nationalSchoolHolidays2026 } from "./annual-plan-calendar.mjs";
import { generateProjectPreview, generateProjectDependents, generateProjectMaster,
  instructionalDates, validateProjectMaster, preserveTeacherMapEdits,
  validateEditedActivityMap } from "./project-flow-service.mjs";

const calendar = { blocks: nationalCalendarBlocks2026(), exceptions: nationalSchoolHolidays2026() };
const decisions = { context_summary: "El grupo pregunta por plantas cercanas.", purpose: "Investigar cómo cambian las plantas.",
  competency_ids: ["CYT_INDAGA"], additional_context: "" };
const dependents = { guiding_questions: ["¿Qué vemos?", "¿Qué cambió?"], journey: [
  { title: "Preguntamos", description: "Formulamos preguntas." },
  { title: "Observamos", description: "Miramos y comparamos." }],
  general_criteria: [{ competency_id: "CYT_INDAGA", criterion: "Observa y compara cambios.",
    expected_evidence: ["Explicaciones", "Dibujos"] }] };
const master = { foundation: "El grupo pregunta por cambios visibles.", closing_description: "Compartir lo observado.",
  closing_rationale: "Permite conversar sobre las preguntas iniciales.", resources: ["Plantas del patio"],
  activities: [{ date: "2026-04-13", title: "Miramos las plantas", purpose: "Observar cambios.",
    competency_ids: ["CYT_INDAGA"], criterion_competency_id: "CYT_INDAGA",
    pedagogical_intention: "Abrir una indagación desde lo visible.", criterion_text: "Observa y compara cambios.",
    expected_evidence: "Explicaciones y dibujos sobre cambios.", acceptable_evidence_variations: ["Explicación oral", "Dibujo comentado"],
    observation_focus: ["Cómo compara lo observado"], materials: ["Plantas del patio"],
    mediation_notes: "Preguntar sin anticipar respuestas.", continuity_from_previous: "Inicia desde las preguntas del grupo.",
    continuity_to_next: "Las primeras observaciones orientan una comparación.", flexibility_notes: "Ajustar según las preguntas que aparezcan.",
    role_in_project: "Abrir la investigación.", expected_progression: "Recoger primeras preguntas.", estimated_minutes: 45 },
    { date: "2026-04-14", title: "Compartimos lo que vimos", purpose: "Comunicar hallazgos.",
      competency_ids: ["CYT_INDAGA"], criterion_competency_id: "CYT_INDAGA",
      pedagogical_intention: "Comunicar y contrastar hallazgos.", criterion_text: "Explica cambios que observó.",
      expected_evidence: "Explicación apoyada en un registro.", acceptable_evidence_variations: ["Relato oral", "Dibujo comentado"],
      observation_focus: ["Cómo relaciona su registro con lo que explica"], materials: ["Registros del grupo"],
      mediation_notes: "Invitar a escuchar ideas diferentes.", continuity_from_previous: "Retoma las observaciones registradas.",
      continuity_to_next: "Cierra reconociendo nuevas preguntas.", flexibility_notes: "Permitir distintas formas de comunicar.",
      role_in_project: "Cerrar y compartir.", expected_progression: "Comparar lo aprendido.", estimated_minutes: 45 }] };
const provider = (output, check) => () => ({ generate: async (request) => {
  check?.(request); return { output, provider_metadata: { usage: { input_tokens: 10 } } };
} });

test("las fechas útiles excluyen fines de semana, feriados y gestión", () => {
  assert.deepEqual(instructionalDates(calendar, "2026-04-13", "2026-04-17"),
    ["2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"]);
  assert.deepEqual(instructionalDates(calendar, "2026-05-15", "2026-05-25"), ["2026-05-15", "2026-05-25"]);
});

test("Sol prepara primero contexto y propósitos, después solo dependencias del propósito elegido", async () => {
  const preview = await generateProjectPreview({ context: { age: 5 }, createProvider: provider({
    context_summary: "Hay plantas cercanas.", context_points: ["Hay un patio."],
    additional_context_example: "Hay árboles junto al aula.", purpose_options: ["Observar plantas.", "Comparar cambios."]
  }, (request) => { assert.equal(request.execution_plan.model, "gpt-6-sol");
    assert.equal(request.execution_plan.reasoning_effort, "medium");
    assert.equal(request.ai_context_bundle.confirmed_questions, undefined); }), loadSkill: async () => "Skill" });
  assert.equal(preview.output.purpose_options.length, 2);
  const next = await generateProjectDependents({ context: { age: 5 }, decisions,
    createProvider: provider(dependents, (request) => {
      assert.equal(request.ai_context_bundle.confirmed_decisions.purpose, decisions.purpose);
      assert.equal(request.execution_plan.model, "gpt-6-sol");
    }), loadSkill: async () => "Skill" });
  assert.equal(next.output.general_criteria[0].competency_id, "CYT_INDAGA");
});

test("Sol devuelve mapa con fechas y competencias válidas; el servidor asigna IDs", async () => {
  const generated = await generateProjectMaster({ context: { age: 5 }, decisions, dependents,
    availableDates: ["2026-04-13", "2026-04-14"],
    createProvider: provider(master, (request) => {
      assert.equal(request.execution_plan.model, "gpt-6-sol");
      assert.equal(request.execution_plan.reasoning_effort, "medium");
      assert.deepEqual(request.ai_context_bundle.confirmed_questions, dependents.guiding_questions);
    }), loadSkill: async () => "Skill" });
  assert.equal(generated.output.activity_route[0].date, "2026-04-13");
  assert.ok(generated.output.activity_route[0].id);
  assert.equal(generated.output.activity_route[0].position,1);
  assert.equal(generated.output.activity_route[0].primary_competency_id,"CYT_INDAGA");
  assert.deepEqual(generated.output.activity_route[0].possible_secondary_competency_ids,[]);
  assert.equal(generated.output.activity_route[0].evaluation_criterion, "Observa y compara cambios.");
  assert.deepEqual(generated.output.activity_route[0].acceptable_evidence_variations,["Explicación oral","Dibujo comentado"]);
  assert.throws(() => validateProjectMaster({ ...master, activities: [{ ...master.activities[0], date: "2026-04-26" }] },
    decisions, dependents, ["2026-04-13"]));
});

test("una regeneración localizada conserva el título editado por la docente en la misma fecha", () => {
  const old = [{ id: "11111111-1111-4111-8111-111111111111", date: "2026-04-13", title: "Título docente",
    specific_purpose: "Observar", competency_ids: ["CYT_INDAGA"], competency_id: "CYT_INDAGA",
    criterion_competency_id: "CYT_INDAGA", role_in_project: "Inicio", expected_progression: "Preguntas" }];
  const generated = [{ ...old[0], id: "22222222-2222-4222-8222-222222222222", title: "Título nuevo" }];
  const merged = preserveTeacherMapEdits(generated, old, [{ route_item_id: old[0].id, field: "title" }], decisions);
  assert.equal(merged[0].title, "Título docente");
  assert.equal(merged[0].id, old[0].id);
  assert.throws(() => validateEditedActivityMap([{ ...old[0], id: "inventado" }, old[0]], decisions, dependents,
    ["2026-04-13", "2026-04-14"]));
});
