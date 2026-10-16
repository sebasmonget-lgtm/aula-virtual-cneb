/** Authorized API routes only. No storage paths, signed links or media enter AI input. */
export function evaluationEvidenceMediaPath(item){
  if(!item?.media_available||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id??''))return null;
  return item.details?.source==='ordinary_observation'
    ? `/api/ordinary-observations/${item.id}/media`
    : `/api/period-evaluations/evidence/${item.id}/media`;
}
