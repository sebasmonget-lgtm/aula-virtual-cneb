import test from "node:test";
import assert from "node:assert/strict";
import {decideReduced} from "./decide-reduced.mjs";
const fixture=()=>({rows:Array.from({length:12},(_,i)=>["A","B"].map(arm=>({case_id:`c${i}`,arm,blind_id:`${i}-${arm}`,
  passes:[1,2].map(()=>({scores:[4,4,4,4,4,4],edits:0}))}))).flat(),
  metrics:{A:{p95_latency_ms:100,median_cost_usd:1,unknown_billed_attempts:0},B:{p95_latency_ms:100,median_cost_usd:1,unknown_billed_attempts:0}},
  deterministic_gates:{A:{valid_outputs:12,risk_defects:0,serious_hard_vetoes:0},B:{valid_outputs:12,risk_defects:0,serious_hard_vetoes:0}}});
test("Reduced tie keeps A and explicitly disclaims independence",()=>{const r=decideReduced(fixture());assert.equal(r.winner,"A");assert.equal(r.independent_evaluators,false);assert.equal(r.human_validation_pending,true);});
test("B efficiency needs measured cost and cannot treat unknown attempts as zero",()=>{const f=fixture();f.metrics.B.median_cost_usd=.5;f.metrics.B.unknown_billed_attempts=1;assert.equal(decideReduced(f).winner,"A");f.metrics.B.unknown_billed_attempts=0;assert.equal(decideReduced(f).winner,"B");});
test("Reduced gate rejects missing/duplicate reviews and unbalanced arms",()=>{const f=fixture();f.rows[0].passes.pop();assert.throws(()=>decideReduced(f));const g=fixture();g.rows[1].arm="A";assert.throws(()=>decideReduced(g));});
test("Safety gate fails closed; two passes use conservative discrepancy reconciliation",()=>{const f=fixture();f.deterministic_gates.A.risk_defects=1;f.deterministic_gates.B.risk_defects=1;assert.equal(decideReduced(f).winner,null);const g=fixture();g.rows[0].passes[1].scores[0]=2;assert.equal(decideReduced(g).scored[0].scores.coherence,2);});
