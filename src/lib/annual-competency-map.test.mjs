import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnualCompetencyMap } from "./annual-competency-map.mjs";

test("mapa anual deriva proyectos, roles y bimestres de los mismos objetos", () => {
  const proposal = { proposed_experiences: [
    { title: "Semillas", period: "Bimestre 1", primary_competency_ids: ["CYT_INDAGA"], possible_secondary_competency_ids: ["CYT_INDAGA", "COM_ORAL"] },
    { title: "Preguntas del barrio", period: "Bimestre 2", primary_competency_ids: ["COM_ORAL"], possible_secondary_competency_ids: ["CYT_INDAGA"] },
  ] };
  const options = [{ id: "CYT_INDAGA", name: "Indaga" }, { id: "COM_ORAL", name: "Oral" }, { id: "MAT_CANTIDAD", name: "Cantidad" }];
  const priorities = [{ competency_id: "MAT_CANTIDAD", emphasis: "prioritize", reason: "Más oportunidades para contar." }];
  const map = buildAnnualCompetencyMap(proposal, options, priorities);
  assert.equal(map.length, 3);
  assert.equal(map[0].project_count, 2);
  assert.equal(map[0].primary_count, 1);
  assert.equal(map[0].possible_secondary_count, 1);
  assert.deepEqual(map[0].periods, ["Bimestre 1", "Bimestre 2"]);
  assert.equal(map[2].project_count, 0);
  assert.equal(map[2].warnings.length, 2);
  assert.equal(proposal.proposed_experiences[0].primary_competency_ids.length, 1);
});

test("una competencia del ciclo sin desempeño de edad sigue visible sin forzarla en proyectos", () => {
  const map = buildAnnualCompetencyMap({ proposed_experiences: [] }, [{ id: "COM_ESCRITURA", name: "Escribe", has_age_performance: false }]);
  assert.equal(map[0].project_count, 0);
  assert.deepEqual(map[0].warnings, []);
});
