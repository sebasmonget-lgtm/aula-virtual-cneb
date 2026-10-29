import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { multiAgeAppDevEnv } from './dev-multi-age-app.mjs';
import { pilotSchoolYearDefaults } from '../src/lib/pilot-school-year-defaults.mjs';
import {downloadNameFromDisposition} from '../src/lib/document-download-name.mjs';

async function start() {
  const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  const base=`http://127.0.0.1:${port}`,env={...multiAgeAppDevEnv({}),AYNI_LOCAL_DB_PORT:String(port),AYNI_LOCAL_TEACHER_ID:randomUUID(),AYNI_ALLOWED_ORIGIN:base,AYNI_MULTI_AGE_AI_MODE:'fixture'};
  const child=spawn(process.execPath,['scripts/local-db-server.mjs'],{env,stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',b=>log+=String(b));child.stderr.on('data',b=>log+=String(b));
  for(let i=0;i<300;i++){
    if(child.exitCode!==null)throw new Error('API de prueba no inició: '+log.slice(-700));
    try{if((await fetch(base+'/health')).ok)return {base,child};}catch{/* Wait for the isolated schema. */}
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill();throw new Error('API de prueba no disponible.');
}
async function stop(child){if(child.exitCode!==null)return;await new Promise(r=>{child.once('exit',r);child.kill('SIGTERM');});}
function client(base){return async(path,body,method='POST')=>{
  const response=await fetch(base+path,body?{method,headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)}:{});
  const value=await response.json();assert.ok(response.ok,`${path}: ${response.status} ${value?.error??''}`);return value;
};}

for(const multi of [false,true])test(`API aislada ${multi?'multiedad':'una edad'}: matrícula, descargas y recuperación`,{timeout:90000},async()=>{
  const {base,child}=await start(),api=client(base);
  try{
    assert.equal((await api('/api/product-mode')).mode,null);
    await api('/api/product-mode',{mode:'documents'},'PUT');
    assert.equal((await fetch(base+'/api/product-mode',{method:'PUT',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({mode:'documents',teacherId:randomUUID()})})).status,422);
    const incomplete=await api('/api/pilot/setup');assert.equal(incomplete.configured,false);
    await api('/api/pilot/setup',{teacherName:'Docente de prueba',institutionName:'Borrador ficticio',year:2026,ages:multi?[3,4]:undefined},'PUT');
    if(multi)assert.deepEqual((await api('/api/pilot/setup')).draft.ages,[3,4]);
    let classroomId;const {startsOn,endsOn}=pilotSchoolYearDefaults(2026);
    if(multi){
      const c=await api('/api/document-generator/setup',{clientRequestId:randomUUID(),teacherConfirmed:true,teachingMode:'single_teacher_multi_age',teacherName:'Docente de prueba',institutionName:'Colegio de prueba',section:'Grupo de prueba',ages:[3,4,5],year:2026,startsOn,endsOn,calendarPolicy:'national-2026',ugel:'UGEL ficticia',createLogo:true,logoInitials:'QA'});classroomId=c.classroomId;
      for(const age of [3,4,5])await api('/api/multi-age/roster/import',{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId,expectedRevision:1,students:[{firstName:`Niño ${age}`,lastName:'Ficticio'}],age});
    }else{
      const c=await api('/api/pilot/setup',{teacherName:'Docente de prueba',institutionName:'Colegio de prueba',section:'Grupo de prueba',age:4,year:2026,startsOn,endsOn,castellanoL2Applicable:false,religionApplicable:false});classroomId=c.dashboard.profile.classroom_id;
      await api('/api/students/import',{clientRequestId:randomUUID(),students:[{firstName:'Niña',lastName:'Ficticia',birthDate:null}]});
      await api('/api/classroom/settings',{confirmEnrollment:true,classroomId},'PUT');
    }
    const c=await api('/api/document-generator/context');assert.equal(c.classroomId,classroomId);assert.equal(c.students.length,multi?3:1);
    for(const kind of ['roster','diagnostic','observations','evaluation','conclusions','family','attendance']){
      const r=await fetch(base+`/api/document-generator/formats/${kind}.docx?studentId=${c.students[0].id}&period=2&month=4`,{headers:{origin:base}});
      assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');
      const filename=downloadNameFromDisposition(r.headers.get('content-disposition'));
      assert.ok(filename.includes(c.students[0].name));assert.ok(filename.includes(`Aula ${c.section}`));assert.ok(filename.includes(String(c.year)));
      if(kind==='attendance')assert.ok(filename.includes(`${c.year}-04`));
      if(['observations','evaluation','conclusions','family'].includes(kind))assert.ok(filename.includes('B02'));
      assert.equal(r.headers.get('access-control-expose-headers'),'content-disposition');
      const zip=await JSZip.loadAsync(await r.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');assert.ok(xml.includes(c.students[0].name));
      if(multi&&kind==='diagnostic'){assert.ok(xml.includes('Grupo de 3 años'));assert.ok(!xml.includes('Grupo de 4 años'));assert.ok(!xml.includes('Grupo de 5 años'));}
    }
    assert.equal((await fetch(base+`/api/document-generator/formats/family.docx?studentId=${randomUUID()}`)).status,422);
    const {workshops}=await api(`/api/document-generator/workshops?age=${multi?3:4}`);assert.ok(workshops.length);
    const w=workshops.find(w=>w.printable);assert.ok(w);
    const guide=await fetch(base+`/api/document-generator/workshops/${w.id}.docx?age=${multi?3:4}`);assert.equal(guide.status,200);
    const pdf=await fetch(base+`/api/document-generator/workshops/${w.id}.pdf?age=${multi?3:4}`);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');
    assert.match(downloadNameFromDisposition(guide.headers.get('content-disposition')),/^Taller - .* - Guía - [34] años - /);
    assert.match(downloadNameFromDisposition(pdf.headers.get('content-disposition')),/^Taller - .* - Materiales - [34] años - /);
    if(multi)for(const extension of ['docx','pdf'])assert.equal((await fetch(base+`/api/document-generator/workshops/${w.id}.${extension}?age=3&studentId=${c.students.find(s=>s.age===4).id}`)).status,422);
    assert.equal((await api('/api/product-mode')).mode,'documents');
    if(multi){
      const roster=await api('/api/multi-age/state');const child=roster.workspace.students[0];
      const photo=await sharp({create:{width:2,height:2,channels:3,background:'#087d96'}}).png().toBuffer();
      await api(`/api/students/${child.id}/photo`,{media:{mimeType:'image/png',base64:photo.toString('base64')}},'PUT');
      const savedPhoto=await fetch(base+`/api/students/${child.id}/photo`);assert.equal(savedPhoto.status,200);assert.equal(savedPhoto.headers.get('cache-control'),'private, no-store');
      await api('/api/multi-age/corrections/student',{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:child.id,firstName:child.first_name,lastName:'De prueba',preferredName:child.preferred_name,birthDate:child.birth_date,age:child.age,reason:'Corrección ficticia de QA',impactsAcknowledged:true,expectedAssignmentId:child.assignment_id,expectedStudentFingerprint:child.correction_fingerprint});
      await api('/api/multi-age/roster/enrollment',{clientRequestId:randomUUID(),classroomId,studentId:child.id,teacherConfirmed:true,status:'inactive',expectedStatus:'active'});
      assert.ok((await api('/api/students/inactive')).students.some(s=>s.id===child.id));
      await api('/api/multi-age/roster/enrollment',{clientRequestId:randomUUID(),classroomId,studentId:child.id,teacherConfirmed:true,status:'active',expectedStatus:'inactive'});
      const turn=await api('/api/multi-age/generation',{clientRequestId:randomUUID(),kind:'conversation',classroomId,expectedRevision:0,text:'Disponemos de patio y bloques. Quiero juegos compartidos con acompañamiento por turnos.'});
      await api('/api/multi-age/conversation/decision',{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId,expectedRevision:0,action:'include',turnId:turn.id});
      const conversation=await api(`/api/multi-age/conversation?classroomId=${classroomId}`);assert.equal(conversation.decisions.messages.length,1);
      assert.ok(conversation.decisions.messages[0].text.includes('patio y bloques'));
      assert.ok((await api('/api/document-generator/context')).planningContext[0].includes('patio y bloques'));
      const state=await api('/api/multi-age/state');assert.equal(state.workspace.students.length,3);assert.equal(state.diagnostic.ready,false);
      assert.ok(state.diagnostic.students.every(s=>!s.observations?.length));
      const annualJob=await api('/api/multi-age/generation',{kind:'annual',classroomId});assert.ok(Number.isFinite(Date.parse(annualJob.createdAt)));
      let generated;
      for(let i=0;i<80;i++){generated=await api(`/api/multi-age/generation/${annualJob.id}`);if(generated.status==='ready')break;await new Promise(r=>setTimeout(r,100));}
      assert.equal(generated.status,'ready');assert.equal(generated.createdAt,annualJob.createdAt);
      const used=await api('/api/multi-age/document-year/use',{teacherConfirmed:true,classroomId,generationJobId:annualJob.id});
      assert.equal((await api('/api/multi-age/document-year/use',{teacherConfirmed:true,classroomId,generationJobId:annualJob.id})).planId,used.planId);
      const planning=(await api('/api/multi-age/state')).planning,plan=planning.plans.find(p=>p.status==='active'),slot=planning.calendar.projects[0];
      const annualDocument=await api(`/api/multi-age/documents/annual_plan/${plan.id}`);assert.equal(annualDocument.documentPresentationVersion,2);
      const annualWord=await fetch(base+`/api/multi-age/documents/annual_plan/${plan.id}.docx`);assert.equal(annualWord.status,200);
      const annualXml=await (await JSZip.loadAsync(await annualWord.arrayBuffer())).file('word/document.xml').async('string');assert.match(annualXml,/Dónde se trabajan las competencias/);
      const input={classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,expectedPlanRevision:plan.revision,selectedDates:slot.instructional_dates.slice(0,2),teacherConfirmed:true};
      const readPath=`/api/multi-age/document-project?classroomId=${classroomId}&annualPlanId=${plan.id}&annualSlotId=${slot.slot_id}`;
      assert.equal(await api(readPath),null);
      const forged=await fetch(base+'/api/multi-age/document-project/start',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({...input,teacherId:randomUUID()})});assert.equal(forged.status,403);
      await api('/api/multi-age/document-project/start',input);
      let prepared;
      for(let i=0;i<120;i++){prepared=await api(readPath);if(prepared.status!=='running')break;await new Promise(r=>setTimeout(r,100));}
      assert.equal(prepared.status,'succeeded');assert.equal(prepared.completed,2);
      assert.equal((await api('/api/multi-age/state')).workspace.activities.length,2);
      const projectWord=await fetch(base+`/api/multi-age/documents/project/${prepared.project_id}.docx`);assert.equal(projectWord.status,200);
      assert.match(downloadNameFromDisposition(projectWord.headers.get('content-disposition')),/^P01 - /);
      const projectXml=await (await JSZip.loadAsync(await projectWord.arrayBuffer())).file('word/document.xml').async('string');
      const dailyRoute=(await api(`/api/multi-age/documents/project/${prepared.project_id}`)).content.documentPlanning.dailyRoute;
      assert.match(projectXml,/Cómo revisaremos el proyecto al finalizar/);assert.match(projectXml,/Ruta breve de actividades/);assert.match(projectXml,/Propuesta del día/);assert.match(projectXml,/Planificamos el proyecto con los niños/);assert.match(projectXml,/Materiales/);
      const bundle=await fetch(base+`/api/multi-age/documents/project/${prepared.project_id}/bundle.zip`,{headers:{origin:base}});
      assert.equal(bundle.status,200);assert.equal(bundle.headers.get('content-type'),'application/zip');assert.equal(bundle.headers.get('cache-control'),'private, no-store');
      assert.match(downloadNameFromDisposition(bundle.headers.get('content-disposition')),/^P01 - .*Proyecto y actividades.zip$/);
      const bundleZip=await JSZip.loadAsync(await bundle.arrayBuffer()),files=Object.keys(bundleZip.files).filter(name=>!bundleZip.files[name].dir);
      assert.equal(files.length,3);assert.ok(files[0].startsWith('01 Proyecto/P01 - '));assert.ok(files[1].startsWith('02 Actividades/P01 - A01 - '));assert.ok(files[2].startsWith('02 Actividades/P01 - A02 - '));
      const bundledMaster=await JSZip.loadAsync(await bundleZip.file(files[0]).async('nodebuffer'));assert.equal(await bundledMaster.file('word/document.xml').async('string'),projectXml);
      assert.equal((await fetch(base+`/api/multi-age/documents/project/${randomUUID()}/bundle.zip`)).status,403);
      const saved=(await api('/api/multi-age/state')).workspace.activities;
      for(const activity of saved){
        const content=(await api(`/api/multi-age/documents/activity/${activity.id}`)).content;
        const download=await fetch(base+`/api/multi-age/documents/activity/${activity.id}.docx`);assert.equal(download.status,200);
        assert.ok(downloadNameFromDisposition(download.headers.get('content-disposition')).startsWith(`P01 - A${String(content.position).padStart(2,'0')} - `));
        const activityXml=await (await JSZip.loadAsync(await download.arrayBuffer())).file('word/document.xml').async('string');assert.match(activityXml,/Qué harán los niños y cómo acompañarlos/);
        assert.ok(projectXml.includes(content.title));assert.ok(projectXml.includes(dailyRoute.find(day=>day.occursOn===content.occursOn).mainAction));
        assert.ok(projectXml.includes(content.occursOn.split('-').reverse().join('/')));
      }
    }else{
      const progress=await api('/api/diagnostics/progress');assert.equal(progress.observation_count,0);
    }
  }finally{await stop(child);}
});
