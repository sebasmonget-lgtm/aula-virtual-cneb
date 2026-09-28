import {readFile,writeFile} from "node:fs/promises";
import {sha256} from "./cases.mjs";
import {reducedExperiment} from "./reduced.mjs";
import {decideReduced} from "./decide-reduced.mjs";
import {validateProjectMasterV3} from "../../src/lib/planning-contract-v3.mjs";
const dir=".local/test-results/project-master-f2/reduced";
const path=".local/test-results/project-master-f2/full/results.json";
const original=await readFile(path,"utf8"), state=JSON.parse(original);
const ledger=JSON.parse(await readFile(`${dir}/paid-completion-ledger.json`,"utf8"));
if (state.runs.filter(r=>r.status==="valid").length!==63 || ledger.runs.length!==2 || ledger.calls.length!==6)
  throw new Error("Unexpected preserved outputs or authorized completion count.");
const merged={...state,runs:[...state.runs,...ledger.runs]};
const {report}=reducedExperiment(merged);
const selected=report.selected.flatMap(c=>c.repetitions.flatMap(rep=>["A","B"].map(arm=>
  merged.runs.find(r=>r.case_id===c.case_id&&r.repetition===rep&&r.arm===arm&&r.status==="valid"))));
const reviews=[];
for (const pass of [1,2]) reviews.push(JSON.parse(await readFile(`evals/project-master/reviews-current-agent-pass${pass}.json`,"utf8")));
const gates=Object.fromEntries(["A","B"].map(arm=>[arm,{valid_outputs:0,risk_defects:0,serious_hard_vetoes:0}]));
const rows=[];
for(const r of selected){
  const c=state.cases.find(c=>c.id===r.case_id), peer=selected.find(p=>p.case_id===r.case_id&&p.arm!==r.arm);
  for(const field of ["input_hash","kb_hash","calendar_hash","retrieval_hash","provider_version","price_version","output_schema_hash"])
    if(!r[field] || r[field]!==peer[field]) throw new Error(`Frozen pair mismatch ${r.case_id}/${field}`);
  if(r.output_hash!==sha256(r.draft)) throw new Error("Saved output hash mismatch.");
  validateProjectMasterV3(r.draft,{instructionalDates:c.dates,allowedCompetencyIds:c.teacher_decisions.competency_ids});
  if (r.draft.activity_map.length!==c.dates.length || r.draft.activity_map.some((item,i)=>item.date!==c.dates[i]))
    throw new Error("Calendar completeness mismatch.");
  const blind_id=sha256(`reduced-blind:${r.case_id}:${r.repetition}:${r.arm}`).slice(0,24);
  const passes=reviews.map(p=>p.rows.find(x=>x.blind_id===blind_id));
  if(passes.some(p=>!p)) throw new Error(`Missing masked review ${blind_id}`);
  gates[r.arm].valid_outputs++;
  rows.push({case_id:r.case_id,arm:r.arm,repetition:r.repetition,blind_id,passes});
}
const result=decideReduced({rows,metrics:report.metrics,deterministic_gates:gates});
result.original_results_sha256=sha256(original);
result.original_valid_preserved=63;
result.additional_generations=2;
result.additional_model_requests=6;
result.additional_spent_usd=ledger.runs.reduce((s,r)=>s+r.cost_usd,0);
result.review_pass_hashes=reviews.map(sha256);
result.risk_audit_scope="Synthetic isolated files only; no child data, media or production writes. Not a staging RLS/Storage audit.";
result.limitations=report.limitations;
await writeFile(`${dir}/decision-current-agent.json`,`${JSON.stringify(result,null,2)}\n`);
if(await readFile(path,"utf8")!==original) throw new Error("Original changed during finalization.");
console.log(JSON.stringify({...result,scored:result.scored.map(r=>({case_id:r.case_id,arm:r.arm,score:r.score,edits:r.edits}))},null,2));
