import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { createPendingAIGenerationsStore } from "./pending-ai-generations-store.mjs";
import { createPilotClassroom, importStudentsForTeacher, parseStudentCsv, validatePilotSetup, validateStudentsForImport } from "./pilot-onboarding-service.mjs";
import { createLocalPrivateEvidenceStorage } from "./private-evidence-storage.mjs";
import { recordOperationalEvent } from "./operational-events.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const setup = (name) => ({ teacherName: name, institutionName: "Escuela de prueba", section: "A", age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });

async function database(directory) {
  const db = await PGlite.create(directory);
  const base = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(base)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, base), "utf8"));
  }
  return db;
}

test("pending generations survives store recreation and expires without exposing payload", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ayni-pending-"));
  let db = await database(dir);
  const classroom = await createPilotClassroom(db, teacherA, setup("Docente A"));
  let now = Date.parse("2026-09-22T12:00:00Z");
  const store = createPendingAIGenerationsStore(db, { ttlMs: 1000, now: () => now });
  const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  await store.set(id, { classroom_id: classroom.classroomId, workflow: "activity", metadata: { model: "mock" } });
  await db.close();
  db = await PGlite.create(dir);
  const restarted = createPendingAIGenerationsStore(db, { ttlMs: 1000, now: () => now });
  assert.equal((await restarted.get(id)).metadata.model, "mock");
  now += 1001;
  assert.equal(await restarted.get(id), undefined);
  assert.equal(await restarted.pruneExpired(), 1);
  assert.equal(await restarted.delete(id), false);
  await db.close();
  await rm(dir, { recursive: true, force: true });
});

test("two teachers can onboard and import pupils into separate classrooms; duplicate active classroom is blocked", async () => {
  const db = await database();
  const a = await createPilotClassroom(db, teacherA, setup("Docente A"));
  const b = await createPilotClassroom(db, teacherB, setup("Docente B"));
  assert.notEqual(a.classroomId, b.classroomId);
  assert.equal(await importStudentsForTeacher(db, teacherA, [{ firstName: "Ana", lastName: "Prueba" }]), 1);
  assert.equal(await importStudentsForTeacher(db, teacherB, parseStudentCsv('first_name,last_name,preferred_name\n"Luis, José",Demo,Luis')), 1);
  const rows = (await db.query(`select cl.teacher_id,s.first_name from students s join classrooms cl on cl.id=s.classroom_id where cl.teacher_id in ($1,$2) order by cl.teacher_id`, [teacherA, teacherB])).rows;
  assert.deepEqual(rows.map((row) => [row.teacher_id, row.first_name]), [[teacherA, "Ana"], [teacherB, "Luis, José"]]);
  assert.equal((await db.query(`select count(*)::int as n from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1`, [teacherA])).rows[0].n, 1);
  await assert.rejects(() => createPilotClassroom(db, teacherA, setup("Docente A")), /aula activa/);
  assert.equal((await db.query(`select count(*)::int as n from classrooms where teacher_id=$1 and status='active'`, [teacherA])).rows[0].n, 1);
  await db.close();
});

test("el alta opcional con logo guarda PNG normalizado solo para la institución docente", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "ayni-pilot-logo-"));
  const assetsDir = path.join(temp, ".local", "assets");
  const db = await database();
  try {
    await mkdir(assetsDir, { recursive: true });
    const jpeg = await sharp({ create: { width: 600, height: 400, channels: 4,
      background: "#087d96" } }).jpeg().toBuffer();
    const logoUpload = { mimeType: "image/jpeg", base64: jpeg.toString("base64") };
    await createPilotClassroom(db, teacherA, { ...setup("Docente A"), logoUpload }, { assetsDir });
    const owner = (await db.query(`select ip.logo_asset_id, ia.owner_user_id, ia.original_path
      from institution_profiles ip join institution_assets ia on ia.id=ip.logo_asset_id
      where ip.owner_user_id=$1`, [teacherA])).rows[0];
    assert.equal(owner.owner_user_id, teacherA);
    assert.match(owner.original_path, /^\.local\/assets\/[0-9a-f-]+\.png$/);
    assert.equal((await sharp(await readFile(path.join(assetsDir, `${owner.logo_asset_id}.png`))).metadata()).format, "png");
    await assert.rejects(() => createPilotClassroom(db, teacherB,
      { ...setup("Docente B"), logoUpload: { ...logoUpload, mimeType: "image/png" } }, { assetsDir }),
    /no coincide/);
    const failingDb = { exec: (...args) => db.exec(...args), query: (sql, ...args) =>
      sql.includes("insert into classrooms(") ? Promise.reject(new Error("fallo simulado")) : db.query(sql, ...args) };
    await assert.rejects(() => createPilotClassroom(failingDb, teacherB,
      { ...setup("Docente B"), logoUpload }, { assetsDir }), /fallo simulado/);
    assert.equal((await readdir(assetsDir)).length, 1);
    assert.equal((await db.query(`select count(*)::int as n from classrooms where teacher_id=$1`, [teacherB])).rows[0].n, 0);
  } finally {
    await db.close();
    await rm(temp, { recursive: true, force: true });
  }
});

test("el alta inicial guarda el perfil completo y un logo de iniciales recuperable", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "ayni-pilot-profile-"));
  const assetsDir = path.join(temp, "assets");
  const db = await database();
  try {
    await mkdir(assetsDir, { recursive: true });
    await createPilotClassroom(db, teacherA, { ...setup("Docente A"), institutionCode: "1234567",
      district: "Pampas", ugel: "UGEL Tayacaja", directorName: "Directora A", createLogo: true,
      logoInitials: "JB", logoPrimary: "#087d96", logoAccent: "#f6c85f" }, { assetsDir });
    const row = (await db.query(`select ip.institution_code,ip.district,ip.ugel,ip.director_name,
      ia.mime_type,ia.original_path from institution_profiles ip join institution_assets ia on ia.id=ip.logo_asset_id
      where ip.owner_user_id=$1`, [teacherA])).rows[0];
    assert.deepEqual([row.institution_code, row.district, row.ugel, row.director_name],
      ["1234567", "Pampas", "UGEL Tayacaja", "Directora A"]);
    assert.equal(row.mime_type, "image/svg+xml");
    assert.match((await readFile(path.join(assetsDir, path.basename(row.original_path)), "utf8")), />JB<\/text>/);
  } finally { await db.close(); await rm(temp, { recursive: true, force: true }); }
});

test("fecha de nacimiento opcional y nombres normalizados se guardan por alumno", async () => {
  const db = await database();
  try {
    await createPilotClassroom(db, teacherA, setup("Docente A"));
    const rows = parseStudentCsv("first_name,last_name,preferred_name,birth_date\nANA MARÍA,DE LA CRUZ,,2021-05-14");
    await importStudentsForTeacher(db, teacherA, rows);
    const student = (await db.query(`select s.first_name,s.last_name,s.preferred_name,s.birth_date::text as birth_date
      from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1`, [teacherA])).rows[0];
    assert.deepEqual(student, { first_name: "Ana María", last_name: "De la Cruz", preferred_name: null, birth_date: "2021-05-14" });
    assert.throws(() => validateStudentsForImport([{ firstName: "Luz", lastName: "Paz", birthDate: "2030-01-01" }]), /no futura/);
    assert.throws(() => parseStudentCsv("first_name,last_name,preferred_name,birth_date\nLuz,Paz,"), /columnas/);
  } finally { await db.close(); }
});

test("pilot validation and CSV reject empty context, invalid dates and oversized classes", async () => {
  assert.throws(() => validatePilotSetup({ ...setup("Docente A"), startsOn: "2026-02-30" }), /fechas/);
  assert.throws(() => parseStudentCsv('first_name,last_name,preferred_name\n"unclosed'), /comillas/);
  const db = await database();
  await createPilotClassroom(db, teacherA, setup("Docente A"));
  const batch = Array.from({ length: 40 }, (_, i) => ({ firstName: `Niño ${i}`, lastName: "Prueba" }));
  assert.equal(await importStudentsForTeacher(db, teacherA, batch), 40);
  await assert.rejects(() => importStudentsForTeacher(db, teacherA, Array.from({ length: 6 }, (_, i) => ({ firstName: `Nuevo ${i}`, lastName: "Prueba" }))), /45/);
  assert.equal((await db.query(`select count(*)::int as n from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1`, [teacherA])).rows[0].n, 40);
  await db.close();
});

test("assessment and conclusion versions cannot duplicate under concurrent writers", async () => {
  const db = await database();
  await createPilotClassroom(db, teacherA, setup("Docente A"));
  await importStudentsForTeacher(db, teacherA, [{ firstName: "Ana", lastName: "Prueba" }]);
  const student = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1`, [teacherA])).rows[0];
  const assessmentId = "11111111-1111-4111-8111-111111111111";
  const params = [assessmentId, student.id, "COM_ORAL", "2026-03-01", "2026-06-30"];
  await db.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,version,status) values($1,$2,$3,$4::date,$5::date,1,'archived')`, params);
  await assert.rejects(() => db.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,version,status) values($1,$2,$3,$4::date,$5::date,1,'archived')`, ["22222222-2222-4222-8222-222222222222", ...params.slice(1)]), /duplicate key/);
  const conclusionParams = ["33333333-3333-4333-8333-333333333333", student.id, "COM_ORAL", assessmentId, "2026-03-01", "2026-06-30"];
  await db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,status) values($1,$2,$3,$4,$5::date,$6::date,1,'archived')`, conclusionParams);
  await assert.rejects(() => db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,status) values($1,$2,$3,$4,$5::date,$6::date,1,'archived')`, ["44444444-4444-4444-8444-444444444444", ...conclusionParams.slice(1)]), /duplicate key/);
  await db.close();
});

test("private evidence adapter writes opaque teacher/student path and rejects invalid payload", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ayni-evidence-"));
  try {
    const storage = createLocalPrivateEvidenceStorage(dir);
    const key = await storage.save({ teacherId: teacherA, studentId: teacherB, mimeType: "image/png", bytes: Buffer.from([137, 80, 78, 71]) });
    assert.match(key, /^student-evidence\/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\/[0-9a-f-]+\.png$/);
    assert.deepEqual(await readFile(path.join(dir, ...key.split("/").slice(1))), Buffer.from([137, 80, 78, 71]));
    await assert.rejects(() => storage.save({ teacherId: "bad", studentId: teacherB, mimeType: "image/png", bytes: Buffer.from([1]) }), /inválido/);
    await storage.delete(key);
    await assert.rejects(() => readFile(path.join(dir, ...key.split("/").slice(1))), { code: "ENOENT" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("operational log excludes sensitive or arbitrary fields", () => {
  const entries = [];
  recordOperationalEvent("ai_generation_rejected", { workflow: "activity", status: 422, prompt: "nota privada", apiKey: "secret", requestId: "invalid" }, (line) => entries.push(line));
  assert.deepEqual(JSON.parse(entries[0]), { event: "ai_generation_rejected", workflow: "activity", status: 422 });
  assert.doesNotMatch(entries[0], /nota privada|secret/);
});

test("Supabase migrations cover reference RLS and private evidence bucket; transfer tables match", async () => {
  const security = await readFile(new URL("../../supabase/migrations/202609220022_pilot_security.sql", import.meta.url), "utf8");
  for (const table of ["curriculum_source_documents", "cycles", "transversal_approaches", "annual_plans", "annual_plan_competencies", "annual_plan_changes"]) assert.match(security, new RegExp(`alter table public\\.${table} enable row level security`));
  const migrations = new URL("../../supabase/migrations/", import.meta.url);
  const allSql = (await Promise.all((await readdir(migrations)).filter((name) => name.endsWith(".sql")).map((name) => readFile(new URL(name, migrations), "utf8")))).join("\n");
  const created = [...allSql.matchAll(/create table(?: if not exists)? public\.([a-z_]+)/gi)].map((match) => match[1]);
  const protectedTables = new Set([...allSql.matchAll(/alter table public\.([a-z_]+) enable row level security/gi)].map((match) => match[1]));
  const periodSecurity = await readFile(new URL("../../supabase/migrations/202609260006_period_assessment_closure.sql", import.meta.url), "utf8");
  const dynamicBlock = periodSecurity.match(/foreach table_name in array array\[([^\]]+)\] loop\s+execute format\('alter table public\.%I enable row level security'/i);
  for (const name of dynamicBlock?.[1].match(/'([a-z_]+)'/g)?.map((value) => value.slice(1, -1)) ?? []) protectedTables.add(name);
  assert.deepEqual(created.filter((name) => !protectedTables.has(name)), []);
  assert.match(security, /'student-evidence', 'student-evidence', false/);
  assert.match(security, /public\.owns_student\(s\.id\)/);
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const importer = await readFile(new URL("../../scripts/prepare-supabase-import.mjs", import.meta.url), "utf8");
  const exported = server.match(/const exportTables = \[([\s\S]*?)\];/)?.[1].match(/"[a-z_]+"/g)?.map((name) => JSON.parse(name));
  const imported = importer.match(/const tableOrder = \[([\s\S]*?)\];/)?.[1].match(/"[a-z_]+"/g)?.map((name) => JSON.parse(name));
  assert.deepEqual(new Set(exported), new Set(imported));
  assert.match(importer, /"confirmed_by", "level_confirmed_by"/);
  assert.match(server, /AYNI_ALLOW_LOCAL_EXPORT/);
});
