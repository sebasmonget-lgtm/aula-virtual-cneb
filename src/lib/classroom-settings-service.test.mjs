import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {loadClassroomSettings,saveClassroomSettings} from './classroom-settings-service.mjs';
test('classroom settings preserve ownership, stale writes, calendars and existing pupils',async()=>{
  const db=await PGlite.create(),teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try{
    const migrations=new URL('../../local-db/migrations/',import.meta.url);
    for(const file of(await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
    const input={teacherName:'QA ficticia',institutionName:'Colegio ficticio',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'};
    const created=await createPilotClassroom(db,teacher,input);await createPilotClassroom(db,other,{...input,age:4});
    const original=await loadClassroomSettings(db,teacher),untouched=await loadClassroomSettings(db,other);
    let saved=await saveClassroomSettings(db,teacher,{expected:original,settings:{...original,castellanoL2Applicable:true,religionApplicable:true}});
    assert.equal(saved.castellanoL2Applicable,true);assert.equal(saved.religionApplicable,true);
    assert.deepEqual(await loadClassroomSettings(db,other),untouched);
    await assert.rejects(saveClassroomSettings(db,teacher,{expected:original,settings:original}),/Recarga/);
    for(const changes of [{startsOn:'2026-02-31'},{year:2027,startsOn:'2027-03-02',endsOn:'2027-12-31'},{religionApplicable:'true'}])await assert.rejects(saveClassroomSettings(db,teacher,{expected:saved,settings:{...saved,...changes}}));
    saved=await saveClassroomSettings(db,teacher,{expected:saved,settings:{...saved,age:4,startsOn:'2026-02-16'}});
    assert.equal(saved.age,4);assert.equal(saved.startsOn,'2026-02-16');
    await importStudentsForTeacher(db,teacher,[{firstName:'Niña',lastName:'Ficticia'}]);
    await assert.rejects(saveClassroomSettings(db,teacher,{expected:saved,settings:{...saved,age:5}}),/niños o planificación/);
    assert.deepEqual(await loadClassroomSettings(db,teacher),saved);
    const flags=await saveClassroomSettings(db,teacher,{expected:saved,settings:{...saved,religionApplicable:false}});
    assert.equal(flags.religionApplicable,false);
    assert.equal((await db.query('select count(*)::int n from students where classroom_id=$1',[created.classroomId])).rows[0].n,1);
    assert.deepEqual(await loadClassroomSettings(db,other),untouched);
    await assert.rejects(loadClassroomSettings(db,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),/primero/);
  }finally{await db.close();}
});
