import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePreparationRoutes} from '../preparation-routes.mjs';
import {withPedagogicalClock} from '../../src/lib/pedagogical-clock.mjs';

test('la preparación no confirma el año ni llama a IA cuando un recurso sigue sin confirmar',async()=>{
 const proposal={proposal_id:'proposal',planned_start_date:'2026-03-30',planned_end_date:'2026-04-10',instructional_dates:['2026-03-30'],materials:['Macetas, acceso por confirmar'],primary_competency_ids:['CYT_INDAGA','COM_ORAL'],opportunities:[{competency_id:'CYT_INDAGA'},{competency_id:'COM_ORAL'}]};
 const plan={id:'plan',status:'draft',revision:3,proposal:{proposed_experiences:[proposal],curriculum_reference:[]}};let receipt,mutations=0;
 await withPedagogicalClock({date:'2026-03-16',time:'08:00'},()=>handlePreparationRoutes({request:{method:'POST'},response:{},url:new URL('http://localhost/api/preparation/projects/complete'),teacherId:'teacher',
  db:{query:async sql=>{if(sql.startsWith('select ap.*'))return{rows:[plan]};if(sql.includes('from preparation_jobs_v2'))return{rows:[]};throw Error('No se debe escribir antes de confirmar los recursos');}},
  annualPlanningContext:async()=>({id:'classroom'}),readJson:async()=>({annualPlanId:'plan',expectedRevision:3,proposalId:'proposal',accepted:true,selectedDates:['2026-03-30']}),
  domainRequest:async()=>{mutations++;},send:(_r,status,body)=>{receipt={status,body};}}));
 assert.equal(receipt.status,422);assert.match(receipt.body.error,/Confirma.*recursos/);assert.equal(mutations,0);assert.equal(plan.status,'draft');
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
