import { randomUUID } from "node:crypto";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";

/** Confirm the activity and its inherited criterion as one database change. */
export async function confirmActivityWithCriterion(db, activityId, criterion, criterionId = randomUUID(), expectedDraftRevision = null,
  workshop = null) {
  const identity = (await db.query(`select lineage_id from activities where id=$1`, [activityId])).rows[0];
  if (!identity) throw new VersionConflictError("La actividad ya no está disponible.");
  return versionTransaction(db, `activity:${identity.lineage_id}`, async (transaction) => {
    const draft = (await transaction.query(`select a.id,a.revision,a.lineage_id,a.experience_id,a.supersedes_activity_id,
      a.occurs_on,a.title,e.classroom_id from activities a join learning_experiences e on e.id=a.experience_id
      where a.id=$1 and a.status='draft' for update`, [activityId])).rows[0];
    if (!draft) throw new VersionConflictError("La actividad ya fue confirmada.");
    if (expectedDraftRevision !== null) assertRevision(draft, expectedDraftRevision);
    let workshopDraft = null;
    if (workshop) {
      workshopDraft = (await transaction.query(`select wa.id,wa.revision,wa.details,wa.workshop_item_index,wm.parent_project_id,
        wm.status as master_status from activities wa join learning_experiences wm on wm.id=wa.experience_id
        where wa.id=$1 and wa.linked_main_activity_id=$2 and wa.status='draft' for update of wa`,
      [workshop.id, activityId])).rows[0];
      if (!workshopDraft || workshopDraft.parent_project_id !== draft.experience_id
        || workshopDraft.master_status !== 'active' || Number(workshopDraft.revision) !== Number(workshop.expectedRevision))
        throw new VersionConflictError("El taller cambió. Revisa ambos borradores antes de confirmar.");
      if (workshopDraft.details?.competency_id !== workshop.competencyId
        || !workshopDraft.details?.criterion_or_observation_focus)
        throw new Error("El taller no tiene una competencia y criterio válidos.");
    }
    if (draft.supersedes_activity_id) {
      const source = (await transaction.query(`select id from activities where id=$1 and experience_id=$2 and lineage_id=$3 and status='active' for update`,
        [draft.supersedes_activity_id,draft.experience_id,draft.lineage_id])).rows[0];
      if (!source) throw new VersionConflictError("La versión original ya no coincide con este borrador.", draft.revision);
      await transaction.query(`update activities set status='archived',superseded_at=now(),updated_at=now() where id=$1`, [source.id]);
    }
    const result = await transaction.query(`update activities set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' and revision=$2 returning id,status,teacher_confirmed_at,revision`, [activityId,draft.revision]);
    if (!result.rows[0]) throw new VersionConflictError();
    if (criterion) {
      await transaction.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,details,status,teacher_confirmed_at) values($1,$2,null,$3,null,$4,$5::jsonb,'active',now())`, [criterionId, activityId, criterion.competency_id, criterion.criterion_text, JSON.stringify(criterion)]);
    }
    if (!draft.supersedes_activity_id) {
      const schedule = (await transaction.query(`select id from class_schedule_entries where activity_id=$1 and classroom_id=$2
        and scheduled_on is not null order by scheduled_on limit 1`,[activityId,draft.classroom_id])).rows[0];
      if (schedule) await transaction.query(`update class_schedule_entries set scheduled_on=$1,title=$2 where id=$3`,[draft.occurs_on,draft.title,schedule.id]);
      else await transaction.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title,is_instructional,sort_order)
        values($1,$2,$3,'09:00','09:45','activity',$4,$5,true,50)`,[randomUUID(),draft.classroom_id,draft.occurs_on,activityId,draft.title]);
    }
    if (workshopDraft) {
      await transaction.query(`update activities set status='active',teacher_confirmed_at=now(),updated_at=now()
        where id=$1 and status='draft' and revision=$2`, [workshopDraft.id, workshopDraft.revision]);
      await transaction.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,performance_id,
        criterion_text,details,status,teacher_confirmed_at) values($1,$2,null,$3,null,$4,$5::jsonb,'active',now())`,
      [randomUUID(), workshopDraft.id, workshopDraft.details.competency_id,
        workshopDraft.details.criterion_or_observation_focus,
        JSON.stringify({ competency_id: workshopDraft.details.competency_id,
          criterion_text: workshopDraft.details.criterion_or_observation_focus,
          expected_evidence: workshopDraft.details.evidence_expected,
          observation_focus: [workshopDraft.details.criterion_or_observation_focus],
          evidence_scope: "individual", teacher_caution: "Registrar solo actuaciones observadas." })]);
      await transaction.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,
        block_type,activity_id,title,is_instructional,sort_order)
        values($1,$2,$3,'11:20','12:00','workshop',$4,$5,true,70)`,
      [randomUUID(), draft.classroom_id, draft.occurs_on, workshopDraft.id, workshopDraft.details.title]);
    }
    return result.rows[0];
  });
}
