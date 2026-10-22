import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {loadActivityRecordSignals,activityRecordLabel} from './activity-record-signals.mjs';
import {loadEffectiveCalendar,reprogramActivity} from './school-calendar-service.mjs';
import {saveOrdinaryObservation,reviseOrdinaryObservation} from './ordinary-observation-service.mjs';
import {syncPeriodEvaluationMap} from './period-assessment-closure-service.mjs';
import {loadPeriodFutureReview} from './period-future-review.mjs';
import {loadWorkshopLibrary} from './workshop-library-service.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {calendarActivityState} from './daily-dashboard-display.mjs';

test('opening/reading creates no execution; observations, calendar, review and workshops agree; history survives',async()=>{
 const db=new PGlite();try{
  for(const f of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+f,import.meta.url),'utf8'));
  const teacher=randomUUID(),room=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  const project=randomUUID(),activity=randomUUID(),schedule=randomUUID(),student=randomUUID(),criterion=randomUUID(),periodId=randomUUID();
  const planned='2026-11-16',actual='2026-11-17';
  await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details) values($1,$2,'project','QA','Explorar','2026-11-16','2026-11-30','active','{}')`,[project,room.classroomId]);
  await db.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status,details) values($1,$2,'Guía QA','Explorar',$3,'active','{"meaningful_situation":"Explorar"}')`,[activity,project,planned]);
  await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,is_instructional) values($1,$2,$3,'09:00','09:45','activity',$4,true)`,[schedule,room.classroomId,planned,activity]);
  await db.query(`insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Niña','QA')`,[student,room.classroomId]);
  await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,status) values($1,$2,'CYT_INDAGA','Describe su observación','active')`,[criterion,activity]);
  await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,'bimester',4,'Bimestre 4','2026-10-12','2026-12-18')`,[periodId,room.schoolYearId]);
  const period={id:periodId,starts_on:'2026-10-12',ends_on:'2026-12-18'};
  const logs=async()=>Number((await db.query('select count(*)::int n from daily_execution_logs')).rows[0].n);
  assert.ok(await loadSavedDocument(db,teacher,'activity',activity));
  await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:room.classroomId});
  assert.equal(await logs(),0,'consulting must not mark work or prevent rescheduling');
  await reprogramActivity(db,{teacherId:teacher,activityId:activity,newDate:'2026-11-18',reason:'Ajuste de aula'},{today:'2026-11-10'});
  await reprogramActivity(db,{teacherId:teacher,activityId:activity,newDate:planned,reason:'Volvemos al día previsto'},{today:'2026-11-10'});
  const raw='Dice: «El agua cae cuando inclino el vaso».',request={studentId:student,activityId:activity,criterionId:criterion,clientRequestId:randomUUID(),sourceKind:'guided',rawText:raw};
  const saved=await saveOrdinaryObservation(db,teacher,request,{occurredAt:new Date(actual+'T15:00:00Z')});
  assert.equal((await saveOrdinaryObservation(db,teacher,request,{occurredAt:new Date(actual+'T15:00:00Z')})).created,false);
  assert.equal(await logs(),0,'saving a real observation also needs no execution');
  const signals=await loadActivityRecordSignals(db,{classroomId:room.classroomId});
  assert.deepEqual(signals.get(activity),{observation_count:1,last_observed_on:actual});
  assert.equal((await loadActivityRecordSignals(db,{classroomId:randomUUID()})).size,0);
  const calendar=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:room.classroomId});
  const a=calendar.activities.find(a=>a.id===activity);
  assert.deepEqual(calendarActivityState(a,actual),{label:'Con observaciones',canMarkNotWorked:false});
  await assert.rejects(()=>reprogramActivity(db,{teacherId:teacher,activityId:activity,newDate:'2026-11-18',reason:'No debe cambiar'},{today:'2026-11-10'}),/registros|evidencias|ejecución/);
  const map=await syncPeriodEvaluationMap(db,{classroomId:room.classroomId,schoolYearId:room.schoolYearId,period});
  assert.equal(map.entries[0].activity_state,'completed');assert.equal(map.entries[0].actual_on,actual);
  const review=await loadPeriodFutureReview(db,{teacherId:teacher,classroomId:room.classroomId,periodId,curriculum:[{id:'CYT_INDAGA',name:'Indaga'}],today:actual});
  assert.equal(review.competencies[0].worked_opportunities,1);
  assert.equal((await loadWorkshopLibrary(db,{teacherId:teacher,classroomId:room.classroomId,today:actual})).coverage.CYT_INDAGA.developed,1);
  const doc=await loadSavedDocument(db,teacher,'activity',activity);
  assert.equal(doc.actual_execution_date,null,'observation date is not fabricated execution');assert.equal(doc.occurs_on,planned);
  assert.equal(doc.registered_evidence[0].observation_text,raw);
  assert.equal((await db.query('select count(*)::int n from competency_assessments')).rows[0].n,0);
  // A historical teacher note remains byte-for-byte identical across the new readers.
  await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status,actual_started_at,actual_ended_at,teacher_closure_note) values($1,$2,$3,'completed',now(),now(),'Mañana retomamos. Texto de la docente.')`,[randomUUID(),schedule,planned]);
  const before=JSON.stringify((await db.query('select * from daily_execution_logs order by id')).rows);
  await loadWorkshopLibrary(db,{teacherId:teacher,classroomId:room.classroomId,today:actual});
  const historical=await loadSavedDocument(db,teacher,'activity',activity);
  assert.equal(historical.teacher_closure_note,'Mañana retomamos. Texto de la docente.');
  assert.equal(JSON.stringify((await db.query('select * from daily_execution_logs order by id')).rows),before);
  await reviseOrdinaryObservation(db,teacher,saved.observation.id,{action:'void',expectedRevision:1,reason:'Prueba de anulación'});
  assert.equal((await loadActivityRecordSignals(db,{classroomId:room.classroomId})).size,0,'voided notes do not count as current observations');
  assert.equal((await db.query('select raw_text from ordinary_observations where id=$1',[saved.observation.id])).rows[0].raw_text,raw);
 }finally{await db.close();}
});

test('absence of records and an old open log never claim non-performance or completion',()=>{
 assert.equal(activityRecordLabel({occurs_on:'2026-04-01'},'2026-04-02'),'Sin registros');
 assert.equal(activityRecordLabel({execution_status:'active'},'2026-04-02'),'Registro anterior');
 assert.equal(activityRecordLabel({execution_status:'planned'},'2026-04-02'),'Prevista');
});
