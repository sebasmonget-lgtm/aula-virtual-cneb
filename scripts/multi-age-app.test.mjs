import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { multiAgeAppDevEnv } from './dev-multi-age-app.mjs';
import { multiAgeAppEntry, multiAgeAppLocalEnabled } from './multi-age-app-routes.mjs';

test('activation is explicit, local only, and disabled servers need no V2 schema', async () => {
  assert.equal(multiAgeAppLocalEnabled({}), false);
  assert.equal(multiAgeAppLocalEnabled({ AYNI_MULTI_AGE_LOCAL: '1' }), true);
  for (const override of [{ NODE_ENV:'production' },{ VERCEL:'1' },{ VERCEL_ENV:'preview' },{ AYNI_AUTH_MODE:'supabase' },{ AYNI_DB_MODE:'postgres' },{ AYNI_SERVERLESS:'1' },{ AYNI_API_HOST:'0.0.0.0' }])
    assert.throws(() => multiAgeAppLocalEnabled({ AYNI_MULTI_AGE_LOCAL:'1', ...override }));
  const db = { query() { throw new Error('Disabled mode must not query existing data.'); } };
  assert.deepEqual(await multiAgeAppEntry(db, randomUUID(), false), { enabled:false });
  const env = multiAgeAppDevEnv({ PATH:'runtime', SUPABASE_DB_URL:'forbidden', OPENAI_API_KEY:'forbidden', AYNI_LOCAL_DATA_DIR:'forbidden', VERCEL:'1', AYNI_AUTH_MODE:'supabase', NEXT_PUBLIC_AYNI_API_URL:'https://forbidden.invalid' });
  assert.equal(env.SUPABASE_DB_URL, undefined); assert.equal(env.OPENAI_API_KEY, undefined); assert.equal(env.VERCEL, undefined); assert.equal(env.AYNI_LOCAL_DATA_DIR, undefined);
  assert.equal(env.NEXT_PUBLIC_AYNI_API_URL, 'http://127.0.0.1:8795'); assert.equal(env.AYNI_MULTI_AGE_LOCAL, '1');
});

async function startApp({ preview = false } = {}) {
  if(preview&&process.env.AYNI_MAIN_QA_URL){
    const target=new URL(process.env.AYNI_MAIN_QA_URL);
    assert.equal(target.protocol,'http:');assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/');assert.equal(target.search,'');assert.equal(target.username,'');assert.equal(target.password,'');
    const health=await(await fetch(target.origin+'/health')).json();assert.equal(health.storage,'temporary-multi-age');
    return {origin:target.origin,child:null};
  }
  const server = createServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath,['scripts/local-db-server.mjs'], { cwd:process.cwd(), stdio:['ignore','pipe','pipe'],
    env:{ ...multiAgeAppDevEnv(), NODE_ENV:'test', AYNI_LOCAL_DB_PORT:String(port), AYNI_ALLOWED_ORIGIN:origin } });
  let output = ''; for (const stream of [child.stdout,child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-2500); });
  for (let i=0;i<150;i++) {
    if (child.exitCode !== null) throw new Error(`Main API exited: ${output}`);
    try { const r=await fetch(origin+'/health'); if(r.ok) { assert.equal((await r.json()).storage,'temporary-multi-age'); return {child,origin}; } } catch { /* Isolated database starting. */ }
    await new Promise(resolve => setTimeout(resolve,150));
  }
  child.kill('SIGTERM'); throw new Error('Main API did not start.');
}
async function stopApp(child) {
  if(!child)return;
  if(child.exitCode!==null)return;
  await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},4000).unref();});
}
function client(origin) {
  const requestOrigin=process.env.AYNI_MAIN_QA_URL&&new URL(process.env.AYNI_MAIN_QA_URL).origin===origin?'http://127.0.0.1:5175':origin;
  const get = async path => {const r=await fetch(origin+path);assert.equal(r.status,200,await r.clone().text());return r.json();};
  const postRaw = (path,input,headers={}) => fetch(origin+path,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json',...headers},body:JSON.stringify(input)});
  const post = async(path,input)=>{const r=await postRaw(path,input),v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;};
  const v2 = input => ({...input,teacherConfirmed:true,clientRequestId:randomUUID()});
  const create = v2({teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia de prueba',ages:[3,4,5],section:'Semillas ficticias',institutionName:'Institución ficticia de prueba',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  return {get,post,postRaw,v2,create};
}

test('real main API: explicit setup → 3 ages → diagnostic → annual → project → activity → evaluation → nine Word downloads', {timeout:120000}, async t=>{
  const app=await startApp({preview:true}), {get,post,postRaw,v2,create}=client(app.origin), prefix='/api/multi-age';
  try {
    assert.equal((await get('/api/curriculum/entry')).contract,null);
    assert.equal((await get('/api/pilot/setup')).configured,false,'an empty account may already have its official school year provisioned');
    await t.test('no automatic activation, forged identity or cross-origin mutation',async()=>{
      const implicit={...create};delete implicit.teachingMode;
      assert.equal((await postRaw(prefix+'/classroom',implicit)).status,422);
      assert.equal((await postRaw(prefix+'/classroom',{...create,teacherId:randomUUID()})).status,403);
      assert.equal((await postRaw(prefix+'/classroom',create,{origin:'https://foreign.invalid'})).status,403);
      assert.equal((await fetch(app.origin+prefix+'/classroom',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(create)})).status,403);
      assert.equal((await get(prefix+'/state')).workspace,null);
    });
    const c=await post(prefix+'/classroom',create);
    assert.equal((await post(prefix+'/classroom',create)).classroomId,c.classroomId);
    assert.equal((await get('/api/curriculum/entry')).contract,2);
    await t.test('legacy readers, writers and workers cannot process this classroom',async()=>{
      for(const route of ['/api/dashboard','/api/planning-journey','/api/diagnostics','/api/annual-journey'])assert.equal((await fetch(app.origin+route)).status,409);
      assert.equal((await postRaw('/api/pilot/setup',{age:4})).status,409);
      assert.equal((await fetch(app.origin+prefix+'/state?classroomId='+randomUUID())).status,403);
    });
    const children=[];
    for(const age of [3,4,5])children.push({...await post(prefix+'/enroll',v2({classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age,...(age===4?{birthDate:'2022-06-10'}:{})})),age});
    let state=await get(prefix+'/state');assert.deepEqual(state.workspace.students.map(s=>s.age),[3,4,5]);assert.equal(state.workspace.periods.length,4);
    for(const child of children){
      const view=state.diagnostic.students.find(s=>s.id===child.studentId),experience=view.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
      const o=await post(prefix+'/diagnostic/observe',v2({studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:`Actuación inicial ficticia exclusiva de ${child.age} años.`,observedOn:'2026-03-16'}));
      await post(prefix+'/diagnostic/family',v2({studentId:child.studentId,expectedAssignmentId:child.assignmentId,familyText:`La familia relata un interés ficticio ${child.age}, sin acreditar logros.`}));
      const ctx=await get(prefix+`/diagnostic/context?studentId=${child.studentId}`);assert.equal(ctx.context.curricular_age,child.age);
      await post(prefix+'/diagnostic/review',v2({studentId:child.studentId,sourceFingerprint:ctx.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[o.observationId],teacher_reading:`Lectura docente ficticia ${child.age} con fuente propia.`,planning_priority:'consider'}]}));
    }
    state=await get(prefix+'/state');assert.equal(state.diagnostic.ready,true);
    const draft=await post(prefix+'/annual/draft',v2({classroomId:c.classroomId,sourceFingerprint:state.planning.sourceFingerprint,proposal:state.planning.exampleProposal}));
    assert.equal((await fetch(app.origin+prefix+`/documents/annual_plan/${draft.planId}.docx`)).status,409);
    const reloaded=await get(prefix+'/state');assert.equal(reloaded.planning.plans[0].id,draft.planId);assert.equal(reloaded.planning.plans[0].proposal.proposals.length,15);
    await post(prefix+'/annual/confirm',v2({classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision}));
    state=await get(prefix+'/state');
    const plan=state.planning.plans[0],slot=plan.document_context.calendar.projects[0],row=plan.proposal.proposals[0];
    const b={title:'Elegimos y conversamos · ficticia',purpose:row.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:row.common_invitation,development:row.one_teacher_organization,closure:'Compartir lo elegido; la profesora registra solo lo observado.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:row.opportunities.map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}]};
    const a=await post(prefix+'/activity',v2({classroomId:c.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,blueprint:b}));
    state=await get(prefix+'/state');assert.equal(state.workspace.criteria.length,3);assert.equal(new Set(state.workspace.criteria.map(c=>c.id)).size,3);
    await t.test('observation cannot use another age or change a saved receipt',async()=>{
      const wrong=await postRaw(prefix+'/observe',v2({studentId:children[0].studentId,criterionId:state.workspace.criteria.find(c=>c.curricular_age===5).id,activityId:a.activityId,periodId:c.periodId,observedOn:b.occursOn,rawText:'Intento cruzado ficticio.'}));assert.notEqual(wrong.status,200);
      assert.notEqual((await postRaw(prefix+'/observe',v2({studentId:children[0].studentId,criterionId:state.workspace.criteria.find(c=>c.curricular_age===3).id,activityId:a.activityId,periodId:state.workspace.periods[3].id,observedOn:b.occursOn,rawText:'No pertenece a este bimestre.'}))).status,200);
      assert.equal((await postRaw(prefix+'/activity',v2({classroomId:c.classroomId,expectedRevision:1,blueprint:b}))).status,422,'main route requires annual lineage');
      assert.equal(state.workspace.activities[0].annual_slot_id,slot.slot_id);
      assert.equal((await postRaw(prefix+'/classroom',{...create,section:'Contenido distinto'})).status,409);
    });
    const contexts=[],grades=[];
    for(const child of children){
      await post(prefix+'/observe',v2({studentId:child.studentId,criterionId:state.workspace.criteria.find(c=>c.curricular_age===child.age).id,activityId:a.activityId,periodId:c.periodId,observedOn:b.occursOn,rawText:`Observación cotidiana propia ficticia ${child.age}.`}));
      const ctx=await get(prefix+`/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${c.periodId}`);contexts.push(ctx);
      assert.equal(ctx.scope.age,child.age);assert.equal(ctx.sourceRows.length,1);assert.ok(ctx.sourceRows[0].observation_text.includes(String(child.age)));
      grades.push(await post(prefix+'/grade',v2({studentId:child.studentId,competencyId:'COM_ORAL',periodId:c.periodId,achievementLevel:child.age===3?'B':'A',sourceFingerprint:ctx.sourceFingerprint})));
    }
    for(const [i,child]of children.entries())await post(prefix+'/conclusion',v2({studentId:child.studentId,competencyId:'COM_ORAL',periodId:c.periodId,assessmentId:grades[i].assessmentId,sourceFingerprint:contexts[i].sourceFingerprint,conclusionText:`Conclusión literal ficticia para ${child.age} años, sin fuentes ajenas.`}));
    for(const child of children)await post(prefix+'/family',v2({studentId:child.studentId,periodId:c.periodId}));
    state=await get(prefix+'/state');
    await t.test('nine real Word downloads retain own texts, ages and versions',async()=>{
      assert.equal(state.documents.length,6);assert.equal(state.workspace.reports.length,3);
      for(const doc of state.documents){const read=await get(prefix+`/documents/${doc.kind}/${doc.id}`);assert.equal(read.id,doc.id);assert.equal(read.curriculumContractVersion,2);const r=await fetch(app.origin+prefix+`/documents/${doc.kind}/${doc.id}.docx`);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);const zip=await JSZip.loadAsync(await r.arrayBuffer());assert.ok((await zip.file('word/document.xml').async('string')).includes(doc.kind==='annual_plan'?'Mi año':doc.kind==='diagnostic_student_review'?'Lectura docente ficticia':read.content.title));}
      for(const child of children){const report=state.workspace.reports.find(r=>r.student_id===child.studentId),r=await fetch(app.origin+prefix+`/reports/${report.id}.docx`);assert.equal(r.status,200);const zip=await JSZip.loadAsync(await r.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');assert.ok(xml.includes(`Conclusión literal ficticia para ${child.age} años`));assert.ok(xml.includes(`${child.age} años`));for(const other of children.filter(s=>s.age!==child.age))assert.ok(!xml.includes(`Conclusión literal ficticia para ${other.age} años`));}
    });
    const again=await get(prefix+'/state');assert.deepEqual(again.workspace.pairs,state.workspace.pairs);assert.ok(again.workspace.pairs.every(p=>p.current&&p.conclusion));
  } finally {await stopApp(app.child);}
});

test('single-age account keeps its main setup/dashboard and cannot be converted by V2 creation', {timeout:90000},async()=>{
  const app=await startApp(),{get,postRaw,create}=client(app.origin);
  try{
    const setup={teacherName:'Profesora ficticia',institutionName:'Jardín ficticio',section:'Una edad',age:4,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'};
    const r=await postRaw('/api/pilot/setup',setup);assert.ok([200,201].includes(r.status),await r.clone().text());
    const before=await get('/api/curriculum/entry');assert.equal(before.contract,1);
    assert.equal((await fetch(app.origin+'/api/dashboard')).status,200);
    assert.equal((await postRaw('/api/multi-age/classroom',create)).status,409);
    assert.deepEqual(await get('/api/curriculum/entry'),before);
    assert.equal((await fetch(app.origin+'/api/dashboard')).status,200);
  }finally{await stopApp(app.child);}
});
