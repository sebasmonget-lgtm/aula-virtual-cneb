import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { activityV3, projectMasterV3, validateActivityV3 } from "../../src/lib/planning-contract-v3.mjs";
const previous = JSON.parse(await readFile(".local/qa-backups/f3-checkpoint-full.json", "utf8"));
const db = await PGlite.create(".local/qa-backups/f4-restored");
const normalize = value => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(normalize) :
  value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
const result = { unchanged: [], activity: null, paidCalls: 0 };
try {
  const exclusions = new Set(["activities", "activity_criteria", "class_schedule_entries", "daily_execution_logs", "local_schema_migrations", "ai_usage_events", "period_evaluation_map_entries", "period_evaluation_map_versions"]);
  const differences = [];
  for (const [table, rows] of Object.entries(previous.tables)) {
    if (exclusions.has(table)) continue;
    const now = (await db.query(`select * from ${table}`)).rows;
    const sorted = items => normalize([...items].map(item => table === "competency_display_labels" ? Object.fromEntries(Object.entries(item).filter(([key]) => key !== "updated_at")) : item)
      .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    if (JSON.stringify(sorted(now)) !== JSON.stringify(sorted(rows))) differences.push({ table, before: rows.length, after: now.length });
    else result.unchanged.push({ table, rows: rows.length });
  }
  assert.equal(differences.length, 0, `Tablas alteradas: ${JSON.stringify(differences)}`);
  result.derived = [];
  for (const table of ["period_evaluation_map_entries", "period_evaluation_map_versions"]) {
    const old = previous.tables[table], current = (await db.query(`select * from ${table}`)).rows;
    const oldById = new Map(old.map(row => [row.id, row]));
    const changedOldIds = current.filter(row => oldById.has(row.id) && JSON.stringify(normalize(row)) !== JSON.stringify(normalize(oldById.get(row.id)))).map(row => row.id);
    const missingOldIds = old.filter(row => !current.some(item => item.id === row.id)).map(row => row.id);
    result.derived.push({ table, before: old.length, after: current.length, changedOldIds, missingOldIds });
  }
  const beforeIds = new Set(previous.tables.activities.map(item => item.id));
  for (const table of ["activities", "activity_criteria", "class_schedule_entries", "daily_execution_logs"]) {
    const now = (await db.query(`select * from ${table}`)).rows;
    const old = previous.tables[table];
    const sorted = items => normalize([...items].sort((a,b) => String(a.id).localeCompare(String(b.id))));
    assert.deepEqual(sorted(now.filter(item => old.some(row => row.id === item.id))), sorted(old), `Filas históricas alteradas: ${table}`);
    result.unchanged.push({ table, rows: old.length });
  }
  const usage = (await db.query("select * from ai_usage_events")).rows;
  const oldUsage = previous.tables.ai_usage_events;
  const sortedUsage = items => normalize([...items].sort((a,b) => String(a.id).localeCompare(String(b.id))));
  assert.deepEqual(sortedUsage(usage.filter(item => oldUsage.some(row => row.id === item.id))), sortedUsage(oldUsage), "Uso histórico alterado");
  assert.equal(usage.length - oldUsage.length, 1, "El fixture local debe producir un solo evento de uso");
  assert.equal(Number(usage.find(item => !oldUsage.some(row => row.id === item.id)).cost_usd), 0);
  result.unchanged.push({ table: "ai_usage_events", rows: oldUsage.length });
  const created = (await db.query("select * from activities")).rows.filter(item => !beforeIds.has(item.id));
  assert.equal(created.length, 1); const activity = created[0];
  assert.equal(activity.status, "active"); assert.equal(activity.occurs_on.toISOString().slice(0,10), "2026-10-19");
  const project = (await db.query("select * from learning_experiences where id=$1", [activity.experience_id])).rows[0];
  const dto = activityV3(activity, project); validateActivityV3({ ...dto, occurs_on: activity.occurs_on.toISOString().slice(0,10) }, projectMasterV3(project));
  assert.equal(dto.project_version, 1);
  const criteria = (await db.query("select * from activity_criteria where activity_id=$1", [activity.id])).rows;
  assert.equal(criteria.length, 2); assert.equal(new Set(criteria.map(item => item.competency_v4_id)).size, 2);
  assert.deepEqual(new Set(criteria.map(item => item.details.source_criterion_id)), new Set(dto.criterion_refs));
  const schedule = (await db.query("select * from class_schedule_entries where activity_id=$1", [activity.id])).rows;
  assert.equal(schedule.length, 1);
  const execution = (await db.query("select * from daily_execution_logs where schedule_entry_id=$1", [schedule[0].id])).rows;
  assert.equal(execution.length, 1); assert.equal(execution[0].status, "completed");
  assert.equal(execution[0].execution_date.toISOString().slice(0,10), "2026-10-19");
  assert.deepEqual(activity.preparation.steps, [activity.details.meaningful_situation,activity.details.child_actions,activity.details.closure_or_continuity]);
  result.activity = { id: activity.id, projectId: project.id, projectVersion: dto.project_version,
    blueprintId: dto.blueprint_id, criteria: criteria.map(item => ({ id: item.id, competencyId: item.competency_v4_id })),
    scheduleId: schedule[0].id, status: activity.status, execution: execution[0].status,
    steps: activity.preparation.steps.length };
  await mkdir(".local/test-results/f4", { recursive: true });
  await writeFile(".local/test-results/f4/history.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ unchangedTables: result.unchanged.length, historicalActivities: beforeIds.size, activity: result.activity }));
} finally { await db.close(); }
