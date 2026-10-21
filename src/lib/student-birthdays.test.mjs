import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { birthdayEvents, loadClassroomBirthdays, todayBirthdayNotices } from "./student-birthdays.mjs";

test("hoy y mañana conservan identidades, nombres y fechas sin exponer año de nacimiento", () => {
  const students = [{ id: "a", first_name: "MATEO", last_name: "SALAZAR TORRES", birth_date: "2020-12-18" },
    { id: "b", first_name: "Abril", last_name: "Paredes Vega", birth_date: "2020-12-19" },
    { id: "c", first_name: "Sin fecha" },
    { id: "d", first_name: "Retirada", birth_date: "2020-12-18", status: "archived" }];
  const before = structuredClone(students), result = todayBirthdayNotices(students, "2026-12-18");
  assert.equal(result.today[0].student_id, "a");
  assert.equal(result.today[0].name, "Mateo Salazar Torres");
  assert.equal(result.today[0].short_name, "Mateo");
  assert.equal(result.tomorrow[0].student_id, "b");
  assert.equal(result.tomorrow[0].date, "2026-12-19");
  assert.equal(JSON.stringify(result).includes("2020"), false);
  assert.deepEqual(students, before);
});

test("el recordatorio de mañana cruza fin de mes y fin de año sin desfase horario", () => {
  const students = [{ id: "a", first_name: "Ana", birth_date: "2021-01-01" },
    { id: "b", first_name: "Luis", birth_date: "2020-12-31" }];
  const result = todayBirthdayNotices(students, "2026-12-31");
  assert.equal(result.today[0].date, "2026-12-31");
  assert.equal(result.tomorrow[0].date, "2027-01-01");
  assert.equal(todayBirthdayNotices([{ ...students[0], birth_date: "2020-05-01" }], "2026-04-30").tomorrow.length, 1);
});

test("29 de febrero conserva su fecha y se recuerda el 28 en años no bisiestos", () => {
  const students = [{ id: "a", first_name: "Lucía", birth_date: "2020-02-29" }];
  const ordinary = birthdayEvents(students, "2026-01-01", "2026-12-31");
  assert.equal(ordinary[0].date, "2026-02-28");
  assert.equal(ordinary[0].leap_day_adjusted, true);
  const leap = birthdayEvents(students, "2028-01-01", "2028-12-31");
  assert.equal(leap[0].date, "2028-02-29");
  assert.equal(leap[0].leap_day_adjusted, false);
  assert.equal(todayBirthdayNotices(students, "2028-02-28").tomorrow[0].date, "2028-02-29");
});

test("fechas vacías, imposibles y anteriores al nacimiento no crean avisos; los homónimos se conservan", () => {
  const result = birthdayEvents([{ id: "a", first_name: "Ana", birth_date: "2020-06-01" },
    { id: "b", first_name: "Ana", birth_date: "2021-06-01" },
    { id: "c", first_name: "Inválida", birth_date: "2021-02-29" },
    { id: "d", first_name: "Vacía", birth_date: "" },
    { id: "e", first_name: "Futura", birth_date: "2027-06-01" }], "2026-01-01", "2026-12-31");
  assert.deepEqual(result.map(item => item.student_id), ["a", "b"]);
  assert.throws(() => birthdayEvents([], "2026-02-31", "2026-12-31"));
  assert.throws(() => todayBirthdayNotices([], ""));
});

test("el calendario consulta solo alumnos activos del aula propia y refleja cambios sin guardar eventos", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`create table classrooms(id text primary key,teacher_id text,status text);
      create table students(id text primary key,classroom_id text,first_name text,last_name text,preferred_name text,birth_date date,status text);
      insert into classrooms values('a','docente-a','active'),('b','docente-b','active');
      insert into students values('s1','a','Mateo','Salazar',null,'2020-12-18','active'),
        ('s2','a','Abril','Paredes',null,'2020-12-19','archived'),
        ('s3','b','Lucía','Vargas',null,'2021-02-18','active');`);
    const input = { teacherId: "docente-a", classroomId: "a", year: 2026 };
    const first = await loadClassroomBirthdays(db, input);
    assert.equal(first.length, 3);
    assert.ok(first.every(item => item.student_id === "s1"));
    assert.equal(first.find(item => item.date.startsWith("2026")).date, "2026-12-18");
    assert.deepEqual(await loadClassroomBirthdays(db, { ...input, classroomId: "b" }), []);
    await db.exec("update students set birth_date='2020-12-19' where id='s1'");
    assert.equal((await loadClassroomBirthdays(db, input)).find(item => item.date.startsWith("2026")).date, "2026-12-19");
    await db.exec("update students set status='archived' where id='s1'");
    assert.deepEqual(await loadClassroomBirthdays(db, input), []);
    await assert.rejects(loadClassroomBirthdays(db, { ...input, year: NaN }));
  } finally { await db.close(); }
});
