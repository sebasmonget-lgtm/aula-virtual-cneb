import test from "node:test";
import assert from "node:assert/strict";
import { currentObservationText, pendingObservationWork } from "./observation-work.mjs";

test("una segunda corrección parte del texto vigente y conserva el original", () => {
  const original = { raw_text: "Contó tres bloques.", corrected_text: null };
  const first = { ...original, corrected_text: "Contó cuatro bloques con apoyo." };
  const second = { ...first, corrected_text: "Contó cuatro bloques después de una pregunta." };
  assert.equal(currentObservationText(original), original.raw_text);
  assert.equal(currentObservationText(first), first.corrected_text);
  assert.equal(currentObservationText(second), second.corrected_text);
  assert.equal(second.raw_text, original.raw_text);
  assert.equal(currentObservationText({raw_text: null}), "");
});

test("texto, foto y motivo pendientes requieren proteger salida; un registro guardado no", () => {
  const empty = { saved: null, rawText: "", photo: null, editMode: false, correctedText: "", reason: "" };
  assert.equal(pendingObservationWork(empty), false);
  assert.equal(pendingObservationWork({...empty, rawText: "Observación ficticia"}), true);
  assert.equal(pendingObservationWork({...empty, photo: {name: "foto ficticia"}}), true);
  const saved = {raw_text: "Original", corrected_text: "Vigente"};
  assert.equal(pendingObservationWork({...empty, saved, rawText: "Original"}), false);
  assert.equal(pendingObservationWork({...empty, saved, editMode: true, correctedText: "Vigente"}), false);
  assert.equal(pendingObservationWork({...empty, saved, editMode: true, correctedText: "Otra corrección"}), true);
  assert.equal(pendingObservationWork({...empty, saved, editMode: true, correctedText: "Vigente", reason: "Motivo"}), true);
});
