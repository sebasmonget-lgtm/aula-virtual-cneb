import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();
const migrationNames = (await readdir(path.join(root, 'supabase/migrations'))).filter((name) => name.endsWith('.sql')).sort();
const teacherA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const teacherB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ids = {
  yearA: '11111111-1111-4111-8111-111111111111', yearB: '22222222-2222-4222-8222-222222222222',
  roomA: '33333333-3333-4333-8333-333333333333', roomB: '44444444-4444-4444-8444-444444444444',
  studentA: '55555555-5555-4555-8555-555555555555', studentB: '66666666-6666-4666-8666-666666666666',
  periodA: '77777777-7777-4777-8777-777777777777', periodB: '88888888-8888-4888-8888-888888888888',
  evidenceA: '99999999-9999-4999-8999-999999999999', evidenceB: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
};

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(path text) returns text[] language sql immutable as $$
      select string_to_array(path, '/')
    $$;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    alter table storage.objects enable row level security;
  `);
  for (const name of migrationNames) {
    // PGlite provides gen_random_uuid() in core but does not package pgcrypto.
    const sql = (await readFile(path.join(root, 'supabase/migrations', name), 'utf8'))
      .replace(/create extension if not exists pgcrypto;/gi, '');
    try { await db.exec(sql); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
  }
  console.log(`Applied ${migrationNames.length} Supabase migrations`);

  // Catalog assertions catch a newly added exposed table or a forgotten old policy.
  const allTables = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`);
  assert(allTables.rows.every((row) => row.relrowsecurity), 'Every public table needs RLS');
  const privateTables = allTables.rows.map((row) => row.relname).filter((name) => !new Set([
    'curriculum_versions','levels','age_grades','curriculum_areas','competencies','capacities','standards','performances',
    'competency_observation_guides','document_templates','observation_references','curriculum_source_documents','cycles','transversal_approaches','ai_pending_generations',
  ]).has(name));
  for (const table of privateTables) {
    const policies = await db.query(`select cmd, roles from pg_policies where schemaname='public' and tablename=$1`, [table]);
    assert.equal(policies.rows.length, 1, `${table}: exactly one policy`);
    assert.equal(policies.rows[0].cmd, 'SELECT', `${table}: no direct writes`);
    assert.deepEqual(policies.rows[0].roles, ['authenticated'], `${table}: authenticated only`);
    const grants = await db.query(`select has_table_privilege('authenticated', $1, 'INSERT') as ins, has_table_privilege('authenticated', $1, 'UPDATE') as upd, has_table_privilege('authenticated', $1, 'DELETE') as del`, [`public.${table}`]);
    assert.deepEqual(grants.rows[0], { ins: false, upd: false, del: false }, `${table}: no DML grants`);
  }
  const helpers = await db.query(`select n.nspname, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname like 'owns_%'`);
  assert.equal(helpers.rows.length, 5);
  for (const helper of helpers.rows) {
    assert.equal(helper.nspname, 'private');
    assert.equal(helper.prosecdef, true);
    assert(helper.proconfig.some((config) => config.startsWith('search_path=')), `${helper.proname}: pinned search_path`);
  }
  const helperAccess = await db.query(`select
    has_function_privilege('anon', 'private.owns_student(uuid)', 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', 'private.owns_student(uuid)', 'EXECUTE') as teacher_execute,
    has_schema_privilege('anon', 'private', 'USAGE') as anon_schema`);
  assert.deepEqual(helperAccess.rows[0], { anon_execute: false, teacher_execute: true, anon_schema: false });
  const storageWrites = await db.query(`select policyname from pg_policies where schemaname='storage' and tablename='objects' and cmd <> 'SELECT'`);
  assert.equal(storageWrites.rows.length, 0, 'No direct Storage writes');

  await db.query('insert into auth.users(id) values ($1),($2)', [teacherA, teacherB]);
  await db.exec(`insert into public.curriculum_versions(id,name,source_url) values ('00000000-0000-4000-8000-000000000001','CNEB','https://example.invalid');
    insert into public.levels(id,name) values ('00000000-0000-4000-8000-000000000002','Inicial');
    insert into public.age_grades(id,level_id,label,age_years) values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','5 años',5);`);
  const templateId = '00000000-0000-4000-8000-000000000004';
  await db.query(`insert into public.document_templates(id,template_type,template_version,schema_version,file_path) values ($1,'annual',1,1,'template.docx')`, [templateId]);
  const sensitiveRows = [];
  async function inserted(sql, params) {
    const result = await db.query(`${sql} returning id`, params);
    return result.rows[0].id;
  }
  for (const [teacher, year, room, student, period, evidence] of [
    [teacherA, ids.yearA, ids.roomA, ids.studentA, ids.periodA, ids.evidenceA],
    [teacherB, ids.yearB, ids.roomB, ids.studentB, ids.periodB, ids.evidenceB],
  ]) {
    await db.query(`insert into public.school_years(id,owner_id,year,starts_on,ends_on) values ($1,$2,2026,'2026-03-01','2026-12-31')`, [year, teacher]);
    await db.query(`insert into public.classrooms(id,school_year_id,teacher_id,age_grade_id,institution_name,section) values ($1,$2,$3,'00000000-0000-4000-8000-000000000003','Jardín','A')`, [room, year, teacher]);
    await db.query(`insert into public.students(id,classroom_id,first_name,last_name) values ($1,$2,'Niño','Prueba')`, [student, room]);
    await db.query(`insert into public.evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values ($1,$2,'bimester',1,'Bimestre 1','2026-03-01','2026-05-01')`, [period, year]);
    await db.query(`insert into public.evidences(id,student_id,observation_text,created_by) values ($1,$2,'Observación real',$3)`, [evidence, student, teacher]);
    const assessment = await inserted(`insert into public.competency_assessments(student_id,competency_v4_id,period_start,period_end,version,status,evaluation_period_id) values ($1,'COMP-01','2026-03-01','2026-05-01',1,'draft',$2)`, [student, period]);
    const conclusion = await inserted(`insert into public.competency_descriptive_conclusions(student_id,competency_v4_id,assessment_id,period_start,period_end,version,status,evaluation_period_id) values ($1,'COMP-01',$2,'2026-03-01','2026-05-01',1,'draft',$3)`, [student, assessment, period]);
    const report = await inserted(`insert into public.family_reports(student_id,period_start,period_end,version,status,evaluation_period_id) values ($1,'2026-03-01','2026-05-01',1,'draft',$2)`, [student, period]);
    const closure = await inserted(`insert into public.period_closures(classroom_id,evaluation_period_id,source_fingerprint,confirmed_by) values ($1,$2,'fingerprint',$3)`, [room, period, teacher]);
    const interview = await inserted(`insert into public.student_family_interviews(classroom_id,student_id,version,status,created_by) values ($1,$2,1,'draft',$3)`, [room, student, teacher]);
    const attachment = await inserted(`insert into public.student_family_interview_attachments(classroom_id,student_id,interview_id,storage_path,mime_type,created_by) values ($1,$2,$3,$4,'application/pdf',$5)`, [room, student, interview, `family-interview/${teacher}/${student}/file.pdf`, teacher]);
    const document = await inserted(`insert into public.document_versions(owner_user_id,entity_type,entity_id,template_id,structured_payload) values ($1,'family_report',$2,$3,'{}')`, [teacher, report, templateId]);
    const diagnostic = await inserted(`insert into public.diagnostic_student_reviews(classroom_id,student_id,version,status,details,source_snapshot,created_by) values ($1,$2,1,'draft','{}','{}',$3)`, [room, student, teacher]);
    await db.query(`insert into storage.objects(bucket_id,name) values ('family-interviews',$1)`, [`family-interview/${teacher}/${student}/file.pdf`]);
    await db.query(`insert into storage.objects(bucket_id,name) values ('student-evidence',$1)`, [`${teacher}/${student}/image.png`]);
    sensitiveRows.push({ assessment, conclusion, report, closure, interview, attachment, document, diagnostic });
  }

  async function asTeacher(teacher, sql) {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${teacher}';`);
    try { return await db.query(sql); }
    finally { await db.exec('reset role; reset request.jwt.claim.sub;'); }
  }
  for (const [teacher, own, other] of [
    [teacherA, { room: ids.roomA, student: ids.studentA, evidence: ids.evidenceA, ...sensitiveRows[0] }, { room: ids.roomB, student: ids.studentB, evidence: ids.evidenceB, ...sensitiveRows[1] }],
    [teacherB, { room: ids.roomB, student: ids.studentB, evidence: ids.evidenceB, ...sensitiveRows[1] }, { room: ids.roomA, student: ids.studentA, evidence: ids.evidenceA, ...sensitiveRows[0] }],
  ]) {
    const scopedRows = [
      ['classrooms', 'room'], ['students', 'student'], ['evidences', 'evidence'],
      ['competency_assessments', 'assessment'], ['competency_descriptive_conclusions', 'conclusion'],
      ['family_reports', 'report'], ['period_closures', 'closure'],
      ['student_family_interviews', 'interview'], ['student_family_interview_attachments', 'attachment'],
      ['document_versions', 'document'], ['diagnostic_student_reviews', 'diagnostic'],
    ];
    for (const [table, key] of scopedRows) {
      const id = own[key];
      assert.equal((await asTeacher(teacher, `select id from public.${table} where id='${id}'`)).rows.length, 1, `${table}: own SELECT`);
    }
    for (const [table, key] of scopedRows) {
      const id = other[key];
      assert.equal((await asTeacher(teacher, `select id from public.${table} where id='${id}'`)).rows.length, 0, `${table}: cross SELECT`);
    }
    for (const [bucket, ownPath, crossPath] of [
      ['family-interviews', `family-interview/${teacher}/${own.student}/file.pdf`, `family-interview/${teacher === teacherA ? teacherB : teacherA}/${other.student}/file.pdf`],
      ['student-evidence', `${teacher}/${own.student}/image.png`, `${teacher === teacherA ? teacherB : teacherA}/${other.student}/image.png`],
    ]) {
      assert.equal((await asTeacher(teacher, `select id from storage.objects where bucket_id='${bucket}' and name='${ownPath}'`)).rows.length, 1, `${bucket}: own SELECT`);
      assert.equal((await asTeacher(teacher, `select id from storage.objects where bucket_id='${bucket}' and name='${crossPath}'`)).rows.length, 0, `${bucket}: cross SELECT`);
      await assert.rejects(() => asTeacher(teacher, `insert into storage.objects(bucket_id,name) values ('${bucket}','${ownPath}')`), /row-level security|permission denied/);
      await assert.rejects(() => asTeacher(teacher, `insert into storage.objects(bucket_id,name) values ('${bucket}','${crossPath}')`), /row-level security|permission denied/);
      for (const path of [ownPath, crossPath]) {
        assert.equal((await asTeacher(teacher, `update storage.objects set name=name where bucket_id='${bucket}' and name='${path}'`)).affectedRows, 0);
        assert.equal((await asTeacher(teacher, `delete from storage.objects where bucket_id='${bucket}' and name='${path}'`)).affectedRows, 0);
      }
    }
    for (const [table, ownId, otherId, column] of [
      ['students', own.student, other.student, 'preferred_name'],
      ['evidences', own.evidence, other.evidence, 'observation_text'],
    ]) {
      for (const id of [ownId, otherId]) {
        await assert.rejects(() => asTeacher(teacher, `update public.${table} set ${column}='forged' where id='${id}'`), /permission denied/);
        await assert.rejects(() => asTeacher(teacher, `delete from public.${table} where id='${id}'`), /permission denied/);
      }
    }
    for (const student of [own.student, other.student]) {
      await assert.rejects(() => asTeacher(teacher, `insert into public.evidences(student_id,observation_text,created_by) values ('${student}','forged','${teacher}')`), /permission denied/);
      await assert.rejects(() => asTeacher(teacher, `insert into public.family_reports(student_id,period_start,period_end,version,status) values ('${student}','2026-05-02','2026-06-01',1,'draft')`), /permission denied/);
    }
    for (const [table, key] of scopedRows) {
      for (const id of [own[key], other[key]]) {
        await assert.rejects(() => asTeacher(teacher, `delete from public.${table} where id='${id}'`), /permission denied/);
        await assert.rejects(() => asTeacher(teacher, `update public.${table} set id=id where id='${id}'`), /permission denied/);
      }
    }
  }
  console.log(`RLS: ${privateTables.length} private tables read-only; two teachers isolated across 11 sensitive tables and Storage; SELECT/INSERT/UPDATE/DELETE exercised`);
} finally {
  await db.close();
}
