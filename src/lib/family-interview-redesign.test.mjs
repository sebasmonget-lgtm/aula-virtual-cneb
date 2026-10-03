import test from "node:test";
import assert from "node:assert/strict";
import { validateFamilyInterviewDetails } from "./diagnostic-sources-v4.mjs";
import { summarizeFamilyInterview, projectFamilyAssessmentContext, familyObservationHint } from "./family-interview-projection.mjs";
import { projectPlanningSignals, proposePersonalization } from "./annual-personalization-service.mjs";
import { publicClassroomContext } from "./classroom-context-service.mjs";
import { buildProjectContext } from "./context-policy-v4.mjs";
import { buildAssessmentInput } from "./assessment-v4-service.mjs";
import { buildFamilyInterviewPrintHtml } from "./family-interview-print.mjs";
import { familyInterviewQuestionGroups } from "./family-interview-contract.mjs";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { id: uuid(99), age: 5, available_resources: [], group_context: "", annual_planning_context: {} };
const sources = (details) => ({
  students: [1, 2, 3].map((n) => ({ id: uuid(n) })),
  interviews: [1, 2].map((n) => ({ id: uuid(n + 10), student_id: uuid(n), version: 1, details })),
  observations: [], group: null, prior: null, names: ["Niña QA"],
});
const familyA = validateFamilyInterviewDetails({
  structured_options_version: 2, interest_tags: ["animals", "plants"],
  community_tags: ["agriculture", "animals"], home_activity_tags: ["explores", "asks_why"],
  language_tags: ["es", "qu"], home_language_uses: [{ language_tag: "qu", with_whom: "abuelos" }],
  autonomy_routines: [{ id: "eating", level: "alone" }],
  family_expectation: "Que disfrute mucho este año.",
});
const familyB = validateFamilyInterviewDetails({
  structured_options_version: 2, interest_tags: ["vehicles", "construction"],
  community_tags: ["market", "workshop"], home_activity_tags: ["builds", "counts_compares"],
  language_tags: ["es"], family_expectation: "Que disfrute mucho este año.",
});

test("dos familias producen contextos individuales y señales de aula distintos sin nombres ni prioridades inventadas", async () => {
  const individualA = summarizeFamilyInterview(familyA);
  const individualB = summarizeFamilyInterview(familyB);
  assert.match(individualA, /^Según la familia/);
  assert.match(individualA, /Animales/);
  assert.match(individualA, /quechua con abuelos/);
  assert.match(individualB, /Vehículos/);
  assert.notEqual(individualA, individualB);
  const signalsA = projectPlanningSignals(sources(familyA), context);
  const signalsB = projectPlanningSignals(sources(familyB), context);
  assert.ok(signalsA.opportunities.some((row) => /agricultura/i.test(row.label)));
  assert.ok(signalsB.opportunities.some((row) => /taller/i.test(row.label)));
  assert.equal(JSON.stringify(signalsA).includes("Niña QA"), false);
  const proposalA = await proposePersonalization(sources(familyA), context, []);
  const proposalB = await proposePersonalization(sources(familyB), context, []);
  assert.notDeepEqual(proposalA.interests.map((row) => row.label), proposalB.interests.map((row) => row.label));
  assert.notDeepEqual(proposalA.context_opportunities.map((row) => row.text), proposalB.context_opportunities.map((row) => row.text));
  assert.deepEqual(proposalA.priorities, []);
  assert.deepEqual(proposalB.priorities, []);
  assert.equal(proposalA.group_profile.includes("Que disfrute mucho"), false);
  assert.ok(JSON.stringify(proposalA.classroom_snapshot).includes("Que disfrute mucho"));
});

test("aulas pequeñas conservan temas de planificación sin exponer nombres ni conteos de celdas pequeñas", () => {
  const base = { version: "classroom-context-v1", age_group: 5, students_total: 3, confirmed_interviews: 2,
    languages: [{ key: "es", label: "Castellano", count: 2 }, { key: "qu", label: "Quechua", count: 1 }],
    primary_languages: [], common_interests: [{ key: "animals", label: "Animales", count: 2 }],
    community_opportunities: [{ key: "agriculture", label: "Chacra o agricultura", count: 2 }],
    previous_education: {}, confirmed_diagnostic_summary: null, diagnostic_coverage: { students_with_observations: 0 },
    diagnostic_review_current: false, observation_gaps: [], provenance: { source_fingerprint: "abc" } };
  const view = publicClassroomContext(base);
  assert.deepEqual(view.common_interests, []);
  assert.deepEqual(view.planning_interests, ["Animales"]);
  const project = buildProjectContext(view);
  assert.match(project.group_context, /Animales/);
  assert.match(project.group_context, /agricultura/);
  assert.doesNotMatch(JSON.stringify(project), /Niña QA|student_id|family_expectation/);
});

test("Assessment mantiene contexto familiar separado de evidencia y solo sugiere situaciones de observación", () => {
  const assessment = projectFamilyAssessmentContext(familyB);
  assert.equal(assessment.role, "context_only");
  assert.equal("family_expectation" in assessment, false);
  const input = buildAssessmentInput({ age: 5, competencyId: "MAT_FORMA", evidenceHistory: [], familyContext: assessment });
  assert.deepEqual(input.evidence_history, []);
  assert.equal(input.student_context.family_context.source, "family_interview");
  assert.match(input.teacher_request, /no evidencia observada/);
  assert.match(familyObservationHint(familyA, "CYT_INDAGA"), /Según la familia/);
  assert.match(familyObservationHint(familyB, "MAT_FORMA"), /observa cómo/);
  assert.match(familyObservationHint(familyB, "MAT_CANTIDAD"), /observa cómo/);
  assert.equal(familyObservationHint({}, "MAT_CANTIDAD"), null);
  assert.equal(projectFamilyAssessmentContext({ interests: "Le gustan las semillas.", language_context: "Habla quechua con su abuela." })
    .legacy_family_context, "Le gustan las semillas. Habla quechua con su abuela.");
});

test("valida selecciones nuevas sin completar respuestas históricas ni admitir inferencias", () => {
  assert.equal(familyA.structured_options_version, 2);
  assert.deepEqual(validateFamilyInterviewDetails({ interests: "Le gusta jugar." }), { interests: "Le gusta jugar." });
  assert.deepEqual(validateFamilyInterviewDetails({ interest_tags: ["animals"] }).structured_options_version, 1);
  assert.throws(() => validateFamilyInterviewDetails({ structured_options_version: 2,
    autonomy_routines: [{ id: "eating", level: "advanced" }] }), /rutinas/);
  assert.throws(() => validateFamilyInterviewDetails({ structured_options_version: 2,
    language_tags: ["es"], home_language_uses: [{ language_tag: "qu", with_whom: "abuela" }] }), /idioma/);
  assert.throws(() => validateFamilyInterviewDetails({ structured_options_version: 1,
    home_activity_tags: ["builds"] }), /anterior/);
});

test("la hoja para papel conserva selecciones y ejemplos sin convertirlos en evaluación", () => {
  const html = buildFamilyInterviewPrintHtml("Niña QA", familyA, familyInterviewQuestionGroups("Niña QA"));
  assert.match(html, /Animales, Plantas y naturaleza/);
  assert.match(html, /Quechua con abuelos/);
  assert.match(html, /Entrevista familiar/);
  assert.doesNotMatch(html, /diagnóstica|nivel de logro|competencia/i);
});
