import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const before = JSON.parse(await readFile(".local/qa-backups/f5-checkpoint-full.json", "utf8"));
const db = await PGlite.create(".local/qa-backups/f6-restored");
const normalize = value => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(normalize) :
  value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key,normalize(value[key])])) : value;
const report = { historicalTables: [], rawHistory: [], newObservations: [], attributions: [] };
try {
  for (const table of ["students","activities","activity_criteria","evidences","competency_assessments",
    "competency_descriptive_conclusions","period_closures","period_closure_versions","daily_execution_logs",
    "family_reports","diagnostic_spontaneous_observations","ai_usage_events"]) {
    const old = before.tables[table], current = (await db.query(`select * from ${table}`)).rows;
    const sort = rows => normalize([...rows].sort((a,b) => String(a.id).localeCompare(String(b.id))));
    assert.deepEqual(sort(current),sort(old),`${table} cambió durante F6`);
    report.historicalTables.push({ table, rows: old.length });
  }
  const raw = (await db.query("select * from ordinary_observations")).rows;
  for (const original of before.tables.ordinary_observations) {
    const current = raw.find(item => item.id === original.id);
    assert.ok(current,`Raw histórico perdido: ${original.id}`);
    assert.deepEqual(normalize(Object.fromEntries(Object.keys(original).map(key => [key,current[key]]))),normalize(original));
    assert.equal(current.captured_criterion_id,null);
    report.rawHistory.push(original.id);
  }
  const revisions = (await db.query("select * from ordinary_observation_revisions")).rows;
  assert.deepEqual(normalize(revisions),normalize(before.tables.ordinary_observation_revisions));
  assert.equal(raw.length, before.tables.ordinary_observations.length + 2);
  const after = raw.filter(item => !report.rawHistory.includes(item.id));
  assert.ok(after.every(item => item.student_id === "90000000-0000-4000-8000-000000000003"));
  assert.ok(after.every(item => item.raw_text.includes("Benjamín")));
  const captured = after.find(item => item.captured_criterion_id);
  assert.equal(captured.captured_criterion_id,"c0000000-0000-4000-8000-000000000002");
  assert.equal(captured.context_snapshot.captured_legacy_competency_id,"50000000-0000-4000-8000-000000000001");
  assert.equal(captured.context_snapshot.captured_competency_id,null);
  const attributions = (await db.query("select * from ordinary_observation_attributions order by observation_id,version")).rows;
  assert.ok(attributions.some(item => item.state === "unavailable"));
  assert.ok(attributions.some(item => item.state === "confirmed" && item.confirmed_competency_ids.includes("MAT_CANTIDAD")));
  assert.ok(attributions.some(item => item.state === "confirmed" && item.confirmed_competency_ids.includes("COM_ARTE")));
  assert.equal((await db.query("select count(*)::int as count from ordinary_observation_criterion_links")).rows[0].count,0);
  report.newObservations = after.map(item => ({ id:item.id,student_id:item.student_id,
    captured_criterion_id:item.captured_criterion_id }));
  report.attributions = attributions.map(item => ({ id:item.id,observation_id:item.observation_id,
    version:item.version,state:item.state,source:item.source,raw_revision:item.raw_revision }));
  await mkdir(".local/test-results/f6", {recursive:true});
  await writeFile(".local/test-results/f6/history.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify({historicalTables:report.historicalTables.length,originalRaw:report.rawHistory.length,
    newRaw:report.newObservations.length,attributions:report.attributions.length}));
} finally { await db.close(); }
