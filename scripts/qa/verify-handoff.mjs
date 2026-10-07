// Explicit local QA, fictitious classroom and fixture provider only.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
const root="http://127.0.0.1:8798", file=".local/handoff-http.json";
const stage=process.argv[2];
async function api(path,body,method="POST"){
  const r=await fetch(root+path,body===undefined?{}:{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json();assert.ok(r.ok,`${path}: ${r.status} ${data.message??data.error??""}`);return data;
}
const dashboard=await api("/api/dashboard");assert.equal(dashboard.profile.teacher_name,"Docente QA ficticia");assert.equal(dashboard.students.length,2);
let state;try{state=JSON.parse(await readFile(file,"utf8"));}catch{state={fictitious:true};}
const workspace=await api("/api/period-evaluations/workspace"),classroomId=workspace.classrooms[0].id,periodId=workspace.periods.find(p=>p.ordinal===3).id;
const scope={classroomId,periodId},query=new URLSearchParams(scope).toString();
async function batch(kind,extra={}){let job=await api("/api/period-evaluations/batches",{...scope,kind,refresh:true,...extra});for(let i=0;i<30&&job.status==="queued";i++)job=await api(`/api/period-evaluations/batches/${job.id}/run`,scope);assert.equal(job.status,"ready");return job;}
async function save(job){return api(`/api/period-evaluations/batches/${job.id}/save`,{...scope,expectedRevision:job.revision,items:job.items});}
if(stage==="evidence"){
  assert.ok(!state.evidence,"Do not repeat the evidence fixture");
  const block=dashboard.today.blocks.find(b=>b.activity_id&&b.criteria.length),criterion=block.criteria[0],moment=block.pedagogical_blocks.find(m=>m.observations?.length);
  state.activityId=block.activity_id;state.competencyId=criterion.competency_v4_id;
  const overview=await api(`/api/period-evaluations/overview?${query}`);state.students=overview.students;
  const prior=(await api("/api/ordinary-observations")).observations;
  for(const student of overview.students){const body={studentId:student.id,clientRequestId:prior.find(o=>o.student_id===student.id&&o.activity_id===block.activity_id)?.client_request_id??randomUUID(),sourceKind:"guided",activityId:block.activity_id,criterionId:criterion.id,momentId:moment.id,rawText:"Dijo: elegí estos materiales para construir mi casa y mostró cómo los organizó."};const first=await api("/api/ordinary-observations",body),again=await api("/api/ordinary-observations",body);assert.equal(first.observation.id,again.observation.id);assert.equal(again.created,false);}
  const today=await api(`/api/period-evaluations/observe-today?activityId=${block.activity_id}&competencyId=${criterion.competency_v4_id}`);assert.equal(today.students.filter(s=>s.has_evidence).length,2);
  const wordSource=await api(`/api/documents/activity/${block.activity_id}`);assert.equal(wordSource.document.registered_evidence.length,2);
  await api("/api/diagnostics/spontaneous-observations/matrix",{studentId:overview.students[0].id,competencyId:criterion.competency_v4_id,contextLabel:"Juego libre",observationText:"Dijo que prefería construir una casa y explicó a su compañera dónde pondría la puerta."});
  const photo=await sharp({create:{width:80,height:80,channels:3,background:"#087d96"}}).jpeg().toBuffer();await api(`/api/students/${overview.students[0].id}/photo`,{media:{base64:photo.toString("base64"),mimeType:"image/jpeg"}},"PUT");
  state.evidence={idempotency:true,today:true,word:true,no_automatic_grade:true};
}else if(stage==="grades"){
  for(const student of state.students){const detail=await api(`/api/period-evaluations/detail?${query}&studentId=${student.id}&competencyId=${state.competencyId}`);const body={...scope,studentId:student.id,competencyId:state.competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:detail.draft?.revision??null,provisionalLevel:"B",achievementLevel:"B",teacherAnalysis:"Explicó su elección durante el juego con preguntas abiertas de la docente.",teacherJustification:"La docente revisó esta situación concreta. Continuará ofreciendo otras oportunidades para observar."};const draft=await api("/api/period-evaluations/save-draft",body);await api("/api/period-evaluations/confirm",{...body,expectedDraftRevision:draft.draft_revision});}
  state.grades=true;
}else if(stage==="conclusions")state.conclusions=await batch("conclusions");
else if(stage==="families"){
  await save(state.conclusions);state.families=await batch("family");
}else if(stage==="word"){
  state.families=await save(state.families);await mkdir(".local/handoff-words",{recursive:true});
  for(const item of state.families.items){const r=await fetch(root+`/api/documents/family_report/${item.saved_id}/download`);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer()),zip=await JSZip.loadAsync(bytes),xml=await zip.file("word/document.xml").async("string");for(const text of ["5 años","Docente QA ficticia","Bimestre 3",item.proposal.sections[0].progress_summary,"Valoración confirmada por la docente"]){assert.ok(xml.includes(text),text);}if(item.student_id===state.students[0].id)assert.ok(Object.keys(zip.files).some(p=>p.startsWith("word/media/")));await writeFile(`.local/handoff-words/${item.student_id}.docx`,bytes);}
  state.word={canonical_conclusions:true,confirmed_levels:true,age:true,private_photo:true};
}else if(stage==="closure"){
  const overview=await api(`/api/period-evaluations/overview?${query}`);const closed=await api("/api/period-evaluations/close",{...scope,expectedCurrentVersionId:overview.closure.current_version_id,expectedSourceFingerprint:overview.closure.source_fingerprint});
  const blocked=await fetch(root+"/api/period-evaluations/batches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...scope,kind:"conclusions",regenerate:true})});assert.equal(blocked.status,409);
  await api("/api/period-evaluations/reopen",{...scope,expectedCurrentVersionId:closed.id,reason:"Corrección ficticia para comprobar el recierre versionado."});
  const first=state.students[0],detail=await api(`/api/period-evaluations/detail?${query}&studentId=${first.id}&competencyId=${state.competencyId}`),body={...scope,studentId:first.id,competencyId:state.competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:null,provisionalLevel:"A",achievementLevel:"A",teacherAnalysis:"Revisión ficticia: explicó su elección y su organización durante el juego.",teacherJustification:"Corrección docente ficticia tras contrastar el registro."};
  const draft=await api("/api/period-evaluations/save-draft",body);await api("/api/period-evaluations/confirm",{...body,expectedDraftRevision:draft.draft_revision});
  const refreshed=(await api(`/api/period-evaluations/batches?${query}&kind=family`)).job;assert.equal(refreshed.items.length,1);assert.equal(refreshed.items[0].student_id,state.students[1].id);
  await save(await batch("conclusions",{studentId:first.id,competencyId:state.competencyId}));await save(await batch("family",{studentId:first.id}));
  const next=await api(`/api/period-evaluations/overview?${query}`),reclosed=await api("/api/period-evaluations/close",{...scope,expectedCurrentVersionId:next.closure.current_version_id,expectedSourceFingerprint:next.closure.source_fingerprint});assert.equal(reclosed.version,closed.version+1);
  const old=await api(`/api/documents/period_closure/${closed.id}`);assert.equal(old.document.content.entries.find(e=>e.student_id===first.id).achievement_level,"B");state.closure={blocked:true,explicit_reopen:true,selective:true,reclosed:true,immutable_old_level:true};
}else throw Error("Choose an explicit QA stage");
const counts=await(await fetch("http://127.0.0.1:8797/counts")).json();assert.equal(counts.paidCalls,0);state.counts=counts;await writeFile(file,JSON.stringify(state,null,2));console.log(JSON.stringify({stage,passed:true,...counts}));
