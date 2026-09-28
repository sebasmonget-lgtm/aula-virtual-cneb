import test from "node:test";
import assert from "node:assert/strict";
import { buildObservationRecommendation, observationRecommendationMessage, observationRecommendationState } from "./observation-recommendation.mjs";

const competencies = [{ id: "MAT_CANTIDAD", name: "Cantidad" }, { id: "COM_ORAL", name: "Oral" }];
const record = { classification_status: "needs_review", classification_source: "jev", competency_v4_ids: [],
  suggested_competency_v4_ids: ["MAT_CANTIDAD", "COM_ORAL"] };

test("Ayni muestra solo candidatas aplicables y preselecciona únicamente la principal", () => {
  const result = buildObservationRecommendation(record, competencies);
  assert.equal(result.state, "suggested");
  assert.equal(result.primary.id, "MAT_CANTIDAD");
  assert.deepEqual(result.additional.map((card) => card.id), ["COM_ORAL"]);
  assert.deepEqual(result.initialSelection, ["MAT_CANTIDAD"]);
  assert.deepEqual(record.competency_v4_ids, []);
  const limited = buildObservationRecommendation({ ...record, suggested_competency_v4_ids: ["INVALID", "COM_ORAL", "COM_ORAL"] }, competencies);
  assert.equal(limited.primary.id, "COM_ORAL");
  assert.equal(limited.additional.length, 0);
});

test("una elección docente prevalece sobre propuestas anteriores, incluso al dejar sin clasificar", () => {
  const confirmed = buildObservationRecommendation({ ...record, classification_source: "teacher",
    competency_v4_ids: ["COM_ORAL"] }, competencies);
  assert.equal(confirmed.state, "teacher_confirmed");
  assert.deepEqual(confirmed.initialSelection, ["COM_ORAL"]);
  assert.equal(confirmed.confirmed[0].id, "COM_ORAL");
  const empty = buildObservationRecommendation({ ...record, classification_source: "teacher" }, competencies);
  assert.equal(empty.state, "teacher_unclassified");
  assert.deepEqual(empty.initialSelection, []);
});

test("privacidad, ausencia de texto, abstención y fallo no simulan una recomendación exitosa", () => {
  assert.equal(observationRecommendationState({ ...record, classification_status: "pending" }), "pending");
  for (const reason of ["privacy_blocked", "missing_text"])
    assert.equal(observationRecommendationState({ ...record, classification_reason: reason }), reason);
  assert.equal(observationRecommendationState({ ...record, suggested_competency_v4_ids: [] }), "insufficient_information");
  assert.equal(observationRecommendationState({ ...record, classification_source: null, suggested_competency_v4_ids: [] }), "unavailable");
  for (const state of ["privacy_blocked", "missing_text", "unavailable", "insufficient_information"])
    assert.doesNotMatch(observationRecommendationMessage(state), /actualizó|recomienda esta/);
});
