import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { buildEditableAnnualSchedule, buildFlexibleAnnualSchedule, defaultInitialStage,
  nationalCalendarBlocks2026, suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";
import { ageFilteredAnnualCurriculum, generateAnnualPreplan, validateAnnualPreplan } from "./annual-preplan-service.mjs";
import { projectFormalAnnualContent, validateAnnualFormal } from "./annual-formal-service.mjs";
import { renderAnnualPlanUnifiedWord } from "./annual-plan-unified-word.mjs";

const calendar = () => ({ school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() });
const slots = () => buildFlexibleAnnualSchedule(calendar(), suggestAnnualProjectDurations(calendar()).map((duration_weeks) => ({ duration_weeks }))).projects;
const row = (slot) => ({ experience_type: "project", title: `Propuesta distinta ${slot.index}`,
  period: slot.period, month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks,
  rationale: `Motivo pedagógico para propuesta ${slot.index}`, purpose: `Propósito de propuesta ${slot.index}`,
  primary_competency_ids: ["COM_ORAL"] });

test("el paquete curricular anual contiene solo el referente de la edad del aula", async () => {
  const cards = await ageFilteredAnnualCurriculum({ age: 5 });
  assert.ok(cards.length > 5);
  assert.ok(cards.every((card) => Object.keys(card.age_reference ?? {}).every((key) => key !== "3" && key !== "4")));
  assert.ok(cards.every((card) => !Object.hasOwn(card, "ages")));
  assert.ok(!cards.some((card) => card.id === "PS_RELIGION" || card.id === "CAST_L2_ORAL"));
});

test("Sol recibe diagnóstico y currículo filtrado; sus doce filas quedan editables", async () => {
  const context = { id: "aula", year: 2026, age: 5, calendar: calendar(), source_diagnostic_review_id: "grupo",
    source_priority_review_id: "prioridad", diagnostic_group: { strengths: "Se comunican jugando." },
    confirmed_priorities: [{ title: "Más diálogo" }], annual_planning_context: { additional_notes: "Usar el huerto" },
    context_v4: { common_interests: [{ label: "plantas" }] }, group_context: "Escuela con huerto." };
  let request;
  const generated = await generateAnnualPreplan({ context, curriculum: [{ id: "COM_ORAL", name: "Se comunica oralmente", ages: { "5": {} } }],
    createProvider: () => ({ generate: async (value) => { request = value; return { output: { proposals: slots().map(row) }, provider_metadata: { usage: { input_tokens: 100 } } }; } }),
    loadSkill: async () => "Skill de prueba" });
  assert.equal(request.execution_plan.model, "gpt-6-sol");
  assert.equal(request.execution_plan.reasoning_effort, "high");
  assert.equal(request.ai_context_bundle.confirmed_group.strengths, "Se comunican jugando.");
  assert.equal(request.ai_context_bundle.confirmed_priorities[0].title, "Más diálogo");
  assert.deepEqual(Object.keys(request.ai_context_bundle.curriculum.competency_cards[0].ages), ["5"]);
  assert.equal(request.ai_context_bundle.initial_slots[5].starts_on, "2026-07-06");
  assert.equal(request.ai_context_bundle.initial_slots[11].starts_on, "2026-12-07");
  assert.match(request.ai_context_bundle.task, /la 6 a Fiestas Patrias/);
  assert.equal(generated.proposal.proposed_experiences.length, 12);
  assert.ok(generated.proposal.proposed_experiences.every((item) => item.proposal_id && item.purpose));
  assert.equal(generated.proposal.proposed_experiences[5].month, 7);
  assert.equal(generated.proposal.proposed_experiences[11].month, 12);
  assert.equal(buildEditableAnnualSchedule(calendar(), generated.proposal.proposed_experiences).projects[11].ends_on, "2026-12-18");
  const shorter = { ...generated.proposal, proposed_experiences: generated.proposal.proposed_experiences.slice(0, 10) };
  assert.equal(validateAnnualPreplan(shorter, ["COM_ORAL"], 2026).proposed_experiences.length, 10);
  assert.equal(buildEditableAnnualSchedule(calendar(), shorter.proposed_experiences).projects.length, 10);
  assert.throws(() => validateAnnualPreplan({ ...shorter, proposed_experiences: [shorter.proposed_experiences[0],
    { ...shorter.proposed_experiences[1], title: shorter.proposed_experiences[0].title }] }, ["COM_ORAL"], 2026));
  assert.throws(() => validateAnnualPreplan({ ...shorter, proposed_experiences: shorter.proposed_experiences.map((item, index) =>
    index === 0 ? { ...item, primary_competency_ids: ["NOT_AGE_APPLICABLE"] } : item) }, ["COM_ORAL"], 2026));
});

test("el Word unificado usa exactamente las filas confirmadas, incluso si la docente conserva diez", async () => {
  const preplan = { plan_format: "annual_preplan_v1", title: "Mi año", school_year: "2026",
    proposed_experiences: slots().slice(0, 10).map((slot) => ({ ...row(slot),
      experience_type: slot.index === 1 ? "unit" : "project",
      proposal_id: `00000000-0000-4000-8000-${String(slot.index).padStart(12, "0")}` })) };
  const formal = { organization_criteria: ["Escuchar al grupo", "Ofrecer juego", "Observar", "Ajustar"],
    transversal_approaches: ["Convivencia y respeto"], teaching_strategies: ["Juego y conversación"],
    assessment_followup: ["Registrar actuaciones"], family_collaboration: ["Dialogar con las familias"],
    inclusive_supports: ["Dar distintas formas de participar"],
    project_details: preplan.proposed_experiences.map((_, index) => ({ index: index + 1,
      context_or_trigger: `Situación distinta ${index + 1}`, final_product: `Producto posible ${index + 1}`,
      materials: ["Material sencillo"], what_to_observe: ["Participación y explicación"] })) };
  validateAnnualFormal(formal, 10);
  const content = projectFormalAnnualContent(preplan, formal, { strengths: "Participan en juegos.", needs: "Conversar más." },
    { priorities: [{ title: "Dar oportunidades para conversar" }] });
  assert.deepEqual(content.proposed_experiences.map((item) => item.proposal_id), preplan.proposed_experiences.map((item) => item.proposal_id));
  assert.equal(content.proposed_experiences[0].purpose, preplan.proposed_experiences[0].purpose);
  const document = { kind: "annual_plan", source_plan_format: "annual_preplan_v1", content,
    document_context: { template_version: "annual-unified-v1", calendar: calendar(), age: 5, classroom_section: "A",
      institution_name: "Escuela de prueba", teacher_name: "Docente de prueba", ugel: "UGEL 01",
      diagnostic_group: { strengths: "Participan en juegos.", needs: "Conversar más." }, group_interests: ["plantas"] } };
  const buffer = await renderAnnualPlanUnifiedWord(document, [{ id: "COM_ORAL", name: "Se comunica oralmente" }]);
  const xml = await (await JSZip.loadAsync(buffer)).file("word/document.xml").async("string");
  assert.match(xml, /Propuesta distinta 10/);
  assert.match(xml, /U01/);
  assert.doesNotMatch(xml, /\{\{PROYECTO_(?:11|12|13|20)_/);
  assert.doesNotMatch(xml, /Propuesta distinta 11/);
  assert.match(xml, /UGEL 01/);
});
