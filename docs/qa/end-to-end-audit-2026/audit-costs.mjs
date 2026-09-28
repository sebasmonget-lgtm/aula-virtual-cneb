// Libro de llamadas reales + escenarios EXPLÍCITOS, no simulación de resultados pedagógicos.
import { readFile, writeFile } from 'node:fs/promises';
import { estimateTextCost, estimateTranscriptionCost, estimateJevCost } from '../../../src/lib/ai-usage-service.mjs';
const root = new URL('./', import.meta.url);
const data = JSON.parse(await readFile(new URL('evidencias/final-ui-qa-snapshot.json', root), 'utf8'));
const events = data.tables.ai_usage_events.filter(row => row.teacher_id === 'd97b5d03-b64d-405e-9de5-ae6e407bf126').sort((a,b) => a.occurred_at.localeCompare(b.occurred_at));
const logs = (await readFile('.local/qa/end-to-end-audit-2026/api-retry.out.log','utf8')).split(/\r?\n/).flatMap(line => { try { const row=JSON.parse(line); return row.event === 'jev_decision' ? [row] : []; } catch { return []; } });
const calls = events.map(row => {
  const matches = logs.filter(log => log.workflow === row.workflow && log.model_effective === row.model && log.input_tokens === row.input_tokens && log.output_tokens === row.output_tokens && Math.abs(Number(row.cost_usd)-log.cost_usd) < 1e-10);
  return { ...row, cost_usd: Number(row.cost_usd), observed_status: 'usage_recorded', attempts: null,
    attempts_note: 'El ledger no correlaciona intentos ni errores por ID de negocio; no se inventa número de reintentos.',
    latency_ms: matches.length === 1 ? matches[0].latency_ms : null,
    latency_match: matches.length === 1 ? 'unique_token_workflow_cost_match_not_business_id' : matches.length ? 'ambiguous' : 'not_logged',
    other_billable_units: row.duration_seconds === null ? null : { audio_seconds: row.duration_seconds } };
});
const totals = { calls: calls.length, providerReportedUsd: 0, tariffEstimatedUsd: 0, unpricedCalls: 0, mixedLedgerUsd: 0, perProvider: {} };
for (const row of calls) {
  totals.perProvider[row.provider] ??= {calls:0,inputTokens:0,cachedInputTokens:0,outputTokens:0,costUsd:0};
  const p=totals.perProvider[row.provider]; p.calls++; p.inputTokens+=row.input_tokens??0; p.cachedInputTokens+=row.cached_input_tokens??0; p.outputTokens+=row.output_tokens??0; p.costUsd+=row.cost_usd;
  if (row.cost_source === 'provider') totals.providerReportedUsd += row.cost_usd;
  else if (row.cost_source === 'estimate') totals.tariffEstimatedUsd += row.cost_usd;
  else totals.unpricedCalls++;
  totals.mixedLedgerUsd += row.cost_usd;
}
const latencies=logs.map(row=>row.latency_ms).filter(Number.isFinite).sort((a,b)=>a-b);
const percentile = p => latencies[Math.max(0,Math.ceil(latencies.length*p)-1)];
totals.jevLatencyMs={count:latencies.length,min:latencies[0],p50:percentile(.5),p95:percentile(.95),max:latencies.at(-1)};
const csvKeys=['occurred_at','id','workflow','provider','model','input_tokens','cached_input_tokens','output_tokens','duration_seconds','cost_source','pricing_version','cost_usd','latency_ms','latency_match','attempts'];
const escape = value => value===null||value===undefined ? '' : '"'+String(value).replaceAll('"','""')+'"';
await writeFile(new URL('llamadas-ia.json',root),JSON.stringify({scope:'Solo identidad QA, eventos realmente registrados',totals,calls},null,2));
await writeFile(new URL('costos.csv',root),'\uFEFF'+csvKeys.join(',')+'\n'+calls.map(row=>csvKeys.map(key=>escape(row[key])).join(',')).join('\n')+'\n');
// Hipótesis de tokens por salida NO medida: todos los modelos Standard, sin caché, <=272k.
const hypothetical=[
  ['annual_formal','gpt-6-sol',12000,4000,[1,1,1]],
  ['project','gpt-6-sol',14000,5000,[6,12,20]],
  ['unit','gpt-6-sol',14000,5000,[2,4,8]],
  ['workshop_master','gpt-6-sol',10000,3000,[4,12,20]],
  ['activity','gpt-6-luna',10000,2200,[80,150,220]],
  ['workshop','gpt-6-luna',7000,1600,[40,120,220]],
  ['assessment_master','gpt-6-sol',12000,2500,[4,4,4]],
  ['assessment','gpt-6-luna',10000,1400,[15*4*6,15*4*8,15*4*12]],
  ['descriptive_conclusion','gpt-6-luna',7000,600,[15*4*6,15*4*8,15*4*12]],
  ['family_report','gpt-6-luna',9000,1800,[60,60,60]],
  ['classroom_period_report','gpt-6-sol',9000,2000,[4,4,4]],
  ['bimester_replan',null,0,0,[3,3,3]],
  ['observation_rewrite','gpt-6-luna',2500,300,[30,180,540]],
];
const jevPerObservation = totals.perProvider.openrouter.costUsd / 23;
const scenarios = ['bajo','realista','intensivo'].map((name,index)=>{
  const multiplier=[1.05,1.2,1.75][index];
  const lines=hypothetical.map(([workflow,model,inputTokens,outputTokens,counts])=>({workflow,model,inputTokens,outputTokens,baseGenerations:counts[index],expectedCallsIncludingRegeneration:model ? counts[index]*multiplier : 0,regenerationMultiplier:multiplier,unitEstimatedUsd:model ? estimateTextCost({model,inputTokens,outputTokens}) : 0,annualEstimatedUsd:model ? estimateTextCost({model,inputTokens,outputTokens})*counts[index]*multiplier : 0,basis:model ? 'Hypothetical token envelope; output NOT generated in E2E' : 'Current replan implementation is deterministic code; not a model call'}));
  const setupOpenAi=events.filter(row=>row.provider==='openai').reduce((sum,row)=>sum+Number(row.cost_usd),0);
  const openaiText=setupOpenAi*multiplier+lines.reduce((sum,row)=>sum+row.annualEstimatedUsd,0);
  const observations=[300,900,1800][index];
  const imageCalls=hypothetical.find(row=>row[0]==='project')[4][index]+hypothetical.find(row=>row[0]==='unit')[4][index];
  const sheetCalls=[40,120,220][index];
  const jevObservationUsd=observations*jevPerObservation*multiplier;
  const jevOtherUsd=(imageCalls+sheetCalls)*estimateJevCost(4000)*multiplier;
  const audioMinutes=[180,600,1500][index];
  const audioUsd=estimateTranscriptionCost(audioMinutes*60);
  const usd=openaiText+jevObservationUsd+jevOtherUsd+audioUsd;
  return {name,students:15,instructionalMonths:10,calendarMonths:12,regenerationMultiplier:multiplier,observations,imageCalls,sheetCalls,audioMinutes,
    lines,diagnosticAndAnnualPreplanAnchorUsd:setupOpenAi,openaiTextEstimatedUsd:openaiText,openaiAudioEstimatedUsd:audioUsd,
    jevObservationsEstimatedUsd:jevObservationUsd,jevImagesAndSheetsEstimatedUsd:jevOtherUsd,annualClassroomEstimatedUsd:usd,
    perInstructionalMonthEstimatedUsd:usd/10,perCalendarMonthEstimatedUsd:usd/12,perStudentYearEstimatedUsd:usd/15,
    limitations:['No yearly E2E calibration: blocked at annual confirmation','No audio, project, assessment or family report generated','Regeneration frequency is assumption, not observed behavior','Jev image/sheet input envelope 4k is assumed','Includes only model/gateway API calls; excludes hosting, storage, database, support, tax and currency conversion']};
});
const sensitivity= { solFallbackAssessmentCalls:60, extraUsdIfEachReplacesLuna:60*(estimateTextCost({model:'gpt-6-sol',inputTokens:10000,outputTokens:1400})-estimateTextCost({model:'gpt-6-luna',inputTokens:10000,outputTokens:1400})),
  note:'If a failed Luna call is also billed, add that initial call separately; no fallback occurred in measured flows.' };
await writeFile(new URL('evidencias/cost-scenarios.json',root),JSON.stringify({at:new Date().toISOString(),currency:'USD',pricingVersion:'2026-09-27-standard',status:'HYPOTHETICAL_NOT_ANNUAL_MEASUREMENT',jevObservedUnitUsd:jevPerObservation,totals,scenarios,sensitivity},null,2));
console.log(JSON.stringify({totals,scenarios:scenarios.map(row=>({name:row.name,annual:row.annualClassroomEstimatedUsd,monthly10:row.perInstructionalMonthEstimatedUsd,perStudent:row.perStudentYearEstimatedUsd})),sensitivity},null,2));
