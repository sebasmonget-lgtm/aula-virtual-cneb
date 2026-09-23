import test from "node:test";
import assert from "node:assert/strict";
import { loadPlanningJourney } from "./planning-journey.mjs";

const fetchFrom = (responses) => async (url) => ({ ok: !(url in responses && responses[url] === null), json: async () => responses[url] });
const base = "http://local";
const planUrl = `${base}/api/annual-plans/current`;
const experienceUrl = `${base}/api/learning-experiences`;

test("el recorrido retoma un borrador anual y no marca etapas por haberlas visitado", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: null, draft: { id: "draft-1" } },
    [experienceUrl]: { experiences: [] },
  }));
  assert.deepEqual(journey, { annual: "draft", experience: "pending", activity: "pending", recommended: "annual", hasConfirmedAnnual: false, hasConfirmedExperience: false, hasConfirmedActivity: false });
});

test("el recorrido propone continuar un proyecto guardado y después la actividad", async () => {
  const withDraft = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-1" } },
    [experienceUrl]: { experiences: [{ id: "exp-1", type: "project", status: "draft", annual_plan_id: "plan-1", details: { starting_point: "Interés" } }] },
  }));
  assert.equal(withDraft.recommended, "experiences");
  assert.equal(withDraft.experience, "draft");
  const activeExperience = { id: "exp-1", type: "project", status: "active", annual_plan_id: "plan-1", details: { starting_point: "Interés" } };
  const withActivity = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-1" } },
    [experienceUrl]: { experiences: [activeExperience] },
    [`${base}/api/activities?experienceId=exp-1`]: { activities: [{ status: "draft" }] },
  }));
  assert.deepEqual(withActivity, { annual: "confirmed", experience: "confirmed", activity: "draft", recommended: "activities", hasConfirmedAnnual: true, hasConfirmedExperience: true, hasConfirmedActivity: false });
});

test("un borrador nuevo no oculta los planes y experiencias confirmados que siguen disponibles", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-1" }, draft: { id: "plan-2" } },
    [experienceUrl]: { experiences: [
      { id: "exp-active", type: "project", status: "active", annual_plan_id: "plan-1", details: { starting_point: "Interés" } },
      { id: "exp-draft", type: "unit", status: "draft", annual_plan_id: "plan-1", details: { starting_point: "Necesidad" } },
    ] },
    [`${base}/api/activities?experienceId=exp-active`]: { activities: [] },
  }));
  assert.equal(journey.recommended, "annual");
  assert.equal(journey.annual, "draft");
  assert.equal(journey.experience, "draft");
  assert.equal(journey.hasConfirmedAnnual, true);
  assert.equal(journey.hasConfirmedExperience, true);
  assert.equal(journey.hasConfirmedActivity, false);
});

test("una actividad confirmada sigue visible en el recorrido aunque exista un borrador nuevo", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-1" } },
    [experienceUrl]: { experiences: [{ id: "exp-1", type: "unit", status: "active", annual_plan_id: "plan-1", details: { starting_point: "Necesidad" } }] },
    [`${base}/api/activities?experienceId=exp-1`]: { activities: [{ status: "active" }, { status: "draft" }] },
  }));
  assert.equal(journey.activity, "draft");
  assert.equal(journey.hasConfirmedActivity, true);
});

test("solo cuenta experiencias del plan vigente y falla claramente si no puede leer el avance", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-2" } },
    [experienceUrl]: { experiences: [{ id: "old", type: "unit", status: "active", annual_plan_id: "plan-1", details: { starting_point: "Antes" } }] },
  }));
  assert.equal(journey.experience, "pending");
  assert.equal(journey.recommended, "experiences");
  await assert.rejects(loadPlanningJourney(base, fetchFrom({ [planUrl]: null, [experienceUrl]: { experiences: [] } })), /avance/);
});
