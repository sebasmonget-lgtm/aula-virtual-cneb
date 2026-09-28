import test from "node:test";
import assert from "node:assert/strict";
import { prepareSimpleProject, combineProjectContext } from "./simple-project-flow.mjs";

const proposal = { purpose: "Explorar semillas", rationale: "Interés del grupo", primary_competency_ids: ["CYT_INDAGA"] };
const decisions = { context_summary: "El grupo pregunta", purpose: proposal.purpose,
  competency_ids: proposal.primary_competency_ids, additional_context: "" };
const draft = () => ({ id: "project", revision: 1, status: "draft", details: { preview: { context_summary: decisions.context_summary } } });
function harness(fail = null, initialRow = draft()) {
  let row = initialRow; const calls = [], checkpoints = [];
  const request = async (path, body, method) => {
    calls.push({ path, body, method }); if (path.endsWith(fail ?? "__none")) throw new Error("Proveedor no disponible");
    if (path.endsWith("/calendar")) return { selection: { status: "confirmed" }, days: [] };
    if (path.endsWith("/dependents")) row = { ...row, revision: 2, details: { ...row.details, decisions: body.decisions, dependents: { guiding_questions: ["¿Qué cambió?"] } } };
    if (path.endsWith("/master")) { assert.equal(body.expectedRevision, 2); row = { ...row, revision: 3, details: { ...row.details, stage: "map_review" } }; }
    return { experience: row };
  };
  return { request, calls, checkpoints, onCheckpoint: (value) => checkpoints.push(value), proposal, planId: "plan", proposalId: "proposal" };
}
test("punto de partida anual prepara A sin confirmar ni exigir nuevo contexto", async () => {
  const input = harness(); const result = await prepareSimpleProject(input);
  assert.equal(input.calls[0].body.proposalId, "proposal");
  assert.deepEqual(input.calls.find((call) => call.path.endsWith("/dependents")).body.decisions, decisions);
  assert.equal(result.details.stage, "map_review"); assert.equal(result.status, "draft");
  assert.equal(input.calls.some((call) => call.path.endsWith("/confirm")), false);
});
test("un fallo conserva el último borrador y reanuda sin repetir preview/dependents", async () => {
  const input = harness("/master"); await assert.rejects(prepareSimpleProject(input), /Proveedor/);
  const last = input.checkpoints.at(-1); assert.equal(last.revision, 2);
  const resumed = harness(null, last); await prepareSimpleProject({ ...resumed, experience: last });
  assert.equal(resumed.calls.some((call) => call.path.endsWith("/start") || call.path.endsWith("/dependents")), false);
});
test("proyecto preparado idéntico no regenera; contexto nuevo actualiza dependencias", async () => {
  const row = { ...draft(), details: { decisions, stage: "map_review", dependents: {} } };
  const input = harness(); assert.equal(await prepareSimpleProject({ ...input, experience: row }), row);
  assert.equal(input.calls.length, 0);
  const changed = harness(); await prepareSimpleProject({ ...changed, experience: row, additionalContext: "Solo tenemos semillas y algodón" });
  assert.equal(changed.calls[0].body.decisions.additional_context, "Solo tenemos semillas y algodón");
});
test("versión confirmada permanece intacta y no llama a la API", async () => {
  const input = harness(); await assert.rejects(prepareSimpleProject({ ...input, experience: { ...draft(), status: "active" } }), /nueva versión/);
  assert.equal(input.calls.length, 0);
});

test("feedback elegido cambia dependencias aun con el mismo contexto", async () => {
  const row = { ...draft(), details: { decisions, stage: "map_review", dependents: {}, planning_feedback: { period_id: "p1" } } };
  const input = harness(); await prepareSimpleProject({ ...input, experience: row,
    feedback: { usePlanningFeedback: true, planningFeedbackPeriodId: "p2" } });
  assert.equal(input.calls[0].path.endsWith("/dependents"), true);
  assert.equal(input.calls[0].body.planningFeedbackPeriodId, "p2");
});

test("JSONB reordena claves sin provocar regeneración ni gasto", async () => {
  const reordered = Object.fromEntries(Object.entries(decisions).reverse());
  const row = { ...draft(), details: { decisions: reordered, stage: "map_review", dependents: {} } };
  const input = harness(); assert.equal(await prepareSimpleProject({ ...input, experience: row }), row);
  assert.equal(input.calls.length, 0);
});

test("cinco entradas opcionales conservan un único contexto y rechazan exceso antes de llamar", async () => {
  const result = combineProjectContext(" Nota ", { Intereses: " Semillas ", Preguntas: "", Recursos: "Algodón", Adaptaciones: "" });
  assert.equal(result, "Nota\nIntereses: Semillas\nRecursos: Algodón");
  assert.equal(combineProjectContext("", {}), "");
  assert.throws(() => combineProjectContext("x".repeat(1001)), /1000/);
  const input = harness(); await assert.rejects(prepareSimpleProject({ ...input, additionalContext: "x".repeat(1001) }), /1000/);
  assert.equal(input.calls.length, 0);
});
