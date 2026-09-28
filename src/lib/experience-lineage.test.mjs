import test from "node:test";
import assert from "node:assert/strict";
import { inheritedActivityCriterion, routeItemFor, saveActivityDetails, saveExperienceDetails } from "./experience-lineage.mjs";

const route = (number, title) => ({ number, title, specific_purpose: title, competency_id: "PS_CONVIVE",
  evaluation_criterion: `Observar ${title}`, expected_evidence: `Registro de ${title}` });

test("los IDs de ruta sobreviven ediciones y se registran cambios explícitos", () => {
  const generated = { title: "Jugamos", purpose: "Participar", activity_route: [route(1, "Elegir"), route(2, "Compartir")] };
  const saved = saveExperienceDetails(generated, null, generated);
  assert.equal(new Set(saved.activity_route.map((item) => item.id)).size, 2);
  const updated = saveExperienceDetails({ ...saved, activity_route: [{ ...saved.activity_route[1], number: 1, title: "Compartir y conversar" }] }, saved);
  assert.equal(updated.activity_route[0].id, saved.activity_route[1].id);
  assert.match(updated.teacher_overrides[0].field, /activity_route\..*\.title/);
  assert.equal(routeItemFor({ details: updated }, updated.activity_route[0].id)?.title, "Compartir y conversar");
});

test("la actividad conserva el origen y registra una modificación docente del criterio", () => {
  const item = { ...route(1, "Compartir"), id: "route-1" };
  const proposal = { title: "Compartir", purpose: "Compartir", competency_status: "confirmed", competency_id: "PS_CONVIVE",
    evaluation_criterion: "Nuevo criterio", expected_evidence: item.expected_evidence, evidence_opportunities: "Escuchar cómo propone los turnos" };
  const saved = saveActivityDetails(proposal, item);
  assert.equal(saved.route_item_id, item.id);
  assert.deepEqual(saved.teacher_overrides.map((entry) => entry.field), ["evaluation_criterion"]);
  assert.equal(inheritedActivityCriterion(saved, item)?.criterion_text, "Nuevo criterio");
  assert.deepEqual(inheritedActivityCriterion(saved, item)?.observation_focus, ["Escuchar cómo propone los turnos"]);
});

test("los borradores históricos siguen usando su exportador anterior", () => {
  assert.equal(saveExperienceDetails({ title: "Histórico" }).document_template_version, undefined);
  assert.equal(saveActivityDetails({ title: "Histórica" }).document_template_version, undefined);
});

test("dos competencias del mapa no cambian la competencia confirmada de la actividad heredada", () => {
  const item = { ...route(1, "Comparamos"), id: "route-2", competency_id: "CYT_INDAGA",
    competency_ids: ["CYT_INDAGA", "TRANS_AUTONOMO"], criterion_competency_id: "TRANS_AUTONOMO" };
  const activity = { competency_status: "confirmed", competency_id: "CYT_INDAGA",
    evaluation_criterion: "Propone cómo comparar semillas", expected_evidence: "Propuesta y explicación" };
  const criterion = inheritedActivityCriterion(activity, item);
  assert.equal(criterion.competency_id, activity.competency_id);
  assert.equal(criterion.criterion_text, activity.evaluation_criterion);
});
