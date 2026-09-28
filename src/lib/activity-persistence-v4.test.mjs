import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeActivityMaterials, publicActivityParent, validateActivityV4 } from "./activity-v4-validation.mjs";
import { buildTeacherActivityGenerationInput } from "./ai-activity-ui-service.mjs";
import { buildAIContext } from "./ai-context-builder-v4.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { PGlite } from "@electric-sql/pglite";
import { annualCalendarDay } from "./annual-plan-schedule.mjs";

const proposal = { title: "Sombras que cambian", purpose: "Explorar la luz", meaningful_situation: "Una sombra se mueve", teacher_preparation: "Preparar linternas", child_actions: "Probar posiciones", mediation: "Preguntar qué cambia", evidence_opportunities: "Registrar explicaciones", closure_or_continuity: "Probar mañana", competency_status: "confirmed", competency_id: "CYT_INDAGA" };
const classroom = { id: "class-5", section: "A", age: 5, calendar: { school_year: 2026 }, language_context: { castellano_l2_applicable: false }, religion_applicable: false };
const project = { id: "project-1", type: "project", title: "Investigamos sombras", purpose: "Explorar fenómenos", details: { trigger_or_interest: "¿Por qué se mueve la sombra?", starting_point: "Linternas", primary_competency_ids: ["CYT_INDAGA"], possible_secondary_competency_ids: ["COM_ORAL"], possible_pathways: ["Cambiar la luz"], spaces_and_materials: ["linternas"], evidence_opportunities: ["Explican cambios"], family_or_community_links: ["Conversar en casa"], adjustment_points: ["Parejas"], flexibility_notes: "Seguir el interés" }, prior_activities: [{ occurs_on: "2026-04-01", title: "Primera luz", purpose: "Observar", closure_or_continuity: "Cambiar distancia" }] };
const unit = { ...project, id: "unit-1", type: "unit", details: { ...project.details, trigger_or_interest: undefined, learning_need_or_context: "Necesitan explicar cambios", possible_pathways: [], proposed_situations: ["Luz y objetos"] } };

test("fecha de actividad admite DATE real de PostgreSQL en guardar y confirmar, sin ampliar límites", async () => {
  const db = await PGlite.create();
  try {
    const dates = (await db.query(`select '2026-03-30'::date as starts_on, '2026-04-10'::date as ends_on`)).rows[0];
    assert.ok(dates.starts_on instanceof Date);
    const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
    const validateSource = source.match(/function validateActivityDate\([\s\S]*?\n\}/)?.[0];
    assert.ok(validateSource);
    const validate = new Function("annualCalendarDay", `${validateSource}; return validateActivityDate;`)(annualCalendarDay);
    const school = { starts_on: "2026-03-02", ends_on: "2026-12-31" };
    for (const stored of [dates, { starts_on: dates.starts_on.toISOString(), ends_on: dates.ends_on.toISOString() }]) {
      for (const day of ["2026-03-30", "2026-04-01", "2026-04-10"]) assert.doesNotThrow(() => validate(day, stored, school));
      for (const day of ["2026-03-29", "2026-04-11", "2026-03-30T00:00:00Z", ""]) assert.throws(() => validate(day, stored, school), /fecha/);
      assert.throws(() => validate("2026-03-30", stored, { ...school, starts_on: "2026-03-31" }), /fecha/);
    }
  } finally { await db.close(); }
});

test("A-D, J-M y O-Q: activity-v1 exige parent permitido, competencia aplicable y coherencia", () => {
  assert.deepEqual(validateActivityV4(proposal, new Set(["CYT_INDAGA"])), proposal);
  assert.throws(() => validateActivityV4({ ...proposal, competency_id: "CAST_L2_ORAL" }, new Set(["CYT_INDAGA"])), /competencia/);
  assert.throws(() => validateActivityV4({ ...proposal, competency_status: "unconfirmed", competency_id: "CYT_INDAGA" }, new Set(["CYT_INDAGA"])), /competencia/);
  assert.throws(() => validateActivityV4({ ...proposal, ignored: true }, new Set(["CYT_INDAGA"])), /activity-v1/);
});

test("D-H: Project y Unit llegan como contexto mínimo, con continuidad y sin datos privados", async () => {
  const input = buildTeacherActivityGenerationInput({ request: { activityPurpose: "Cambiar la posición de una linterna", materials: ["papel"] }, classroom, learningExperience: project });
  assert.deepEqual(input.classroom_context.materials, ["linternas", "papel"]);
  assert.equal(input.learning_experience_context.trigger_or_interest, "¿Por qué se mueve la sombra?");
  assert.deepEqual(input.learning_experience_context.possible_pathways, ["Cambiar la luz"]);
  assert.equal(input.learning_experience_context.prior_activities[0].closure_or_continuity, "Cambiar distancia");
  assert.equal(JSON.stringify(input), JSON.stringify(input).replace(/private|student|evidence_media/g, ""));
  const unitInput = buildTeacherActivityGenerationInput({ request: { activityPurpose: "Explicar cambios" }, classroom, learningExperience: unit });
  assert.equal(unitInput.learning_experience_context.learning_need_or_context, "Necesitan explicar cambios");
  assert.deepEqual(unitInput.learning_experience_context.proposed_situations, ["Luz y objetos"]);
  const bundle = await buildAIContext(input, await loadKnowledgeBaseV4());
  assert.equal(bundle.context.workflow_inputs.learning_experience_context.title, "Investigamos sombras");
  assert.equal(bundle.context.workflow_inputs.learning_experience_context.prior_activities.length, 1);
});

test("I: activity conserva límites de parent y persistencia", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const paired = await readFile(new URL("../../scripts/daily-workshop-persistence.mjs", import.meta.url), "utf8");
  assert.match(server, /activeLearningExperience\(body\.experienceId, context\.id\)/);
  assert.match(server, /activityAllowedCompetencies/);
  assert.match(server, /pending\.learning_experience_id !== experience\.id/);
  assert.match(paired, /sequence,preparation,adaptations,status,details,generation_metadata/);
  assert.match(paired, /'\[\]'::jsonb/);
  const activitySection = server.slice(server.indexOf('pathname === "/api/activities"'), server.indexOf('pathname === "/api/activity-criteria"'));
  assert.doesNotMatch(activitySection, /insert into evidences/);
  assert.match(activitySection, /inheritedActivityCriterion\(current\.details,\s*routeItem\)/);
  assert.match(activitySection, /confirmActivityWithCriterion\(db,\s*id,\s*criterion,\s*randomUUID\(\),\s*expectedRevision\(body\.expectedRevision\),\s*workshop\)/);
});

test("A-C: OPTIONS permite PUT y el parent público no filtra metadata técnica", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.match(server, /const corsMethods = "GET,POST,PUT,OPTIONS"/);
  assert.match(server, /"access-control-allow-methods": corsMethods/);
  const parentContext = server.slice(server.indexOf("async function activityParentContext"), server.indexOf("async function activityAllowedCompetencies"));
  assert.match(parentContext, /return publicActivityParent\(experience, prior\)/);
  const publicParent = publicActivityParent({ id: "p1", type: "project", title: "Proyecto", purpose: "Propósito", starts_on: "2026-03-01", ends_on: "2026-03-30", origin: "planned", details: { primary_competency_ids: ["CYT_INDAGA"] }, generation_metadata: { model: "hidden", tokens: 9 }, teacher_confirmed_at: "hidden", response_id: "hidden" }, [{ occurs_on: "2026-03-02", title: "Anterior", purpose: "Probar", closure_or_continuity: "Continuar", model: "hidden" }]);
  assert.deepEqual(Object.keys(publicParent).sort(), ["details", "ends_on", "id", "origin", "prior_activities", "purpose", "starts_on", "title", "type"]);
  assert.doesNotMatch(JSON.stringify(publicParent), /hidden|generation_metadata|response_id|tokens/);
});

test("G-N: edición conserva metadata, regeneración validada la reemplaza y materiales se normalizan", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const paired = await readFile(new URL("../../scripts/daily-workshop-persistence.mjs", import.meta.url), "utf8");
  assert.match(server, /metadata: safeAnnualGenerationMetadata\(generated\.internalMetadata\)/);
  assert.match(server, /generation_metadata\) values/);
  assert.match(server, /pending\.learning_experience_id!==current\.experience_id/);
  assert.match(paired, /generation_metadata=coalesce\(\$6::jsonb,generation_metadata\)[\s\S]*status='draft' and revision=\$8/);
  assert.match(server, /pendingAIGenerations\.delete\(body\.generationId\)/);
  assert.match(server, /normalizeActivityMaterials\(body\.materials\)/);
  assert.match(server, /a\.status='draft'/);
  assert.match(await readFile(new URL("./activity-confirmation.mjs", import.meta.url), "utf8"), /teacher_confirmed_at=now\(\)/);
  assert.deepEqual(normalizeActivityMaterials([" linterna ", "", "linterna", 7, { name: "papel" }, "papel"]), ["linterna", "papel"]);
  assert.equal(normalizeActivityMaterials("linterna").length, 0);
  assert.equal(normalizeActivityMaterials(Array.from({ length: 25 }, (_, index) => `m${index}`)).length, 20);
});
