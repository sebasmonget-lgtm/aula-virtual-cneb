import assert from "node:assert/strict";
import test from "node:test";
import { anonymousDecisionText, createJevCompetencySuggester } from "./jev-competency-suggestion.mjs";
import { applicableDiagnosticCompetencies } from "./diagnostic-sources-v4.mjs";

const options = [
  { id: "MAT_CANTIDAD", name: "Resuelve problemas de cantidad", applies_when: ["Cuenta con propósito"], avoid_when: ["Conteo incidental"] },
  { id: "COM_ORAL", name: "Se comunica oralmente", applies_when: ["Explica ideas"], avoid_when: ["Hablar como medio"] },
];
const loadKb = async () => ({ version: "4.1.0", competencyCards: options.map((item) => ({ ...item,
  official_name: item.name, ai_meaning: item.applies_when[0], ages: { 5: { ai_focus: item.applies_when[0],
    observable_patterns: item.applies_when } }, avoid_when: item.avoid_when })) });

function choiceResult(choice, confidence = 0.9, sufficient = 0.95) {
  return { answers: { competency: { choice, confidence }, evidence_sufficient: { noul: sufficient } },
    metadata: {} };
}
function parallelResult(quantity, oral, sufficient = 0.95) {
  return { answers: { MAT_CANTIDAD: { noul: quantity }, COM_ORAL: { noul: oral },
    evidence_sufficient: { noul: sufficient } }, metadata: {} };
}

test("anonimiza nombres y omite información familiar o identificadores", () => {
  assert.equal(anonymousDecisionText("Contó tres vasos y explicó a Camila.", ["Camila"]),
    "Contó tres vasos y explicó a [estudiante].");
  assert.equal(anonymousDecisionText("Conversó con su mamá Rosa.", ["Rosa"]), null);
  assert.equal(anonymousDecisionText("Su DNI es 12345678."), null);
});

test("conserva verbos y conectores observables sin exponer nombres desconocidos", () => {
  assert.equal(anonymousDecisionText("Dibujó círculos. Después señaló el más grande."),
    "Dibujó círculos. Después señaló el más grande.");
  assert.equal(anonymousDecisionText("Reparte cuatro plumones. Dice: 'Ahora falta uno'."),
    "Reparte cuatro plumones. Dice: 'Ahora falta uno'.");
  assert.equal(anonymousDecisionText("Camila dibujó círculos."), "[persona] dibujó círculos.");
  assert.equal(anonymousDecisionText("Dibuja círculos.", ["Dibuja"]), "[estudiante] círculos.");
});

test("omite solo el prefijo ficticio; no permite que oculte identificadores o información familiar", () => {
  assert.equal(anonymousDecisionText("[PRUEBA FICTICIA · OBS-20260927] Camila contó tres vasos.", ["Camila"]),
    "[estudiante] contó tres vasos.");
  assert.equal(anonymousDecisionText("[PRUEBA FICTICIA] Contó tres vasos."), "Contó tres vasos.");
  assert.equal(anonymousDecisionText("[PRUEBA FICTICIA · OBS-20260927] Su DNI es 12345678."), null);
  assert.equal(anonymousDecisionText("[PRUEBA FICTICIA · OBS-20260927] Conversó con su mamá Rosa."), null);
  assert.equal(anonymousDecisionText("[PRUEBA FICTICIA · OBS-20260927] "), null);
  assert.equal(anonymousDecisionText("[ETIQUETA · OBS-20260927] Contó vasos."), null);
  assert.equal(anonymousDecisionText("Contó vasos. [PRUEBA FICTICIA · OBS-20260927]"), null);
});

test("Choice prioriza la principal y noul sugiere adicionales sin duplicarla", async () => {
  const calls = [];
  const suggester = createJevCompetencySuggester({ loadKb, client: { decide: async (request) => {
    calls.push(request);
    return request.workflow === "observation_competency_primary"
      ? choiceResult("COM_ORAL") : parallelResult(0.94, 0.88);
  } } });
  assert.deepEqual((await suggester.classify({ observation: "Contó y explicó.", age: 5, options })).candidate_ids,
    ["COM_ORAL", "MAT_CANTIDAD"]);
  assert.equal(calls.length, 2);
  assert.deepEqual(Object.keys(calls[0].questions), ["competency", "evidence_sufficient"]);
  assert.deepEqual(Object.keys(calls[1].questions), ["MAT_CANTIDAD", "COM_ORAL", "evidence_sufficient"]);
  assert.ok(calls[0].questions.competency.criteria.NO_CLASIFICABLE);
  const none = createJevCompetencySuggester({ loadKb, client: { decide: async (request) =>
    request.workflow === "observation_competency_primary" ? choiceResult("NO_CLASIFICABLE")
      : parallelResult(0.99, 0.99) } });
  assert.deepEqual((await none.classify({ observation: "Jugó.", age: 5, options })).candidate_ids, []);
});

test("ordena adicionales por puntuación, limita a cuatro y conserva la principal", async () => {
  const candidates = ["A", "B", "C", "D", "E"].map((id) => ({ id, name: id,
    applies_when: ["Actuación observable"], avoid_when: [] }));
  const suggester = createJevCompetencySuggester({ loadKb: async () => ({ version: "test",
    competencyCards: candidates }), client: { decide: async (request) => request.workflow === "observation_competency_primary"
      ? choiceResult("A") : { answers: {
        A: { noul: 0.81 }, B: { noul: 0.82 }, C: { noul: 0.83 }, D: { noul: 0.84 },
        E: { noul: 0.99 }, evidence_sufficient: { noul: 0.99 } }, metadata: {} } } });
  assert.deepEqual((await suggester.classify({ observation: "Agrupó y comparó.", age: 5,
    options: candidates })).candidate_ids, ["A", "E", "D", "C"]);
});

test("abstiene por insuficiencia y mantiene la principal si falla la llamada adicional", async () => {
  const weak = createJevCompetencySuggester({ loadKb, client: { decide: async (request) =>
    request.workflow === "observation_competency_primary" ? choiceResult("MAT_CANTIDAD", 0.9, 0.2)
      : parallelResult(0.99, 0.99) } });
  assert.deepEqual((await weak.classify({ observation: "Jugó.", age: 5, options })).candidate_ids, []);
  const partial = createJevCompetencySuggester({ loadKb, client: { decide: async (request) => {
    if (request.workflow === "observation_competency_additional") throw new Error("secondary timeout");
    return choiceResult("MAT_CANTIDAD");
  } } });
  assert.deepEqual((await partial.classify({ observation: "Contó vasos.", age: 5, options })).candidate_ids,
    ["MAT_CANTIDAD"]);
  const noPrimary = createJevCompetencySuggester({ loadKb, client: { decide: async (request) => {
    if (request.workflow === "observation_competency_primary") throw new Error("primary timeout");
    return parallelResult(0.9, 0.9);
  } } });
  await assert.rejects(noPrimary.classify({ observation: "Contó vasos.", age: 5, options }), /primary timeout/);
});

test("las opciones curriculares excluyen Castellano L2 y Religión sin condiciones del aula", async () => {
  const basic = await applicableDiagnosticCompetencies({ age_years: 5,
    castellano_l2_applicable: false, religion_applicable: false });
  assert.equal(basic.some((item) => item.id === "CAST_L2_ORAL" || item.id === "PS_RELIGION"), false);
  const extended = await applicableDiagnosticCompetencies({ age_years: 5,
    castellano_l2_applicable: true, religion_applicable: true });
  assert.ok(extended.some((item) => item.id === "CAST_L2_ORAL"));
  assert.ok(extended.some((item) => item.id === "PS_RELIGION"));
});
