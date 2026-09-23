import { randomUUID } from "node:crypto";

export class DiagnosticReviewError extends Error {
  constructor(reason) {
    super(reason === "no_students" ? "Agrega al menos un niño antes de revisar el diagnóstico." :
      reason === "no_confirmed_diagnosis" ? "Confirma primero la revisión diagnóstica del grupo." : "No hay un aula activa.");
    this.name = "DiagnosticReviewError";
    this.reason = reason;
  }
}

export async function diagnosticProgressForTeacher(db, teacherId) {
  const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
  if (!classroom) throw new DiagnosticReviewError("no_classroom");
  const [students, observations, reviewed] = await Promise.all([
    db.query(`select count(*)::int as total from students where classroom_id = $1 and status = 'active'`, [classroom.id]),
    db.query(`select (
      (select count(*) from student_observations so
        join diagnostic_entries de on de.id = so.diagnostic_entry_id
        join diagnostic_sessions ds on ds.id = de.session_id where ds.classroom_id = $1)
      +
      (select count(*) from diagnostic_experience_observations where classroom_id = $1)
    )::int as total`, [classroom.id]),
    db.query(`select exists(select 1 from diagnostic_sessions where classroom_id = $1 and status = 'completed') as value`, [classroom.id]),
  ]);
  return { student_count: students.rows[0].total, observation_count: observations.rows[0].total, reviewed: reviewed.rows[0].value };
}

/** Records the teacher's review of available diagnostic information, including insufficiency. */
export async function completeDiagnosticReviewForTeacher(db, teacherId) {
  const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
  if (!classroom) throw new DiagnosticReviewError("no_classroom");
  const studentCount = (await db.query(`select count(*)::int as total from students where classroom_id = $1 and status = 'active'`, [classroom.id])).rows[0].total;
  if (studentCount === 0) throw new DiagnosticReviewError("no_students");
  const confirmed = (await db.query(`select (
    exists(select 1 from diagnostic_group_reviews where classroom_id = $1 and status = 'confirmed')
    or exists(select 1 from diagnostic_entries de join diagnostic_sessions ds on ds.id = de.session_id
      where ds.classroom_id = $1 and de.teacher_confirmed = true)
  ) as value`, [classroom.id])).rows[0].value;
  if (!confirmed) throw new DiagnosticReviewError("no_confirmed_diagnosis");

  await db.exec("begin");
  try {
    const updated = await db.query(`update diagnostic_sessions set status = 'completed', completed_at = now()
      where id = (select id from diagnostic_sessions where classroom_id = $1 and status = 'active' order by started_at desc limit 1)
      returning id`, [classroom.id]);
    let sessionId = updated.rows[0]?.id;
    if (!sessionId) {
      const reviewed = (await db.query(`select id from diagnostic_sessions where classroom_id = $1 and status = 'completed' order by completed_at desc limit 1`, [classroom.id])).rows[0];
      sessionId = reviewed?.id ?? randomUUID();
      if (!reviewed) await db.query(`insert into diagnostic_sessions (id, classroom_id, title, status, completed_at, created_by)
        values ($1, $2, $3, 'completed', now(), $4)`, [sessionId, classroom.id, `Revisión diagnóstica ${new Date().getFullYear()}`, teacherId]);
    }
    await db.exec("commit");
    return { sessionId, classroomId: classroom.id };
  } catch (error) { await db.exec("rollback"); throw error; }
}
