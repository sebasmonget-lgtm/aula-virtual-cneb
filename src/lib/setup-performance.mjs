import { AsyncLocalStorage } from "node:async_hooks";

const scope = new AsyncLocalStorage();
const names = new Set(["bootstrap", "auth", "save", "dashboard", "calendar", "logo_decode", "logo_upload", "db_connect", "db_query"]);
export const setupPerformanceActive = () => Boolean(scope.getStore());
export async function measureSetupPhase(name, work) {
  const state = scope.getStore();
  if (!state || !names.has(name)) return work();
  const start = performance.now();
  try { return await work(); }
  finally {
    state.ms[name] = (state.ms[name] ?? 0) + performance.now() - start;
    if (name === "db_query") state.queries++;
  }
}
export async function withSetupPerformance(work) {
  const state = { ms: {}, queries: 0 }, start = performance.now();
  const result = await scope.run(state, work);
  state.ms.server = performance.now() - start;
  const timing = Object.entries(state.ms).map(([name, ms]) => `${name};dur=${ms.toFixed(1)}${name === "db_query" ? `;desc="${state.queries} calls"` : ""}`).join(", ");
  return { result, timing, metrics: { ...state.ms, queries: state.queries } };
}
