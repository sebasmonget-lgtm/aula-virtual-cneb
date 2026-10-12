import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {updateStudentDetails} from './student-details-service.mjs';
import {changeStudentEnrollment,inactiveStudents} from './student-enrollment.mjs';

test('student edits preserve identity and history, detect stale forms, isolate owners and survive removal/recovery',async()=>{
 const db=await PGlite.create(),teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 try {
  const directory=new URL('../../local-db/migrations/',import.meta.url);
  for(const file of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,directory),'utf8'));
  await createPilotClassroom(db,teacher,{teacherName:'Docente QA',institutionName:'Colegio QA',section:'A',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  await importStudentsForTeacher(db,teacher,[{firstName:'Agata',lastName:'Quispe',birthDate:'2021-03-12'}]);
  const row=(await db.query(`select id,classroom_id from students where first_name='Agata'`)).rows[0];
  await db.query(`update students set initial_context='Historia ficticia preservada' where id=$1`,[row.id]);
  const expected={firstName:'Agata',lastName:'Quispe',preferredName:null,birthDate:'2021-03-12'};
  const input={firstName:'Agata Montes',lastName:'Quispe Tovar',birthDate:'2021-03-13',preferredName:null,expected};
  await assert.rejects(updateStudentDetails(db,other,row.id,input),/no disponible/);
  await assert.rejects(updateStudentDetails(db,teacher,row.id,{...input,birthDate:'2099-03-13'}),/no futura/);
  await updateStudentDetails(db,teacher,row.id,input);
  await updateStudentDetails(db,teacher,row.id,input); // Same request after lost response is idempotent.
  const saved=(await db.query(`select id,classroom_id,first_name,last_name,birth_date::text,initial_context from students where id=$1`,[row.id])).rows[0];
  assert.equal(saved.first_name,'Agata Montes');assert.equal(saved.last_name,'Quispe Tovar');assert.equal(saved.birth_date,'2021-03-13');assert.equal(saved.classroom_id,row.classroom_id);assert.equal(saved.initial_context,'Historia ficticia preservada');
  await assert.rejects(updateStudentDetails(db,teacher,row.id,{...input,firstName:'Cambio desactualizado'}),/cambiaron/);
  await changeStudentEnrollment(db,teacher,row.id,{status:'inactive',expectedStatus:'active'});
  assert.equal((await db.query(`select count(*)::int n from students where id=$1 and status='active'`,[row.id])).rows[0].n,0);
  assert.equal((await inactiveStudents(db,teacher))[0].id,row.id);
  assert.equal((await inactiveStudents(db,other)).length,0);
  await assert.rejects(updateStudentDetails(db,teacher,row.id,input),/no disponible/);
  await changeStudentEnrollment(db,teacher,row.id,{status:'active',expectedStatus:'inactive'});
  assert.equal((await db.query('select initial_context from students where id=$1',[row.id])).rows[0].initial_context,'Historia ficticia preservada');
  assert.equal((await inactiveStudents(db,teacher)).length,0);
 }finally{await db.close();}
});
