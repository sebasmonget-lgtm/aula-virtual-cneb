import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const before = JSON.parse(await readFile(".local/qa-backups/f4-checkpoint-full.json", "utf8"));
const db = await PGlite.create(".local/qa-backups/f5-restored");
const normalize = value => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(normalize) :
  value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key,normalize(value[key])])) : value;
const report = { historicalTables: [], observations: [], revisions: [] };
try {
  for (const table of ["students","activities","activity_criteria","evidences","competency_assessments",
    "competency_descriptive_conclusions","period_closures","period_closure_versions","daily_execution_logs",
    "family_reports","diagnostic_spontaneous_observations","ai_usage_events"]) {
    const old = before.tables[table], current = (await db.query(`select * from ${table}`)).rows;
    const sorted = items => normalize([...items].sort((a,b) => String(a.id).localeCompare(String(b.id))));
    assert.deepEqual(sorted(current),sorted(old),`${table} cambió durante F5`);
    report.historicalTables.push({ table, rows: old.length });
  }
  const rows = (await db.query("select * from ordinary_observations order by student_id")).rows;
  const revisions = (await db.query("select * from ordinary_observation_revisions")).rows;
  assert.equal(rows.length,2);
  assert.equal(revisions.length,1);
  const benjamin = rows.find(row => row.student_id === "90000000-0000-4000-8000-000000000002");
  const camila = rows.find(row => row.student_id === "90000000-0000-4000-8000-000000000003");
  assert.equal(benjamin.source_kind,"guided");
  assert.ok(benjamin.activity_id && benjamin.project_id);
  assert.match(benjamin.raw_text,/Camila/);
  assert.equal(camila.source_kind,"spontaneous");
  assert.equal(camila.activity_id,null);
  assert.ok(camila.raw_text.startsWith("  Benjamín"));
  assert.ok(camila.raw_text.endsWith("  "));
  assert.equal(camila.source_revision,2);
  assert.equal(revisions[0].observation_id,camila.id);
  assert.equal(revisions[0].created_by,camila.created_by);
  assert.match(revisions[0].corrected_text,/transcripción automática/);
  report.observations = rows.map(row => ({ id: row.id, student_id: row.student_id, source_kind: row.source_kind,
    activity_id: row.activity_id, project_id: row.project_id, source_revision: row.source_revision }));
  report.revisions = revisions.map(row => ({ id: row.id, observation_id: row.observation_id, revision: row.revision }));
  await mkdir(".local/test-results/f5", { recursive: true });
  await writeFile(".local/test-results/f5/history.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify({ unchangedHistoricalTables: report.historicalTables.length, raw: rows.length, revisions: revisions.length }));
} finally { await db.close(); }
