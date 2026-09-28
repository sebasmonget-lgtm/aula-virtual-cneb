import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import JSZip from "jszip";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import {
  SIAGIE_EXPORT_STATUS,
  activityMapState,
  buildGenericAssessmentWorkbook,
  buildClassroomPeriodReportInput,
  buildPeriodStatistics,
  classroomReportFingerprint,
  competencyWorkState,
  isTeacherAchievementLevel,
  stableCompetencyLabel,
  syncPeriodEvaluationMap,
  validateClassroomPeriodReport,
} from "./period-assessment-closure-service.mjs";

const classroomId = "00000000-0000-4000-8000-000000000201";
const yearId = "00000000-0000-4000-8000-000000000101";
const periodId = "00000000-0000-4000-8000-000000000801";
const experienceId = "00000000-0000-4000-8000-000000000301";
const activityId = "00000000-0000-4000-8000-000000000401";
const criterionId = "00000000-0000-4000-8000-000000000501";
const studentId = "00000000-0000-4000-8000-000000000601";

async function mapFixture() {
  const db = await PGlite.create();
  await db.exec(`
    create table profiles(user_id uuid primary key);
    create table school_years(id uuid primary key);
    create table classrooms(id uuid primary key,school_year_id uuid references school_years(id));
    create table evaluation_periods(id uuid primary key,school_year_id uuid references school_years(id));
    create table learning_experiences(id uuid primary key,classroom_id uuid references classrooms(id),revision bigint,status text,details jsonb);
    create table experience_formal_contents(id uuid primary key,experience_id uuid references learning_experiences(id));
    create table activities(id uuid primary key,experience_id uuid references learning_experiences(id),revision bigint,occurs_on date,status text,details jsonb);
    create table activity_criteria(id uuid primary key,activity_id uuid references activities(id),revision integer,status text,competency_v4_id text,details jsonb);
    create table students(id uuid primary key,classroom_id uuid references classrooms(id));
    create table evidences(id uuid primary key,student_id uuid references students(id),criterion_id uuid references activity_criteria(id),observed_at timestamptz);
  `);
  await db.exec(await readFile(new URL("../../local-db/migrations/0057_period_assessment_closure.sql", import.meta.url), "utf8"));
  await db.query(`insert into profiles values('00000000-0000-4000-8000-000000000001')`);
  await db.query(`insert into school_years values($1)`, [yearId]);
  await db.query(`insert into classrooms values($1,$2)`, [classroomId, yearId]);
  await db.query(`insert into evaluation_periods values($1,$2)`, [periodId, yearId]);
  await db.query(`insert into learning_experiences values($1,$2,2,'active','{}')`, [experienceId, classroomId]);
  await db.query(`insert into experience_formal_contents values('00000000-0000-4000-8000-000000000302',$1)`, [experienceId]);
  await db.query(`insert into activities values($1,$2,3,'2026-04-10','active',$3::jsonb)`, [activityId, experienceId, JSON.stringify({ activity_blueprint_id: "blueprint-1" })]);
  await db.query(`insert into activity_criteria values($1,$2,4,'active','COM_ORAL',$3::jsonb)`, [criterionId, activityId, JSON.stringify({ expected_evidence: "Explicación oral", observation_focus: ["Explica su decisión"] })]);
  await db.query(`insert into students values($1,$2)`, [studentId, classroomId]);
  return db;
}

test("1 y 12: criterio confirmado aparece en el mapa con IDs, versiones y etiqueta estable", async () => {
  const db = await mapFixture();
  try {
    const result = await syncPeriodEvaluationMap(db, { classroomId, schoolYearId: yearId, period: { id: periodId, starts_on: "2026-03-01", ends_on: "2026-05-31" } });
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].criterion_id, criterionId);
    assert.equal(result.entries[0].criterion_revision, 4);
    assert.equal(result.entries[0].activity_blueprint_ref, "blueprint-1");
    assert.equal(result.entries[0].formal_content_id, "00000000-0000-4000-8000-000000000302");
    assert.deepEqual(stableCompetencyLabel({ id: "COM_ORAL", official_name: "Se comunica oralmente en su lengua materna", area: "Comunicación" }), {
      competency_id: "COM_ORAL", short_label: "Se comunica", area: "Comunicación", official_name: "Se comunica oralmente en su lengua materna",
    });
  } finally { await db.close(); }
});

test("2, 3 y 4: actividad realizada, omitida y evidencia actualizan worked/evidenced por código", async () => {
  assert.equal(activityMapState({ executionStatus: "completed" }), "completed");
  assert.equal(activityMapState({ executionStatus: "skipped", evidenceCount: 0 }), "skipped");
  assert.deepEqual(competencyWorkState([{ activity_state: "skipped", evidence_count: 0 }], true), { planned: true, worked: false, evidenced: false, state: "planned" });
  const db = await mapFixture();
  try {
    const period = { id: periodId, starts_on: "2026-03-01", ends_on: "2026-05-31" };
    const before = await syncPeriodEvaluationMap(db, { classroomId, schoolYearId: yearId, period });
    await db.query(`insert into evidences values(gen_random_uuid(),$1,$2,'2026-04-10T10:00:00Z')`, [studentId, criterionId]);
    const after = await syncPeriodEvaluationMap(db, { classroomId, schoolYearId: yearId, period });
    assert.equal(after.version, before.version + 1);
    assert.equal(after.entries[0].activity_state, "completed");
    assert.equal(after.entries[0].evidence_count, 1);
    assert.equal(after.entries[0].students_with_evidence, 1);
    assert.equal(competencyWorkState(after.entries, true).state, "evidenced");
  } finally { await db.close(); }
});

test("13, 14 y 15: estadísticas exactas, sin promediar niveles ni convertir no trabajado en C", () => {
  const rows = [
    { student_id: "s1", competency_id: "COM_ORAL", evidence_count: 2, level: "AD" },
    { student_id: "s2", competency_id: "COM_ORAL", evidence_count: 1, level: "A" },
    { student_id: "s3", competency_id: "COM_ORAL", evidence_count: 0, level: null },
  ];
  const result = buildPeriodStatistics({ rows, mapEntries: [{ competency_v4_id: "COM_ORAL", activity_state: "completed", activity_id: "a", criterion_id: "c", evidence_count: 3 }], competencyMeta: [{ competency_id: "COM_ORAL", short_label: "Se comunica", area: "Comunicación" }], studentCount: 3, plannedCompetencyIds: ["COM_ORAL", "MAT_CANTIDAD"] });
  const oral = result.competencies.find((item) => item.competency_id === "COM_ORAL");
  const quantity = result.competencies.find((item) => item.competency_id === "MAT_CANTIDAD");
  assert.deepEqual(oral.levels, { AD: 1, A: 1, B: 0, C: 0 });
  assert.deepEqual(oral.percentages, { AD: 50, A: 50, B: 0, C: 0 });
  assert.equal(quantity.worked, false);
  assert.deepEqual(quantity.levels, { AD: 0, A: 0, B: 0, C: 0 });
  assert.equal(quantity.students_without_grade, 0, "solo prevista: no crea valoraciones faltantes");
  assert.equal(quantity.students_without_evidence, 0, "solo prevista: no crea cobertura obligatoria");
  assert.equal(oral.students_without_grade, 1);
  assert.equal(oral.students_without_evidence, 1);
  assert.equal("average_grade" in result.classroom, false);
});

test("7: la profesora puede elegir exactamente AD, A, B o C y no existe una opción recomendada", () => {
  for (const value of ["AD", "A", "B", "C"]) assert.equal(isTeacherAchievementLevel(value), true);
  for (const value of [null, "", "D", "18", "sugerido"]) assert.equal(isTeacherAchievementLevel(value), false);
});

test("16 y 17: informe global usa Sol medium y no acepta cifras generadas por el modelo", () => {
  const plan = resolveAIExecutionPlan({ workflow: "classroom_period_report" });
  assert.equal(plan.model, "gpt-6-sol");
  assert.equal(plan.reasoning_effort, "medium");
  const report = { general_overview: "El aula muestra avances diversos.", developed_competencies: ["Comunicación oral"], group_strengths: ["Participación"], competencies_needing_development: ["Indagación"], little_or_not_worked: ["Cantidad"], evidence_coverage: "La cobertura requiere revisión.", follow_up_summary: "Conviene observar en nuevas situaciones.", next_period_findings: ["Ofrecer más oportunidades"] };
  assert.deepEqual(validateClassroomPeriodReport(report), report);
  assert.throws(() => validateClassroomPeriodReport({ ...report, general_overview: "12 estudiantes avanzaron." }), /no puede introducir cifras/);
  const input = buildClassroomPeriodReportInput({ age: 5, competencyIds: ["COM_ORAL"], statistics: { student_count: 2 }, evaluationMap: [{ competency_v4_id: "COM_ORAL", activity_state: "completed", evidence_count: 2, students_with_evidence: 2, activity_id: activityId, criterion_id: criterionId }], classroomContext: { id: classroomId } });
  assert.equal(input.classroom_context.id, "current_classroom");
  assert.doesNotMatch(JSON.stringify(input), new RegExp(`${classroomId}|${activityId}|${criterionId}`));
});

test("16: el workflow del informe global acepta el contrato y recibe solo contexto agregado", async () => {
  const report = { general_overview: "El aula muestra avances diversos.", developed_competencies: ["Comunicación oral"], group_strengths: ["Participación"], competencies_needing_development: ["Indagación"], little_or_not_worked: ["Cantidad"], evidence_coverage: "La cobertura requiere revisión.", follow_up_summary: "Conviene observar en nuevas situaciones.", next_period_findings: ["Ofrecer más oportunidades"] };
  const input = buildClassroomPeriodReportInput({ age: 5, competencyIds: ["COM_ORAL"], statistics: { student_count: 2 }, evaluationMap: [{ competency_v4_id: "COM_ORAL", activity_state: "completed", evidence_count: 2, students_with_evidence: 2 }], classroomContext: {} });
  let captured;
  const result = await generateAIWorkflowV4(input, { provider: { id: "mock", async generate(request) { captured = request; return report; } } });
  assert.deepEqual(result.output, report);
  assert.equal(captured.execution_plan.model, "gpt-6-sol");
  assert.doesNotMatch(JSON.stringify(captured.ai_context_bundle), /student_name|first_name|last_name/);
});

test("18: el fingerprint del informe cambia únicamente al cambiar consolidado o mapa", () => {
  const statistics = { classroom: { confirmed_assessments: 2 }, competencies: [] };
  assert.equal(classroomReportFingerprint(statistics, 1), classroomReportFingerprint(structuredClone(statistics), 1));
  assert.notEqual(classroomReportFingerprint(statistics, 1), classroomReportFingerprint(statistics, 2));
  assert.notEqual(classroomReportFingerprint(statistics, 1), classroomReportFingerprint({ ...statistics, classroom: { confirmed_assessments: 3 } }, 1));
});

test("19: las tablas privadas nuevas tienen RLS por aula y escrituras directas revocadas", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/202609260006_period_assessment_closure.sql", import.meta.url), "utf8");
  for (const table of ["period_evaluation_map_versions", "period_evaluation_map_entries", "classroom_period_reports", "period_closure_workflows"]) {
    assert.match(sql, new RegExp(`alter table public\\.%I enable row level security|alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /private\.owns_classroom\(classroom_id\)/);
  assert.match(sql, /revoke insert,update,delete,truncate,references,trigger/);
});

test("20: Excel genérico contiene valoración y conclusión confirmadas", async () => {
  const workbook = await buildGenericAssessmentWorkbook([{ student_name: "Ana", competency_name: "Se comunica", achievement_level: "A", conclusion: "Explica sus ideas.", period_label: "Bimestre 1", state: "confirmed" },{ student_name: "Luis", competency_name: "Se comunica", achievement_level: null, conclusion: "", period_label: "Bimestre 1", state: "observation_pending" }]);
  const zip = await JSZip.loadAsync(workbook);
  const sheet = await zip.file("xl/worksheets/sheet1.xml").async("string");
  assert.match(sheet, /Ana/);
  assert.match(sheet, />A</);
  assert.match(sheet, /Explica sus ideas/);
  assert.match(sheet, /Bimestre 1/);
  assert.match(sheet, /Pendiente de observación/);
  assert.doesNotMatch(sheet, />C</);
});

test("21: exportación SIAGIE permanece visible y no implementada", () => {
  assert.equal(SIAGIE_EXPORT_STATUS.implemented, false);
  assert.match(SIAGIE_EXPORT_STATUS.label, /SIAGIE/);
  assert.match(SIAGIE_EXPORT_STATUS.message, /pendiente|Próximamente/i);
});
