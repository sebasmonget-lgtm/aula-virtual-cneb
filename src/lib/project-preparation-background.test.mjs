import test from 'node:test';
import assert from 'node:assert/strict';
import {preparationExecutor} from './preparation-executor.mjs';

test('el ejecutor conserva el Master pendiente, su etapa y respuesta antes de continuar',async()=>{
 const id='66001804-0000-4000-8000-000000000001',proposal='66001804-0000-4000-8000-000000000002';
 const job={id:'job',kind:'project',source_id:'year',source_revision:1,classroom_id:'classroom',payload:{project_id:id,proposal_id:proposal,stage:'master',additional_context:''}};
 const plan={revision:1,proposal:{proposed_experiences:[{proposal_id:proposal,purpose:'Propósito',rationale:'Contexto',primary_competency_ids:['MAT_CANTIDAD','PS_CONVIVE']}]}};
 const row={id,status:'draft',revision:3,details:{decisions:{additional_context:''},dependents:{}}};
 let calls=0;const snapshots=[];
 const execute=preparationExecutor({db:{query:async()=>({rows:[plan]})},request:async(_job,path,_body,_method,extra)=>{
  if(path===`/api/project-flow/${id}`)return {experience:row};
  assert.equal(path,`/api/project-flow/${id}/master`);calls++;
  assert.ok(extra.masterExecution);
  if(calls===1){await extra.masterExecution.save({provider_responses:{master:'resp_known'}});return {generation_pending:true};}
  assert.equal(extra.masterExecution.checkpoint.provider_responses.master,'resp_known');return {experience:row};
 }});
 const checkpoint=async p=>{job.payload=structuredClone(p);snapshots.push(structuredClone(p));};
 assert.equal(await execute(job,checkpoint),false);
 assert.equal(job.payload.stage,'master');assert.equal(job.payload.attempt_pending,false);
 assert.equal(job.payload.project_provider_checkpoint.provider_responses.master,'resp_known');
 assert.ok(Date.parse(job.payload.provider_poll_after)>Date.now());
 // Advance only the fixture's wait; production uses the bounded five-second delay.
 job.payload.provider_poll_after='2000-01-01T00:00:00Z';
 assert.equal(await execute(job,checkpoint),true);
 assert.equal(job.payload.stage,'ready');assert.equal(calls,2);
 assert.ok(snapshots.some(p=>p.attempt_pending&&p.project_provider_checkpoint?.provider_responses.master==='resp_known'));
});

test('un conflicto de fuente no se presenta como espera del proveedor',async()=>{
 const job={kind:'activity_block',source_id:'project',source_revision:1,input_fingerprint:'bad',payload:{attempt_pending:true,items:[]}};
 let calls=0;
 const execute=preparationExecutor({db:{query:async()=>({rows:[]})},request:async()=>{calls++;}});
 await assert.rejects(()=>execute(job,async()=>{}),e=>e.name==='VersionConflictError');assert.equal(calls,0);
});
