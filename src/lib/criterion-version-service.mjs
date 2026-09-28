import { randomUUID } from "node:crypto";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";

export class CriterionVersionError extends Error {
  constructor(reason,message) {super(message);this.name="CriterionVersionError";this.reason=reason;}
}

export async function copyConfirmedCriterion(db,teacherId,classroomId,sourceId,expectedSourceRevision=null) {
  const identity=(await db.query(`select lineage_id from activity_criteria where id=$1`,[sourceId])).rows[0];
  if(!identity) throw new CriterionVersionError("source_unavailable","El criterio vigente ya no está disponible.");
  return versionTransaction(db,`criterion:${identity.lineage_id}`,async(tx)=>{
    const source=(await tx.query(`select ac.* from activity_criteria ac
      join activities a on a.id=ac.activity_id and a.status='active'
      join learning_experiences e on e.id=a.experience_id and e.classroom_id=$2
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where ac.id=$3 and ac.status='active' for update of ac`,[teacherId,classroomId,sourceId])).rows[0];
    if(!source) throw new CriterionVersionError("source_unavailable","El criterio vigente ya no está disponible.");
    if(expectedSourceRevision!==null) assertRevision(source,expectedSourceRevision);
    const existing=(await tx.query(`select id from activity_criteria where activity_id=$1 and competency_v4_id=$2 and status='draft'`,
      [source.activity_id,source.competency_v4_id])).rows[0];
    if(existing) throw new VersionConflictError("Ya existe un borrador nuevo de este criterio.",source.revision,"draft_exists");
    const id=randomUUID(),version=Number(source.version??1)+1;
    await tx.query(`insert into activity_criteria
      (id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,display_order,evidence_kind,details,generation_metadata,status,version,supersedes_criterion_id,lineage_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,'draft',$11,$12,$13)`,
    [id,source.activity_id,source.competency_id,source.competency_v4_id,source.performance_id,source.criterion_text,
      source.display_order,source.evidence_kind,JSON.stringify(source.details),
      JSON.stringify({workflow:"criterion_copy",source_criterion_id:source.id}),version,source.id,source.lineage_id]);
    return {id,version,revision:1,lineage_id:source.lineage_id,status:"draft",supersedes_criterion_id:source.id};
  });
}

export async function confirmCriterionVersion(db,criterionId,activityId,expectedDraftRevision=null) {
  const identity=(await db.query(`select lineage_id from activity_criteria where id=$1`,[criterionId])).rows[0];
  if(!identity) throw new CriterionVersionError("draft_unavailable","El borrador ya no está disponible.");
  return versionTransaction(db,`criterion:${identity.lineage_id}`,async(tx)=>{
    const draft=(await tx.query(`select id,revision,lineage_id,activity_id,competency_v4_id,supersedes_criterion_id from activity_criteria
      where id=$1 and activity_id=$2 and status='draft' for update`,[criterionId,activityId])).rows[0];
    if(!draft) throw new VersionConflictError("El criterio ya fue confirmado o reemplazado.");
    if(expectedDraftRevision!==null) assertRevision(draft,expectedDraftRevision);
    // Recover unused, incompatible inherited criteria only after explicit teacher confirmation.
    // Never rewrite a criterion or move evidence already linked to its historical identity.
    await tx.query(`update activity_criteria ac set status='archived',superseded_at=now(),updated_at=now()
      from activities a where ac.activity_id=$1 and a.id=ac.activity_id and ac.status='active'
        and ac.competency_v4_id<>$2 and a.details->>'competency_status'='confirmed'
        and a.details->>'competency_id'=$2
        and not exists(select 1 from evidences e where e.criterion_id=ac.id)`,
      [activityId,draft.competency_v4_id]);
    if(draft.supersedes_criterion_id) {
      const source=(await tx.query(`select id from activity_criteria where id=$1 and activity_id=$2 and competency_v4_id=$3 and lineage_id=$4 and status='active' for update`,
        [draft.supersedes_criterion_id,activityId,draft.competency_v4_id,draft.lineage_id])).rows[0];
      if(!source) throw new VersionConflictError("La versión original ya no coincide con este borrador.",draft.revision);
      await tx.query(`update activity_criteria set status='archived',superseded_at=now(),updated_at=now() where id=$1`,[source.id]);
    }
    const result=(await tx.query(`update activity_criteria set status='active',teacher_confirmed_at=now(),updated_at=now()
      where id=$1 and activity_id=$2 and status='draft' and revision=$3 returning id,status,teacher_confirmed_at,version,revision`,[criterionId,activityId,draft.revision])).rows[0];
    if(!result) throw new VersionConflictError();
    return result;
  });
}
