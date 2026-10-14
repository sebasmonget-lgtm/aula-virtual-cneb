import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {enqueuePreparation,ownedPreparationJob,runPreparationStep,retryPreparation,preparationFingerprint} from './preparation-jobs.mjs';
import {createPendingAIGenerationsStore} from './pending-ai-generations-store.mjs';
import {preparationExecutor} from './preparation-executor.mjs';
import {COMPLETE_PROJECT_POLICY,publishAcceptedProjectBlock} from './complete-project-preparation.mjs';
import {confirmActivityWithCriterion} from './activity-confirmation.mjs';
import {validateActivityV4} from './activity-v4-validation.mjs';
import {handlePreparationRoutes} from '../../scripts/preparation-routes.mjs';

test('aceptación completa: diez días, recuperación sin repetir IA y publicación atómica',async()=>{
  const db=new PGlite();try{
    for(const name of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+name,import.meta.url),'utf8'));
    const teacher=randomUUID(),classroom=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    const annual=randomUUID(),proposal=randomUUID(),experience=randomUUID(),curriculum=(await db.query('select id from curriculum_versions limit 1')).rows[0].id;
    const dates=Array.from({length:10},(_,i)=>`2099-11-${String(i+10).padStart(2,'0')}`),route=dates.map(date=>({id:randomUUID(),date}));
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,status,proposal) values($1,$2,$3,$4,'active',$5::jsonb)`,[annual,classroom.classroomId,classroom.schoolYearId,curriculum,JSON.stringify({proposed_experiences:[{proposal_id:proposal}]})]);
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,source_proposal_id) values($1,$2,'project','QA','QA',$3,$4,'draft',$5::jsonb,$6,$7)`,[experience,classroom.classroomId,dates[0],dates.at(-1),JSON.stringify({activity_route:route,stage:'map_review',decisions:{additional_context:''}}),annual,proposal]);
    await db.query("update learning_experiences set status='active',teacher_confirmed_at=now() where id=$1",[experience]);
    const plan=(await db.query('select * from annual_plans where id=$1',[annual])).rows[0];
    const input={policy:COMPLETE_PROJECT_POLICY,proposalId:proposal,dates},payload={project_id:experience,proposal_id:proposal,expected_dates:dates,additional_context:'',acceptance:{policy:COMPLETE_PROJECT_POLICY,teacher_id:teacher,accepted_at:new Date().toISOString(),reviewed_individually:false}};
    const job=await enqueuePreparation(db,{teacherId:teacher,classroomId:classroom.classroomId,kind:'project',sourceId:annual,sourceRevision:plan.revision,input,payload});
    assert.equal((await enqueuePreparation(db,{teacherId:teacher,classroomId:classroom.classroomId,kind:'project',sourceId:annual,sourceRevision:plan.revision,input,payload})).id,job.id);
    const pending=createPendingAIGenerationsStore(db);let calls=0,saves=0,confirmations=0,failSave=true,failPublish=true;
    const domain=async(j,path,body,method,extra)=>{
      const tx=j.db??db;
      if(path===`/api/project-flow/${experience}`)return{experience:(await db.query('select * from learning_experiences where id=$1',[experience])).rows[0]};
      if(path==='/api/ai/activities/generate'){
        calls++;const id=randomUUID();await pending.set(id,{workflow:'activity',classroom_id:classroom.classroomId,learning_experience_id:experience});
        return{generation_id:id,proposal:{title:'Actividad completa QA',purpose:'Explorar',meaningful_situation:'Explorar materiales',competency_status:'confirmed',competency_id:'CYT_INDAGA',route_item_id:body.routeItemId,teacher_preparation:'Preparación concreta',child_actions:'Acciones completas',mediation:'Orientaciones completas',evidence_opportunities:'Registrar hechos reales',closure_or_continuity:'Continuar explorando'}};
      }
      if(path==='/api/activities'){
        assert.ok(await pending.get(body.generationId));if(failSave){failSave=false;throw Object.assign(new Error('Save interrupted before write'),{status:422});}
        saves++;const id=randomUUID();await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,details,status,preparation_item_id) values($1,$2,$3,'QA','QA',$4::jsonb,'draft',$5)`,[id,experience,body.occursOn,JSON.stringify(body.proposal),extra.preparationItemId]);return{id};
      }
      assert.match(path,/\/activities\/.*\/confirm$/);confirmations++;if(failPublish&&confirmations===2)throw new Error('Second validation interrupted');
      validateActivityV4((await tx.query('select details from activities where id=$1',[path.split('/')[3]])).rows[0].details,new Set(['CYT_INDAGA']));
      return confirmActivityWithCriterion(tx,path.split('/')[3],{competency_id:'CYT_INDAGA',criterion_text:'Explica una idea'},randomUUID(),body.expectedRevision,null,{acceptedBlock:true});
    };
    const execute=preparationExecutor({db,pending,request:domain});
    await runPreparationStep(db,execute);await runPreparationStep(db,execute);assert.equal(calls,1);
    await db.query("delete from ai_pending_generations where workflow='activity'");
    assert.equal((await runPreparationStep(db,execute)).status,'failed');assert.equal(calls,1);
    await retryPreparation(db,teacher,job.id);await runPreparationStep(db,execute);assert.equal(calls,1,'durable response restores expired transport token');
    // Recover the row after losing its checkpoint: the item ID proves it was already saved.
    let stored=await ownedPreparationJob(db,teacher,job.id);delete stored.payload.items[0].activity_id;
    await db.query('update preparation_jobs set payload=$1::jsonb where id=$2',[JSON.stringify(stored.payload),job.id]);
    await runPreparationStep(db,execute);assert.equal(calls,1);assert.equal(saves,1);
    for(let i=0;i<24;i++){const step=await runPreparationStep(db,execute);if(step?.status==='failed')break;}
    stored=await ownedPreparationJob(db,teacher,job.id);assert.equal(stored.status,'failed');assert.equal(calls,10);assert.equal(saves,10);
    assert.equal((await db.query("select count(*)::int as n from activities where status='active' and experience_id=$1",[experience])).rows[0].n,0,'a failure rolls back the whole block');
    assert.equal((await db.query('select count(*)::int as n from class_schedule_entries where activity_id in (select id from activities where experience_id=$1)',[experience])).rows[0].n,0);
    assert.equal(stored.approved_at,null);
    failPublish=false;await retryPreparation(db,teacher,job.id);const result=await runPreparationStep(db,execute);assert.equal(result.status,'succeeded');assert.ok(result.approved_at);
    assert.equal((await db.query("select count(*)::int as n from activities where status='active' and experience_id=$1",[experience])).rows[0].n,10);
    assert.equal((await db.query('select count(*)::int as n from activity_criteria where activity_id in (select id from activities where experience_id=$1)',[experience])).rows[0].n,10);
    assert.equal((await db.query('select count(distinct scheduled_on)::int as n from class_schedule_entries where activity_id in (select id from activities where experience_id=$1)',[experience])).rows[0].n,10);
    assert.equal((await db.query("select count(*)::int as n from activities where experience_id=$1 and generation_metadata->'publication_authorization'->>'reviewed_individually'='false'",[experience])).rows[0].n,10);
    stored=await ownedPreparationJob(db,teacher,job.id);await publishAcceptedProjectBlock(db,stored,domain);assert.equal(calls,10);assert.equal(saves,10);
    await assert.rejects(()=>ownedPreparationJob(db,randomUUID(),job.id));
    assert.equal(await runPreparationStep(db,execute),null);
    assert.equal(preparationFingerprint((await db.query('select details from learning_experiences where id=$1',[experience])).rows[0].details),stored.payload.project_fingerprint);
    const futureJob=await enqueuePreparation(db,{teacherId:teacher,classroomId:classroom.classroomId,kind:'project',sourceId:annual,sourceRevision:plan.revision,input:{future:true},payload:{...payload,future_version:true,accepted_preview_revision:11}});
    let receipt;
    const routeOptions={request:{method:'POST'},response:{},url:new URL('http://localhost/api/preparation/projects/future-complete'),db,teacherId:teacher,origin:'http://localhost',send:(_response,status,value)=>{receipt={status,value};},readJson:async()=>({projectId:experience,expectedRevision:11,accepted:true}),projectFlowRow:async()=>({row:(await db.query('select * from learning_experiences where id=$1',[experience])).rows[0]})};
    await handlePreparationRoutes(routeOptions);assert.equal(receipt.status,202);assert.equal(receipt.value.id,futureJob.id);assert.equal(calls,10,'replay of future acceptance does not restart generation');
    await handlePreparationRoutes({...routeOptions,readJson:async()=>({projectId:experience,expectedRevision:12,accepted:true})});assert.equal(receipt.status,409);
    await handlePreparationRoutes({...routeOptions,projectFlowRow:async()=>({row:null})});assert.equal(receipt.status,409);
    await handlePreparationRoutes({...routeOptions,url:new URL('http://localhost/api/preparation/activities'),readJson:async()=>({experienceId:experience})});assert.equal(receipt.status,202);assert.equal(receipt.value.id,futureJob.id);assert.equal(calls,10);
  }finally{await db.close();}
});
