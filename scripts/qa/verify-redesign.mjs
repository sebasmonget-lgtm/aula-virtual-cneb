// Explicit local fixture only. Never uses .env files or a remote endpoint.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
const root="http://127.0.0.1:8798";
async function api(path,body,method="POST"){
  const response=await fetch(root+path,body===undefined?undefined:{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const value=await response.json();assert.ok(response.ok,`${path}: ${response.status} ${value.error??""}`);return value;
}
const setup=await api("/api/pilot/setup");
if(!setup.configured)await api("/api/pilot/setup",{teacherName:"Docente QA ficticia",institutionName:"Jardín QA ficticio",section:"QA rediseño",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31",castellanoL2Applicable:false,religionApplicable:false});
let plans=await api("/api/annual-plans/current");
if(!plans.active){
  const start=await api("/api/annual-journey/start");
  const job=await api("/api/annual-journey/prepare",{teacherIdeas:"Tenemos bloques y un patio",sourceFingerprint:start.snapshot.source_fingerprint,
    ...(plans.draft?{draftId:plans.draft.id,expectedRevision:plans.draft.revision}:{}),experienceContract:true,contextItems:[{text:"Tenemos bloques y un patio"}],historicalProjects:[{title:"Familia"}],conversation:[{role:"teacher",text:"Tenemos bloques y un patio"}]});
  let finished;for(let i=0;i<8;i++){finished=await api(`/api/annual-journey/jobs/${job.id}/run`,{});if(finished.status==="succeeded")break;assert.ok(["queued","running"].includes(finished.status),finished.error);}assert.equal(finished.status,"succeeded");
  plans=await api("/api/annual-plans/current");
  await api(`/api/annual-journey/${plans.draft.id}/confirm`,{expectedRevision:plans.draft.revision,interpretationsReviewed:true,futureCoverageAcknowledged:true});
  plans=await api("/api/annual-plans/current");
}
const plan=plans.active;assert.equal(plan.project_slots.length,15);assert.ok(plan.proposal.proposed_experiences.length<15);
const proposal=plan.proposal.proposed_experiences[0];
const job=await api("/api/preparation/projects",{annualPlanId:plan.id,proposalId:proposal.proposal_id,additionalContext:"Tenemos bloques y un patio"});
if(job.status==="failed")await api(`/api/preparation/${job.id}/retry`,{});
async function done(id){for(let i=0;i<160;i++){const status=await api(`/api/preparation/${id}`);if(["failed","uncertain"].includes(status.status))throw Error(status.error);if(status.status==="succeeded")return status;await new Promise(resolve=>setTimeout(resolve,500));}throw Error("QA job timeout");}
const prepared=await done(job.id),project=(await api(`/api/project-flow/${prepared.project_id}`)).experience;
const confirmation=project.status==="active"?{block_job:await api("/api/preparation/activities",{experienceId:project.id})}:await api(`/api/project-flow/${project.id}/confirm`,{expectedRevision:project.revision});
const block=await done(confirmation.block_job.id),review=await api(`/api/preparation/${block.id}/review`);
assert.equal(review.activities.length,block.total);assert.ok(block.total>0);
if(!block.approved_at)await api(`/api/preparation/${block.id}/approve`,{reviewed:true,activities:review.activities.map(row=>({id:row.id,expectedRevision:row.revision}))});
const exports=await api("/api/documents/export",{}),ready=await done(exports.id);assert.ok(ready.parts.length);
const zip=await fetch(root+"/api/documents/artifacts/zip",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({artifactIds:ready.parts[0]})});assert.equal(zip.status,200);assert.ok((await zip.arrayBuffer()).byteLength>1000);
const counts=await (await fetch("http://127.0.0.1:8797/counts")).json();assert.equal(counts.paidCalls,0);
const result={fixture:true,annual_slots:15,future_projects:plan.proposal.proposed_experiences.length,activity_block:review.activities.length,exported_documents:ready.total,zip_parts:ready.parts.length,...counts};
await mkdir(".local/qa-redesign-20261005-results",{recursive:true});await writeFile(".local/qa-redesign-20261005-results/verification.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
