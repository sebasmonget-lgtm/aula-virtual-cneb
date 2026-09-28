import { DIMENSIONS } from "./gate.mjs";
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const quantile = (xs, p) => [...xs].sort((a,b) => a-b)[Math.ceil(xs.length*p)-1];
export function decideReduced({ rows, metrics, deterministic_gates }) {
  if (!Array.isArray(rows) || rows.length !== 24 || new Set(rows.map(r=>r.blind_id)).size !== 24)
    throw new Error("Reduced review requires 24 distinct outputs / 12 pairs.");
  const grouped = new Map();
  for (const r of rows) {
    if (!["A","B"].includes(r.arm) || !Array.isArray(r.passes) || r.passes.length !== 2)
      throw new Error("Two declared current-agent passes required.");
    for (const p of r.passes) if (p.scores.length !== 6 || p.scores.some(s=>!Number.isInteger(s)||s<0||s>4) || !Number.isInteger(p.edits) || p.edits < 0)
      throw new Error("Invalid review scores.");
    const pairs = grouped.get(r.case_id) ?? new Set();
    if (pairs.has(r.arm)) throw new Error("Duplicate arm for case.");
    pairs.add(r.arm); grouped.set(r.case_id,pairs);
  }
  if (grouped.size !== 12 || [...grouped.values()].some(p=>p.size!==2)) throw new Error("Incomplete reduced pairs.");
  const scored = rows.map(r=>({ ...r, scores:Object.fromEntries(Object.keys(DIMENSIONS).map((d,i)=>
    [d,Math.min(...r.passes.map(p=>p.scores[i]))])), edits:Math.max(...r.passes.map(p=>p.edits)) }));
  for (const r of scored) r.score=Object.entries(DIMENSIONS).reduce((s,[d,w])=>s+r.scores[d]*w,0);
  const arms = Object.fromEntries(["A","B"].map(arm=>{
    const subset=scored.filter(r=>r.arm===arm);
    return [arm,{...metrics[arm], mean_score:mean(subset.map(r=>r.score)),
      dimensions:Object.fromEntries(Object.keys(DIMENSIONS).map(d=>[d,mean(subset.map(r=>r.scores[d]))])),
      estimated_corrections:subset.reduce((s,r)=>s+r.edits,0),
      mean_estimated_corrections:mean(subset.map(r=>r.edits))}];
  }));
  const {A,B}=arms, delta=B.mean_score-A.mean_score;
  const noDrop=Object.keys(DIMENSIONS).every(d=>B.dimensions[d]>=A.dimensions[d]-.20);
  const efficiency=B.p95_latency_ms<=A.p95_latency_ms*.75 ||
    (A.unknown_billed_attempts===0 && B.unknown_billed_attempts===0 && B.median_cost_usd<=A.median_cost_usd*.75);
  // No claim of specialist approval, teacher timing or population validity from this reduced selected subset.
  const passes = arm=> deterministic_gates?.[arm]?.valid_outputs===12 &&
    deterministic_gates[arm].risk_defects===0 && deterministic_gates[arm].serious_hard_vetoes===0;
  let winner=passes("A") ? "A" : null;
  if (passes("B") && (!passes("A") || (delta>=.20 && noDrop) ||
      (Math.abs(delta)<=.20 && efficiency && B.mean_estimated_corrections<=A.mean_estimated_corrections))) winner="B";
  let seed=20260928;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0; return seed/4294967296;};
  const differences=[...grouped.keys()].map(id=>scored.find(r=>r.case_id===id&&r.arm==="B").score-scored.find(r=>r.case_id===id&&r.arm==="A").score);
  const bootstrap=Array.from({length:2000},()=>mean(Array.from({length:12},()=>differences[Math.floor(random()*12)])));
  return {validation_mode:"provisional_current_agent_reduced", winner, B_experimental:winner!=="B",
    human_validation_pending:true, independent_evaluators:false, paid_review_calls:0,
    corrections_are_agent_estimates:true, measured_teacher_minutes:null, A,B,
    paired_mean_delta:delta, bootstrap_95_percent_interval:[quantile(bootstrap,.025),quantile(bootstrap,.975)],
    bootstrap_seed:20260928, deterministic_gates, scored,
    rule:{quality_delta_min:.20, maximum_dimension_drop:.20, efficiency_reduction_min:.25,
      no_dimension_drop:noDrop, efficiency_gate:efficiency},
    reason:winner===null?"Neither reduced candidate passed; keep existing confirmed flow.":
      winner==="B"?"B meets preregistered thresholds in the explicitly amended provisional subset.":
      "B does not clearly satisfy the preregistered improvement/efficiency rule; retain A conservatively."};
}
