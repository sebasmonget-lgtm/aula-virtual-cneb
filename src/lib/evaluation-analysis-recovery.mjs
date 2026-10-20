const key=task=>`${task.student_id}:${task.competency_id??'family'}`;
const blockers=new Set(['quota','authentication','rate_limited','provider_unavailable','context_unavailable','sources_changed']);

/** Only a received, rejected response may be regenerated automatically, once. */
export function analysisFailure(error,phase,prior=null){
  const reason=error?.reason;
  let kind;
  if(reason==='version_conflict'||['23505','40001','40P01'].includes(error?.code))kind='sources_changed';
  else if(reason==='insufficient_quota')kind='quota';
  else if(reason==='authentication_failed')kind='authentication';
  else if(reason==='rate_limited')kind='rate_limited';
  else if(phase==='prepare')kind='context_unavailable';
  else if(phase==='save')kind='save_failed';
  else if(phase==='validation'||error?.providerMetadata||reason==='structured_output_invalid')kind='invalid_response';
  else if(['timeout','response_pending'].includes(reason))kind='uncertain';
  else kind='provider_unavailable';
  return {kind,attempts:(prior?.attempts??0)+1,total_attempts:(prior?.total_attempts??0)+1};
}

export function nextAnalysisTasks(job,limit){
  if(Object.values(job.failures??{}).some(failure=>failure.attempts>0&&blockers.has(failure.kind)))return [];
  const saved=new Set(job.results.map(key));
  const pending=job.tasks.filter(task=>!saved.has(key(task)));
  const fresh=pending.filter(task=>!job.failures?.[key(task)]);
  const retry=pending.filter(task=>{const failure=job.failures?.[key(task)];return failure?.attempts===0||(failure?.kind==='invalid_response'&&failure.attempts<2);});
  return [...fresh,...retry].slice(0,limit);
}

export function analysisOutcome(job){
  const saved=new Set(job.results.map(key)),remaining=job.tasks.filter(task=>!saved.has(key(task)));
  if(!remaining.length)return {status:'ready',error:null};
  const failures=remaining.map(task=>job.failures?.[key(task)]).filter(Boolean);
  const blocked=failures.find(f=>f.attempts>0&&blockers.has(f.kind));
  if(blocked){
    const messages={quota:'No hay saldo disponible para continuar. Los análisis guardados se conservan.',authentication:'No se pudo acceder al servicio de análisis. Los análisis guardados se conservan.',rate_limited:'El servicio pidió esperar. Retoma los pendientes en unos momentos.',provider_unavailable:'El servicio de análisis no respondió. Puedes retomar los pendientes.',context_unavailable:'No se pudieron consultar los registros. Puedes retomar los pendientes.',sources_changed:'Los registros cambiaron. Actualiza los análisis pendientes.'};
    return {status:'paused',error:messages[blocked.kind]};
  }
  if(nextAnalysisTasks(job,1).length)return {status:'queued',error:null};
  return {status:failures.some(f=>f.kind==='uncertain')?'uncertain':'paused',error:`${remaining.length===1?'Queda 1 análisis pendiente':`Quedan ${remaining.length} análisis pendientes`}. Los demás ya están guardados.`};
}

export function allowManualAnalysisRetry(failures={}){
  return Object.fromEntries(Object.entries(failures).map(([id,failure])=>[id,{...failure,attempts:0}]));
}
