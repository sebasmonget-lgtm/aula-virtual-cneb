import { randomUUID } from "node:crypto";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";

// Reuse the private workflow JSONB; closure versions remain immutable.
export async function periodEditState(db, classroomId, periodId) {
  const closure = (await db.query(`select * from period_closures where classroom_id=$1 and evaluation_period_id=$2`, [classroomId, periodId])).rows[0];
  const workflow = (await db.query(`select step_state from period_closure_workflows where classroom_id=$1 and evaluation_period_id=$2`, [classroomId, periodId])).rows[0];
  const state = workflow?.step_state?.period_edit ?? { events: [] };
  return { closure, state, closed: Boolean(closure && state.reopened_version_id !== closure.current_version_id) };
}

export async function assertPeriodOpen(db, classroomId, periodId) {
  if ((await periodEditState(db, classroomId, periodId)).closed)
    throw new VersionConflictError("Reabre el bimestre antes de cambiar su evaluación.", null, "period_closed");
}

export async function assertPeriodDatesOpen(db,classroomId,start,end,{lock=false}={}) {
  const periods=(await db.query(`select p.id from evaluation_periods p join classrooms c on c.school_year_id=p.school_year_id where c.id=$1 and p.starts_on<=$3::date and p.ends_on>=$2::date order by p.id`,[classroomId,start,end])).rows;
  for(const period of periods) {
    if(lock)await db.query("select pg_advisory_xact_lock(hashtext($1))",[`period:${period.id}`]);
    await assertPeriodOpen(db,classroomId,period.id);
  }
}

export async function appendPeriodEvent(db, { classroomId, periodId, teacherId, event, reopenedVersionId }) {
  const { state } = await periodEditState(db, classroomId, periodId);
  const at = (await db.query("select now() as at")).rows[0].at;
  const next = { ...state, ...(reopenedVersionId !== undefined ? { reopened_version_id: reopenedVersionId } : {}),
    events: [...state.events, { ...event, by: teacherId, at: new Date(at).toISOString() }] };
  await db.query(`insert into period_closure_workflows(id,classroom_id,evaluation_period_id,step_state,updated_by)
    values($1,$2,$3,jsonb_build_object('period_edit',$4::jsonb),$5)
    on conflict(classroom_id,evaluation_period_id) do update set step_state=period_closure_workflows.step_state || excluded.step_state,updated_by=excluded.updated_by,updated_at=now()`,
  [randomUUID(), classroomId, periodId, JSON.stringify(next), teacherId]);
}

export async function reopenPeriod(db, { classroomId, periodId, teacherId, expectedVersionId, reason }) {
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw new Error("Explica brevemente por qué reabres el bimestre.");
  return versionTransaction(db, `period:${periodId}`, async tx => {
    const owned = (await tx.query(`select c.id from classrooms c join evaluation_periods p on p.school_year_id=c.school_year_id where c.id=$1 and p.id=$2 and c.teacher_id=$3`, [classroomId, periodId, teacherId])).rows[0];
    if (!owned) throw new VersionConflictError("El período no corresponde a esta aula.");
    const current = await periodEditState(tx, classroomId, periodId);
    if (!current.closure || current.closure.current_version_id !== expectedVersionId) throw new VersionConflictError();
    if (!current.closed) return { reopened: true, unchanged: true };
    await appendPeriodEvent(tx, { classroomId, periodId, teacherId, reopenedVersionId: expectedVersionId,
      event: { type: "reopened", closure_version_id: expectedVersionId, reason: reason.trim() } });
    return { reopened: true };
  });
}

export async function invalidateStudentFamilyReport(db, { studentId, period, competencyId }) {
  // Preserve the Word/history. A new current report must be explicitly prepared.
  await db.query(`update family_reports set status='archived',updated_at=now() where student_id=$1 and period_start=$2::date and period_end=$3::date and status in ('active','draft')`, [studentId, period.starts_on, period.ends_on]);
  return { studentId, competencyId };
}
