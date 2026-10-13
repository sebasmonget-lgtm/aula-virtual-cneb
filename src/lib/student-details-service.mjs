import { validateStudentsForImport } from './student-import.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { lockClassroomSchedule } from './activity-schedule-integrity.mjs';

const fields = row => ({firstName:row.first_name,lastName:row.last_name,preferredName:row.preferred_name ?? null,birthDate:row.birth_date instanceof Date ? row.birth_date.toISOString().slice(0,10) : row.birth_date ?? null});
export async function updateStudentDetails(db,teacherId,studentId,input) {
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(studentId) || !input?.expected)throw new TypeError('Recarga la lista antes de editar al niño.');
  const value=validateStudentsForImport([input])[0];
  return db.transaction(async tx=>{
    const owned=(await tx.query(`select s.classroom_id from students s join classrooms c on c.id=s.classroom_id
      where s.id=$1 and c.teacher_id=$2 and c.status='active' and s.status='active'`,[studentId,teacherId])).rows[0];
    if(!owned)throw new TypeError('Niño no disponible en tu aula.');
    await lockClassroomSchedule(tx,owned.classroom_id);
    const row=(await tx.query(`select first_name,last_name,preferred_name,birth_date::text from students where id=$1 and classroom_id=$2 and status='active' for update`,[studentId,owned.classroom_id])).rows[0];
    if(!row)throw new VersionConflictError('La lista cambió. Recarga antes de editar.');
    const current=fields(row);
    // A retry after a lost response is successful if this exact edit already committed.
    if(Object.keys(current).every(key=>current[key]===value[key]))return {id:studentId,classroomId:owned.classroom_id};
    if(Object.keys(current).some(key=>current[key]!==input.expected[key]))throw new VersionConflictError('Los datos del niño cambiaron. Recarga la lista antes de guardar.');
    await tx.query(`update students set first_name=$1,last_name=$2,preferred_name=$3,birth_date=$4::date where id=$5 and classroom_id=$6`,[value.firstName,value.lastName,value.preferredName,value.birthDate,studentId,owned.classroom_id]);
    return {id:studentId,classroomId:owned.classroom_id};
  });
}
