/** Provider background polling returns a job to queued; it does not restart its preparation. */
export function documentAnnualPreparationProgress(job,{starting=false}={}){
 const generating=!starting&&Boolean(job)&&((job.attempts??0)>0||job.status==='running');
 return {started_at:starting?undefined:job?.createdAt??job?.updatedAt,
  stage:generating?'generation':'sources',completed_stages:generating?['sources','calendar']:[]};
}
