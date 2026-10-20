import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from '../src/lib/pilot-onboarding-service.mjs';
import {loadEffectiveCalendar} from '../src/lib/school-calendar-service.mjs';

async function port(){const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const number=server.address().port;await new Promise(resolve=>server.close(resolve));return number;}
async function start(dataDir,teacher,providerUrl){
  const number=await port(),base=`http://127.0.0.1:${number}`;
  const child=spawn(process.execPath,['scripts/local-db-server.mjs'],{stdio:['ignore','pipe','pipe'],env:{...process.env,
    NODE_ENV:'test',AYNI_DB_MODE:'local',AYNI_AUTH_MODE:'local',AYNI_LOCAL_DATA_DIR:dataDir,AYNI_LOCAL_TEACHER_ID:teacher,
    AYNI_LOCAL_DB_PORT:String(number),AYNI_ALLOWED_ORIGIN:base,NEXT_PUBLIC_AYNI_EXPERIENCE:'1',AYNI_EXPERIENCE:'1',
    VERCEL_ENV:'preview',AYNI_QA_PREVIEW_CLOCK:'1',AYNI_QA_TEACHER_ID:teacher,AYNI_SESSION_SIGNING_KEY:'test-only-http-signature-key-of-32-characters',
    OPENAI_API_KEY:'test-only-no-paid-provider',OPENAI_BASE_URL:providerUrl}});
  let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
  for(let i=0;i<140;i++){
    if(child.exitCode!==null)throw Error(output.slice(-1500));
    try{if((await fetch(base+'/health')).ok)return{child,base};}catch{/* Local migrations are still loading. */}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  child.kill();throw Error('Local API did not start');
}
async function stop(child){if(!child||child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}

test('HTTP real: dependents conserva la disponibilidad confirmada y Master alcanza el proveedor sin pedirla otra vez',{timeout:90000},async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'ayni-preparation-http-')),dataDir=path.join(directory,'pgdata'),teacher=randomUUID();
  let instance,db,calls=0;
  // The provider is deliberately unavailable. Reaching it proves the original
  // precondition regression is fixed, without any paid call or fake AI success.
  const provider=createServer((req,res)=>{calls++;req.resume();res.writeHead(429,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'insufficient_quota',type:'insufficient_quota',message:'Controlled test quota'}}));});
  await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));
  const providerUrl=`http://127.0.0.1:${provider.address().port}/v1`;
  try{
    instance=await start(dataDir,teacher,providerUrl);await stop(instance.child);instance=null;
    db=new PGlite(dataDir);
    const classroom=await createPilotClassroom(db,teacher,{teacherName:'Elena Ramírez',institutionName:'IE Semillas',section:'Los Girasoles',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    const calendar=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:classroom.classroomId,from:'2026-11-02',to:'2026-11-13'});
    const dates=calendar.days.filter(day=>day.is_instructional).map(day=>day.date),annual=randomUUID(),proposal=randomUUID(),project=randomUUID();
    const decisions={context_summary:'Algunos niños preguntan por las plantas del patio.',purpose:'Observar y comunicar cómo cambian las plantas.',competency_ids:['CYT_INDAGA','COM_ORAL'],additional_context:''};
    const receipt={resources:['Macetas del patio, acceso por confirmar'],confirmed_by:teacher,confirmed_at:'2026-10-19T12:00:00Z'};
    const candidate={proposal_id:proposal,experience_type:'project',title:'Miramos nuestras plantas',purpose:decisions.purpose,rationale:decisions.context_summary,primary_competency_ids:decisions.competency_ids,instructional_dates:dates,materials:receipt.resources};
    const curriculum=(await db.query('select id from curriculum_versions where active=true limit 1')).rows[0].id;
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,status,proposal) values($1,$2,$3,$4,'active',$5::jsonb)`,[annual,classroom.classroomId,classroom.schoolYearId,curriculum,JSON.stringify({journey_version:2,experience_context:{},resolved_calendar:{calendar_version:{id:calendar.version.id}},proposed_experiences:[candidate]})]);
    await db.query(`insert into project_slots(id,annual_plan_id,slot_index,proposal_id,starts_on,ends_on,duration_weeks) values($1,$2,1,$3,'2026-11-02','2026-11-13',2)`,[randomUUID(),annual,proposal]);
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,source_proposal_id,source_proposal_index,origin) values($1,$2,'project',$3,$4,'2026-11-02','2026-11-13','draft',$5::jsonb,$6,$7,0,'planned')`,[project,classroom.classroomId,candidate.title,candidate.purpose,JSON.stringify({flow_version:'project-master-v1',resource_readiness:receipt,preview:{}}),annual,proposal]);
    await db.close();db=null;
    instance=await start(dataDir,teacher,providerUrl);
    const headers={origin:instance.base,'content-type':'application/json'};
    const clock=await fetch(instance.base+'/api/qa/clock',{method:'PUT',headers,body:JSON.stringify({date:'2026-10-19',time:'08:00'})});
    assert.equal(clock.status,200);headers.cookie=clock.headers.getSetCookie().find(value=>value.startsWith('__Host-ayni_qa_clock=')).split(';')[0];
    const initial=await fetch(`${instance.base}/api/project-flow/${project}`,{headers});const initialRow=(await initial.json()).experience;
    const updated=await fetch(`${instance.base}/api/project-flow/${project}/dependents`,{method:'POST',headers,body:JSON.stringify({decisions,expectedRevision:initialRow.revision})});
    assert.equal(updated.status,200,await updated.clone().text());const saved=(await updated.json()).experience;
    assert.deepEqual(saved.details.resource_readiness,receipt);assert.equal(calls,0,'Dependents moderno no necesita IA');
    const confirmed=await fetch(`${instance.base}/api/project-flow/${project}/calendar`,{method:'PUT',headers,body:JSON.stringify({selectedDates:dates,confirm:true})});
    assert.equal(confirmed.status,200,await confirmed.clone().text());
    const master=await fetch(`${instance.base}/api/project-flow/${project}/master`,{method:'POST',headers,body:JSON.stringify({expectedRevision:saved.revision,dependents:saved.details.dependents})});
    const result=await master.json();assert.equal(master.status,422);assert.equal(result.provider_reason,'insufficient_quota',JSON.stringify(result));assert.equal(calls,1);
    const reloaded=(await(await fetch(`${instance.base}/api/project-flow/${project}`,{headers})).json()).experience;
    assert.deepEqual(reloaded.details.resource_readiness,receipt);assert.equal(reloaded.details.project_master,undefined,'No se simula una generación completada');
    // Resuming the selected draft accepts its resources without another checkbox.
    // GET remains read-only; the authenticated POST records that acceptance.
    await stop(instance.child);instance=null;db=new PGlite(dataDir);
    const job=randomUUID();
    await db.query("update learning_experiences set details=details-'resource_readiness' where id=$1 and status='draft'",[project]);
    await db.query(`insert into preparation_jobs_v2(id,teacher_id,classroom_id,kind,source_id,source_revision,input_fingerprint,status,payload)
      values($1,$2,$3,'project',$4,1,'lost-receipt-fixture','failed',$5::jsonb)`,[job,teacher,classroom.classroomId,annual,JSON.stringify({stage:'master',project_id:project,proposal_id:proposal,error:'No pudimos completar lo pendiente.'})]);
    await db.close();db=null;instance=await start(dataDir,teacher,providerUrl);headers.origin=instance.base;
    const review=await(await fetch(`${instance.base}/api/preparation/${job}`,{headers})).json();
    assert.equal(review.required_resources,undefined);
    const beforeRetry=(await(await fetch(`${instance.base}/api/project-flow/${project}`,{headers})).json()).experience;
    assert.equal(beforeRetry.details.resource_readiness,undefined,'Consultar no confirma materiales');
    const retry=await fetch(`${instance.base}/api/preparation/${job}/retry`,{method:'POST',headers,body:'{}'});
    assert.equal(retry.status,202,await retry.clone().text());
    const recovered=(await(await fetch(`${instance.base}/api/project-flow/${project}`,{headers})).json()).experience;
    assert.equal(recovered.details.resource_readiness.confirmed_by,teacher);
    assert.equal(recovered.details.resource_readiness.confirmation_source,'project_resume');
    assert.deepEqual(recovered.details.resource_readiness.resources,receipt.resources);
  }finally{
    if(db)await db.close();await stop(instance?.child);await new Promise(resolve=>provider.close(resolve));
    assert.equal(path.dirname(directory).toLowerCase(),path.resolve(tmpdir()).toLowerCase());await rm(directory,{recursive:true,force:true});
  }
});
