import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { multiAgeAppDevEnv } from './dev-multi-age-app.mjs';

const confirmed=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
async function start(storeName){
  const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const origin=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['scripts/local-db-server.mjs'],{stdio:['ignore','pipe','pipe'],env:{...multiAgeAppDevEnv({}),NODE_ENV:'test',AYNI_LOCAL_DB_PORT:String(port),AYNI_ALLOWED_ORIGIN:origin,AYNI_MULTI_AGE_STORAGE:'persistent',AYNI_MULTI_AGE_STORE_NAME:storeName,AYNI_MULTI_AGE_AI_MODE:'fixture'}});
  let failed=false;child.once('error',()=>{failed=true;});child.stdout.resume();child.stderr.resume();
  for(let n=0;n<200;n++){
    if(failed||child.exitCode!==null)throw new Error('Persistent main API exited before startup.');
    try{const r=await fetch(origin+'/health');if(r.ok){assert.equal((await r.json()).storage,'persistent-multi-age');return {child,origin};}}catch{/* Database booting. */}
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill('SIGTERM');throw new Error('Persistent API did not start.');
}
async function stop(app){if(!app||app.child.exitCode!==null)return;await new Promise(r=>{app.child.once('exit',r);app.child.kill('SIGTERM');});}
function client(app){
  const get=async path=>{const r=await fetch(app.origin+path);assert.equal(r.status,200,await r.clone().text());return r.json();};
  const raw=(path,input)=>fetch(app.origin+path,{method:'POST',headers:{'content-type':'application/json',origin:app.origin},body:JSON.stringify(input)});
  const post=async(path,input)=>{const r=await raw(path,input),v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;};
  return {get,post,raw};
}

test('persistent main API: restart → three age-specific AI proposals → teacher review → annual → project → activity → assessments → nine unchanged Word files',{timeout:150000},async t=>{
  const storeName=process.env.AYNI_MULTI_AGE_QA_STORE??'http-'+randomUUID();let app=await start(storeName),c=client(app);const p='/api/multi-age';
  try{
    assert.equal((await c.get('/api/curriculum/entry')).contract,null,'never overwrite an existing test classroom');
    const classroom=await c.post(p+'/classroom',{...confirmed(),teachingMode:'single_teacher_multi_age',teacherName:'Docente de prueba persistente',ages:[3,4,5],section:'Semillas de prueba',institutionName:'Jardín ficticio',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'}),children=[];
    for(const age of [3,4,5])children.push({...await c.post(p+'/enroll',{...confirmed(),classroomId:classroom.classroomId,expectedRevision:1,age,firstName:`Prueba ${age}`,lastName:'Persistente'}),age});
    let state=await c.get(p+'/state');assert.deepEqual(state.capabilities,{storage:'persistent-local',ai:'fixture'});
    const diagnosticJobs=[];
    for(const child of children){
      const s=state.diagnostic.students.find(s=>s.id===child.studentId),e=s.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=e.aspects.find(a=>a.competency_id==='COM_ORAL');
      const o=await c.post(p+'/diagnostic/observe',{...confirmed(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:e.id,aspectId:aspect.id,observedOn:'2026-03-16',observationStatus:'observed_without_judgment',observationText:`Registro literal exclusivo para ${child.age} años, ficticio.`});
      child.observationId=o.observationId;
      const input={kind:'diagnostic',classroomId:classroom.classroomId,studentId:child.studentId};
      const job=await c.post(p+'/generation',input);assert.equal((await c.post(p+'/generation',input)).id,job.id);diagnosticJobs.push(job);
    }
    await stop(app);app=await start(storeName);c=client(app);
    const wait=async id=>{for(let n=0;n<120;n++){const j=await c.get(p+'/generation/'+id);if(!['queued','running'].includes(j.status)){assert.equal(j.status,'ready',JSON.stringify(j));return j;}await new Promise(r=>setTimeout(r,100));}throw new Error('Generation did not finish.');};
    await t.test('restarted account preserves roster and results; no AI confirmation or age mixing',async()=>{
      state=await c.get(p+'/state');assert.equal(state.workspace.students.length,3);assert.ok(state.diagnostic.students.every(s=>!s.review));
      for(const [i,child] of children.entries()){
        let job=await c.get(p+'/generation/'+diagnosticJobs[i].id);
        if(job.status==='interrupted'){await c.post(p+`/generation/${job.id}/retry`,{});}
        job=await wait(job.id);const findings=job.result.output.findings;assert.deepEqual(findings[0].observation_ids,[child.observationId]);assert.equal(job.result.teacherConfirmed,false);
        await c.post(p+'/diagnostic/review',{...confirmed(),studentId:child.studentId,generationJobId:job.id,sourceFingerprint:job.sourceFingerprint,pendingInformationAcknowledged:true,findings});
      }
    });
    const annualJob=await c.post(p+'/generation',{kind:'annual',classroomId:classroom.classroomId});const annual=await wait(annualJob.id);
    assert.equal(annual.result.output.proposals.length,15);for(const row of annual.result.output.proposals)assert.deepEqual(row.opportunities.map(o=>o.age),[3,4,5]);
    state=await c.get(p+'/state');assert.equal(state.planning.plans.length,0,'proposal is not a plan until saved');
    const draft=await c.post(p+'/annual/draft',{...confirmed(),classroomId:classroom.classroomId,sourceFingerprint:annual.sourceFingerprint,generationJobId:annual.id,proposal:annual.result.output});
    await stop(app);app=await start(storeName);c=client(app);
    state=await c.get(p+'/state');assert.equal(state.planning.plans[0].id,draft.planId);assert.equal(state.planning.plans[0].status,'draft');
    await c.post(p+'/annual/confirm',{...confirmed(),classroomId:classroom.classroomId,planId:draft.planId,expectedRevision:draft.revision});
    state=await c.get(p+'/state');const plan=state.planning.plans[0],slot=plan.document_context.calendar.projects[0];
    const activityJob=await c.post(p+'/generation',{kind:'activity',classroomId:classroom.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,occursOn:slot.instructional_dates[0],competencyIds:['COM_ORAL']});
    const activityProposal=await wait(activityJob.id);
    assert.equal((await c.get(p+'/state')).workspace.activities.length,0);
    const activityInput={...confirmed(),classroomId:classroom.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,generationJobId:activityJob.id,blueprint:activityProposal.result.proposal};
    const a=await c.post(p+'/activity',activityInput);assert.equal((await c.post(p+'/activity',activityInput)).replayed,true,'lost confirmation response is safe even after the task is stale');
    const activityDocument=await c.get(p+`/documents/activity/${a.activityId}`);
    assert.deepEqual(activityDocument.identity.ages,[3,4,5]);assert.equal(activityDocument.content.title,activityInput.blueprint.title);
    const activityWordResponse=await fetch(app.origin+p+`/documents/activity/${a.activityId}.docx`);
    assert.equal(activityWordResponse.status,200);assert.equal(activityWordResponse.headers.get('cache-control'),'private, no-store');
    const activityWordXml=await(await JSZip.loadAsync(Buffer.from(await activityWordResponse.arrayBuffer()))).file('word/document.xml').async('string');
    for(const age of [3,4,5])assert.ok(activityWordXml.includes(`Qué observar en ${age} años`));
    state=await c.get(p+'/state');
    for(const child of children){
      const criterion=state.workspace.criteria.find(r=>r.curricular_age===child.age);
      await c.post(p+'/observe',{...confirmed(),studentId:child.studentId,criterionId:criterion.id,activityId:a.activityId,periodId:classroom.periodId,observedOn:activityInput.blueprint.occursOn,rawText:`Registro cotidiano ficticio propio de ${child.age} años.`});
      const context=await c.get(p+`/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${classroom.periodId}`);assert.equal(context.scope.age,child.age);
      const grade=await c.post(p+'/grade',{...confirmed(),studentId:child.studentId,competencyId:'COM_ORAL',periodId:classroom.periodId,sourceFingerprint:context.sourceFingerprint,achievementLevel:'B'});
      await c.post(p+'/conclusion',{...confirmed(),studentId:child.studentId,competencyId:'COM_ORAL',periodId:classroom.periodId,sourceFingerprint:context.sourceFingerprint,assessmentId:grade.assessmentId,conclusionText:`Texto confirmado para ${child.age} años, ficticio.`});
      await c.post(p+'/family',{...confirmed(),studentId:child.studentId,periodId:classroom.periodId});
    }
    state=await c.get(p+'/state');const before=structuredClone(state);
    const bytes=[];
    for(const doc of state.documents){const r=await fetch(app.origin+p+`/documents/${doc.kind}/${doc.id}.docx`);assert.equal(r.status,200);bytes.push(Buffer.from(await r.arrayBuffer()));}
    for(const report of state.workspace.reports){const r=await fetch(app.origin+p+`/reports/${report.id}.docx`);assert.equal(r.status,200);const file=Buffer.from(await r.arrayBuffer());bytes.push(file);assert.ok((await(await JSZip.loadAsync(file)).file('word/document.xml').async('string')).includes('Texto confirmado para'));}
    assert.equal(bytes.length,9);
    await stop(app);app=await start(storeName);c=client(app);
    state=await c.get(p+'/state');assert.deepEqual(state,before,'a process restart does not regenerate, alter notes or replace documents');
    assert.deepEqual(await c.get(p+`/documents/activity/${a.activityId}`),activityDocument,'activity export remains available after reopening the local store');
    const reopenedWord=await fetch(app.origin+p+`/documents/activity/${a.activityId}.docx`);
    assert.equal(reopenedWord.status,200);assert.equal(await(await JSZip.loadAsync(Buffer.from(await reopenedWord.arrayBuffer()))).file('word/document.xml').async('string'),activityWordXml);
    assert.equal((await c.get(p+'/generation?classroomId='+classroom.classroomId)).jobs.length,5);
    await t.test('project conversation → explicit decision → activities 2 and 3 → own-age notes → restart preserves history',async()=>{
      const project=state.workspace.projects[0],master=structuredClone(project.criteriaFamilies),reportsBefore=structuredClone(state.workspace.reports),gradesBefore=state.workspace.pairs.map(pair=>pair.grade);
      const message='Quiero acompañar a un grupo por turno. No hay témperas. ¿Qué miraré en 3, 4 y 5 años?';
      const conversationInput={kind:'conversation',classroomId:classroom.classroomId,projectId:project.id,text:message,expectedRevision:0,clientRequestId:randomUUID()};
      const turn=await c.post(p+'/generation',conversationInput);assert.equal((await c.post(p+'/generation',conversationInput)).id,turn.id);await wait(turn.id);
      let chat=await c.get(p+`/conversation?classroomId=${classroom.classroomId}&projectId=${project.id}`);assert.equal(chat.turns[0].teacherText,message);assert.equal(chat.decisions.revision,0);
      assert.equal((await c.raw(p+'/conversation/decision',{...confirmed(),classroomId:classroom.classroomId,projectId:project.id,turnId:turn.id,action:'include',expectedRevision:0,teacherConfirmed:false})).status,422);
      await c.post(p+'/conversation/decision',{...confirmed(),classroomId:classroom.classroomId,projectId:project.id,turnId:turn.id,action:'include',expectedRevision:0});
      const secondJob=await c.post(p+'/generation',{kind:'activity',classroomId:classroom.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:2,occursOn:slot.instructional_dates[1],competencyIds:['COM_ORAL']});
      const secondProposal=await wait(secondJob.id),secondInput={...confirmed(),classroomId:classroom.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:2,expectedRevision:1,generationJobId:secondJob.id,blueprint:secondProposal.result.proposal};
      const second=await c.post(p+'/activity',secondInput);assert.equal(second.projectId,project.id);assert.equal((await c.post(p+'/activity',secondInput)).replayed,true);
      state=await c.get(p+'/state');assert.equal(state.workspace.projects.length,1);assert.equal(state.workspace.projects[0].activities.length,2);assert.deepEqual(state.workspace.projects[0].criteriaFamilies,master);
      for(const child of children){
        const cr=state.workspace.criteria.find(r=>r.activity_id===second.activityId&&r.curricular_age===child.age);
        await c.post(p+'/observe',{...confirmed(),studentId:child.studentId,activityId:second.activityId,criterionId:cr.id,periodId:classroom.periodId,observedOn:secondProposal.result.proposal.occursOn,rawText:`Segunda observación ficticia propia de ${child.age} años.`});
        const own=await c.get(p+`/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${classroom.periodId}`);assert.equal(own.sourceRows.length,2);assert.ok(own.sourceRows.every(o=>o.observation_text.includes(String(child.age))));
      }
      await c.post(p+'/activity',{...secondInput,...confirmed(),generationJobId:undefined,activityPosition:3,blueprint:{...secondProposal.result.proposal,title:'Continuamos jugando, actividad 3 ficticia',occursOn:slot.instructional_dates[2]}});
      await stop(app);app=await start(storeName);c=client(app);
      state=await c.get(p+'/state');assert.equal(state.workspace.projects[0].activities.length,3);assert.deepEqual(state.workspace.projects[0].criteriaFamilies,master);assert.deepEqual(state.workspace.reports,reportsBefore);assert.deepEqual(state.workspace.pairs.map(pair=>pair.grade),gradesBefore);assert.ok(state.workspace.pairs.every(pair=>!pair.current));
      chat=await c.get(p+`/conversation?classroomId=${classroom.classroomId}&projectId=${project.id}`);assert.equal(chat.turns.length,1);assert.equal(chat.turns[0].teacherText,message);assert.equal(chat.decisions.messages[0].text,message);assert.ok(chat.turns[0].assistantText);
      assert.equal((await c.get(p+'/generation?classroomId='+classroom.classroomId)).jobs.length,7);
    });
    await t.test('batch proposal → restart → review all ages → atomic confirmation → restart preserves existing notes and reports',async()=>{
      state=await c.get(p+'/state');const project=state.workspace.projects[0],beforeBatch=structuredClone(state.workspace);
      const input={kind:'activity_batch',classroomId:classroom.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:project.nextPosition,activityDates:slot.instructional_dates.slice(3,6),competencyIds:['COM_ORAL']};
      const job=await c.post(p+'/generation',input);assert.equal((await c.post(p+'/generation',input)).id,job.id);
      const prepared=await wait(job.id);assert.equal(prepared.result.proposals.length,3);assert.equal(prepared.result.teacherConfirmed,false);
      assert.deepEqual((await c.get(p+'/state')).workspace,beforeBatch,'a ready batch does not materialize activities');
      await stop(app);app=await start(storeName);c=client(app);
      const reopened=await c.get(p+'/generation/'+job.id);assert.deepEqual(reopened.result,prepared.result);assert.equal(reopened.status,'ready');
      const save={...confirmed(),...input,kind:undefined,expectedRevision:1,generationJobId:job.id,proposals:reopened.result.proposals};
      const bad=structuredClone(save);bad.clientRequestId=randomUUID();bad.proposals[2].criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.5.01'];
      assert.equal((await c.raw(p+'/activity/batch',bad)).status,422);assert.equal((await c.get(p+'/state')).workspace.activities.length,3);
      assert.equal((await c.raw(p+'/activity/batch',{...save,teacherConfirmed:false})).status,422);
      const result=await c.post(p+'/activity/batch',save);assert.equal(result.activities.length,3);assert.equal((await c.post(p+'/activity/batch',save)).replayed,true);
      state=await c.get(p+'/state');assert.equal(state.workspace.activities.length,6);assert.deepEqual(state.workspace.projects[0].criteriaFamilies,beforeBatch.projects[0].criteriaFamilies);assert.deepEqual(state.workspace.reports,beforeBatch.reports);assert.deepEqual(state.workspace.pairs,beforeBatch.pairs);
      for(const old of beforeBatch.activities)assert.deepEqual(state.workspace.activities.find(a=>a.id===old.id),old);
      for(const activity of result.activities){assert.equal(activity.projectId,project.id);assert.deepEqual(state.workspace.criteria.filter(cr=>cr.activity_id===activity.activityId).map(cr=>cr.curricular_age).sort(),[3,4,5]);}
      const after=structuredClone(state);await stop(app);app=await start(storeName);c=client(app);assert.deepEqual(await c.get(p+'/state'),after);
      assert.equal((await c.post(p+'/activity/batch',save)).replayed,true);assert.equal((await c.get(p+'/generation/'+job.id)).status,'stale');
      assert.equal((await c.get(p+'/generation?classroomId='+classroom.classroomId)).jobs.length,8);
    });
    await t.test('bad origins, forged owners and legacy writers remain blocked',async()=>{
      const input={kind:'annual',classroomId:classroom.classroomId};
      assert.equal((await c.raw(p+'/generation',{...input,teacherId:randomUUID()})).status,403);
      assert.equal((await fetch(app.origin+p+'/generation',{method:'POST',headers:{'content-type':'application/json',origin:'https://foreign.invalid'},body:JSON.stringify(input)})).status,403);
      assert.equal((await fetch(app.origin+'/api/dashboard')).status,409);
    });
  }finally{await stop(app);}
});
