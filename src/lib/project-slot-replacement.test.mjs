import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {libraryRow} from './annual-year-editor.mjs';
import {assertSavedSlotReplacement} from './project-slot-replacement.mjs';
import {enqueuePreparation,ownedPreparationJob,preparationFingerprint} from './preparation-jobs.mjs';
import {COMPLETE_PROJECT_POLICY,publishAcceptedProjectBlock} from './complete-project-preparation.mjs';

test('replacement is limited to the saved slot and exact outgoing library snapshot',()=>{
 const old={proposal_id:'old',title:'Agua',planned_start_date:'2099-11-10'},slot={slot_id:'slot12',starts_on:'2099-11-10',ends_on:'2099-11-20'};
 const previous={proposed_experiences:[old],resolved_calendar:{projects:[{...slot,proposal_id:'old'}]}};
 const next={available_experiences:[libraryRow(old)],resolved_calendar:{projects:[{...slot,proposal_id:'new'}]}};
 assert.doesNotThrow(()=>assertSavedSlotReplacement(next,previous,'new','old'));
 for(const change of [value=>value.resolved_calendar.projects[0].ends_on='2099-11-21',value=>value.available_experiences=[],value=>value.available_experiences[0].title='Changed']){
  const changed=structuredClone(next);change(changed);assert.throws(()=>assertSavedSlotReplacement(changed,previous,'new','old'));
 }
});

test('prepared replacement publishes atomically, preserves old documents, audits omitted dates and protects execution',async()=>{
 const db=new PGlite();try{
  for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
  const teacher=randomUUID(),room=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  const curriculum=(await db.query('select id from curriculum_versions limit 1')).rows[0].id;
  const oldYear=randomUUID(),year=randomUUID(),oldId=randomUUID(),nextId=randomUUID(),oldProject=randomUUID(),project=randomUUID(),oldActivity=randomUUID(),omitted=randomUUID(),activity=randomUUID(),schedule=randomUUID(),routeId=randomUUID();
  const day='2099-11-10',last='2099-11-11',slot={slot_id:'slot12',starts_on:day,ends_on:last};
  const old={proposal_id:oldId,title:'Agua',purpose:'Explorar',planned_start_date:day,planned_end_date:last};
  const previous={proposed_experiences:[old],resolved_calendar:{projects:[{...slot,proposal_id:oldId}]}};
  const next={proposed_experiences:[{proposal_id:nextId,title:'Animales'}],available_experiences:[libraryRow(old)],resolved_calendar:{projects:[{...slot,proposal_id:nextId}]}};
  for(const [id,status,proposal]of [[oldYear,'archived',previous],[year,'active',next]])await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,status,proposal,version) values($1,$2,$3,$4,$5,$6::jsonb,case when $5='active' then 2 else 1 end)`,[id,room.classroomId,room.schoolYearId,curriculum,status,JSON.stringify(proposal)]);
  const details={activity_route:[{id:routeId,date:day}],project_master:{foundation:'Guardada'}};
  for(const [id,annual,source]of [[oldProject,oldYear,oldId],[project,year,nextId]])await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,source_proposal_id) values($1,$2,'project','QA','QA',$3,$4,'active',$5::jsonb,$6,$7)`,[id,room.classroomId,day,last,JSON.stringify(details),annual,source]);
  for(const [id,experience,date,status]of [[oldActivity,oldProject,day,'active'],[omitted,oldProject,last,'active'],[activity,project,day,'draft']])await db.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status,details) values($1,$2,'QA','QA',$3,$4,$5::jsonb)`,[id,experience,date,status,JSON.stringify({route_item_id:routeId})]);
  for(const [id,a,date]of [[schedule,oldActivity,day],[randomUUID(),omitted,last]])await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title,is_instructional) values($1,$2,$3,'09:00','09:45','activity',$4,'QA',true)`,[id,room.classroomId,date,a]);
  const p=(await db.query('select * from learning_experiences where id=$1',[project])).rows[0],plan=(await db.query('select * from annual_plans where id=$1',[year])).rows[0];
  const accepted=await enqueuePreparation(db,{teacherId:teacher,classroomId:room.classroomId,kind:'project',sourceId:year,sourceRevision:plan.revision,input:{test:'replacement'},payload:{project_id:project,project_revision:Number(p.revision),project_fingerprint:preparationFingerprint(p.details),expected_dates:[day],items:[{activity_id:activity,route_item_id:routeId,date:day}],acceptance:{policy:COMPLETE_PROJECT_POLICY,teacher_id:teacher}}});
  const log=randomUUID();await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status,actual_started_at) values($1,$2,$3,'active',now())`,[log,schedule,day]);
  const confirm=async(j,path)=>j.db.query("update activities set status='active' where id=$1",[path.split('/')[3]]);
  await assert.rejects(()=>publishAcceptedProjectBlock(db,accepted,confirm),/ejecución o evidencias/);
  assert.equal((await db.query('select status from activities where id=$1',[oldActivity])).rows[0].status,'active');
  assert.equal((await ownedPreparationJob(db,teacher,accepted.id)).approved_at,null);
  await db.query('delete from daily_execution_logs where id=$1',[log]); // disposable fixture only
  await publishAcceptedProjectBlock(db,accepted,confirm);
  assert.equal((await db.query('select activity_id from class_schedule_entries where id=$1',[schedule])).rows[0].activity_id,activity);
  const oldRows=(await db.query('select status,schedule_status,details from activities where id=any($1::uuid[])',[[oldActivity,omitted]])).rows;
  assert.ok(oldRows.every(row=>row.status==='archived'&&row.schedule_status==='cancelled'));
  assert.ok(oldRows.every(row=>row.details.route_item_id===routeId),'pedagogical content preserved');
  assert.equal((await db.query('select count(*)::int as n from activity_schedule_changes where activity_id=any($1::uuid[])',[[oldActivity,omitted]])).rows[0].n,2);
  await publishAcceptedProjectBlock(db,accepted,confirm);
  assert.equal((await db.query('select count(*)::int as n from activity_schedule_changes where activity_id=any($1::uuid[])',[[oldActivity,omitted]])).rows[0].n,2,'replay does not cancel or publish twice');
 }finally{await db.close();}
});
