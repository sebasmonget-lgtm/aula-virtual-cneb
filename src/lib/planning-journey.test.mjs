import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canOpenPlanningStep, loadPlanningJourney, loadStartingGuidance } from "./planning-journey.mjs";

const base = "http://local";
const planUrl = `${base}/api/annual-plans/current`;
const experienceUrl = `${base}/api/learning-experiences`;
const diagnosticUrl = `${base}/api/diagnostics/progress`;
const reviewed = { reviewed: true, student_count: 1, observation_count: 0 };
const fetchFrom = (responses) => async (url) => {
  const value = url in responses ? responses[url] : url === diagnosticUrl ? reviewed : undefined;
  return { ok: value !== null, json: async () => value };
};

test("sin niños se empieza por el padrón; con niños ya se puede preparar Mi año", async () => {
  const plans = { active: null, draft: null };
  const empty = { reviewed: false, student_count: 0, observation_count: 0 };
  const withoutStudents = await loadStartingGuidance(base, fetchFrom({ [planUrl]: plans, [diagnosticUrl]: empty }));
  assert.equal(withoutStudents.startingSection, "Niños");
  const withStudents = await loadStartingGuidance(base, fetchFrom({ [planUrl]: plans, [diagnosticUrl]: { ...empty, student_count: 1 } }));
  assert.equal(withStudents.startingSection, "Diagnóstico");
  const journey = await loadPlanningJourney(base, fetchFrom({ [planUrl]: plans, [experienceUrl]: { experiences: [] }, [diagnosticUrl]: { ...empty, student_count: 1 } }));
  assert.equal(journey.recommended, "annual");
  assert.equal(journey.diagnostic, "pending");
});

test("una observación guardada no obliga a cerrar el diagnóstico antes de planificar", async () => {
  const plans = { active: null, draft: null };
  const diagnostic = { reviewed: false, student_count: 1, observation_count: 1 };
  const journey = await loadPlanningJourney(base, fetchFrom({ [planUrl]: plans, [experienceUrl]: { experiences: [] }, [diagnosticUrl]: diagnostic }));
  assert.equal(journey.diagnostic, "in_progress");
  assert.equal(journey.recommended, "annual");
  const next = await loadPlanningJourney(base, fetchFrom({ [planUrl]: plans, [experienceUrl]: { experiences: [] }, [diagnosticUrl]: { ...diagnostic, reviewed: true } }));
  assert.equal(next.diagnostic, "reviewed");
  assert.equal(next.recommended, "annual");
});

test("Mi año se abre con padrón; proyectos y actividades conservan sus guardas", () => {
  const journey = { diagnostic: "in_progress", studentCount: 0, hasConfirmedAnnual: false, hasConfirmedExperience: false };
  assert.equal(canOpenPlanningStep(journey, "diagnostic"), true);
  assert.equal(canOpenPlanningStep(journey, "annual"), false);
  journey.studentCount = 1;
  assert.equal(canOpenPlanningStep(journey, "annual"), true);
  assert.equal(canOpenPlanningStep(journey, "experiences"), false);
  journey.hasConfirmedAnnual = true;
  assert.equal(canOpenPlanningStep(journey, "experiences"), true);
  assert.equal(canOpenPlanningStep(journey, "activities"), false);
  journey.hasConfirmedExperience = true;
  assert.equal(canOpenPlanningStep(journey, "activities"), true);
});

test("el recorrido retoma un borrador anual y no marca etapas por haberlas visitado", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: null, draft: { id: "draft-1" } },
    [experienceUrl]: { experiences: [] },
  }));
  assert.deepEqual(journey, { mode:"first_setup",diagnostic: "reviewed", studentCount: 1, annual: "draft", experience: "pending", activity: "pending", recommended: "annual", hasConfirmedAnnual: false, hasConfirmedExperience: false, hasConfirmedActivity: false });
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
  assert.deepEqual(withActivity, { mode:"first_setup",diagnostic: "reviewed", studentCount: 1, annual: "confirmed", experience: "confirmed", activity: "draft", recommended: "activities", hasConfirmedAnnual: true, hasConfirmedExperience: true, hasConfirmedActivity: false });
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

test("un proyecto de un plan histórico sigue en el recorrido y falla claramente si no puede leer el avance", async () => {
  const journey = await loadPlanningJourney(base, fetchFrom({
    [planUrl]: { active: { id: "plan-2" } },
    [experienceUrl]: { experiences: [{ id: "old", type: "unit", status: "active", annual_plan_id: "plan-1", details: { starting_point: "Antes" } }] },
    [`${base}/api/activities?experienceId=old`]: { activities: [{ status: "draft" }] },
  }));
  assert.equal(journey.experience, "confirmed");
  assert.equal(journey.activity, "draft");
  assert.equal(journey.recommended, "activities");
  await assert.rejects(loadPlanningJourney(base, fetchFrom({ [planUrl]: null, [experienceUrl]: { experiences: [] } })), /avance/);
});

test("la interfaz abre el diagnóstico y ofrece continuar al plan solo tras guardar la revisión", async () => {
  const workspace = await readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8");
  const diagnostic = await readFile(new URL("../features/dashboard/components/profile-and-diagnostic.tsx", import.meta.url), "utf8");
  const students = await readFile(new URL("../features/dashboard/components/students-screen.tsx", import.meta.url), "utf8");
  const setup = await readFile(new URL("../features/dashboard/components/pilot-setup.tsx", import.meta.url), "utf8");
  assert.match(setup, /Paso 1 de 6 · Configura el aula/);
  assert.match(students, /Añadir niños al aula/);
  assert.match(workspace, /guidance\.startingSection === "Niños" \? "Aula" : guidance\.startingSection/);
  assert.match(workspace, /id: "diagnostic" as const, label: "Diagnóstico"/);
  assert.match(workspace, /className="ayni-journey-link" onClick=\{onGoDiagnostic\}/);
  assert.match(workspace, /guidance\.startingSection === "Diagnóstico".*setPlanningTarget\("diagnostic"\).*setActive\("Planificar"\)/);
  assert.match(workspace, /tab === "diagnostic" \? \(journey\?\.studentCount \? <GuidedDiagnostic/);
  assert.match(workspace, /<EvaluationHome dashboard=\{dashboard\}/);
  assert.match(diagnostic, /disabled=\{index \+ 1 > maxStep\}/);
  assert.match(diagnostic, /setData\(await completeDiagnosticReview\(\)\); onPlan\?\.\(\)/);
  assert.match(diagnostic, /!data\.observations\.length.*información insuficiente/);
  assert.match(students, /Continuar: evaluación diagnóstica/);
});
