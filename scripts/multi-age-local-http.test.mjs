import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { startMultiAgeLocalServer } from './multi-age-local-server.mjs';
import { sampleMultiAgeBlueprint } from './fixtures/multi-age-local-fixture.mjs';
import JSZip from 'jszip';

test('HTTP local recorre matrícula a informe, con cookie/origen/host y sin conexión externa',{timeout:90000},async t=>{
  const app=await startMultiAgeLocalServer();
  try{
    const page=await fetch(app.url),cookie=page.headers.get('set-cookie').split(';')[0];assert.match(await page.text(),/datos ficticios/);
    const headers={'content-type':'application/json',origin:app.url,cookie};
    const post=async(path,input)=>{const r=await fetch(app.url+path,{method:'POST',headers,body:JSON.stringify(input)});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;};
    const body={clientRequestId:randomUUID(),teacherConfirmed:true,ages:[3,4,5],section:'Local HTTP',institutionName:'Institución ficticia',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'};
    await t.test('sin sesión, origen distinto, host distinto y JSON inválido se rechazan',async()=>{
      assert.equal((await fetch(app.url+'/api/state')).status,403);
      assert.equal((await fetch(app.url+'/api/classroom',{method:'POST',headers:{...headers,origin:'https://example.invalid'},body:JSON.stringify(body)})).status,403);
      const wrongHost=await new Promise((resolve,reject)=>{http.get(app.url+'/api/state',{headers:{cookie,host:'example.invalid'}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));}).on('error',reject);});
      assert.equal(wrongHost,403);
      assert.equal((await fetch(app.url+'/api/classroom',{method:'POST',headers,body:'{'})).status,400);
    });
    const c=await post('/api/classroom',body),students=[];
    for(const age of [3,4,5])students.push(await post('/api/enroll',{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:c.classroomId,expectedRevision:1,firstName:'Niña '+age,lastName:'HTTP ficticia',age}));
    const a=await post('/api/activity',{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:c.classroomId,expectedRevision:1,blueprint:sampleMultiAgeBlueprint()});
    let state=(await (await fetch(app.url+'/api/state',{headers:{cookie}})).json()).workspace;
    const contexts=[];
    for(const [i,s]of students.entries()){
      await post('/api/observe',{studentId:s.studentId,activityId:a.activityId,criterionId:state.criteria.find(r=>r.curricular_age===i+3).id,periodId:c.periodId,observedOn:'2026-10-22',clientRequestId:randomUUID(),rawText:`Actuación ficticia conservada ${i+3}.`});
      contexts.push(await(await fetch(`${app.url}/api/context?studentId=${s.studentId}&competencyId=COM_ORAL&periodId=${c.periodId}`,{headers:{cookie}})).json());
    }
    const grades=[];
    for(const [i,s]of students.entries())grades.push(await post('/api/grade',{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:s.studentId,competencyId:'COM_ORAL',periodId:c.periodId,achievementLevel:'A',sourceFingerprint:contexts[i].sourceFingerprint}));
    for(const [i,s]of students.entries())await post('/api/conclusion',{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:s.studentId,competencyId:'COM_ORAL',periodId:c.periodId,assessmentId:grades[i].assessmentId,sourceFingerprint:contexts[i].sourceFingerprint,conclusionText:`Conclusión escrita para el niño ficticio de ${i+3} años.`});
    const reports=[];
    for(const s of students)reports.push(await post('/api/family',{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:s.studentId,periodId:c.periodId}));
    await t.test('tres informes persistidos, descargas Word reales y recarga sin nuevas escrituras',async()=>{
      for(const r of reports){const file=await fetch(`${app.url}/api/reports/${r.reportId}.docx`,{headers:{cookie}});assert.equal(file.status,200);assert.match(file.headers.get('content-type'),/wordprocessingml/);assert.ok((await file.arrayBuffer()).byteLength>10000);}
      state=(await(await fetch(app.url+'/api/state',{headers:{cookie}})).json()).workspace;
      assert.equal(state.students.length,3);assert.equal(state.reports.length,3);assert.equal(state.pairs.length,3);assert.ok(state.pairs.every(p=>p.current&&p.conclusion));
    });
  }finally{await app.close();}
});

test('HTTP diagnóstico → Mi año → actividad → evaluación e informes en las tres edades',{timeout:90000},async()=>{
  const app=await startMultiAgeLocalServer();
  try{
    const page=await fetch(app.url),cookie=page.headers.get('set-cookie').split(';')[0],headers={'content-type':'application/json',origin:app.url,cookie};
    const request=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
    const post=async(path,input)=>{const r=await fetch(app.url+path,{method:'POST',headers,body:JSON.stringify(input)}),v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;};
    const get=async path=>{const r=await fetch(app.url+path,{headers:{cookie}});assert.equal(r.status,200);return r.json();};
    const c=await post('/api/classroom',{...request(),ages:[3,4,5],section:'Recorrido diagnóstico anual',institutionName:'Institución ficticia HTTP',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'}),children=[];
    for(const age of [3,4,5])children.push({...await post('/api/enroll',{...request(),classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age}),age});
    let state=await get('/api/state');
    for(const child of children){
      const view=state.planning.diagnostic.students.find(s=>s.id===child.studentId),experience=view.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
      const obs=await post('/api/diagnostic/observe',{...request(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:`Observación inicial literal de ${child.age} años.`,observedOn:'2026-03-16'});
      await post('/api/diagnostic/family',{...request(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,familyText:`Relato familiar ficticio ${child.age}, separado de la observación.`});
      const ctx=await get(`/api/diagnostic/context?studentId=${child.studentId}`);assert.equal(ctx.context.curricular_age,child.age);
      await post('/api/diagnostic/review',{...request(),studentId:child.studentId,sourceFingerprint:ctx.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[obs.observationId],teacher_reading:`Lectura revisada de ${child.age} años.`,planning_priority:'consider'}]});
    }
    state=await get('/api/state');assert.equal(state.planning.diagnostic.ready,true);
    const annualProposal=structuredClone(state.planning.exampleProposal);for(const p of annualProposal.proposals)p.one_teacher_organization='Organización docente para revisar. '.repeat(50);
    const draftInput={...request(),classroomId:c.classroomId,sourceFingerprint:state.planning.sourceFingerprint,proposal:annualProposal};assert.ok(Buffer.byteLength(JSON.stringify(draftInput))>65536);
    const draft=await post('/api/annual/draft',draftInput);
    assert.equal((await fetch(`${app.url}/api/documents/annual_plan/${draft.planId}.docx`,{headers:{cookie}})).status,409);
    state=await get('/api/state');assert.equal(state.planning.plans[0].id,draft.planId);assert.equal(state.planning.plans[0].proposal.proposals.length,15);
    await post('/api/annual/confirm',{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
    const documents=await get('/api/documents');assert.equal(documents.documents.length,4);assert.ok(documents.documents.every(d=>d.exportReady));
    for(const document of documents.documents){const download=await fetch(`${app.url}/api/documents/${document.kind}/${document.id}.docx`,{headers:{cookie}});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/v1\.docx/);const zip=await JSZip.loadAsync(await download.arrayBuffer()),body=await zip.file('word/document.xml').async('string');assert.ok(body.includes(document.kind==='annual_plan'?'Mi año 2026':'Grupo curricular confirmado'));}
    assert.equal((await fetch(`${app.url}/api/documents/annual_plan/${randomUUID()}.docx`,{headers:{cookie}})).status,403);
    const blueprint=sampleMultiAgeBlueprint(),slot=state.planning.calendar.projects[0];blueprint.occursOn=slot.instructional_dates[0];
    const activity=await post('/api/activity',{...request(),classroomId:c.classroomId,expectedRevision:1,annualPlanId:draft.planId,annualSlotId:slot.slot_id,blueprint});
    state=await get('/api/state');const grades=[];
    for(const child of children){
      await post('/api/observe',{...request(),studentId:child.studentId,activityId:activity.activityId,criterionId:state.workspace.criteria.find(cr=>cr.curricular_age===child.age).id,periodId:c.periodId,observedOn:blueprint.occursOn,rawText:`Actuación ordinaria literal de ${child.age} años.`});
      const ctx=await get(`/api/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${c.periodId}`);
      grades.push({...await post('/api/grade',{...request(),studentId:child.studentId,competencyId:'COM_ORAL',periodId:c.periodId,achievementLevel:'A',sourceFingerprint:ctx.sourceFingerprint}),child,sourceFingerprint:ctx.sourceFingerprint});
    }
    for(const grade of grades)await post('/api/conclusion',{...request(),studentId:grade.child.studentId,competencyId:'COM_ORAL',periodId:c.periodId,assessmentId:grade.assessmentId,sourceFingerprint:grade.sourceFingerprint,conclusionText:`Conclusión literal docente de ${grade.child.age} años.`});
    for(const child of children){const report=await post('/api/family',{...request(),studentId:child.studentId,periodId:c.periodId}),file=await fetch(`${app.url}/api/reports/${report.reportId}.docx`,{headers:{cookie}});assert.equal(file.status,200);const zip=await JSZip.loadAsync(await file.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');assert.ok(xml.includes(`Conclusión literal docente de ${child.age} años.`));assert.ok(xml.includes(`${child.age} años`));}
    state=await get('/api/state');assert.equal(state.workspace.reports.length,3);assert.equal(state.planning.plans[0].status,'active');assert.ok(state.workspace.pairs.every(p=>p.current));
  }finally{await app.close();}
});

test('un calendario anual no soportado informa el límite y conserva la matrícula local',{timeout:90000},async()=>{
  const app=await startMultiAgeLocalServer();try{
    const page=await fetch(app.url),cookie=page.headers.get('set-cookie').split(';')[0],headers={'content-type':'application/json',origin:app.url,cookie};
    const created=await fetch(app.url+'/api/classroom',{method:'POST',headers,body:JSON.stringify({clientRequestId:randomUUID(),teacherConfirmed:true,ages:[3,4,5],section:'Otro año local',institutionName:'Institución ficticia',year:2027,startsOn:'2027-03-15',endsOn:'2027-12-17'})});assert.equal(created.status,200);
    const response=await fetch(app.url+'/api/state',{headers:{cookie}}),state=await response.json();assert.equal(response.status,200);assert.ok(state.workspace.classroom.id);assert.equal(state.planning,null);assert.match(state.planningUnavailable,/2026/);
  }finally{await app.close();}
});
