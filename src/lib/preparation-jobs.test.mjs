import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID,createHmac } from "node:crypto";
import { readdir,readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { enqueueActivityBlock,ownedPreparationJob,runPreparationStep,retryPreparation,acceptPreparationDispatch } from "./preparation-jobs.mjs";
import { preparationExecutor } from "./preparation-executor.mjs";
import { createPendingAIGenerationsStore } from "./pending-ai-generations-store.mjs";
import { handlePreparationRoutes } from "../../scripts/preparation-routes.mjs";

async function fixture(){const db=new PGlite();
  for(const name of (await readdir(new URL("../../local-db/migrations/",import.meta.url))).filter(name=>name.endsWith(".sql")).sort())await db.exec(await readFile(new URL(`../../local-db/migrations/${name}`,import.meta.url),"utf8"));
  const teacher=randomUUID(),classroom=await createPilotClassroom(db,teacher,{teacherName:"QA",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
  const project=(await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
    values($1,$2,'project','QA','QA','2026-10-05','2026-10-16','draft',$3::jsonb) returning *`,[randomUUID(),classroom.classroomId,JSON.stringify({activity_route:[{id:randomUUID(),date:"2026-10-05"},{id:randomUUID(),date:"2026-10-06"}]})])).rows[0];
  await db.query(`update learning_experiences set status='active',teacher_confirmed_at=now() where id=$1`,[project.id]);
  return {db,teacher,project:(await db.query("select * from learning_experiences where id=$1",[project.id])).rows[0]};
}
test("bloque durable conserva resultados, reanuda sin IA, no duplica y confirma de forma atómica",async()=>{
  const {db,teacher,project}=await fixture();try{
    const job=await enqueueActivityBlock(db,teacher,project);assert.equal((await enqueueActivityBlock(db,teacher,project)).id,job.id);
    await assert.rejects(()=>ownedPreparationJob(db,randomUUID(),job.id));
    const pending=createPendingAIGenerationsStore(db);let calls=0,saves=0;
    const execute=preparationExecutor({db,pending,request:async(_job,path,body,_method,extra)=>{
      if(path==="/api/ai/activities/generate"){
        calls++;const id=randomUUID();await pending.set(id,{workflow:"activity",classroom_id:project.classroom_id,learning_experience_id:project.id});
        return {generation_id:id,proposal:{title:"Actividad QA",route_item_id:body.routeItemId},workshop_proposal:null};
      }
      assert.equal(path,"/api/activities");assert.ok(await pending.get(body.generationId));saves++;
      const id=randomUUID();await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,details,status,preparation_item_id)
        values($1,$2,$3,'QA','QA',$4::jsonb,'draft',$5)`,[id,project.id,body.occursOn,JSON.stringify(body.proposal),extra.preparationItemId]);return {id};
    }});
    assert.equal((await runPreparationStep(db,execute)).completed,0);assert.equal(calls,1);
    // Lose the transport token after persisting the full response: retry restores it without generating.
    await db.query("delete from ai_pending_generations");
    assert.equal((await runPreparationStep(db,execute)).completed,1);assert.equal(calls,1);
    await runPreparationStep(db,execute);await runPreparationStep(db,execute);
    const complete=await ownedPreparationJob(db,teacher,job.id);assert.equal(complete.status,"succeeded");assert.equal(calls,2);assert.equal(saves,2);
    assert.equal(await runPreparationStep(db,execute),null);
    assert.equal((await db.query("select count(*)::int as n from activities where experience_id=$1",[project.id])).rows[0].n,2);
    let confirmations=0;
    const route=async(action,body,user=teacher)=>{let result;await handlePreparationRoutes({request:{method:body?"POST":"GET"},response:{},url:new URL(`http://local/api/preparation/${job.id}/${action}`),db,teacherId:user,readJson:async()=>body,
      send:(_response,status,data)=>{result={status,data};},domainRequest:async(transactionalJob,path)=>{
        confirmations++;if(confirmations===2)throw new Error("Simulated second confirmation failure");
        await transactionalJob.db.query("update activities set status='active',teacher_confirmed_at=now() where id=$1",[path.split("/")[3]]);
      }});return result;};
    const review=await route("review");assert.equal(review.status,200);
    const body={reviewed:true,activities:review.data.activities.map(item=>({id:item.id,expectedRevision:item.revision}))};
    assert.equal((await route("approve",body)).status,422);
    assert.equal((await db.query("select count(*)::int as n from activities where status='active' and experience_id=$1",[project.id])).rows[0].n,0);
    assert.equal((await ownedPreparationJob(db,teacher,job.id)).approved_at,null);
    confirmations=2;assert.equal((await route("approve",body)).status,200);
    assert.ok((await ownedPreparationJob(db,teacher,job.id)).approved_at);
    assert.equal((await route("approve",body)).status,200);assert.equal(confirmations,4);
    assert.equal((await route("review",undefined,randomUUID())).status,409);
  }finally{await db.close();}
});
test("lease, llamada incierta y firma privada impiden duplicación silenciosa",async()=>{
  const {db,teacher,project}=await fixture();try{
    const job=await enqueueActivityBlock(db,teacher,project);const pending=createPendingAIGenerationsStore(db);let entered,release,calls=0;
    const reached=new Promise(resolve=>{entered=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
    const execute=preparationExecutor({db,pending,request:async()=>{calls++;entered();await blocked;throw Object.assign(new Error("Lost response"),{status:503});}});
    const running=runPreparationStep(db,execute);await reached;assert.equal(await runPreparationStep(db,execute),null);assert.equal(calls,1);
    release();assert.equal((await running).status,"uncertain");
    await assert.rejects(()=>retryPreparation(db,teacher,job.id),/última llamada/);
    assert.equal((await retryPreparation(db,teacher,job.id,true)).status,"queued");
    await db.query(`update preparation_jobs set status='running',lease_until=now()-interval '1 minute',payload=jsonb_set(payload,'{attempt_pending}','true'::jsonb) where id=$1`,[job.id]);
    assert.equal((await runPreparationStep(db,execute)).status,"uncertain");assert.equal(calls,1);
    const secret="fixture-secret-32-characters-minimum",timestamp=String(Math.floor(Date.now()/1000)),nonce=randomUUID();
    const headers={"x-ayni-dispatch-time":timestamp,"x-ayni-dispatch-nonce":nonce,"x-ayni-dispatch-signature":createHmac("sha256",secret).update(`${timestamp}.${nonce}`).digest("hex")};
    assert.equal(await acceptPreparationDispatch(db,headers,"wrong-secret"),false);
    assert.equal(await acceptPreparationDispatch(db,headers,secret),true);assert.equal(await acceptPreparationDispatch(db,headers,secret),false);
    assert.equal(await acceptPreparationDispatch(db,headers,secret,Date.now()+120000),false);
  }finally{await db.close();}
});

test("repreparar un borrador distingue su revisión y rechaza contexto, propiedad o CAS incorrectos",async()=>{
  const {db,teacher,project}=await fixture();try{
    const planId=randomUUID(),proposalId=randomUUID();
    const source={plan:{id:planId,status:"active",revision:1,proposal:{experience_context:{}}},slot:{ends_on:"2099-12-31"},classroom:{id:project.classroom_id}};
    const revised={...project,status:"draft",annual_plan_id:planId,source_proposal_id:proposalId,revision:12,
      details:{stage:"dependents",decisions:{additional_context:"Tenemos tizas."}}};
    const route=async(body,owned=revised)=>{let result;await handlePreparationRoutes({request:{method:"POST"},response:{},url:new URL("http://local/api/preparation/projects"),db,teacherId:teacher,
      readJson:async()=>body,projectFlowSource:async()=>source,projectFlowRow:async()=>({row:owned}),send:(_response,status,data)=>{result={status,data};}});return result;};
    const base={annualPlanId:planId,proposalId,additionalContext:"Tenemos tizas."};
    const original=await route(base);assert.equal(original.status,202);
    const changed={...base,projectId:project.id,expectedProjectRevision:12};
    const next=await route(changed);assert.equal(next.status,202);assert.notEqual(next.data.id,original.data.id);
    assert.equal((await route(changed)).data.id,next.data.id,"double submission recovers the same revised job");
    assert.equal((await ownedPreparationJob(db,teacher,next.data.id)).payload.project_id,project.id);
    assert.equal((await route({...changed,expectedProjectRevision:11})).status,409);
    assert.equal((await route({...changed,additionalContext:"Otro contexto"})).status,409);
    assert.equal((await route(changed,null)).status,409);
    assert.equal((await route(changed,{...revised,status:"active"})).status,409);
    assert.equal((await route(changed,{...revised,source_proposal_id:randomUUID()})).status,409);
    assert.equal((await route(changed,{...revised,details:{...revised.details,project_master:{}}})).status,409);
  }finally{await db.close();}
});
