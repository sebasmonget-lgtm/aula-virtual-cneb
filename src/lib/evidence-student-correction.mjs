import { versionTransaction, VersionConflictError } from './version-integrity.mjs';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
// Deliberately narrow: text-only, same classroom, no affected confirmed valuation.
// Correcting evaluated evidence or moving private attachments needs a separate review flow.
export async function reassignEvidenceStudent(db, input, refreshStudentContext = async () => {}) {
  const { evidenceId, teacherId, expectedStudentId, studentId, expectedRevision } = input;
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (![evidenceId, teacherId, expectedStudentId, studentId].every(id => uuid.test(id ?? '')) ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('Recarga la evidencia para corregir el alumno.');
  if (reason.length < 8 || reason.length > 300) throw new TypeError('Escribe un motivo de 8 a 300 caracteres.');
  const load = async runner => (await runner.query(`select e.*,s.classroom_id,ac.competency_v4_id,ep.id as period_id
    from evidences e join students s on s.id=e.student_id join classrooms c on c.id=s.classroom_id
    join activity_criteria ac on ac.id=e.criterion_id
    left join evaluation_periods ep on ep.school_year_id=c.school_year_id and e.observed_on between ep.starts_on and ep.ends_on
    where e.id=$1 and c.teacher_id=$2 and e.created_by=$2`, [evidenceId, teacherId])).rows[0];
  const initial = await load(db);
  if (!initial) throw new TypeError('Evidencia no encontrada.');
  const result = await versionTransaction(db, initial.period_id ? `period:${initial.period_id}` : `evidence:${evidenceId}`, async tx => {
    const row = await load(tx);
    if (!row || row.student_id !== expectedStudentId || row.student_reassignment_history.length !== expectedRevision)
      throw new VersionConflictError('La asignación cambió. Recarga la evidencia.');
    if (row.media_path) throw new TypeError('No se puede cambiar el alumno de una evidencia con adjunto privado.');
    if (studentId === row.student_id) throw new TypeError('Elige otro alumno.');
    const target = (await tx.query("select id from students where id=$1 and classroom_id=$2 and status='active'", [studentId, row.classroom_id])).rows[0];
    if (!target) throw new TypeError('El alumno debe pertenecer a la misma aula.');
    if (row.period_id && (await tx.query('select 1 from period_closures where classroom_id=$1 and evaluation_period_id=$2', [row.classroom_id, row.period_id])).rows.length)
      throw new TypeError('El período está cerrado; no se cambia su evidencia.');
    const confirmed = (await tx.query(`select 1 from competency_assessments where student_id in ($1,$2)
      and competency_v4_id=$3 and status='active' and teacher_confirmed_at is not null
      and $4::date between period_start and period_end limit 1`, [row.student_id, studentId, row.competency_v4_id, row.observed_on])).rows.length;
    if (confirmed) throw new TypeError('Hay una valoración confirmada afectada; primero debe revisarse por el flujo de evaluación.');
    const history = { from_student_id: row.student_id, to_student_id: studentId, teacher_id: teacherId, reason, corrected_at: new Date().toISOString() };
    const updated = (await tx.query(`update evidences set student_id=$1,
      student_reassignment_history=student_reassignment_history || $2::jsonb
      where id=$3 and student_id=$4 and jsonb_array_length(student_reassignment_history)=$5
      returning id,student_id`, [studentId, JSON.stringify([history]), evidenceId, expectedStudentId, expectedRevision])).rows[0];
    if (!updated) throw new VersionConflictError('La asignación cambió. Recarga la evidencia.');
    return updated;
  });
  await refreshStudentContext(db, expectedStudentId);
  await refreshStudentContext(db, studentId);
  return result;
}
