import { randomUUID } from "node:crypto";

/** Confirm the activity and its inherited criterion as one database change. */
export async function confirmActivityWithCriterion(db, activityId, criterion, criterionId = randomUUID()) {
  return db.transaction(async (transaction) => {
    const result = await transaction.query(`update activities set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' returning id,status,teacher_confirmed_at`, [activityId]);
    if (!result.rows[0]) throw new Error("La actividad ya fue confirmada.");
    if (criterion) {
      await transaction.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,details,status,teacher_confirmed_at) values($1,$2,null,$3,null,$4,$5::jsonb,'active',now())`, [criterionId, activityId, criterion.competency_id, criterion.criterion_text, JSON.stringify(criterion)]);
    }
    return result.rows[0];
  });
}
