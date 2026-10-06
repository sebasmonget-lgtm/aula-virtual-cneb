import { VersionConflictError } from "./version-integrity.mjs";

export function limaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// All schedule, execution and evidence writers take this lock in their transaction.
export async function lockClassroomSchedule(tx, classroomId) {
  await tx.query("select id from classrooms where id=$1 for update", [classroomId]);
}

export async function assertActivityScheduleMutable(tx, activity, today = limaToday()) {
  if (activity.status === "archived" || activity.occurs_on < today)
    throw new VersionConflictError("Esta actividad pertenece al pasado. Su fecha y sus registros deben conservarse.", activity.revision, "activity_history_protected");
  const recorded = (await tx.query(`select exists(
    select 1 from activities a where a.lineage_id=$1 and (
      exists(select 1 from evidences ev where ev.activity_id=a.id)
      or exists(select 1 from ordinary_observations o where o.activity_id=a.id)
      or exists(select 1 from class_schedule_entries se join daily_execution_logs d on d.schedule_entry_id=se.id
        where se.activity_id=a.id and (d.status<>'planned' or d.actual_started_at is not null or d.actual_ended_at is not null))
    )) as recorded`, [activity.lineage_id])).rows[0];
  if (recorded?.recorded)
    throw new VersionConflictError("Esta actividad ya tiene ejecución o evidencias. Conserva su fecha y sus registros.", activity.revision, "activity_history_protected");
}
