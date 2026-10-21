import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { estimateJevCost, estimateTextCost, estimateTranscriptionCost,
  loadTeacherAiUsage, recordAiUsage, withAiUsageContext } from "./ai-usage-service.mjs";

const teacherA = "00000000-0000-4000-8000-000000000001";
const teacherB = "00000000-0000-4000-8000-000000000002";

test('consultar una respuesta background no duplica su evento; docentes distintos conservan aislamiento',async()=>{
 const ids=[];const db={query:async(_sql,values)=>{ids.push(values[0]);return{rows:[]};}};
 const input={provider:'openai',workflow:'diagnostic_group_synthesis',model:'gpt-6.1-sol',inputTokens:100,outputTokens:50,responseId:'resp_unique_background'};
 await withAiUsageContext({teacherId:teacherA,db},async()=>{await recordAiUsage(input);await recordAiUsage(input);});
 await withAiUsageContext({teacherId:teacherB,db},()=>recordAiUsage(input));
 assert.equal(ids[0],ids[1]);assert.notEqual(ids[0],ids[2]);assert.match(ids[0],/^[0-9a-f-]{36}$/);
});

test("precios estimados usan tokens, caché y duración sin almacenar contenido", () => {
  assert.equal(estimateTextCost({ model: "gpt-6-sol", inputTokens: 1_000_000, cachedInputTokens: 200_000, outputTokens: 100_000 }), 4.78);
  assert.equal(estimateTextCost({ model: "gpt-6-sol", inputTokens: 10_000, cachedInputTokens: 2000, outputTokens: 1000 }), 0.0264);
  assert.equal(estimateTextCost({ model: "gpt-6-sol-20260927", inputTokens: 10_000, cachedInputTokens: 2000, outputTokens: 1000 }), 0.0264);
  assert.equal(estimateTextCost({ model: "gpt-6-luna", inputTokens: 1000, outputTokens: 500 }), 0.00035);
  assert.equal(estimateTextCost({ model: "gpt-6.1-sol", inputTokens: 10000, cachedInputTokens: 2000, cacheWriteTokens: 6000, outputTokens: 1000 }), 0.0292);
  assert.equal(estimateTextCost({ model: "gpt-6-luna", inputTokens: 300000, cachedInputTokens: 100000, cacheWriteTokens: 150000, outputTokens: 1000 }), 0.05025);
  assert.equal(estimateTextCost({ model: "gpt-6-luna", inputTokens: 100, cachedInputTokens: 50, cacheWriteTokens: 51, outputTokens: 1 }), null);
  assert.equal(estimateTranscriptionCost(60), 0.003);
  assert.equal(estimateTranscriptionCost(60, "gpt-transcribe"), 0.0045);
  assert.equal(estimateTranscriptionCost(60, "unknown"), null);
  assert.equal(estimateJevCost(1_000_000), 0.042);
  assert.equal(estimateTextCost({ model: "unknown", inputTokens: 1, outputTokens: 1 }), null);
});

test("la atribución concurrente no cruza docentes y prefiere costo del proveedor", async () => {
  const writes = [];
  const db = { async query(sql, values) { assert.match(sql, /insert into ai_usage_events/u); writes.push(values); return { rows: [] }; } };
  await Promise.all([
    withAiUsageContext({ teacherId: teacherA, db }, () => recordAiUsage({ provider: "openai", workflow: "annual_plan", model: "gpt-6-sol", inputTokens: 1000, outputTokens: 500 })),
    withAiUsageContext({ teacherId: teacherB, db }, () => recordAiUsage({ provider: "openrouter", workflow: "project_image", model: "typesafe/jev-1.13-20260917", inputTokens: 200, outputTokens: 0, providerCostUsd: 0.00002 })),
  ]);
  assert.deepEqual(writes.map((row) => row[1]).sort(), [teacherA, teacherB]);
  assert.equal(writes.find((row) => row[1] === teacherB)[9], 0.00002);
  assert.equal(writes.find((row) => row[1] === teacherB)[10], "provider");
  assert.equal(await recordAiUsage({ provider: "openai", workflow: "activity", model: "gpt-6-luna" }), false);
  assert.equal(await withAiUsageContext({ teacherId: teacherA, db }, () => recordAiUsage({ provider: "openai", workflow: "", model: "gpt-6-luna" })), false);
});

test("transcripción prioriza usage real; conserva estimación por duración si falta usage", async () => {
  const writes = [];
  const db = { async query(_sql, values) { writes.push(values); return { rows: [] }; } };
  await withAiUsageContext({ teacherId: teacherA, db }, async () => {
    for (const usage of [{ inputTokens: 300, outputTokens: 57 }, {}, { inputTokens: 300, outputTokens: 57, providerCostUsd: 0.0007 }])
      await recordAiUsage({ provider: "openai", workflow: "audio_transcription", model: "gpt-4o-mini-transcribe", durationSeconds: 30, ...usage });
  });
  assert.deepEqual(writes.map(row => row[9]), [0.00066, 0.0015, 0.0007]);
  assert.deepEqual(writes.map(row => row[10]), ["estimate", "estimate", "provider"]);
});

test("transcripción con idiomas usa su tarifa por duración sin recalcular históricos", async () => {
  const writes = [], db = { async query(_sql, values) { writes.push(values); return { rows: [] }; } };
  await withAiUsageContext({ teacherId: teacherA, db }, () => recordAiUsage({ provider: "openai", workflow: "audio_transcription",
    model: "gpt-transcribe", durationSeconds: 30, inputTokens: 300, outputTokens: 57 }));
  assert.equal(writes[0][9], 0.00225);
  assert.equal(writes[0][10], "estimate");
});

test("resumen usa el mes de Lima y filtra por docente en servidor", async () => {
  let params;
  const db = { async query(sql, values) { assert.match(sql, /where teacher_id=\$1/u); params = values; return { rows: [{ provider: "openai", workflow: "annual_plan", model: "gpt-6-sol", calls: 2, unpriced_calls: 0, estimated_calls: 2, cost_usd: "0.02", month_calls: 1, month_unpriced_calls: 0, month_estimated_calls: 1, month_cost_usd: "0.01" }] }; } };
  const report = await loadTeacherAiUsage(db, teacherA, new Date("2026-10-01T04:30:00.000Z"));
  assert.deepEqual(params, [teacherA, "2026-09-01T05:00:00.000Z"]);
  assert.equal(report.month, "2026-09");
  assert.equal(report.currentMonth.costUsd, 0.01);
  assert.equal(report.total.calls, 2);
  assert.equal(report.currentMonth.estimatedCalls, 1);
});

test("la migración y consulta reales mantienen separado el consumo de dos docentes", async () => {
  const db = new PGlite();
  try {
    await db.exec("create table profiles(user_id uuid primary key)");
    await db.query("insert into profiles(user_id) values ($1),($2)", [teacherA, teacherB]);
    await db.exec(await readFile(new URL("../../local-db/migrations/0060_ai_usage_events.sql", import.meta.url), "utf8"));
    await withAiUsageContext({ teacherId: teacherA, db }, () => recordAiUsage({ provider: "openai", workflow: "activity", model: "gpt-6-luna", inputTokens: 1000, cacheWriteTokens: 800, outputTokens: 500 }));
    await withAiUsageContext({ teacherId: teacherB, db }, () => recordAiUsage({ provider: "openrouter", workflow: "project_image", model: "typesafe/jev-1.13", inputTokens: 10000, outputTokens: 0 }));
    const a = await loadTeacherAiUsage(db, teacherA);
    const b = await loadTeacherAiUsage(db, teacherB);
    assert.deepEqual([a.total.calls, b.total.calls], [1, 1]);
    assert.deepEqual([a.breakdown[0].provider, b.breakdown[0].provider], ["openai", "openrouter"]);
    assert.equal(a.total.costUsd, 0.00037);
    assert.equal(b.total.costUsd, 0.00042);
  } finally { await db.close(); }
});
