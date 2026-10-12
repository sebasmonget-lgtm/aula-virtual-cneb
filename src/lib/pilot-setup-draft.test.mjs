import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { loadSetupDraft, saveSetupDraft, normalizeSetupDraft } from './pilot-setup-draft.mjs';
import { createPilotClassroom } from './pilot-onboarding-service.mjs';

test('incomplete setup survives reload, isolates teachers and clears only after final creation', async () => {
  const db = await PGlite.create(), teacher = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    const directory = new URL('../../local-db/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,directory),'utf8'));
    await saveSetupDraft(db, teacher, {institutionName:'Colegio ficticio',age:null,year:2026});
    await db.query(`update profiles set preferences=preferences||'{"theme":"preserved"}'::jsonb where user_id=$1`,[teacher]);
    await saveSetupDraft(db, other, {teacherName:'Otra docente',year:2026});
    assert.equal((await loadSetupDraft(db,teacher)).age,null);
    assert.equal((await loadSetupDraft(db,teacher)).institutionName,'Colegio ficticio');
    assert.equal((await db.query('select count(*)::int n from classrooms where teacher_id=$1',[teacher])).rows[0].n,0);
    const foreign = await loadSetupDraft(db,other);
    await saveSetupDraft(db,teacher,{institutionName:'Modificado',year:2026,createLogo:true,logoInitials:'QA'});
    assert.deepEqual(await loadSetupDraft(db,other),foreign);
    await assert.rejects(createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'A',age:null,year:2026}),/Completa/);
    assert.equal((await loadSetupDraft(db,teacher)).institutionName,'Modificado');
    await createPilotClassroom(db,teacher,{teacherName:'Docente QA',institutionName:'Colegio QA',section:'A',age:4,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    assert.equal(await loadSetupDraft(db,teacher),null);
    assert.equal((await db.query('select preferences from profiles where user_id=$1',[teacher])).rows[0].preferences.theme,'preserved');
    await assert.rejects(saveSetupDraft(db,teacher,{year:2026}),/ya se guardó/);
    assert.deepEqual(await loadSetupDraft(db,other),foreign);
  } finally { await db.close(); }
});

test('draft rejects invalid uploads and ignores client ownership and unknown fields', () => {
  assert.throws(()=>normalizeSetupDraft({logoUpload:{mimeType:'text/html',base64:'YWJj'}}),/logo/);
  assert.throws(()=>normalizeSetupDraft({logoUpload:{mimeType:'image/png',base64:'x'.repeat(2_666_669)}}),/logo/);
  assert.throws(()=>normalizeSetupDraft({logoUpload:{mimeType:'image/png',base64:'bad%'}}),/logo/);
  const draft = normalizeSetupDraft({year:2026,teacherId:'foreign',age:2,secret:'ignored',logoUpload:{mimeType:'image/png',base64:'YWJj'}});
  assert.equal(draft.age,null); assert.equal(draft.teacherId,undefined); assert.equal(draft.secret,undefined);
  assert.deepEqual(draft.logoUpload,{mimeType:'image/png',base64:'YWJj'});
});
