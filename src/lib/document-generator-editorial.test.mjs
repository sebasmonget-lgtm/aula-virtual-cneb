import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {chooseAyniProductMode} from './ayni-product-mode.mjs';
import {createMultiAgeClassroom} from './multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,validateMultiAgeAnnualProposal} from './multi-age-annual.mjs';
import {proposeLocalMultiAgeAnnual,DOCUMENT_GENERATOR_ANNUAL_SCHEMA,MULTI_AGE_ANNUAL_SCHEMA} from './multi-age-planning-generation.mjs';
import {generatorProjectDetail} from '../features/dashboard/components/generator-project-detail.ts';
import {multiAgePlanningDocumentSections} from './multi-age-planning-word.mjs';

test('las nuevas propuestas separan propósito, contexto y apoyos; las guardadas conservan su contrato y lectura',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb(),teacher=randomUUID(),request={teacherConfirmed:true,clientRequestId:randomUUID()};
 try{
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const {classroomId}=await createMultiAgeClassroom(db,teacher,{...request,teacherName:'Docente QA',institutionName:'Jardín QA',section:'QA',ages:[3,4,5],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  const data=await multiAgeAnnualContext(db,teacher,classroomId),legacy=sampleMultiAgeAnnualProposal(data),before=JSON.stringify(legacy);
  validateMultiAgeAnnualProposal(legacy,data);
  const old=legacy.proposals[0],slot=data.calendar.projects[0],oldView=generatorProjectDetail(old,slot,'Bimestre 1');
  assert.equal(oldView.rationale,old.one_teacher_organization);assert.equal(oldView.summary,undefined);
  assert.equal(oldView.children_actions[0],`3 años: ${old.opportunities.find(o=>o.age===3).child_action}`);
  assert.ok(oldView.opportunities.every(o=>o.supports===old.one_teacher_organization));
  const proposal=structuredClone(legacy);
  for(const row of proposal.proposals){row.summary='Una invitación breve al juego compartido.';row.rationale='Los sectores disponibles permiten explorar elecciones en grupo.';for(const o of row.opportunities)o.supports=`Ofrecer opciones de participación para ${o.age} años en ${o.competency_id}.`;}
  assert.equal(validateMultiAgeAnnualProposal(proposal,data),proposal);
  const broader=structuredClone(proposal),first=broader.proposals[0],existingIds=new Set(first.opportunities.map(o=>o.competency_id));
  const third=proposal.proposals.flatMap(r=>r.opportunities).find(o=>!existingIds.has(o.competency_id)).competency_id;
  for(const age of [3,4,5])first.opportunities.push(structuredClone(proposal.proposals.flatMap(r=>r.opportunities).find(o=>o.age===age&&o.competency_id===third)));
  validateMultiAgeAnnualProposal(broader,data);
  assert.equal(new Set(first.opportunities.map(o=>o.competency_id)).size,3,'Dos es un mínimo de producto, nunca un techo para los proyectos.');
  const broaderView=generatorProjectDetail(first,slot,'Bimestre 1');
  for(const opportunity of first.opportunities)assert.ok(broaderView.children_actions.find(s=>s.startsWith(`${opportunity.age} años:`)).includes(opportunity.child_action));
  const view=generatorProjectDetail(proposal.proposals[0],slot,'Bimestre 1');
  assert.equal(view.summary,proposal.proposals[0].summary);assert.equal(view.rationale,proposal.proposals[0].rationale);
  for(const o of proposal.proposals[0].opportunities)assert.ok(view.children_actions.find(s=>s.startsWith(`${o.age} años:`)).includes(o.child_action),'El resumen conserva acciones de ambas competencias.');
  for(const o of view.opportunities)assert.ok(o.supports.includes(proposal.proposals[0].opportunities.find(p=>p.competency_id===o.competency_id).supports));
  const missing=structuredClone(proposal);delete missing.proposals[0].rationale;assert.throws(()=>validateMultiAgeAnnualProposal(missing,data));
  const developed=structuredClone(proposal);developed.proposals[0].rationale='Al compartir los materiales pueden surgir distintas elecciones. '.repeat(13).trim();validateMultiAgeAnnualProposal(developed,data);
  assert.ok(developed.proposals[0].rationale.length>700,'La situación puede desarrollarse más allá del antiguo límite.');
  assert.equal(DOCUMENT_GENERATOR_ANNUAL_SCHEMA.properties.proposals.items.properties.rationale.maxLength,1000);
  const noSupport=structuredClone(proposal);delete noSupport.proposals[0].opportunities[0].supports;assert.throws(()=>validateMultiAgeAnnualProposal(noSupport,data));
  const oneCompetency=structuredClone(proposal);oneCompetency.proposals[0].opportunities=oneCompetency.proposals[0].opportunities.filter(o=>o.competency_id===oneCompetency.proposals[0].opportunities[0].competency_id);assert.throws(()=>validateMultiAgeAnnualProposal(oneCompetency,data),/dos competencias/);
  const mixed=structuredClone(proposal);mixed.proposals[0]=structuredClone(old);validateMultiAgeAnnualProposal(mixed,data);
  assert.equal(JSON.stringify(legacy),before,'Leer/adaptar no cambia la propuesta anterior.');
  const reviewed=await proposeLocalMultiAgeAnnual(db,teacher,classroomId,{provider:{generate:async request=>{assert.equal(request.output_schema.id,DOCUMENT_GENERATOR_ANNUAL_SCHEMA.id+'-protected-v26');assert.ok(request.output_schema.properties.proposals.items.required.includes('summary'));assert.equal(request.ai_context_bundle.annual_distribution_brief.schedule.length,15);return {output:proposal};}}});
  assert.equal(reviewed.distributionReview.projectCount,15);
  assert.ok(!MULTI_AGE_ANNUAL_SCHEMA.properties.proposals.items.required.includes('summary'),'El contrato diario permanece separado.');
 }finally{await db.close();}
});

test('el documento anual conserva los nuevos apoyos sin duplicar la organización en cada competencia',()=>{
 const row={slot_id:'slot',title:'Juego compartido',summary:'Resumen breve.',rationale:'Contexto concreto.',purpose:'Propósito integrado.',common_invitation:'Invitación abierta.',one_teacher_organization:'Organización compartida.',opportunities:[{age:3,competency_id:'PS_IDENTIDAD',child_action:'Elegir un juego.',mediation:'Escuchar su elección.',observation:'Cómo expresa su preferencia.',supports:'Presentar dos opciones.',official_performance_refs:[]}]};
 const sections=multiAgePlanningDocumentSections({contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,status:'active',version:1,confirmedAt:'2026-10-25',kind:'annual_plan',sourceSnapshot:{students:[]},identity:{ages:[3],school_year:2026},curriculumSnapshot:{ages:[3]},curriculumReference:[],content:{title:'Año QA',organization:'Organización anual.',proposals:[row],everyday_opportunities:[]},calendar:{projects:[{slot_id:'slot',starts_on:'2026-03-30',ends_on:'2026-04-10',instructional_dates:['2026-03-30']}],initial_stage:{name:'Inicio',starts_on:'2026-03-02',ends_on:'2026-03-27',purpose:'Acogida',what_to_observe:[]}}});
 const text=JSON.stringify(sections);assert.ok(text.includes(row.rationale));assert.ok(text.includes(row.opportunities[0].supports));assert.equal(text.split(row.one_teacher_organization).length-1,1);
});
