import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {multiAgePeriodOverview,closeMultiAgePeriod,loadMultiAgePeriodClosure} from './multi-age-period.mjs';
import {enrollMultiAgeStudent,multiAgeLocalWorkspace,observeMultiAgeStudent} from './multi-age-local-service.mjs';
import {multiAgeDiagnosticContext,recordMultiAgeDiagnosticObservation} from './multi-age-diagnostic.mjs';
import {correctMultiAgeStudent} from './multi-age-corrections.mjs';
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
for(const schema of ['local','supabase'])test(`Ingreso tardío ${schema}: cierre anterior vigente, diagnóstico y observación desde ingreso, correcciones sin tocar otro bimestre`,{timeout:90000},async()=>{
 const f=await makeMultiAgePeriodFixture({schema}),{db,teacher}=f;try{
  const before=await multiAgePeriodOverview(db,teacher,{classroomId:f.classroom.classroomId,periodId:f.period.id}),closed=await closeMultiAgePeriod(db,teacher,{...confirm(),classroomId:f.classroom.classroomId,periodId:f.period.id,expectedCurrentVersionId:null,expectedSourceFingerprint:before.sourceFingerprint,pendingAcknowledged:true}),manifest=await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId);
  const enroll={...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,firstName:'Niña nueva',lastName:'Ficticia',age:3,enrolledOn:'2026-05-26'};
  await assert.rejects(enrollMultiAgeStudent(db,teacher,{...enroll,enrolledOn:'2026-04-01'}),/Reabre/);
  await assert.rejects(enrollMultiAgeStudent(db,teacher,{...enroll,enrolledOn:'2027-01-01'}),/ingreso/);
  const child=await enrollMultiAgeStudent(db,teacher,enroll);assert.equal((await enrollMultiAgeStudent(db,teacher,enroll)).replayed,true);
  let current=await multiAgePeriodOverview(db,teacher,{classroomId:f.classroom.classroomId,periodId:f.period.id});assert.equal(current.closure.closed,true);assert.equal(current.closure.current,true);assert.equal(current.sourceFingerprint,before.sourceFingerprint);assert.equal(current.rows.length,3);
  const w=await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId),student=w.students.find(s=>s.id===child.studentId);assert.equal(student.enrolled_on,enroll.enrolledOn);
  const context=await multiAgeDiagnosticContext(db,teacher,child.studentId),experience=context.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
  const observation={...confirm(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:'Registro ficticio de ingreso: señaló un material y pidió usarlo.',observedOn:'2026-05-25'};
  await assert.rejects(recordMultiAgeDiagnosticObservation(db,teacher,observation),/ingreso/);await recordMultiAgeDiagnosticObservation(db,teacher,{...observation,clientRequestId:randomUUID(),observedOn:'2026-05-26'});
  await assert.rejects(observeMultiAgeStudent(db,teacher,{clientRequestId:randomUUID(),studentId:child.studentId,activityId:f.activity.activityId,criterionId:f.children[0].criterionId,periodId:f.period.id,observedOn:f.activity.blueprint.occursOn,rawText:'No debe registrarse antes del ingreso.'}),/había ingresado|ingreso/);
  const correction=await correctMultiAgeStudent(db,teacher,{...confirm(),impactsAcknowledged:true,studentId:child.studentId,expectedAssignmentId:child.assignmentId,expectedStudentFingerprint:student.correction_fingerprint,firstName:'Niña nueva corregida',lastName:student.last_name,preferredName:'',birthDate:'',age:3,reason:'Precisar el nombre ficticio sin afectar el período anterior.'});assert.ok(correction);
  current=await multiAgePeriodOverview(db,teacher,{classroomId:f.classroom.classroomId,periodId:f.period.id});assert.equal(current.closure.current,true);assert.equal(current.sourceFingerprint,before.sourceFingerprint);assert.deepEqual(await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId),manifest);
  await assert.rejects(db.query("update multi_age_enrollment_dates set starts_on='2026-04-01' where student_id=$1",[child.studentId]),/se conserva/);
  if(schema==='supabase'){await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);assert.equal((await db.query('select * from multi_age_enrollment_dates')).rows.length,0);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select * from multi_age_enrollment_dates')).rows.length,1);await assert.rejects(db.query('delete from multi_age_enrollment_dates where student_id=$1',[child.studentId]),e=>e.code==='42501');await db.query('reset role');}
 }finally{await db.close();}
});

test('upgrade conserva una fecha V2 ya confirmada y restaura exactamente las filas V1 sin columna añadida',{timeout:90000},async()=>{
 const db=new PGlite();try{
  const directory=new URL('../../local-db/migrations/',import.meta.url),names=(await readdir(directory)).filter(n=>n.endsWith('.sql')).sort();let legacy;
  for(const name of names){if(name==='0091_multi_age_enrollment_date.sql')legacy=JSON.stringify((await db.query('select to_jsonb(s) as data from students s order by id')).rows);if(name>='0092_multi_age_enrollment_isolation.sql')break;await db.exec(await readFile(new URL(name,directory),'utf8'));}
  const teacher=randomUUID(),year=randomUUID(),classroom=randomUUID(),student=randomUUID();await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia de upgrade')",[teacher]);await db.query("insert into school_years(id,owner_id,year,starts_on,ends_on) values($1,$2,2026,'2026-03-02','2026-12-31')",[year,teacher]);
  await db.query("insert into classrooms(id,school_year_id,teacher_id,age_grade_id,institution_name,section,age_mode,curriculum_contract_version) values($1,$2,$3,null,'Jardín ficticio','Upgrade','multi',2)",[classroom,year,teacher]);await db.query("insert into students(id,classroom_id,first_name,last_name,enrolled_on) values($1,$2,'Niña ficticia','Ingreso confirmado','2026-08-17')",[student,classroom]);
  await db.exec(await readFile(new URL('0092_multi_age_enrollment_isolation.sql',directory),'utf8'));
  assert.equal((await db.query('select starts_on::text from multi_age_enrollment_dates where student_id=$1',[student])).rows[0].starts_on,'2026-08-17');
  assert.equal(JSON.stringify((await db.query('select to_jsonb(s) as data from students s where id<>$1 order by id',[student])).rows),legacy);
  assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='students' and column_name='enrolled_on'")).rows[0].n,0);
 }finally{await db.close();}
});
