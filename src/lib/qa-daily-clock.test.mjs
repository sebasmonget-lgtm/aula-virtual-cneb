import test from "node:test";
import assert from "node:assert/strict";
import { readQADailyClock } from "./qa-daily-clock.mjs";
test("reloj diario QA exige opt-in, test, clon aislado y fecha válida; nunca habilita producción", () => {
  const env = { AYNI_QA_DAILY_CLOCK: "1", NODE_ENV: "test", AYNI_LOCAL_DATA_DIR: ".local/qa-backups/f4-restored", AYNI_QA_DATE: "2026-10-19", AYNI_QA_TIME: "09:10" };
  assert.deepEqual(readQADailyClock(env), { date: "2026-10-19", time: "09:10" });
  assert.equal(readQADailyClock({}), null);
  for (const patch of [{ NODE_ENV: "production" }, { AYNI_LOCAL_DATA_DIR: ".local/data" }, { DATABASE_URL: "remote" },
    { AYNI_QA_DATE: "2026-02-31" }, { AYNI_QA_TIME: "24:00" }]) assert.throws(() => readQADailyClock({ ...env, ...patch }));
});
