import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePreparationRoutes} from '../preparation-routes.mjs';
import {withPedagogicalClock} from '../../src/lib/pedagogical-clock.mjs';

test('preparar confirma los materiales de la propuesta sin casilla adicional',async()=>{
 const proposal={proposal_id:'proposal',planned_start_date:'2026-03-30',planned_end_date:'2026-04-10',instructional_dates:['2026-03-30'],materials:['Macetas, acceso por confirmar'],primary_competency_ids:['CYT_INDAGA','COM_ORAL'],opportunities:[{competency_id:'CYT_INDAGA'},{competency_id:'COM_ORAL'}]};
 const plan={id:'plan',status:'active',revision:3,proposal:{experience_context:{},proposed_experiences:[proposal],curriculum_reference:[]}};
 const before=JSON.stringify(plan);let response,resourceReceipt,queued=0;
 await withPedagogicalClock({date:'2026-03-16',time:'08:00'},()=>handlePreparationRoutes({request:{method:'POST'},response:{},url:new URL('http://localhost/api/preparation/projects/complete'),teacherId:'teacher',
  db:{query:async(sql,params)=>{
   if(sql.startsWith('select ap.*'))return{rows:[plan]};
   if(sql.startsWith('select 1 from classrooms'))return{rows:[{id:'classroom'}]};
   if(sql.startsWith('update learning_experiences')){resourceReceipt=JSON.parse(params[0]);return{rows:[]};}
   if(sql.startsWith('insert into preparation_jobs_v2')){queued++;return{rows:[{id:params[0],kind:'project',status:'queued',payload:JSON.parse(params[7])}]};}
   if(sql.startsWith('select'))return{rows:[]};
   throw Error('Unexpected SQL: '+sql);
  }},
  annualPlanningContext:async()=>({id:'classroom'}),readJson:async()=>({annualPlanId:'plan',expectedRevision:3,proposalId:'proposal',accepted:true,selectedDates:['2026-03-30']}),
  projectFlowSource:async()=>({plan,slot:{ends_on:'2026-04-10'},dates:proposal.instructional_dates}),
  domainRequest:async(_job,path)=>{if(path==='/api/project-flow/start')return{experience:{id:'project',status:'draft',details:{}}};return{};},
  send:(_r,status,body)=>{response={status,body};}}));
 assert.equal(response.status,202,JSON.stringify(response));assert.equal(queued,1);
 assert.equal(resourceReceipt.confirmed_by,'teacher');assert.equal(resourceReceipt.confirmation_source,'project_preparation');
 assert.deepEqual(resourceReceipt.resources,proposal.materials);assert.equal(JSON.stringify(plan),before);
});

test('invalid project dates cannot confirm a draft year or start its preparation',async()=>{
 const proposal={proposal_id:'proposal',planned_start_date:'2026-03-30',planned_end_date:'2026-04-10',
  instructional_dates:['2026-03-30','2026-03-31','2026-04-01','2026-04-06'],materials:['Papel'],
  primary_competency_ids:['CYT_INDAGA','COM_ORAL'],opportunities:[{competency_id:'CYT_INDAGA'},{competency_id:'COM_ORAL'}]};
 const plan={id:'plan',status:'draft',revision:3,proposal:{proposed_experiences:[proposal],curriculum_reference:[]}};
 for(const selectedDates of [['2026-04-02'],['2026-04-04'],['2026-04-20']]){
  let receipt,mutations=0;
  const db={query:async sql=>{
   if(sql.startsWith('select ap.*'))return {rows:[plan]};
   if(sql.includes('from preparation_jobs_v2'))return {rows:[]};
   throw Error('Calendar validation must precede further preparation work');
  }};
  await withPedagogicalClock({date:'2026-03-16',time:'08:00'},()=>handlePreparationRoutes({
   request:{method:'POST'},response:{},url:new URL('http://localhost/api/preparation/projects/complete'),db,teacherId:'teacher',
   annualPlanningContext:async()=>({id:'classroom'}),readJson:async()=>({annualPlanId:'plan',expectedRevision:3,proposalId:'proposal',accepted:true,selectedDates}),
   domainRequest:async()=>{mutations++;},send:(_response,status,body)=>{receipt={status,body};},
  }));
  assert.equal(receipt.status,409);assert.match(receipt.body.error,/días de clase disponibles/);assert.equal(mutations,0);assert.equal(plan.status,'draft');
 }
});
