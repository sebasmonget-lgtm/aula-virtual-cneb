// Test-only preload: advance the fictitious classroom's business clock, not its data.
// Never imported by the product. PGlite/WASM also sees this simulated clock.
// UI action logs separately retain actual wall time for billing/audit interpretation.
import { readFileSync } from "node:fs";
import path from "node:path";
if (process.env.AYNI_LOCAL_DB_PORT !== "8790" || process.env.AYNI_AUTH_MODE !== "local"
  || process.env.AYNI_LOCAL_TEACHER_ID !== "d97b5d03-b64d-405e-9de5-ae6e407bf126"
  || path.resolve(process.env.AYNI_LOCAL_DATA_DIR ?? "") !== path.resolve(".local/qa/end-to-end-audit-2026/pgdata")) {
  throw new Error("The E2E clock is restricted to the isolated fictitious classroom.");
}
const NativeDate = Date;
const file = path.resolve(".local/qa/end-to-end-audit-2026/business-clock.json");
let previous, base, realStart;
const now = () => {
  const value = JSON.parse(readFileSync(file, "utf8")).at;
  if (value !== previous) {
    const parsed = NativeDate.parse(value);
    if (!Number.isFinite(parsed) || !/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value)) throw new Error("Invalid E2E business date.");
    previous = value; base = parsed; realStart = NativeDate.now();
  }
  return base + NativeDate.now() - realStart;
};
function AuditDate(...args) {
  if (!new.target) return new NativeDate(now()).toString();
  return Reflect.construct(NativeDate, args.length ? args : [now()], new.target);
}
AuditDate.prototype = NativeDate.prototype;
Object.setPrototypeOf(AuditDate, NativeDate);
AuditDate.now = now;
globalThis.Date = AuditDate;
