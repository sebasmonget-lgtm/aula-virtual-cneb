import test from "node:test";
import assert from "node:assert/strict";
import { stampProjectV3 } from "./project-v3-snapshot.mjs";
import { stampActivityV3, activityCriteriaV3 } from "./activity-v3-snapshot.mjs";
import { activityV3, projectMasterV3, validateActivityV3 } from "./planning-contract-v3.mjs";
import { saveActivityDetails } from "./experience-lineage.mjs";
import { validateActivityV4 } from "./activity-v4-validation.mjs";
import { buildTeacherActivityGenerationInput } from "./ai-activity-ui-service.mjs";
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = "2026-10-19";
function fixture() {
  const project = { id: id(4), version: 2, status: "draft", details: {
    decisions: { purpose: "Explorar y compartir", context_summary: "Interés por semillas", additional_context: "", competency_ids: ["CYT_INDAGA", "COM_ORAL"] },
    dependents: { guiding_questions: ["¿Qué cambia?"], journey: [{ title: "Comparar", description: "Exploramos" }], general_criteria: [
      { competency_id: "CYT_INDAGA", criterion: "Compara semillas", expected_evidence: ["Describe diferencias"] },
      { competency_id: "COM_ORAL", criterion: "Explica una idea", expected_evidence: ["Explicación"] }] },
    activity_route: [{ id: id(5), date, title: "Semillas", specific_purpose: "Comparar dos semillas", competency_id: "CYT_INDAGA",
      competency_ids: ["CYT_INDAGA", "COM_ORAL"], criterion_competency_id: "CYT_INDAGA", evaluation_criterion: "Compara dos semillas",
      expected_evidence: "Descripción de diferencias", materials: ["Semillas"], mediation_notes: "Preguntar", expected_progression: "Comparar" }],
    project_master: { foundation: "Interés", resources: ["Semillas"], closing_description: "Compartir" } } };
  project.details = stampProjectV3(project, project.details, { plan: { id: id(1), version: 1 }, proposalId: id(2), slot: { id: id(3) }, source: { title: "Semillas" } }, "kb-test", [date]);
  project.status = "active";
  const blueprint = project.details.activity_route[0];
  const proposal = { title: "Semillas", purpose: blueprint.specific_purpose, meaningful_situation: "Explorar semillas", teacher_preparation: "Preparar", child_actions: "Comparar", mediation: "Preguntar", evidence_opportunities: "Descripción", closure_or_continuity: "Compartir", competency_status: "confirmed", competency_id: "CYT_INDAGA", route_item_id: blueprint.id, evaluation_criterion: blueprint.evaluation_criterion, expected_evidence: blueprint.expected_evidence };
  const activity = { id: id(6), experience_id: project.id, version: 1, status: "draft", occurs_on: date };
  return { project, blueprint, proposal, activity };
}
test("actividad sin aporte extra hereda propósito, fecha, criterio, materiales y versión exacta", () => {
  const { project, proposal, activity, blueprint } = fixture(), before = JSON.stringify(project);
  const input = buildTeacherActivityGenerationInput({ request: { routeItemId: blueprint.id }, classroom: { id: id(7), age: 4 }, learningExperience: project });
  assert.equal(input.activity_purpose, blueprint.specific_purpose);
  assert.deepEqual(input.classroom_context.materials, ["Semillas"]);
  assert.equal(input.learning_experience_context.confirmed_project_master.version, 2);
  const details = stampActivityV3(activity, saveActivityDetails(proposal, blueprint), project);
  const dto = activityV3({ ...activity, details }, project);
  validateActivityV3(dto, projectMasterV3(project));
  assert.equal(dto.compatibility_adapter, undefined); assert.equal(dto.project_version, 2);
  assert.equal(dto.teacher_context, ""); assert.equal(dto.occurs_on, date);
  assert.deepEqual(dto.competency_ids, ["CYT_INDAGA"]); // A secondary in the project is not automatic work.
  assert.equal(activityCriteriaV3(details).length, 1); assert.equal(JSON.stringify(project), before);
});
test("otra competencia requiere criterio separado y override explícito, no reutiliza criterio principal", () => {
  const { project, proposal, activity, blueprint } = fixture();
  const edited = { ...proposal, teacher_context: "Hoy exploramos por parejas", additional_criteria: [
    { competency_id: "COM_ORAL", criterion_text: "Explica la diferencia a su compañero", expected_evidence: "Explicación durante la comparación" }] };
  validateActivityV4(edited, new Set(["CYT_INDAGA", "COM_ORAL"]));
  const details = stampActivityV3(activity, saveActivityDetails(edited, blueprint), project);
  const criteria = activityCriteriaV3(details); assert.equal(criteria.length, 2);
  assert.notEqual(criteria[0].source_criterion_id, criteria[1].source_criterion_id);
  assert.equal(criteria[1].competency_id, "COM_ORAL");
  assert.ok(details.teacher_overrides.some(item => item.field === "criteria"));
  const dto = activityV3({ ...activity, details }, project); validateActivityV3(dto, projectMasterV3(project));
  assert.throws(() => validateActivityV3({ ...dto, teacher_overrides: [] }, projectMasterV3(project)), /criterio/);
  assert.deepEqual(stampActivityV3(activity, details, project), details);
});
test("override de propósito trazable; rechaza confirmados, fuente ajena, criterio duplicado o vacío", () => {
  const { project, proposal, activity, blueprint } = fixture();
  const details = stampActivityV3(activity, saveActivityDetails({ ...proposal, purpose: "Comparar tamaños" }, blueprint), project);
  assert.ok(details.teacher_overrides.some(item => item.field === "purpose" && item.to === "Comparar tamaños"));
  assert.throws(() => stampActivityV3({ ...activity, status: "active" }, details, project), /confirmada/);
  assert.throws(() => stampActivityV3(activity, { ...details, route_item_id: id(99) }, project), /blueprint/);
  assert.throws(() => stampActivityV3(activity, { ...details, additional_criteria: [{ competency_id: "CYT_INDAGA", criterion_text: "Otro", expected_evidence: "Otra" }] }, project), /propio criterio/);
  assert.throws(() => stampActivityV3(activity, { ...details, additional_criteria: [{ competency_id: "COM_ORAL", criterion_text: "", expected_evidence: "Otra" }] }, project), /propio criterio/);
  const dto = activityV3({ ...activity, details }, project);
  assert.throws(() => validateActivityV3({ ...dto, project_version: 1 }, projectMasterV3(project)), /proyecto/);
  assert.throws(() => validateActivityV3({ ...dto, project_fingerprint: "changed" }, projectMasterV3(project)), /fuente/);
});
