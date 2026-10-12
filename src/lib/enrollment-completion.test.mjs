import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createPilotClassroom, importStudentsForTeacher } from './pilot-onboarding-service.mjs';
import { confirmEnrollmentCompletion } from './enrollment-completion.mjs';

test('explicit enrollment confirmation persists, is idempotent and isolates classrooms and preferences', async () => {
  const db = await PGlite.create(), teacher = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    const migrations = new URL('../../local-db/migrations/', import.meta.url);
    for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    const input = {teacherName:'QA ficticia',institutionName:'Colegio ficticio',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'};
    const own = await createPilotClassroom(db,teacher,input), foreign = await createPilotClassroom(db,other,input);
    await db.query(`update profiles set preferences='{"theme":"unchanged"}'::jsonb where user_id=$1`,[teacher]);
    const read = async id => (await db.query('select preferences from profiles where user_id=$1',[id])).rows[0].preferences;
    const untouched = await read(other);
    await assert.rejects(confirmEnrollmentCompletion(db,teacher,own.classroomId),/al menos/);
    await importStudentsForTeacher(db,teacher,[{firstName:'Niña',lastName:'Ficticia'}]);
    assert.equal((await read(teacher)).enrollment_completed_at,undefined,'Pupil count cannot confirm enrollment');
    await assert.rejects(confirmEnrollmentCompletion(db,other,own.classroomId),/no está disponible/);
    await assert.rejects(confirmEnrollmentCompletion(db,teacher,foreign.classroomId),/no está disponible/);
    const confirmed = await confirmEnrollmentCompletion(db,teacher,own.classroomId);
    assert.ok(Number.isFinite(Date.parse(confirmed.completedAt)));
    assert.equal((await read(teacher)).enrollment_completed_at[own.classroomId],confirmed.completedAt,'Fresh read/session uses persisted server state');
    assert.deepEqual(await confirmEnrollmentCompletion(db,teacher,own.classroomId),confirmed,'Retry after a lost response keeps the original confirmation');
    assert.equal((await read(teacher)).theme,'unchanged');
    assert.deepEqual(await read(other),untouched);
    assert.equal((await db.query('select count(*)::int n from students where classroom_id=$1',[own.classroomId])).rows[0].n,1);
  } finally { await db.close(); }
});
