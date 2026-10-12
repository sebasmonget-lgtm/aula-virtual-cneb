import { versionTransaction, VersionConflictError } from './version-integrity.mjs';

/** Explicit teacher decision, scoped to an owned classroom; never inferred from pupil count. */
export async function confirmEnrollmentCompletion(db, teacherId, classroomId) {
  if (!/^[0-9a-f-]{36}$/i.test(classroomId ?? '')) throw new Error('Recarga para revisar el aula actual.');
  return versionTransaction(db, `enrollment-completion:${teacherId}`, async tx => {
    const classroom = (await tx.query(`select c.id from classrooms c
      join school_years sy on sy.id=c.school_year_id
      where c.id=$1 and c.teacher_id=$2 and c.status='active' and sy.owner_id=$2
      for update of c`, [classroomId, teacherId])).rows[0];
    if (!classroom) throw new VersionConflictError('El aula cambió o no está disponible. Recarga antes de continuar.');
    const profile = (await tx.query(`select preferences from profiles where user_id=$1 for update`, [teacherId])).rows[0];
    const saved = profile?.preferences?.enrollment_completed_at?.[classroomId];
    if (typeof saved === 'string') return { classroomId, completedAt: saved };
    const students = (await tx.query(`select exists(select 1 from students where classroom_id=$1 and status='active') as present`, [classroomId])).rows[0];
    if (!students.present) throw new Error('Registra al menos un niño antes de confirmar la matrícula.');
    const result = (await tx.query(`update profiles set preferences=jsonb_set(preferences,
      '{enrollment_completed_at}', coalesce(preferences->'enrollment_completed_at','{}'::jsonb)
        || jsonb_build_object($2::text, now()::text), true)
      where user_id=$1 returning preferences->'enrollment_completed_at'->>$2::text as completed_at`, [teacherId, classroomId])).rows[0];
    return { classroomId, completedAt: result.completed_at };
  });
}
