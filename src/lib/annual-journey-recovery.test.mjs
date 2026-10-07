import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {fixtureCalendar,generationFixture} from "./test-fixtures/annual-journey.mjs";
import {buildAnnualClassroomSnapshot} from "./annual-classroom-snapshot.mjs";
import {generateAnnualJourney} from "./annual-journey-service.mjs";
import {validateAnnualJourney} from "./annual-journey-contract.mjs";
import {observationCoverage,coverageLabel} from "./observation-coverage.mjs";
import {publicJourneyJob} from "./annual-journey-jobs.mjs";
import {createPilotClassroom} from "./pilot-onboarding-service.mjs";
import {defaultInitialStage} from "./annual-plan-calendar.mjs";
import {handleAnnualJourneyRoutes} from "../../scripts/annual-journey-routes.mjs";
const curriculum=[{id:"MAT_CANTIDAD",name:"Cantidad",capacities:["Comunica su comprensión"]},{id:"COM_ORAL",name:"Oral",capacities:["Interactúa estratégicamente"]}];
const snapshot=()=>buildAnnualClassroomSnapshot({students:[{id:"one"},{id:"two"}],interviews:[],names:[],fingerprint:"scope",
  observations:[{id:"one_blocks",student_id:"one",observation_text:"Cambió las piezas después de que cayó la torre."},
    {id:"two_seeds",student_id:"two",observation_text:"Señaló otro recipiente al cambiar la disposición."}]},{available_resources:[]},curriculum);

test("job background: recargar y consultar temprano no crea otra generación ni expone el ID del proveedor",async()=>{
  const db=new PGlite();
  try {
    for(const file of (await readdir(new URL("../../local-db/migrations/",import.meta.url))).filter(file=>file.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(`../../local-db/migrations/${file}`,import.meta.url),"utf8"));
    const teacherId=randomUUID(),created=await createPilotClassroom(db,teacherId,{teacherName:"QA background",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    const context={id:created.classroomId,school_year_id:created.schoolYearId,curriculum_version_id:(await db.query("select id from curriculum_versions limit 1")).rows[0].id,
      year:2026,age:5,available_resources:[],calendar:{initial_stage:defaultInitialStage()}};
    let creates=0,retrieves=0;
    const route=async(path,body,user=teacherId)=>{
      let result;
      await handleAnnualJourneyRoutes({request:{method:body===undefined?"GET":"POST"},response:{},url:new URL(`http://localhost/api/annual-journey/${path}`),
        db,teacherId:user,readJson:async()=>body,send:(_r,status,data)=>{result={status,data};},annualPlanningContext:async()=>context,annualDocumentContext:()=>({teacher_name:"QA"}),
        createProvider:(_plan,options)=>({generate:async request=>{
          assert.equal(options.background,true);
          if(!options.resumeResponseId){creates++;await options.onResponseStarted("resp_private_fixture");throw Object.assign(new Error("pending"),{reason:"response_pending"});}
          retrieves++;assert.equal(options.resumeResponseId,"resp_private_fixture");
          return{output:generationFixture(request.ai_context_bundle.curriculum.competency_cards)};
        }})});return result;
    };
    const start=await route("start");
    const prepared=await route("prepare",{teacherIdeas:"",sourceFingerprint:start.data.snapshot.source_fingerprint});
    const id=prepared.data.id,pending=await route(`jobs/${id}/run`,{});
    assert.equal(pending.status,202);assert.equal(pending.data.status,"queued");assert.ok(pending.data.poll_after_ms>0);
    assert.ok(!JSON.stringify(pending.data).includes("resp_private_fixture"));
    await route(`jobs/${id}`);await route(`jobs/${id}/run`,{});assert.equal(creates,1);assert.equal(retrieves,0);
    assert.equal((await route(`jobs/${id}`,undefined,randomUUID())).status,404);
    await db.query("update ai_pending_generations set payload=jsonb_set(payload,'{next_poll_at}','\"1970-01-01\"'::jsonb) where id=$1",[id]);
    assert.equal((await route(`jobs/${id}/run`,{})).status,202);
    assert.equal((await route(`jobs/${id}/run`,{})).status,201);
    assert.equal(creates,1);assert.equal(retrieves,1);
    assert.equal((await route(`jobs/${id}`)).data.calls_attempted,1);
  } finally {await db.close();}
});

test("regresión QA: actuaciones de dos niños no pasan a interpretación individual ni grupal; sigue el año",async()=>{
  const sources=snapshot(),keys=sources.facts.map(f=>f.key),calls=[];
  const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:sources,curriculum,calendar:fixtureCalendar(),
    createProvider:()=>({generate:async request=>{
      calls.push(request);
      if(request.workflow==="annual_journey_review") {
        assert.equal(request.ai_context_bundle.plan.evidence_interpretations.length,0);
        assert.equal(request.ai_context_bundle.plan.insufficient_interpretations[0].information_status,"insufficient_information");
        return {output:{issues:[]}};
      }
      return {output:{...generationFixture(curriculum),evidence_interpretations:[{fact_keys:keys,interpretation:"Ambos requieren el mismo apoyo",meaning:"support_needed",scope:"individual"}]}};
    }})});
  assert.equal(calls.length,1);assert.deepEqual(plan.evidence_interpretations,[]);
  assert.deepEqual(plan.insufficient_interpretations[0].subjects,["child_1","child_2"]);
  assert.equal(plan.insufficient_interpretations[0].attempted_scope,"individual");
  assert.deepEqual(plan.classroom_snapshot.facts,sources.facts);validateAnnualJourney(plan,curriculum,{confirmation:true});
  const invalid={...plan,evidence_interpretations:[{fact_keys:keys,interpretation:"Interpretación incorrecta",meaning:"ambiguous",scope:"individual"}]};
  assert.throws(()=>validateAnnualJourney(invalid,curriculum),e=>e.reason==="invalid_scope"&&e.details.subjects.length===2);
});

test("el revisor detecta razones dependientes de una hipótesis retirada y repara solo la fila afectada",async()=>{
  const sources=snapshot();let reviews=0;const original={...generationFixture(curriculum),proposals:generationFixture(curriculum).proposals.slice(0,12)};
  const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:sources,curriculum,calendar:fixtureCalendar(),checkpoint:{slots:Array.from({length:12},()=>({proposal_id:randomUUID()}))},createProvider:()=>({generate:async request=>{
    const b=request.ai_context_bundle;
    if(request.workflow==="annual_plan")return{output:{...original,evidence_interpretations:[{fact_keys:sources.facts.map(f=>f.key),interpretation:"Todos tienen dificultad",meaning:"support_needed",scope:"individual"}]}};
    if(request.workflow==="annual_journey_review")return{output:{issues:reviews++===0?[{proposal_id:b.plan.proposed_experiences[0].proposal_id,reason:"El apoyo depende de una generalización retirada"}]:[]}};
    assert.equal(b.affected_proposal_ids.length,1);
    return{output:{replacements:[{...original.proposals[0],rationale:"Oportunidad curricular para seguir conociendo actuaciones individuales.",proposal_id:b.affected_proposal_ids[0],change_reason:"Conservar desconocimiento"}],everyday_opportunities:b.plan.everyday_opportunities,evidence_interpretations:[]}};
  }})});
  assert.match(plan.proposed_experiences[0].rationale,/curricular/);assert.equal(plan.insufficient_interpretations.length,1);
  assert.equal(plan.proposed_experiences[1].rationale,original.proposals[1].rationale);
});

test("matriz cuenta registros únicos confirmados, sin transformar sugerencias ni vacíos en dificultades",()=>{
  const counts=observationCoverage([{id:"g",student_id:"one",competency_v4_id:"MAT",observation_text:"Comparó"},
    {id:"g",student_id:"one",competency_v4_id:"MAT",observation_text:"Comparó"}],
  [{id:"s",student_id:"one",classification_source:"teacher",competency_v4_ids:["MAT","ORAL"],observation_text:"Explicó"},
    {id:"pending",student_id:"two",classification_source:"openai",competency_v4_ids:["MAT"],observation_text:"Observó"}]);
  assert.deepEqual(counts,{"one:MAT":2,"one:ORAL":1});assert.equal(coverageLabel(0),"Sin registros");
});

test("la cobertura no se marca lista mientras su reparación determinística siga en curso",async()=>{
  const stages=[];
  await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),
    onCheckpoint:async state=>stages.push({stage:state.stage,passed:state.validation_passed===true,attempts:state.attempts.map(a=>a.workflow)}),
    createProvider:()=>({generate:async request=>{
      const b=request.ai_context_bundle,out=generationFixture(curriculum);
      if(request.workflow==="annual_plan"){out.proposals[0].opportunities[0].competency_id="INVALID";return{output:out};}
      if(request.workflow==="annual_journey_review")return{output:{issues:[]}};
      return{output:{replacements:[{...out.proposals[0],proposal_id:b.affected_proposal_ids[0],change_reason:"Corregir ID"}],
        everyday_opportunities:b.plan.everyday_opportunities,evidence_interpretations:[]}};
    }})});
  const repairing=stages.find(s=>s.attempts.at(-1)==="annual_journey_repair");
  assert.equal(repairing.stage,"validation");assert.equal(repairing.passed,false);
  assert.ok(stages.some(s=>s.stage==="review"&&s.passed));
});

test("job moderno: recuperación, exclusión concurrente y permisos sin revisión IA rutinaria",async()=>{
  const db=new PGlite();
  try {
    for(const f of (await readdir(new URL("../../local-db/migrations/",import.meta.url))).filter(f=>f.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(`../../local-db/migrations/${f}`,import.meta.url),"utf8"));
    const teacherId=randomUUID(),created=await createPilotClassroom(db,teacherId,{teacherName:"QA recuperación",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    const context={id:created.classroomId,school_year_id:created.schoolYearId,curriculum_version_id:(await db.query("select id from curriculum_versions limit 1")).rows[0].id,
      year:2026,age:5,available_resources:[],calendar:{initial_stage:defaultInitialStage()}};
    let generations=0,redundantCalls=0,release;
    const blocked=new Promise(resolve=>{release=resolve;});let generating;
    const reachedGeneration=new Promise(resolve=>{generating=resolve;});
    const route=async(path,body,user=teacherId)=>{
      let result;
      await handleAnnualJourneyRoutes({request:{method:body===undefined?"GET":"POST"},response:{},url:new URL(`http://localhost/api/annual-journey/${path}`),
        db,teacherId:user,readJson:async()=>body,send:(_r,status,data)=>{result={status,data};},annualPlanningContext:async()=>context,annualDocumentContext:()=>({teacher_name:"QA"}),
        createProvider:()=>({generate:async request=>{
          if(request.workflow==="annual_plan"){
            generations++;if(generations===1){generating();await blocked;throw Object.assign(new Error("simulated"),{name:"OpenAIProviderError"});}
            return{output:generationFixture(request.ai_context_bundle.curriculum.competency_cards)};
          }
          redundantCalls++;throw new Error("No debe invocarse una revisión rutinaria");
        }})});return result;
    };
    const start=await route("start");assert.equal(start.status,200);
    const coverage=await route("coverage");assert.equal(coverage.status,200);assert.deepEqual(coverage.data.counts,{});assert.equal(coverage.data.observed_students,0);
    const prepared=await route("prepare",{teacherIdeas:"Quiero priorizar Indaga y Crea\nColecta navideña",sourceFingerprint:start.data.snapshot.source_fingerprint});
    assert.equal(prepared.status,202,JSON.stringify(prepared.data));assert.equal(generations,0);
    const id=prepared.data.id;
    const intent=(await db.query("select payload from ai_pending_generations where id=$1",[id])).rows[0].payload;
    assert.match(intent.safeIdeas,/Indaga y Crea/);
    const running=route(`jobs/${id}/run`,{});await reachedGeneration;
    const progress=await route(`jobs/${id}`);assert.equal(progress.data.stage,"generation");
    assert.deepEqual(progress.data.completed_stages,["sources","calendar"]);
    assert.ok(!JSON.stringify(progress.data).includes("snapshot"));
    assert.equal((await route(`jobs/${id}/run`,{})).status,409);assert.equal(generations,1);
    assert.equal((await route(`jobs/${id}`,undefined,randomUUID())).status,404);
    release();assert.equal((await running).status,503);
    const failed=await route(`jobs/${id}`);assert.equal(failed.data.status,"failed");
    assert.equal(failed.data.calls_attempted,1);assert.equal(failed.data.calls_completed,0);
    assert.equal((await route(`jobs/${id}/run`,{})).status,202);
    assert.equal((await route(`jobs/${id}/run`,{})).status,201);
    assert.equal(generations,2);assert.equal(redundantCalls,0);
    const saved=(await db.query("select proposal,revision from annual_plans where id=$1",[prepared.data.draft_id])).rows[0];
    assert.equal(saved.proposal.teacher_idea_messages.length,2);assert.equal(saved.proposal.resolved_calendar.integrity.assigned,172);
    const confirmed=await route(`${prepared.data.draft_id}/confirm`,{expectedRevision:Number(saved.revision)});assert.equal(confirmed.status,200,JSON.stringify(confirmed.data));
    assert.equal((await route(`jobs/${id}/run`,{})).status,200);assert.equal(generations,2);
    await route("start");await route(`jobs/${id}`);assert.equal(redundantCalls,0);
    const newPreparation=await route("prepare",{teacherIdeas:"Nueva revisión",sourceFingerprint:start.data.snapshot.source_fingerprint});
    assert.equal(newPreparation.status,202);
    await db.query("update annual_plans set proposal=proposal || '{\"teacher_preferences\":\"Otra edición\"}'::jsonb where id=$1",[newPreparation.data.draft_id]);
    assert.equal((await route(`jobs/${newPreparation.data.id}/run`,{})).status,409);
    assert.equal((await route(`jobs/${newPreparation.data.id}`)).data.status,"failed");assert.equal(generations,2);
    assert.equal(publicJourneyJob(id,{status:"running",lease_until:"2026-01-01",completed_stages:[],stage:"review",checkpoint:{}},Date.now()).status,"interrupted");
  } finally {await db.close();}
});
