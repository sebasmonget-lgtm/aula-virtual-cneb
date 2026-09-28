import test from "node:test";
import assert from "node:assert/strict";
import { projectMasterCases, sha256 } from "./cases.mjs";
import { normalizeProjectOutput } from "./contract.mjs";

function generated(item) {
  return { preview: { context_summary: "Contexto confirmado del aula", context_points: ["Se explora en grupo"],
    additional_context_example: "Ejemplo hipotético", purpose_options: ["Explorar", "Comunicar"] },
  dependents: { guiding_questions: ["¿Qué notamos?", "¿Qué cambió?"],
    journey: [{ title: "Exploramos", description: "Observamos materiales" },
      { title: "Comunicamos", description: "Compartimos hallazgos" }],
    general_criteria: item.teacher_decisions.competency_ids.map((competency_id) => ({
      competency_id, criterion: `Comunica una acción observable de ${competency_id}`,
      expected_evidence: [`Registro observable de ${competency_id}`] })) },
  master: { foundation: "Se parte del contexto confirmado", closing_description: "Se comparten hallazgos",
    closing_rationale: "Permite continuidad", resources: ["papel"],
    activities: item.dates.map((date, index) => ({ date, title: `Actividad ${index + 1}`, purpose: "Explorar y comunicar",
      competency_ids: [item.teacher_decisions.competency_ids[0]],
      criterion_competency_id: item.teacher_decisions.competency_ids[0],
      pedagogical_intention: "Observar acciones", criterion_text: "Explica lo observado",
      expected_evidence: "Explicación sobre lo observado", acceptable_evidence_variations: ["Señalamiento"],
      observation_focus: ["Acciones y palabras"], materials: ["papel"],
      mediation_notes: "Preguntar qué ocurrió", continuity_from_previous: "Recuperar lo anterior",
      continuity_to_next: "Volver a observar", flexibility_notes: "Ajustar al interés",
      role_in_project: "Exploración", expected_progression: "Explicación más precisa", estimated_minutes: 30 })) } };
}

test("both generated arms project through one stable V3 contract", () => {
  const item = projectMasterCases()[0], body = generated(item);
  const meta = { kbVersion: "kb-v4", calendarHash: sha256(item.dates), inputHash: sha256(item) };
  const first = normalizeProjectOutput(item, body, meta);
  const second = normalizeProjectOutput(item, structuredClone(body), meta);
  assert.equal(first.output_hash, second.output_hash);
  assert.equal(first.output.activity_map.length, item.dates.length);
  assert(first.output.activity_map.every((row) => row.criterion_refs.length === 1));
});

test("invalid date and competency fail before V3 draft can be accepted", () => {
  const item = projectMasterCases()[0], meta = { kbVersion: "kb-v4", calendarHash: "calendar", inputHash: "input" };
  const badDate = generated(item); badDate.master.activities[0].date = "2026-12-25";
  assert.throws(() => normalizeProjectOutput(item, badDate, meta), /calendario|fechas|actividad/i);
  const badCompetency = generated(item); badCompetency.master.activities[0].competency_ids = ["INVALID"];
  assert.throws(() => normalizeProjectOutput(item, badCompetency, meta), /competencias|actividad/i);
});
