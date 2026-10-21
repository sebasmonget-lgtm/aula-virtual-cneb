export const hasDiagnosticDocumentText = details =>
  ['strengths','needs','planning_priorities'].some(key => typeof details?.[key] === 'string' && details[key].trim());

/** Opening/recovering a document must reuse saved work before considering another AI call. */
export async function prepareDiagnosticDocumentDraft(api, {allowRetry=false,acceptPotentialRepeat=false}={}) {
  const draft=await api.prepare();
  if(hasDiagnosticDocumentText(draft.details))return {draftId:draft.id,details:draft.details,job:null};
  let job=await api.load(draft.id);
  if(job.status==='ready'&&job.details)return {draftId:draft.id,details:job.details,job};
  if(['queued','processing'].includes(job.status))return {draftId:draft.id,details:null,job};
  if(job.status!=='idle'&&!(['failed','uncertain'].includes(job.status)&&allowRetry))
    return {draftId:draft.id,details:null,job};
  if(job.requiresRepeatConsent&&!acceptPotentialRepeat)return {draftId:draft.id,details:null,job};
  job=await api.start(draft.id,acceptPotentialRepeat);
  return {draftId:draft.id,details:job.status==='ready'?job.details??null:null,job};
}
