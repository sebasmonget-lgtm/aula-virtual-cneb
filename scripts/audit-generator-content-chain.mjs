// Replays already-paid synthetic responses through the real writers; zero network/AI calls.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {openMultiAgeLocalDb} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,validateMultiAgeAnnualProposal} from '../src/lib/multi-age-annual.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {loadMultiAgeDocument} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';

const source=process.argv.find(a=>a.startsWith('--source-root='))?.slice(14);
if(!/^[a-z0-9-]{1,60}$/.test(source??''))throw new TypeError('Selecciona una carpeta de resultados ficticios.');
const directory=`output/generador-documentos/${source}`;
const annualResult=JSON.parse(await readFile(`${directory}/round-01/result.json`,'utf8'));
const generated=JSON.parse(await readFile(`${directory}/round-02/result.json`,'utf8'));
const db=await openMultiAgeLocalDb(),teacher=randomUUID(),conf=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const c=await createMultiAgeClassroom(db,teacher,{...conf(),teacherName:'Docente ficticia QA',institutionName:'Jardín ficticio QA',section:'Prueba editorial',ages:[3,4,5],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
 for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age});
 const data=await multiAgeAnnualContext(db,teacher,c.classroomId),proposal=sampleMultiAgeAnnualProposal(data);
 proposal.title='Muestra QA de estructura anual con tres propuestas de IA';proposal.organization=annualResult.output.organization;
 proposal.proposals.splice(0,3,...annualResult.output.proposals);validateMultiAgeAnnualProposal(proposal,data);
 const draft=await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId:c.classroomId,sourceFingerprint:data.sourceFingerprint,proposal});
 await confirmMultiAgeAnnualPlan(db,teacher,{...conf(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
 const row=proposal.proposals[0],slot=data.calendar.projects[0],input={classroomId:c.classroomId,annualPlanId:draft.planId,annualSlotId:row.slot_id,competencyIds:[...new Set(row.opportunities.map(o=>o.competency_id))],occursOn:slot.instructional_dates[0]};
 const job=await enqueueMultiAgeGeneration(db,teacher,{kind:'activity',...input},{mode:'fixture'});
 await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>({generate:async()=>({output:{...generated.proposal,projectPlanning:generated.projectPlanning}})})});
 const ready=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(ready.status,'ready');
 const saved=await confirmMultiAgeActivity(db,teacher,{...conf(),...input,expectedRevision:1,generationJobId:job.id,blueprint:ready.result.proposal});
 const docs=[];
 for(const [kind,id,name]of [['annual_plan',draft.planId,'qa-plan-anual.docx'],['project',saved.projectId,'qa-proyecto.docx'],['activity',saved.activityId,'qa-actividad.docx']]){
  const doc=await loadMultiAgeDocument(db,teacher,kind,id),before=JSON.stringify(doc),bytes=await renderMultiAgePlanningWord(doc);
  const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
  const plain=xml.replace(/<[^>]+>/g,'').replaceAll('&amp;','&');
  assert.doesNotMatch(xml,/\{\{|\[object Object\]|undefined/);assert.equal(JSON.stringify(doc),before);
  if(kind==='annual_plan')for(const p of annualResult.output.proposals){assert.ok(plain.includes(p.rationale));assert.equal(plain.split(p.common_invitation).length-1,1,'La invitación se explica una vez por proyecto.');for(const o of p.opportunities)assert.ok(plain.includes(o.child_action));}
  if(kind==='project'){
   assert.equal(doc.content.meaningfulSituation,generated.projectPlanning.meaningfulSituation);
   assert.deepEqual(doc.content.commonSequence,generated.projectPlanning.commonSequence);
   assert.ok(plain.includes(doc.content.meaningfulSituation));assert.notDeepEqual(doc.content.commonSequence,generated.proposal.commonSequence);
   for(const support of doc.content.annualContext.supports)assert.equal(plain.split(support).length-1,1,'Los apoyos no se repiten entre preplanificación y enfoques.');
  }
  if(kind==='activity'){assert.deepEqual(doc.content.commonSequence,generated.proposal.commonSequence);assert.equal(doc.content.criteriaFamilies.length,2);}
  for(const f of doc.content.criteriaFamilies??[])assert.deepEqual(f.variants.map(v=>v.curricular_age).sort(),[3,4,5]);
  await writeFile(`${directory}/${name}`,bytes);await writeFile(`${directory}/${kind}.json`,JSON.stringify(doc,null,2));docs.push({name,kind,bytes:bytes.length});
 }
 assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from competency_assessments')).rows[0].n,0);
 await writeFile(`${directory}/chain-audit.json`,JSON.stringify({syntheticOnly:true,aiCalls:0,documents:docs,annualRealSamples:3,annualOtherSlots:'fictitious fixtures for structure only',projectSeparateFromFirstActivity:true,emptyAssessments:true},null,2));
 console.log(JSON.stringify({documents:docs,projectSeparateFromFirstActivity:true,emptyAssessments:true}));
}finally{await db.close();}
