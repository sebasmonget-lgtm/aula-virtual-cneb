import { lockClassroomSchedule } from "./activity-schedule-integrity.mjs";
import { VersionConflictError } from "./version-integrity.mjs";

export async function inactiveStudents(db, teacherId) {
  return (await db.query(`select s.id,concat_ws(' ',coalesce(s.preferred_name,s.first_name),s.last_name) as name
    from students s join classrooms c on c.id=s.classroom_id
    where c.teacher_id=$1 and c.status='active' and s.status::text in ('inactive','archived') order by s.first_name,s.last_name`,[teacherId])).rows;
}

export async function changeStudentEnrollment(db,teacherId,studentId,{status,expectedStatus}) {
  if(!['active','inactive'].includes(status)||!['active','inactive'].includes(expectedStatus)||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(studentId))throw new TypeError("Estado de matrícula inválido.");
  return db.transaction(async tx=>{
    const row=(await tx.query(`select s.classroom_id from students s join classrooms c on c.id=s.classroom_id
      where s.id=$1 and c.teacher_id=$2 and c.status='active'`,[studentId,teacherId])).rows[0];
    if(!row)throw new TypeError("Alumno no disponible en tu aula.");
    await lockClassroomSchedule(tx,row.classroom_id);
    // Cloud uses classroom_status (active/archived); keep the existing API and legacy local rows compatible.
    const storedStatus=status==='inactive'?'archived':'active';
    const expectedStored=expectedStatus==='inactive'?['inactive','archived']:['active'];
    const changed=await tx.query(`update students set status=$1 where id=$2 and status::text=any($3::text[]) returning id`,[storedStatus,studentId,expectedStored]);
    if(!changed.rows.length)throw new VersionConflictError("La matrícula cambió. Recarga Mi aula.");
    return changed.rows[0];
  });
}
