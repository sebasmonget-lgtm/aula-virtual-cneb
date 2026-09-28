import { readFile, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { validateProjectMasterV3, projectMasterV3 } from "../../src/lib/planning-contract-v3.mjs";
// Run only after stopping the QA API, never against personal/production data.
const snapshot = JSON.parse(await readFile(".local/qa-backups/f2-baseline-export-full.json", "utf8"));
const db = await PGlite.create(".local/qa-backups/f3-restored-v2");
const normalize = value => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  return value;
};
const report = { unchanged: [], projects: [] };
try {
  for (const table of ["activities", "activity_criteria", "evidences", "competency_assessments", "competency_descriptive_conclusions",
    "period_closure_versions", "period_closures", "document_versions", "experience_formal_contents", "annual_plans"]) {
    const rows = (await db.query(`select * from ${table}`)).rows;
    const sorted = values => normalize([...values].sort((a,b) => String(a.id).localeCompare(String(b.id))));
    assert.deepEqual(sorted(rows), sorted(snapshot.tables[table]), `${table}: cambió un dato histórico`);
    report.unchanged.push({ table, rows: rows.length });
  }
  const current = (await db.query("select * from learning_experiences")).rows;
  const fields = ["title", "purpose", "details", "classroom_id", "annual_plan_id", "source_proposal_id", "source_proposal_index", "version"];
  for (const old of snapshot.tables.learning_experiences) {
    const row = current.find(item => item.id === old.id); assert.ok(row);
    const pick = item => normalize(Object.fromEntries(fields.map(key => [key,item[key]])));
    assert.deepEqual(pick(row), pick(old), `Proyecto histórico cambiado: ${old.id}`);
  }
  for (const row of current.filter(item => item.details.contract_version === "project-master-v3")) {
    const dto = projectMasterV3(row); validateProjectMasterV3(dto);
    report.projects.push({ id: row.id, version: row.version, status: row.status, source: dto.source,
      blueprintIds: dto.activity_map.map(item => item.blueprint_id), sourceFingerprint: dto.source_fingerprint });
  }
  assert.equal(report.projects.length, 2);
  assert.ok(report.projects.some(item => item.version === 1 && item.status === "active"));
  assert.ok(report.projects.some(item => item.version === 2 && item.status === "active"));
  await writeFile(".local/test-results/f3/history.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await db.close(); }
