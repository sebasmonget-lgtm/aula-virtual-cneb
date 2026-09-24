import { randomUUID } from "node:crypto";

export class CriterionVersionError extends Error {
  constructor(reason,message) {super(message);this.name="CriterionVersionError";this.reason=reason;}
}

export async function copyConfirmedCriterion(db,teacherId,classroomId,sourceId) {
  await db.exec("begin");
  try {
    const source=(await db.query(`select ac.* from activity_criteria ac
      join activities a on a.id=ac.activity_id and a.status='active'
      join learning_experiences e on e.id=a.experience_id and e.classroom_id=$2
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where ac.id=$3 and ac.status='active'`,[teacherId,classroomId,sourceId])).rows[0];
    if(!source) throw new CriterionVersionError("source_unavailable","El criterio vigente ya no está disponible.");
    const existing=(await db.query(`select id from activity_criteria where activity_id=$1 and competency_v4_id=$2 and status='draft'`,
      [source.activity_id,source.competency_v4_id])).rows[0];
    if(existing) throw new CriterionVersionError("draft_exists","Ya existe un borrador nuevo de este criterio.");
    const id=randomUUID(),version=Number(source.version??1)+1;
    await db.query(`insert into activity_criteria
      (id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,display_order,evidence_kind,details,generation_metadata,status,version,supersedes_criterion_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,'draft',$11,$12)`,
    [id,source.activity_id,source.competency_id,source.competency_v4_id,source.performance_id,source.criterion_text,
      source.display_order,source.evidence_kind,JSON.stringify(source.details),
      JSON.stringify({workflow:"criterion_copy",source_criterion_id:source.id}),version,source.id]);
    await db.exec("commit");
    return {id,version,status:"draft",supersedes_criterion_id:source.id};
  } catch(error) {await db.exec("rollback").catch(()=>{});throw error;}
}

export async function confirmCriterionVersion(db,criterionId,activityId) {
  await db.exec("begin");
  try {
    const draft=(await db.query(`select id,activity_id,competency_v4_id,supersedes_criterion_id from activity_criteria
      where id=$1 and activity_id=$2 and status='draft'`,[criterionId,activityId])).rows[0];
    if(!draft) throw new CriterionVersionError("draft_unavailable","El borrador ya no está disponible.");
    if(draft.supersedes_criterion_id) {
      const source=(await db.query(`select id from activity_criteria where id=$1 and activity_id=$2 and competency_v4_id=$3 and status='active'`,
        [draft.supersedes_criterion_id,activityId,draft.competency_v4_id])).rows[0];
      if(!source) throw new CriterionVersionError("source_changed","La versión original ya no coincide con este borrador.");
      await db.query(`update activity_criteria set status='archived',updated_at=now() where id=$1`,[source.id]);
    }
    const result=(await db.query(`update activity_criteria set status='active',teacher_confirmed_at=now(),updated_at=now()
      where id=$1 and activity_id=$2 and status='draft' returning id,status,teacher_confirmed_at,version`,[criterionId,activityId])).rows[0];
    await db.exec("commit");
    return result;
  } catch(error) {await db.exec("rollback").catch(()=>{});throw error;}
}
