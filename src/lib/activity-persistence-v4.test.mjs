import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeActivityMaterials, publicActivityParent, validateActivityV4 } from "./activity-v4-validation.mjs";
import { buildTeacherActivityGenerationInput } from "./ai-activity-ui-service.mjs";
import { buildAIContext } from "./ai-context-builder-v4.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

const proposal = { title: "Sombras que cambian", purpose: "Explorar la luz", meaningful_situation: "Una sombra se mueve", teacher_preparation: "Preparar linternas", child_actions: "Probar posiciones", mediation: "Preguntar qué cambia", evidence_opportunities: "Registrar explicaciones", closure_or_continuity: "Probar mañana", competency_status: "confirmed", competency_id: "CYT_INDAGA" };
const classroom = { id: "class-5", section: "A", age: 5, calendar: { school_year: 2026 }, language_context: { castellano_l2_applicable: false }, religion_applicable: false };
const project = { id: "project-1", type: "project", title: "Investigamos sombras", purpose: "Explorar fenómenos", details: { trigger_or_interest: "¿Por qué se mueve la sombra?", starting_point: "Linternas", primary_competency_ids: ["CYT_INDAGA"], possible_secondary_competency_ids: ["COM_ORAL"], possible_pathways: ["Cambiar la luz"], spaces_and_materials: ["linternas"], evidence_opportunities: ["Explican cambios"], family_or_community_links: ["Conversar en casa"], adjustment_points: ["Parejas"], flexibility_notes: "Seguir el interés" }, prior_activities: [{ occurs_on: "2026-04-01", title: "Primera luz", purpose: "Observar", closure_or_continuity: "Cambiar distancia" }] };
const unit = { ...project, id: "unit-1", type: "unit", details: { ...project.details, trigger_or_interest: undefined, learning_need_or_context: "Necesitan explicar cambios", possible_pathways: [], proposed_situations: ["Luz y objetos"] } };

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

test("I: activity conserva el routing Terra/low y el servidor preserva límites de parent/persistencia", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.match(server, /activeLearningExperience\(body\.experienceId, context\.id\)/);
  assert.match(server, /activityAllowedCompetencies/);
  assert.match(server, /pending\.learning_experience_id !== experience\.id/);
  assert.match(server, /sequence,preparation,adaptations,status,details,generation_metadata/);
  assert.match(server, /'\[\]'::jsonb/);
  assert.doesNotMatch(server.slice(server.indexOf('pathname === "/api/activities"'), server.indexOf('pathname === "/api/activity-criteria"')), /insert into activity_criteria|insert into evidences/);
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
  assert.match(server, /metadata: safeAnnualGenerationMetadata\(generated\.internalMetadata\)/);
  assert.match(server, /generation_metadata\) values/);
  assert.match(server, /pending\.learning_experience_id!==current\.experience_id/);
  assert.match(server, /generation_metadata=\$6::jsonb/);
  assert.match(server, /pendingAIGenerations\.delete\(body\.generationId\)/);
  assert.match(server, /normalizeActivityMaterials\(body\.materials\)/);
  assert.match(server, /a\.status='draft'/);
  assert.match(server, /teacher_confirmed_at=now\(\)/);
  assert.deepEqual(normalizeActivityMaterials([" linterna ", "", "linterna", 7, { name: "papel" }, "papel"]), ["linterna", "papel"]);
  assert.equal(normalizeActivityMaterials("linterna").length, 0);
  assert.equal(normalizeActivityMaterials(Array.from({ length: 25 }, (_, index) => `m${index}`)).length, 20);
});
