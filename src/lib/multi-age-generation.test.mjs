import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { createMultiAgeClassroom } from './multi-age-local-service.mjs';
import { proposeLocalMultiAgeBlueprint } from './multi-age-generation.mjs';
import { sampleMultiAgeBlueprint } from '../../scripts/fixtures/multi-age-local-fixture.mjs';
import { resolveAIExecutionPlan } from './ai-execution-router-v4.mjs';

test('adaptador de prompts simulado conserva edades, referentes, router y revisión docente',{timeout:90000},async t=>{
  const db=await openMultiAgeLocalDb(),teacher=randomUUID();
  try{
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia')",[teacher]);
    const c=await createMultiAgeClassroom(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,ages:[3,4,5],section:'Contexto',institutionName:'Jardín ficticio',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
    const input={classroomId:c.classroomId,competencyIds:['COM_ORAL'],occursOn:'2026-10-22'};
    await t.test('una llamada simulada recibe las tres edades y el plan vigente sin guardar una propuesta',async()=>{
      let calls=0;
      const provider={generate:async request=>{calls++;assert.ok(Object.isFrozen(request));assert.deepEqual(request.ai_context_bundle.curriculum.map(c=>c.age),[3,4,5]);
        assert.equal(request.execution_plan.model,resolveAIExecutionPlan({workflow:'project_master',task:'generation'}).model);
        assert.ok(request.skill_instructions.includes('sin copiar otra edad'));return {output:sampleMultiAgeBlueprint(),provider_metadata:{provider:'simulated'}};}};
      const result=await proposeLocalMultiAgeBlueprint(db,teacher,input,{provider});assert.equal(calls,1);assert.equal(result.teacherConfirmed,false);
      assert.equal((await db.query('select count(*)::int n from activities a join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1',[c.classroomId])).rows[0].n,0);
    });
    await t.test('no hay proveedor implícito, reparación a ciegas ni publicación de edades cruzadas',async()=>{
      await assert.rejects(proposeLocalMultiAgeBlueprint(db,teacher,input),/explícito/);
      const wrong=sampleMultiAgeBlueprint();wrong.criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.5.03'];
      let calls=0;await assert.rejects(proposeLocalMultiAgeBlueprint(db,teacher,input,{provider:{generate:async()=>{calls++;return {output:wrong};}}}),/edad/);assert.equal(calls,1);
      const missing=sampleMultiAgeBlueprint();missing.participantAges=[3,4];missing.criteriaFamilies[0].variants.pop();
      await assert.rejects(proposeLocalMultiAgeBlueprint(db,teacher,input,{provider:{generate:async()=>({output:missing})}}),/grupos/);
      assert.equal((await db.query('select count(*)::int n from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1',[c.classroomId])).rows[0].n,0);
    });
  }finally{await db.close();}
});
