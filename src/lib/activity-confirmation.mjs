import { randomUUID } from "node:crypto";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";

/** Confirm the activity and its inherited criterion as one database change. */
export async function confirmActivityWithCriterion(db, activityId, criterion, criterionId = randomUUID(), expectedDraftRevision = null) {
  const identity = (await db.query(`select lineage_id from activities where id=$1`, [activityId])).rows[0];
  if (!identity) throw new VersionConflictError("La actividad ya no está disponible.");
  return versionTransaction(db, `activity:${identity.lineage_id}`, async (transaction) => {
    const draft = (await transaction.query(`select id,revision,lineage_id,experience_id,supersedes_activity_id from activities where id=$1 and status='draft' for update`, [activityId])).rows[0];
    if (!draft) throw new VersionConflictError("La actividad ya fue confirmada.");
    if (expectedDraftRevision !== null) assertRevision(draft, expectedDraftRevision);
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
    return result.rows[0];
  });
}
