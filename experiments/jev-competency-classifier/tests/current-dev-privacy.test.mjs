import test from "node:test";
import assert from "node:assert/strict";
import { devPrivacy } from "../src/current-dev-privacy.mjs";
import { anonymousDecisionText } from "../../../src/lib/jev-competency-suggestion.mjs";

test("mención familiar pedagógica no bloquea; regresiones obligatorias", () => {
  for (const observation of ["Dibujó a su familia y dijo quién era cada persona.",
    "En el cuento dijo que al final venía su mamá.", "Dijo que su papá usa una taza más grande.",
    "Comparó la casa de cartón con la de su hermano.", "Escribe su nombre con marcas y dice que es para su familia."])
    assert.equal(devPrivacy(observation).blocked, false);
  assert.equal(anonymousDecisionText("Dibujó a su familia y dijo quién era cada persona."), null);
});
test("identificadores reales y dirección concreta siguen bloqueados; nombres se neutralizan", () => {
  for (const observation of ["Su teléfono es 987654321.", "El correo es prueba@example.invalid.",
    "Dijo www.example.invalid.", "Su domicilio es calle Ficticia 123."])
    assert.equal(devPrivacy(observation).blocked, true);
  const result = devPrivacy("Dijo que Elena debía esperar su turno.", ["Elena"]);
  assert.equal(result.blocked, false); assert.ok(!result.text.includes("Elena"));
  assert.equal(devPrivacy("Habló de su domicilio al representar una casa.").blocked, false);
});
test("la anonimización de textos sin menciones familiares permanece igual a V1", () => {
  for (const observation of ["Contó cinco aros y apartó uno.", "Mostró el cartel y dijo lo que creía que decía.",
    "Creo que comparó dos objetos; no sé si los contó.", "Construyó un puente sobre la mesa."])
    assert.equal(devPrivacy(observation).text, anonymousDecisionText(observation));
});
