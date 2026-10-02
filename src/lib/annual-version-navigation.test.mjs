import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the production guard and version click handler, without a browser dialog
// or a duplicate implementation of their decisions. Other UI is outside this test.
const componentText = await readFile(new URL("../features/dashboard/components/annual-preplan-workspace.tsx", import.meta.url), "utf8");
const locationText = await readFile(new URL("./workspace-location.ts", import.meta.url), "utf8");
const component = ts.createSourceFile("annual-preplan-workspace.tsx", componentText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const location = ts.createSourceFile("workspace-location.ts", locationText, ts.ScriptTarget.Latest, true);
function findOne(source, predicate) {
  const matches = [];
  function visit(node) { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit); }
  visit(source);
  assert.equal(matches.length, 1, "The production behavior must be found unambiguously.");
  return matches[0];
}
const guard = findOne(component, (node) => ts.isCallExpression(node)
  && node.expression.getText(component) === "useEffect"
  && node.arguments[1]?.getText(component) === "[dirty, busy]").arguments[0];
const click = findOne(component, (node) => ts.isJsxAttribute(node) && node.name.getText(component) === "onClick"
  && node.initializer?.getText(component).includes("canLeaveWorkspace()")
  && node.initializer.getText(component).includes("setSelectedId(item.id)")).initializer.expression;
const navigation = findOne(location, (node) => ts.isFunctionDeclaration(node) && node.name?.text === "canLeaveWorkspace");
const compiled = ts.transpileModule(`${navigation.getText(location)}
const cleanup = (${guard.getText(component)})();
const selectVersion = (${click.getText(component)});
exports.selectVersion = selectVersion;
exports.cleanup = cleanup;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function harness({ dirty = true, answer = false, target = "active" } = {}) {
  const targetPlan = { id: target, status: target === "history" ? "archived" : "active", proposal: { plan_format: "annual_preplan_v1", proposed_experiences: [{ title: "Plan confirmado" }] } };
  const pending = { plan_format: "annual_preplan_v1", proposed_experiences: [{ title: "Cambio de la docente" }] };
  const state = { selectedId: "draft", proposal: pending, editRequestId: "row", prompts: [], writes: [] };
  const events = new EventTarget();
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported, Event, dirty, busy: null, selectedId: state.selectedId, item: targetPlan,
    window: {
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
      confirm: (message) => { state.prompts.push(message); return answer; },
    },
    isPreplan: (plan) => plan.proposal.plan_format === "annual_preplan_v1",
    setSelectedId: (id) => { state.writes.push("selection"); state.selectedId = id; },
    setProposal: (proposal) => { state.writes.push("proposal"); state.proposal = proposal; },
    setEditRequestId: (id) => { state.writes.push("editor"); state.editRequestId = id; },
  });
  return { state, pending, targetPlan, events, ...exported };
}

test("Cancelar conserva la versión y todos los cambios pendientes al abrir vigente o histórico", () => {
  for (const target of ["active", "history"]) {
    const flow = harness({ target, answer: false });
    flow.selectVersion();
    assert.equal(flow.state.selectedId, "draft");
    assert.strictEqual(flow.state.proposal, flow.pending);
    assert.equal(flow.state.editRequestId, "row");
    assert.deepEqual(flow.state.writes, []);
    assert.equal(flow.state.prompts.length, 1);
    assert.match(flow.state.prompts[0], /Cancela para permanecer y guardarlos/);
    flow.cleanup();
    assert.equal(flow.events.dispatchEvent(new Event("ayni-before-navigation", { cancelable: true })), true);
    assert.equal(flow.state.prompts.length, 1, "Unmount must remove the guard.");
  }
});

test("Descartar cambia a vigente o histórico sin escribir en sus propuestas ni guardar el borrador", () => {
  for (const target of ["active", "history"]) {
    const flow = harness({ target, answer: true });
    const originalTarget = structuredClone(flow.targetPlan);
    const originalDraft = structuredClone(flow.pending);
    flow.selectVersion();
    assert.equal(flow.state.prompts.length, 1);
    assert.match(flow.state.prompts[0], /descartarlos y continuar/);
    assert.equal(flow.state.selectedId, target);
    assert.strictEqual(flow.state.proposal, flow.targetPlan.proposal);
    assert.equal(flow.state.editRequestId, null);
    assert.deepEqual(flow.targetPlan, originalTarget);
    assert.deepEqual(flow.pending, originalDraft);
    assert.deepEqual(flow.state.writes, ["editor", "selection", "proposal"]);
    flow.cleanup();
  }
});

test("No hay aviso si el borrador está limpio o se selecciona la misma versión", () => {
  const clean = harness({ dirty: false });
  clean.selectVersion();
  assert.equal(clean.state.selectedId, "active");
  assert.deepEqual(clean.state.prompts, []);
  const same = harness({ target: "draft" });
  same.selectVersion();
  assert.strictEqual(same.state.proposal, same.pending);
  assert.deepEqual(same.state.writes, []);
  assert.deepEqual(same.state.prompts, []);
  same.cleanup();
});
