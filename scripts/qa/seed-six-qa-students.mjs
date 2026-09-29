import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { importStudentsForTeacher } from "../../src/lib/pilot-onboarding-service.mjs";
import { saveAndConfirmFamilyInterview } from "../../src/lib/diagnostic-sources-v4.mjs";
import { refreshStudentContextSnapshot } from "../../src/lib/student-context-service.mjs";
import { defaultEvaluationPeriods } from "../../src/lib/period-evaluation-service.mjs";
import { saveOrdinaryObservation } from "../../src/lib/ordinary-observation-service.mjs";

// Run only while the local API using this PGlite directory is stopped.
// This script adds QA data to the already configured five-year-old classroom.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, ".local", "pgdata");
const resultDir = path.join(root, ".local", "qa-six-students");
const dataset = JSON.parse(await readFile(new URL("./six-qa-students.dataset.json", import.meta.url), "utf8"));
const teacherId = process.env.AYNI_LOCAL_TEACHER_ID;
assert.match(teacherId ?? "", /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, "Provide the existing local teacher ID");
assert.equal(dataset.fictional, true);
assert.equal(dataset.students.length, 6);
assert.equal(dataset.observation_dates.length, 4);
assert.equal(new Set(dataset.students.map((student) => `${student.firstName} ${student.lastName}`)).size, 6);
assert.ok(dataset.students.every((student) => student.observations.length === 4));

const db = await PGlite.create(dataDir);
try {
  const classroom = (await db.query(`select c.id,c.school_year_id,c.section,ag.age_years,sy.year,sy.starts_on,sy.ends_on
    from classrooms c join age_grades ag on ag.id=c.age_grade_id
    join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and c.status='active'`, [teacherId])).rows;
  assert.equal(classroom.length, 1, "The existing local teacher must have one active classroom");
  assert.equal(classroom[0].age_years, 5, "Do not insert these QA cases into another age group");
  assert.equal(classroom[0].year, 2026);
  const room = classroom[0];
  for (const table of ["students", "student_family_interviews", "ordinary_observations", "evidences", "competency_assessments"]) {
    const join = table === "students" ? "where classroom_id=$1" : table === "student_family_interviews" || table === "ordinary_observations" ? "where classroom_id=$1" :
      `where student_id in (select id from students where classroom_id=$1)`;
    const count = (await db.query(`select count(*)::int as n from ${table} ${join}`, [room.id])).rows[0].n;
    assert.equal(count, 0, `Expected an empty QA classroom; found ${table}=${count}`);
  }

  const existingPeriods = (await db.query(`select id,kind,ordinal,label,starts_on,ends_on from evaluation_periods
    where school_year_id=$1 order by ordinal`, [room.school_year_id])).rows;
  if (!existingPeriods.length) {
    const blocks = (await db.query(`select type,start_date,end_date from calendar_blocks where school_year_id=$1 order by start_date`, [room.school_year_id])).rows;
    for (const period of defaultEvaluationPeriods(room, blocks)) await db.query(`insert into evaluation_periods
      (id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,$3,$4,$5,$6::date,$7::date)`,
    [randomUUID(), room.school_year_id, period.kind, period.ordinal, period.label, period.starts_on, period.ends_on]);
  }
  const periods = (await db.query(`select id,label,starts_on,ends_on from evaluation_periods
    where school_year_id=$1 order by starts_on`, [room.school_year_id])).rows;
  const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  for (const day of dataset.observation_dates) {
    assert.ok(periods.some((period) => dateOnly(period.starts_on) <= day && day <= dateOnly(period.ends_on)), `No evaluation period covers ${day}`);
  }

  await importStudentsForTeacher(db, teacherId, dataset.students.map(({ firstName, lastName }) => ({ firstName, lastName })));
  const rows = (await db.query(`select id,first_name,last_name,birth_date from students where classroom_id=$1
    and status='active' order by first_name`, [room.id])).rows;
  assert.equal(rows.length, 6);
  assert.ok(rows.every((row) => row.birth_date == null), "Do not invent birth dates");
  const ids = new Map(rows.map((row) => [`${row.first_name} ${row.last_name}`, row.id]));
  const interviews = [];
  for (const student of dataset.students) {
    const studentId = ids.get(`${student.firstName} ${student.lastName}`);
    assert.ok(studentId);
    const saved = await saveAndConfirmFamilyInterview(db, teacherId, studentId, student.interview);
    assert.equal(saved.status, "confirmed");
    const context = await refreshStudentContextSnapshot(db, studentId);
    assert.ok(context?.family_interview_context, `Interview absent from context for ${student.firstName}`);
    assert.equal(context.family_interview_context.version, 1);
    interviews.push({ student_id: studentId, interview_id: saved.id, status: saved.status });
  }

  const observations = [];
  for (let dayIndex = 0; dayIndex < dataset.observation_dates.length; dayIndex++) {
    const day = dataset.observation_dates[dayIndex];
    for (let studentIndex = 0; studentIndex < dataset.students.length; studentIndex++) {
      const student = dataset.students[studentIndex];
      const studentId = ids.get(`${student.firstName} ${student.lastName}`);
      const eventTime = new Date(`${day}T10:${String(studentIndex * 5).padStart(2, "0")}:00-05:00`);
      const rawText = student.observations[dayIndex];
      const saved = await saveOrdinaryObservation(db, teacherId, {
        studentId, clientRequestId: randomUUID(), sourceKind: "spontaneous", rawText,
      }, { occurredAt: eventTime });
      assert.equal(saved.created, true);
      assert.equal(saved.observation.raw_text, rawText);
      assert.ok(saved.observation.context_snapshot?.evaluation_period_id, `Period missing for ${student.firstName} O${dayIndex + 1}`);
      observations.push({ student_id: studentId, observation_id: saved.observation.id,
        case_id: `${student.firstName}-O${dayIndex + 1}`, date: day,
        evaluation_period_id: saved.observation.context_snapshot.evaluation_period_id });
    }
  }

  const count = async (sql) => (await db.query(sql, [room.id])).rows[0].n;
  assert.equal(await count("select count(*)::int as n from students where classroom_id=$1"), 6);
  assert.equal(await count("select count(*)::int as n from student_family_interviews where classroom_id=$1 and status='confirmed'"), 6);
  assert.equal(await count("select count(*)::int as n from ordinary_observations where classroom_id=$1 and status='saved'"), 24);
  assert.equal(await count("select count(*)::int as n from ordinary_observation_attributions a join ordinary_observations o on o.id=a.observation_id where o.classroom_id=$1"), 0);
  assert.equal(await count("select count(*)::int as n from evidences e join students s on s.id=e.student_id where s.classroom_id=$1"), 0);
  assert.equal(await count("select count(*)::int as n from competency_assessments a join students s on s.id=a.student_id where s.classroom_id=$1"), 0);
  const result = { dataset_id: dataset.dataset_id, classroom_id: room.id, age_years: room.age_years,
    students: rows.map((row) => ({ id: row.id, name: `${row.first_name} ${row.last_name}` })),
    interviews, observations, periods: periods.map((period) => ({ id: period.id, label: period.label,
      starts_on: dateOnly(period.starts_on), ends_on: dateOnly(period.ends_on) })),
    teacher_attributions: 0, assessment_levels: 0 };
  await mkdir(resultDir, { recursive: true });
  await writeFile(path.join(resultDir, "seed-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ classroom_id: result.classroom_id, age_years: result.age_years,
    students: result.students.length, confirmed_interviews: result.interviews.length,
    raw_observations: result.observations.length, teacher_attributions: 0, assessment_levels: 0 }));
} finally {
  await db.close();
}
