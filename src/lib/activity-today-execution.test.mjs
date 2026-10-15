import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {startActivityToday} from './activity-today-execution.mjs';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {saveOrdinaryObservation} from './ordinary-observation-service.mjs';
import {loadStudentTrajectory} from './student-trajectory-service.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {classroomObservationCoverage} from './classroom-observation-coverage.mjs';

test('develop today preserves the project date, checks ownership, records actual day and keeps nominal observation context',async()=>{
 const db=new PGlite();try{
  for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
  const teacher=randomUUID(),room=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  const project=randomUUID(),activity=randomUUID(),schedule=randomUUID(),student=randomUUID(),blueprint=randomUUID(),criterion=randomUUID();
  const planned='2026-11-16',actual='2026-10-14';
  await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
    values($1,$2,'project','Proyecto QA','Explorar',$3,$3,'active',$4::jsonb)`,[project,room.classroomId,planned,JSON.stringify({activity_route:[{id:blueprint,date:planned}]})]);
  await db.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status,details) values($1,$2,'Exploración QA','Explorar',$3,'active',$4::jsonb)`,[activity,project,planned,JSON.stringify({meaningful_situation:'Explorar',route_item_id:blueprint})]);
  await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,is_instructional) values($1,$2,$3,'09:00','09:45','activity',$4,true)`,[schedule,room.classroomId,planned,activity]);
  await db.query(`insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Niña','QA')`,[student,room.classroomId]);
  await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,status) values($1,$2,'CYT_INDAGA','Explica lo que observa','active')`,[criterion,activity]);
  await assert.rejects(()=>startActivityToday(db,teacher,activity,'2026-12-01'),/proyecto terminó/);
  assert.equal((await db.query('select count(*)::int as n from daily_execution_logs')).rows[0].n,0);
  await assert.rejects(()=>startActivityToday(db,randomUUID(),activity,actual));
  await assert.rejects(()=>startActivityToday(db,teacher,randomUUID(),actual));
  assert.equal(await startActivityToday(db,teacher,activity,actual),schedule);
  assert.equal(await startActivityToday(db,teacher,activity,actual),schedule);
  assert.equal((await db.query('select count(*)::int as n from daily_execution_logs where schedule_entry_id=$1',[schedule])).rows[0].n,1);
  assert.equal((await db.query('select occurs_on::text as date from activities where id=$1',[activity])).rows[0].date,planned);
  assert.equal((await db.query('select scheduled_on::text as date from class_schedule_entries where id=$1',[schedule])).rows[0].date,planned);
  await db.query("insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,'bimester',4,'Bimestre 4','2026-10-12','2026-12-18')",[randomUUID(),room.schoolYearId]);
  const observation=await saveOrdinaryObservation(db,teacher,{studentId:student,activityId:activity,criterionId:criterion,clientRequestId:randomUUID(),sourceKind:'guided',rawText:'Explica que el agua cae al inclinar el recipiente.'},{occurredAt:new Date(actual+'T15:00:00Z')});
  assert.equal(observation.observation.context_snapshot.activity_date,planned);
  const document=await loadSavedDocument(db,teacher,'activity',activity);
  assert.equal(document.actual_execution_date,actual);assert.equal(document.occurs_on,planned);
  assert.equal(document.registered_evidence[0].student_id,student);assert.match(document.registered_evidence[0].observation_text,/agua cae/);
  const trajectory=await loadStudentTrajectory(db,teacher,student,{includeOrdinary:true});
  assert.match(JSON.stringify(trajectory),/agua cae/);assert.equal(await loadStudentTrajectory(db,randomUUID(),student,{includeOrdinary:true}),null);
  assert.ok(trajectory.timeline.every(period=>period.competencies.every(item=>item.level===null)),'observation does not invent a final level');
  const counts=await classroomObservationCoverage(db,{classroomId:room.classroomId,year:{starts_on:new Date('2026-03-02'),ends_on:new Date('2026-12-31')},competencyId:'CYT_INDAGA'});
  assert.equal(counts.get(student),1,'actual-day capture must count even when planned in a later bimester');
  await assert.rejects(()=>startActivityToday(db,teacher,activity,'2026-10-15'),/jornada registrada/);
  await db.query("update daily_execution_logs set status='completed',actual_ended_at=now() where schedule_entry_id=$1",[schedule]);
  await assert.rejects(()=>startActivityToday(db,teacher,activity,actual),/jornada registrada/);
 }finally{await db.close();}
});
