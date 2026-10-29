import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {makeMultiAgeYearFixture,institutional2027} from './fixtures/multi-age-year-fixture.mjs';
import {startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client} from './fixtures/multi-age-http-fixture.mjs';
const p='/api/multi-age',confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()}),xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
test('API transición anual: reinicios, Word/Excel históricos y aula siguiente con niños de 3/4/5 sin evidencia trasladada',{timeout:150000},async()=>{
 const storeName='year-transition-'+randomUUID(),f=await makeMultiAgeYearFixture({storeName});await f.db.close();let app=await start(storeName),c=client(app);
 const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer());};
 try{
  const before=await c.get(p+'/state'),context=await c.get(p+'/years/transition?classroomId='+f.classroom.classroomId),old=[];
  for(const d of before.documents.filter(d=>d.exportReady)){const path=`/documents/${d.kind}/${d.id}.docx`;old.push({path,xml:await xml(await download(path))});}
  for(const r of before.workspace.reports){const path=`/reports/${r.id}.docx`;old.push({path,xml:await xml(await download(path))});}
  const oldExcel=await download(`/periods/closures/${context.periods[0].closureVersionId}.xlsx`);
  const request={...confirm(),historyAcknowledged:true,classroomId:f.classroom.classroomId,sourceFingerprint:context.sourceFingerprint,reason:'Confirmar la continuidad ficticia del nuevo año sin trasladar evidencias.',nextClassroom:{ages:[3,4,5],section:'Semillas siguiente año',institutionName:'Jardín ficticio',year:2027,startsOn:'2027-03-01',endsOn:'2027-12-31',calendarPolicy:'institutional',calendar:institutional2027()},students:f.children.map(child=>child.age===5?{studentId:child.studentId,action:'leave'}:{studentId:child.studentId,action:'continue',age:child.age+1})};
  const result=await c.post(p+'/years/transition',request);await stop(app);app=await start(storeName);c=client(app);assert.equal((await c.post(p+'/years/transition',request)).replayed,true);
  const empty=await c.get(p+'/state');assert.equal(empty.workspace.classroom.year,2027);assert.equal(empty.documents.length,0);assert.equal(empty.workspace.pairs.length,0);assert.equal(empty.diagnostic.ready,false);assert.ok(empty.diagnostic.students.every(s=>!s.review&&!s.family&&!s.observations.length));
  await c.post(p+'/enroll',{...confirm(),classroomId:result.classroomId,expectedRevision:1,firstName:'Nueva niña',lastName:'Ficticia',age:3,enrolledOn:'2027-03-15'});
  const enrolled=await c.get(p+'/state');assert.deepEqual(enrolled.workspace.students.map(s=>s.age),[3,4,5]);
  for(const child of enrolled.diagnostic.students)await c.post(p+'/diagnostic/review',{...confirm(),studentId:child.id,sourceFingerprint:child.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]});
  let state=await c.get(p+'/state');const draft=await c.post(p+'/annual/draft',{...confirm(),classroomId:result.classroomId,sourceFingerprint:state.planning.sourceFingerprint,proposal:state.planning.exampleProposal});
  state=await c.get(p+'/state');const plan=state.planning.plans.find(plan=>plan.id===draft.planId);await c.post(p+'/annual/confirm',{...confirm(),classroomId:result.classroomId,planId:plan.id,expectedRevision:plan.revision,sourceFingerprint:state.planning.sourceFingerprint});
  state=await c.get(p+'/state');const active=state.planning.plans.find(plan=>plan.status==='active'),slot=state.planning.calendar.projects[0],proposal=active.proposal.proposals[0];
  const blueprint={title:'Primer juego compartido del año nuevo',purpose:proposal.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:proposal.common_invitation,development:proposal.one_teacher_organization,closure:'Invitar a compartir sin atribuir logros ni obligar a hablar.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:[3,4,5].map(age=>{const own=proposal.opportunities.find(o=>o.age===age&&o.competency_id==='COM_ORAL');return {curricular_age:age,criterion_text:own.child_action,expected_evidence:own.observation,observation_moments:['development'],official_performance_refs:own.official_performance_refs};})}]};
  await c.post(p+'/activity',{...confirm(),classroomId:result.classroomId,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot.slot_id,blueprint});
  await stop(app);app=await start(storeName);c=client(app);const final=await c.get(p+'/state');assert.equal(final.workspace.activities.length,1);assert.deepEqual(final.workspace.criteria.map(k=>k.curricular_age),[3,4,5]);assert.equal(final.workspace.pairs.length,0);
  const history=await c.get(p+'/years/history');assert.equal(history.years.length,1);assert.equal(history.years[0].closures.length,4);
  for(const d of old)assert.equal(await xml(await download(d.path)),d.xml);
  const original=await JSZip.loadAsync(oldExcel),current=await JSZip.loadAsync(await download(`/periods/closures/${context.periods[0].closureVersionId}.xlsx`));assert.equal(await original.file('xl/worksheets/sheet1.xml').async('string'),await current.file('xl/worksheets/sheet1.xml').async('string'));
  assert.equal((await c.get(p+'/generation?classroomId='+result.classroomId)).jobs.length,0);
  const directory=new URL('../.local/multi-age-main-20261023/transicion-anual/',import.meta.url);await mkdir(directory,{recursive:true});await writeFile(new URL('state.json',directory),JSON.stringify(final,null,2));await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,previousYear:2026,year:2027,ages:[3,4,5],closuresPreserved:4,originalWordsUnchanged:old.length,originalExcelUnchanged:true,sourceCopies:0,restarts:2,aiCalls:0,remoteWrites:0},null,2));
 }finally{await stop(app);}
});
