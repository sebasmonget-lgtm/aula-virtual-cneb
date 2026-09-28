// Read-only ledger reconciliation. Never overwrite the 49-call BEFORE artifact.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("./", import.meta.url);
const explicitAction = process.argv[2] ?? null;
const explicitPeriod = process.argv[3] ?? null;
if (explicitAction && (!/^[a-z_]+$/.test(explicitAction) || !/^(P[1-4]|annual)$/.test(explicitPeriod ?? "")))
  throw new Error("Etiqueta UI inválida");
const baseline = JSON.parse(await readFile(new URL("llamadas-ia.json", root), "utf8"));
const output = new URL("llamadas-ia-continuacion.json", root);
let prior = baseline;
try { prior = JSON.parse(await readFile(output, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
assert.deepEqual(prior.calls.slice(0, baseline.calls.length), baseline.calls, "BEFORE calls must remain unchanged");
const response = await fetch("http://127.0.0.1:8790/api/export");
if (!response.ok) throw new Error(`QA ledger read failed: ${response.status}`);
const snapshot = await response.json();
const teacher = "d97b5d03-b64d-405e-9de5-ae6e407bf126";
const events = snapshot.tables.ai_usage_events.filter(row => row.teacher_id === teacher)
  .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
const actions = JSON.parse(await readFile(new URL("ai-acciones-ui-continuacion.json", root), "utf8")).map(row=>
  ({...row,business_day:row.business_day??row.business_date,attempts:row.attempts??row.attempt}));
const specific = new Map([
  ["e7f2f42a-98d1-4b36-9bbf-ff80bb52391a", { action: "annual_formal", period: "annual", observed_status: "rejected_output", attempts: 1, regeneration: 0 }],
  ["aa74690f-0efa-44a0-82d1-3dafd4f33df3", { action: "annual_formal", period: "annual", observed_status: "Word listo", attempts: 1, regeneration: 1 }],
  ["ebcecf06-441f-4b5b-be79-9e9459041a85", { action: "project_preview", period: "P1", observed_status: "context_and_purpose_ready", attempts: 1, regeneration: 0 }],
  ["6cccd6ce-fea1-46b6-a8f4-ce83b7976be9", { action: "jev_project_image", period: "P1", observed_status: "recommended_image_selected_in_UI", attempts: 1, regeneration: 0 }],
  ["0717caba-36d4-47b4-9339-499c388cc122", { action: "jev_workshop_sheet", period: "P1", observed_status: "abstained_no_suitable_sheet", attempts: 1, regeneration: 0 }],
  ["f1cc7bb7-93c7-407b-a0c6-f141052a94de", { action: "project_preview", period: "P1", observed_status: "huerto_preview_ready", attempts: 1, regeneration: 0 }],
  ["579bfa31-c8b5-43db-a8e8-140ad9688321", { action: "project_dependents", period: "P1", observed_status: "huerto_questions_ready", attempts: 1, regeneration: 0 }],
  ["b9e1d65d-dea7-4d77-85e1-7ca440aefd3b", { action: "project_master", period: "P1", observed_status: "huerto_map_confirmed_UI", attempts: 1, regeneration: 0 }],
  ["afd524a9-7a49-4afb-ad96-647a85f8be6b", { action: "jev_project_image", period: "P1", observed_status: "huerto_image_selected_UI", attempts: 1, regeneration: 0 }],
  ["a66de508-9152-4d15-bb3e-4e2153c11469", { action: "assessment", period: "P1", observed_status: "H36_wrong_civil_dates_not_confirmed", attempts: 1, regeneration: 0 }],
  ["d1513e55-5a01-4095-95a6-8b8b64624881", { action: "assessment", period: "P1", observed_status: "H36_retry_correct_dates_teacher_confirmed", attempts: 1, regeneration: 1 }],
  ["4889d7b5-3367-4f12-ba64-a144cdeb985b", { action: "descriptive_conclusion", period: "P1", observed_status: "H37_same_proposal_confirmed_after_fix_no_regeneration", attempts: 1, regeneration: 0 }],
  ["9162976a-86c0-4569-b310-9f0ac572ad1e", { action: "project_preview", period: "P2", observed_status: "H45_preview_ignored_selected_P1_feedback_not_confirmed", attempts: 1, regeneration: 0 }],
  ["d2ea62e6-2394-4d61-aa07-6373ba868fe2", { action: "project_preview", period: "P2", observed_status: "H45_updated_preview_P1_results_verified_UI", attempts: 1, regeneration: 1 }],
  ["62b5e969-05cf-403b-aa8a-8f775e87a736", { action: "project_dependents", period: "P2", observed_status: "invalid_dependents_not_saved", attempts: 1, regeneration: 0 }],
  ["bcd696ae-6627-45ae-bb7f-51f8966c99a9", { action: "descriptive_conclusion", period: "P3", observed_status: "Alma_UI_generation_with_Luna_and_Sol_usage", attempts: 1, regeneration: 0, provider_attempt_role: "primary", ui_generation_attempt: 1 }],
  ["4e5fafc3-9bb0-4855-bfc2-fa596c439bd6", { action: "descriptive_conclusion", period: "P3", observed_status: "Alma_same_UI_generation_final_conclusion_reviewed_confirmed", attempts: 1, regeneration: 0, provider_attempt_role: "fallback", ui_generation_attempt: 1 }],
]);
// Four rejected UI generations of Alma before H39; each billed a primary and fallback.
for (const [index, id] of [
  "6ffa8803-fccc-4cd9-a747-9c2dde473714", "c444f552-c912-4b6d-b434-bb34ae729f6b",
  "f95895c9-ecd6-4b7b-bcfb-be4791ca3fef", "0282996e-bcdc-4529-87e2-41f80defce4d",
  "8637b621-7348-41d8-b15b-f5f52d5b12c5", "f8360fa6-e191-4608-8904-77cfa7e93fc2",
  "4bbb1c80-ae35-40cf-ad19-5513e66f8203", "4d8aaa13-50d9-40b7-8fbc-6553a409effc",
].entries()) specific.set(id, { action: "descriptive_conclusion", period: "P1", observed_status: "H39_false_rejection_not_confirmed",
  attempts: 1, regeneration: index < 2 ? 0 : 1, ui_generation_attempt: Math.floor(index / 2) + 1,
  provider_attempt_role: index % 2 ? "fallback" : "primary" });
const expectedWorkflow = action => action.startsWith("project_") ? "project" :
  action === "annual_formal" ? "annual_plan" : action.startsWith("jev_") ? null : action;
const matchesAction = (action, row) => expectedWorkflow(action.action ?? "") === row.workflow
  || (action.action?.startsWith("project_") && row.workflow === "unit")
  || (action.action === "activity" && row.workflow === "workshop")
  || (action.action === "workshop_master" && row.workflow === "workshop_sheet")
  || (action.action?.startsWith("jev_") && row.provider === "openrouter");
const calls = prior.calls.map((row, index) => index < baseline.calls.length ? row : { ...row, ...specific.get(row.id) });
const ids = new Set(calls.map(row => row.id));
for (const row of events) {
  if (ids.has(row.id)) continue;
  const candidates = actions.filter(action => (action.business_day
    ? row.occurred_at.slice(0, 10) === action.business_day
    : action.started <= row.occurred_at && (!action.observed || row.occurred_at <= action.observed)) &&
    matchesAction(action, row));
  const uniqueActions = new Set(candidates.map(item => item.action));
  const action = uniqueActions.size === 1
    ? candidates.sort((a, b) => (b.started_at ?? b.started ?? b.observed_ready_at ?? b.observed ?? "").localeCompare(a.started_at ?? a.started ?? a.observed_ready_at ?? a.observed ?? ""))[0]
    : null; // Same simulated day is not enough to attribute several project phases.
  const explicit = explicitAction && matchesAction({action:explicitAction},row)
    ? { action: explicitAction, period: explicitPeriod, action_match: "explicit_UI_checkpoint_after_generation" } : {};
  calls.push({ ...row, cost_usd: Number(row.cost_usd), observed_status: "usage_recorded",
    action: row.workflow === "workshop" ? "workshop_day" : row.workflow === "workshop_sheet" ? "jev_workshop_sheet" : row.workflow === "project_image" ? "jev_project_image" : action?.action ?? row.workflow, period: action?.period ?? explicitPeriod ?? "unmatched",
    attempts: action?.attempts ?? null, regeneration: action?.regeneration ?? null,
    attempts_note: "UI actions observed; not proof of unrecorded gateway/SDK retry counts.",
    observed_wall_clock_at: new Date().toISOString(),
    clock_basis: action?.business_day ? "QA simulated business date; UI action retains real wall clock" : "wall_clock",
    action_match: action ? action.business_day ? "latest_matching_UI_action_at_checkpoint_on_simulated_day" : "workflow_and_ui_time_window" : "unmatched_no_inference",
    ...explicit, ...specific.get(row.id) });
  ids.add(row.id);
}
assert.equal(calls.length, events.length, "Do not silently drop prior calls or count duplicates");
const totals = { calls: calls.length, baselineCalls: baseline.calls.length,
  providerReportedUsd: 0, tariffEstimatedUsd: 0, unpricedCalls: 0, mixedLedgerUsd: 0 };
const byFunction = {};
for (const row of calls) {
  totals.mixedLedgerUsd += row.cost_usd;
  if (row.cost_source === "provider") totals.providerReportedUsd += row.cost_usd;
  else if (row.cost_source === "estimate") totals.tariffEstimatedUsd += row.cost_usd;
  else totals.unpricedCalls++;
  const fn = row.action ?? row.workflow;
  byFunction[fn] ??= { calls: 0, costUsd: 0, meanUsd: 0 };
  byFunction[fn].calls++; byFunction[fn].costUsd += row.cost_usd;
}
for (const fn of Object.values(byFunction)) fn.meanUsd = fn.costUsd / fn.calls;
await writeFile(output, JSON.stringify({ scope: "Cumulative QA ledger; original BEFORE calls unchanged",
  at: new Date().toISOString(), businessClockAtExport: snapshot.exportedAt, totals, byFunction, calls }, null, 2));
console.log(JSON.stringify({ at: snapshot.exportedAt, totals, byFunction }, null, 2));
