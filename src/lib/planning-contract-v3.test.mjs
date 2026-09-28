import test from "node:test";
import assert from "node:assert/strict";
import { activityV3, canonicalProjectDetails, canonicalProjectRoute, projectMasterV3,
  resolveAnnualProposal, validateActivityV3, validateProjectMasterV3 } from "./planning-contract-v3.mjs";
import { routeItemFor } from "./experience-lineage.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const proposal = { proposal_id: id(2), title: "El huerto", experience_type: "project" };
const plan = { id: id(1), version: 2, proposal: { proposed_experiences: [proposal] } };
const slot = { id: id(3), annual_plan_id: plan.id, slot_index: 1, proposal_id: proposal.proposal_id,
  starts_on: "2026-04-13", ends_on: "2026-04-17" };

test("la propuesta moderna tiene un ID canónico y el slot es solo alias del mismo plan", () => {
  const direct = resolveAnnualProposal(plan, [slot], proposal.proposal_id);
  const alias = resolveAnnualProposal(plan, [slot], slot.id);
  assert.equal(direct.proposalId, proposal.proposal_id);
  assert.equal(alias.proposalId, direct.proposalId);
  assert.equal(alias.slotId, slot.id);
  assert.equal(alias.planVersion, 2);
  assert.equal(resolveAnnualProposal({ ...plan, id: id(4) }, [slot], proposal.proposal_id), null);
  assert.equal(resolveAnnualProposal(plan, [{ ...slot, proposal_id: id(5) }], proposal.proposal_id), null);
  assert.equal(resolveAnnualProposal(plan, [slot], id(9)), null);
});

test("un plan histórico sin proposal_id usa el ID del slot sin inventar identidad retroactiva", () => {
  const legacy = { ...plan, proposal: { proposed_experiences: [{ title: "Juego libre", experience_type: "project" }] } };
  const resolved = resolveAnnualProposal(legacy, [{ ...slot, proposal_id: null }], slot.id);
  assert.equal(resolved.proposalId, slot.id);
  assert.equal(resolved.legacy, true);
  assert.equal(resolveAnnualProposal(legacy, [{ ...slot, proposal_id: null }], proposal.proposal_id), null);
});

test("V3 lee un mapa histórico sin duplicarlo y mantiene criterio, mediación y vínculos", () => {
  const blueprint = { id: id(7), date: "2026-04-13", title: "Miramos plantas", specific_purpose: "Comparar hojas",
    competency_ids: ["CYT_INDAGA", "COM_ORAL"], criterion_competency_id: "CYT_INDAGA",
    evaluation_criterion: "Compara hojas observadas", expected_evidence: "Describe dos hojas",
    mediation_notes: "Preguntar qué cambió", expected_progression: "De mirar a comparar" };
  const details = { flow_version: "project-master-v2", starting_point: "El grupo vio semillas",
    decisions: { purpose: "Explorar", competency_ids: ["CYT_INDAGA", "COM_ORAL"] },
    dependents: { guiding_questions: ["¿Qué cambió?"], journey: [{ title: "Exploramos" }],
      general_criteria: [{ competency_id: "CYT_INDAGA", criterion: "Compara cambios",
        expected_evidence: ["Descripción oral"] }] },
    activity_route: [blueprint], project_master: { foundation: "Una pregunta real", resources: ["Hojas"],
      activity_blueprints: [{ ...blueprint, title: "Copia obsoleta" }] } };
  const experience = { id: id(6), version: 2, status: "archived", annual_plan_id: plan.id,
    source_proposal_id: proposal.proposal_id, source_proposal_index: 0, details };
  const view = projectMasterV3(experience, { planVersion: 2, slotId: slot.id });
  assert.equal(view.contract_version, "project-master-v3");
  assert.equal(view.source.annual_plan_id, plan.id);
  assert.equal(view.source.proposal_id, proposal.proposal_id);
  assert.equal(view.activity_map[0].blueprint_id, blueprint.id);
  assert.equal(view.activity_map[0].title, blueprint.title);
  assert.equal(view.activity_map[0].criterion_text, blueprint.evaluation_criterion);
  assert.equal(view.activity_map[0].mediation, blueprint.mediation_notes);
  assert.equal(view.criteria[0].expected_evidence[0], "Descripción oral");
  assert.equal(view.compatibility_adapter, true);
  assert.throws(() => validateProjectMasterV3(view));
  assert.deepEqual(canonicalProjectRoute(details), [blueprint]);
  assert.equal(routeItemFor(experience, blueprint.id)?.title, blueprint.title);
  const saved = canonicalProjectDetails(details);
  assert.equal(saved.project_master.activity_blueprints, undefined);
  assert.deepEqual(saved.activity_route, [blueprint]);
  assert.equal(details.project_master.activity_blueprints[0].title, "Copia obsoleta");
  const activity = { id: id(8), version: 1, status: "active", experience_id: experience.id,
    occurs_on: "2026-04-13", details: { route_item_id: blueprint.id, purpose: "Comparar hojas" } };
  const activityView = activityV3(activity, experience);
  assert.equal(activityView.project_id, experience.id);
  assert.equal(activityView.project_version, 2);
  assert.equal(activityView.blueprint_id, blueprint.id);
  assert.equal(activityView.compatibility_adapter, true);
  assert.throws(() => validateActivityV3(activityView, view));
  assert.equal(activityV3({ ...activity, experience_id: id(9) }, experience), null);
  assert.throws(() => validateProjectMasterV3({ ...view, activity_map: [view.activity_map[0], view.activity_map[0]] }));
  assert.throws(() => validateActivityV3({ ...activityView, blueprint_id: id(9) }, view));
});

test("los contratos V3 nuevos exigen procedencia y referencias curriculares completas", () => {
  const criterionId = id(11), blueprintId = id(12);
  const project = { contract_version: "project-master-v3", id: id(6), version: 1, status: "confirmed",
    source: { annual_plan_id: plan.id, annual_plan_version: 2, proposal_id: proposal.proposal_id, slot_id: slot.id },
    calendar_fingerprint: "calendar-1", kb_version: "cneb-2026", source_fingerprint: "source-1",
    starting_point: { annual_proposal: proposal.title, teacher_context: null, no_changes: true },
    purpose: "Comparar las plantas", competency_ids: ["CYT_INDAGA"], guiding_questions: ["¿Qué cambia?"],
    criteria: [{ criterion_id: criterionId, competency_id: "CYT_INDAGA", text: "Compara cambios" }],
    expected_evidence: [{ criterion_id: criterionId, description: "Explicación oral" }],
    progression: ["Observar", "Comparar"], mediation: ["Preguntar por cambios"], teacher_overrides: [],
    activity_map: [{ blueprint_id: blueprintId, date: "2026-04-13", purpose: "Comparar hojas",
      competency_id: "CYT_INDAGA", competency_ids: ["CYT_INDAGA"], criterion_refs: [criterionId],
      expected_evidence: ["Descripción de hojas"], resource_refs: [] }] };
  assert.equal(validateProjectMasterV3(project), project);
  const activity = { contract_version: "activity-v3", id: id(13), version: 1, project_id: project.id,
    project_version: 1, blueprint_id: blueprintId, occurs_on: "2026-04-13", purpose: "Comparar hojas",
    criterion_refs: [criterionId], evidence_opportunities: ["Explicación"], sequence: ["Observar"],
    preparation: [], mediation: [], adaptations: [], teacher_overrides: [] };
  assert.equal(validateActivityV3(activity, project), activity);
  assert.throws(() => validateProjectMasterV3({ ...project, source: { ...project.source, proposal_id: id(99) },
    activity_map: [{ ...project.activity_map[0], criterion_refs: [id(98)] }] }));
  assert.throws(() => validateActivityV3({ ...activity, criterion_refs: [id(98)] }, project));
});

test("el adaptador histórico acepta mapa anidado solo cuando no hay ruta canónica", () => {
  const blueprint = { id: id(7), title: "Actividad antigua", date: "2026-04-13" };
  const experience = { id: id(6), version: 1, details: { project_master: { activity_blueprints: [blueprint] } } };
  assert.equal(projectMasterV3(experience).activity_map[0].title, "Actividad antigua");
  assert.equal(projectMasterV3({ ...experience, details: {} }), null);
});
