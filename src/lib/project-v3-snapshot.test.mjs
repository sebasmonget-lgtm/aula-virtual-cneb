import test from "node:test";
import assert from "node:assert/strict";
import { stampProjectV3, retainProjectCriterionIds } from "./project-v3-snapshot.mjs";
import { projectMasterV3, validateProjectMasterV3 } from "./planning-contract-v3.mjs";
import { assertFutureProjectMapEdits } from "./project-map-version-guard.mjs";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const dates = ["2026-04-01"];
const source = { plan: { id: id(1), version: 2 }, proposalId: id(2), slot: { id: id(3) }, source: { title: "Semillas" } };
const details = () => ({ decisions: { purpose: "Explorar", context_summary: "Preguntas del grupo", additional_context: "", competency_ids: ["CYT_INDAGA"] },
  dependents: { guiding_questions: ["¿Qué cambió?"], journey: [{ title: "Explorar", description: "Miramos semillas" }],
    general_criteria: [{ competency_id: "CYT_INDAGA", criterion: "Compara semillas", expected_evidence: ["Describe diferencias"] }] },
  activity_route: [{ id: id(5), date: dates[0], title: "Mirar semillas", specific_purpose: "Comparar", competency_ids: ["CYT_INDAGA"],
    criterion_competency_id: "CYT_INDAGA", evaluation_criterion: "Compara dos semillas", expected_evidence: "Describe diferencias",
    materials: ["Semillas"], mediation_notes: "Preguntar qué observa", expected_progression: "Observar y comparar" }],
  project_master: { foundation: "Interés real", closing_description: "Compartir", resources: ["Semillas"] } });
const experience = () => ({ id: id(4), version: 1, status: "draft", details: details() });
test("V3 persistido guarda procedencia y referencias sin duplicar el mapa canónico", () => {
  const before = experience(); const snapshot = JSON.stringify(before);
  const saved = stampProjectV3(before, before.details, source, "kb-1", dates);
  const dto = projectMasterV3({ ...before, details: saved });
  assert.equal(dto.compatibility_adapter, undefined); validateProjectMasterV3(dto, { instructionalDates: dates });
  assert.equal(dto.source.annual_plan_version, 2); assert.equal(dto.source.proposal_id, id(2));
  assert.equal(dto.activity_map[0].blueprint_id, id(5));
  assert.equal(dto.activity_map[0].criterion_refs[0], dto.criteria[0].criterion_id);
  assert.equal(saved.project_master.activity_blueprints, undefined);
  assert.equal(saved.activity_map, undefined); assert.equal(JSON.stringify(before), snapshot);
  assert.equal(typeof saved.starting_point, "string");
  assert.deepEqual(dto.starting_point.proposal, source.source);
});
test("edición de mapa conserva blueprint/criterio y actualiza huella; histórico intacto", () => {
  const first = experience(); const saved = stampProjectV3(first, first.details, source, "kb-1", dates);
  const changed = structuredClone(saved); changed.activity_route[0].specific_purpose = "Comparar tamaños";
  const next = stampProjectV3({ ...first, details: saved }, changed, source, "kb-1", dates);
  assert.equal(next.activity_route[0].id, saved.activity_route[0].id);
  assert.equal(next.dependents.general_criteria[0].criterion_id, saved.dependents.general_criteria[0].criterion_id);
  assert.notEqual(next.source_fingerprint, saved.source_fingerprint);
  assert.equal(saved.activity_route[0].specific_purpose, "Comparar");
});
test("no convierte confirmados ni admite calendario incompatible", () => {
  const row = experience(); assert.throws(() => stampProjectV3({ ...row, status: "active" }, row.details, source, "kb-1", dates), /confirmada/);
  assert.throws(() => stampProjectV3(row, row.details, source, "kb-1", ["2026-04-02"]), /días lectivos/);
});

test("restampar contenido idéntico conserva huella e IDs", () => {
  const row = experience(); const saved = stampProjectV3(row, row.details, source, "kb-1", dates);
  const again = stampProjectV3({ ...row, details: saved }, saved, source, "kb-1", dates);
  assert.deepEqual(again, saved);
});

test("regenerar dependencias conserva IDs de criterios dentro del borrador", () => {
  const row = experience(), saved = stampProjectV3(row, row.details, source, "kb-1", dates);
  const next = retainProjectCriterionIds(details().dependents, saved.dependents);
  assert.equal(next.general_criteria[0].criterion_id, saved.dependents.general_criteria[0].criterion_id);
});

test("sucesor V3 de un legacy conserva íntegro el blueprint histórico y proyecta refs sin reescribirlo", () => {
  const row = experience(), original = structuredClone(row.details.activity_route);
  const boundary = { sourceRoute: original, today: "2026-09-28", recordedRouteIds: [] };
  const saved = stampProjectV3(row, row.details, source, "kb-1", dates, boundary);
  assert.deepEqual(saved.activity_route, original);
  assert.doesNotThrow(() => assertFutureProjectMapEdits(original, saved.activity_route, boundary));
  const dto = projectMasterV3({ ...row, details: saved });
  validateProjectMasterV3(dto, { instructionalDates: dates });
  assert.equal(dto.activity_map[0].criterion_refs[0], dto.criteria[0].criterion_id);
});
