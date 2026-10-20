import test from 'node:test';import assert from 'node:assert/strict';
import{analysisFailure,analysisOutcome,nextAnalysisTasks,allowManualAnalysisRetry}from'./evaluation-analysis-recovery.mjs';
const task=i=>({student_id:`child${i}`,competency_id:'COM_ORAL'});
const k=i=>`child${i}:COM_ORAL`;
const job=()=>({tasks:Array.from({length:120},(_,i)=>task(i)),results:Array.from({length:41},(_,i)=>task(i)),failures:{}});
test('un lote histórico de 41/120 retoma ocho faltantes sin tocar los guardados',()=>{
 const j=job();assert.deepEqual(nextAnalysisTasks(j,8),j.tasks.slice(41,49));assert.equal(analysisOutcome(j).status,'queued');assert.equal(j.results.length,41);
});
test('respuesta recibida inválida: primero nuevos análisis, un solo reintento automático',()=>{
 const j=job();j.failures[k(41)]=analysisFailure(Error('Texto privado'),'validation');
 assert.deepEqual(nextAnalysisTasks(j,8),j.tasks.slice(42,50));assert.deepEqual(analysisOutcome(j),{status:'queued',error:null});
 j.results.push(...j.tasks.slice(42));assert.deepEqual(nextAnalysisTasks(j,8),[task(41)]);
 j.failures[k(41)]=analysisFailure(Error('Otra respuesta inválida'),'validation',j.failures[k(41)]);
 assert.deepEqual(nextAnalysisTasks(j,8),[]);assert.equal(analysisOutcome(j).status,'paused');assert.match(analysisOutcome(j).error,/1 análisis pendiente/);
});
test('timeout no se repite automáticamente; los otros continúan y la incertidumbre queda explícita',()=>{
 const j=job();j.failures[k(41)]=analysisFailure({reason:'timeout'},'generation');
 assert.equal(analysisOutcome(j).status,'queued');assert.equal(nextAnalysisTasks(j,8).some(t=>t.student_id==='child41'),false);
 j.results.push(...j.tasks.slice(42));assert.equal(analysisOutcome(j).status,'uncertain');assert.equal(nextAnalysisTasks(j,8).length,0);
});
test('saldo, acceso y rate limit detienen la generación sin multiplicar llamadas',()=>{
 for(const reason of ['insufficient_quota','authentication_failed','rate_limited']){
  const j=job();j.failures[k(41)]=analysisFailure({reason},'generation');assert.equal(analysisOutcome(j).status,'paused');
 }
});
test('errores de guardado/contexto y conflictos nunca se clasifican como respuesta regenerable',()=>{
 assert.equal(analysisFailure(Error('SQL privado'),'save').kind,'save_failed');
 assert.equal(analysisFailure(Error('SQL privado'),'prepare').kind,'context_unavailable');
 assert.equal(analysisFailure({reason:'version_conflict'},'save').kind,'sources_changed');
 assert.deepEqual(Object.keys(analysisFailure(Error('token secreto'),'validation')).sort(),['attempts','kind','total_attempts']);
});
test('reintento explícito abre otro presupuesto acotado y conserva el conteo histórico',()=>{
 const j=job();j.results.push(...j.tasks.slice(42));j.failures[k(41)]={kind:'invalid_response',attempts:2,total_attempts:2};
 j.failures=allowManualAnalysisRetry(j.failures);assert.deepEqual(nextAnalysisTasks(j,8),[task(41)]);
 const next=analysisFailure(Error(),'validation',j.failures[k(41)]);assert.equal(next.attempts,1);assert.equal(next.total_attempts,3);
 j.results.push(task(41));assert.deepEqual(analysisOutcome(j),{status:'ready',error:null});
});
