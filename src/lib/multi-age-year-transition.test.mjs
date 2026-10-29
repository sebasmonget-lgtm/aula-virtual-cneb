import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeMultiAgeYearFixture,institutional2027} from '../../scripts/fixtures/multi-age-year-fixture.mjs';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {multiAgeYearTransitionContext,confirmMultiAgeYearTransition,multiAgeYearHistory} from './multi-age-year-transition.mjs';
import {multiAgeLocalWorkspace} from './multi-age-local-service.mjs';
import {multiAgeDiagnosticWorkspace} from './multi-age-diagnostic.mjs';
import {multiAgeAnnualWorkspace} from './multi-age-annual.mjs';
import {loadMultiAgeDocument,listMultiAgeDocuments} from './multi-age-document-service.mjs';
import {loadMultiAgePeriodClosure} from './multi-age-period.mjs';
const input=(f,context)=>({teacherConfirmed:true,historyAcknowledged:true,clientRequestId:randomUUID(),classroomId:f.classroom.classroomId,sourceFingerprint:context.sourceFingerprint,reason:'Abrir el nuevo año ficticio conservando todas las fuentes del anterior.',nextClassroom:{ages:[3,4,5],section:'Semillas 2027',institutionName:'Jardín ficticio',year:2027,startsOn:'2027-03-01',endsOn:'2027-12-31',calendarPolicy:'institutional',calendar:institutional2027()},students:f.children.map(child=>child.age===5?{studentId:child.studentId,action:'leave'}:{studentId:child.studentId,action:'continue',age:child.age+1})});
for(const schema of ['local','supabase'])test(`Transición ${schema}: cuatro cierres → revisión por niño → año nuevo sin fuentes copiadas e historial conservado`,{timeout:180000},async()=>{
 const f=await makeMultiAgeYearFixture({schema}),{db,teacher}=f;try{

  const base=await multiAgeYearTransitionContext(db,teacher,f.classroom.classroomId);assert.equal(base.ready,true);assert.equal(base.periods.length,4);
  const interruptedId=randomUUID();await db.query(`insert into multi_age_generation_jobs(id,teacher_id,classroom_id,kind,input,input_fingerprint,source_fingerprint,provider_mode,status) values($1,$2,$3,'annual',$4::jsonb,$5,'synthetic-year-source','fixture','queued')`,[interruptedId,teacher,f.classroom.classroomId,JSON.stringify({classroomId:f.classroom.classroomId}),randomUUID()]);
  const busy=await multiAgeYearTransitionContext(db,teacher,f.classroom.classroomId);assert.equal(busy.ready,false);await assert.rejects(confirmMultiAgeYearTransition(db,teacher,input(f,busy)),/preparaciones pendientes/);
  await db.query("update multi_age_generation_jobs set status='interrupted' where id=$1",[interruptedId]);
  const context=await multiAgeYearTransitionContext(db,teacher,f.classroom.classroomId);assert.equal(context.ready,true);assert.equal(context.interruptedJobs,1);
  const documents=(await listMultiAgeDocuments(db,teacher,{classroomId:f.classroom.classroomId})).filter(d=>d.exportReady),saved=[];for(const d of documents)saved.push(await loadMultiAgeDocument(db,teacher,d.kind,d.id));const before=(await db.query('select id,to_jsonb(s) as data from students s order by id')).rows;

  const request={...input(f,context),discardInterruptedPreparations:true};await assert.rejects(confirmMultiAgeYearTransition(db,teacher,{...request,discardInterruptedPreparations:false}),/interrumpidas/);await assert.rejects(confirmMultiAgeYearTransition(db,teacher,{...request,sourceFingerprint:'obsoleto'}),/Cambió/);
  await assert.rejects(confirmMultiAgeYearTransition(db,f.other,request),/no está disponible/);
  const missing=structuredClone(request);missing.students.pop();await assert.rejects(confirmMultiAgeYearTransition(db,teacher,missing),/cada niño/);
  const foreign=structuredClone(request);foreign.students[0].studentId=randomUUID();await assert.rejects(confirmMultiAgeYearTransition(db,teacher,foreign),/Revisa/);
  const invalid=structuredClone(request);invalid.nextClassroom.calendar.periods[0].startsOn='2027-03-16';await assert.rejects(confirmMultiAgeYearTransition(db,teacher,invalid),/calendario/);
  assert.equal((await db.query('select status from classrooms where id=$1',[f.classroom.classroomId])).rows[0].status,'active');

  const result=await confirmMultiAgeYearTransition(db,teacher,request);assert.equal((await confirmMultiAgeYearTransition(db,teacher,request)).replayed,true);assert.equal(result.lineage.length,3);assert.equal(result.lineage.filter(l=>l.action==='continue').length,2);
  assert.equal((await db.query('select status from multi_age_generation_jobs where id=$1',[interruptedId])).rows[0].status,'stale');
  const next=await multiAgeLocalWorkspace(db,teacher,result.classroomId);assert.equal(next.classroom.year,2027);assert.deepEqual(next.students.map(s=>s.age),[4,5]);assert.equal(next.activities.length,0);assert.equal(next.pairs.length,0);assert.equal(next.reports.length,0);
  assert.ok(next.students.every(s=>!f.children.some(c=>c.studentId===s.id)));assert.equal((await listMultiAgeDocuments(db,teacher,{classroomId:result.classroomId})).length,0);
  const diagnostic=await multiAgeDiagnosticWorkspace(db,teacher,result.classroomId);assert.equal(diagnostic.ready,false);assert.ok(diagnostic.students.every(s=>s.observations.length===0&&!s.family&&!s.review));assert.equal((await multiAgeAnnualWorkspace(db,teacher,result.classroomId)).plans.length,0);
  assert.deepEqual((await db.query('select id,to_jsonb(s) as data from students s where id=any($1::uuid[]) order by id',[before.map(s=>s.id)])).rows,before);
  for(const [i,d]of documents.entries())assert.deepEqual(await loadMultiAgeDocument(db,teacher,d.kind,d.id),saved[i]);
  for(const p of context.periods)assert.equal((await loadMultiAgePeriodClosure(db,teacher,p.closureVersionId)).id,p.closureVersionId);
  const history=await multiAgeYearHistory(db,teacher);assert.equal(history.years.length,1);assert.equal(history.years[0].documents.filter(d=>d.exportReady).length,documents.length);assert.equal(history.years[0].closures.length,4);assert.equal(history.years[0].reports.length,3);
  await assert.rejects(db.query("update multi_age_year_transitions set manifest='{}'::jsonb where id=$1",[result.transitionId]),/inmutable/);
  if(schema==='supabase'){await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);assert.equal((await multiAgeYearHistory(db,teacher)).years.length,0);assert.equal((await db.query('select * from multi_age_year_transitions')).rows.length,0);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select * from multi_age_year_transitions')).rows.length,1);await db.query('reset role');}
 }finally{await db.close();}
});
test('no abre año con bimestres pendientes ni inventa niveles para cerrar',{timeout:90000},async()=>{
 const f=await makeMultiAgePeriodFixture();try{const c=await multiAgeYearTransitionContext(f.db,f.teacher,f.classroom.classroomId);assert.equal(c.ready,false);await assert.rejects(confirmMultiAgeYearTransition(f.db,f.teacher,input(f,c)),/cuatro bimestres/);assert.equal((await f.db.query("select count(*)::int n from classrooms where status='active' and teacher_id=$1",[f.teacher])).rows[0].n,1);assert.equal((await f.db.query('select count(*)::int n from multi_age_year_transitions')).rows[0].n,0);}finally{await f.db.close();}
});
