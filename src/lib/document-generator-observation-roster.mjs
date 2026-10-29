import {CurriculumPermissionError, validCurriculumId} from './classroom-curriculum-scope.mjs';

const contract = 'ayni-document-observation-roster-v1';

/** Names are frozen after generation on the server; they are never AI input. */
export async function captureDocumentObservationRoster(db, teacherId, scope) {
  if (scope.contract !== 2 || scope.teacher_id !== teacherId) throw new CurriculumPermissionError();
  const rows = (await db.query(`select s.id,s.first_name,s.last_name,ag.age_years as age
    from students s join classrooms c on c.id=s.classroom_id
    join school_years sy on sy.id=c.school_year_id
    left join student_curriculum_assignments a on a.student_id=s.id and a.classroom_id=c.id
      and a.school_year_id=sy.id and a.status='active'
    left join age_grades ag on ag.id=a.age_grade_id
    where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and s.status='active'
    order by s.last_name,s.first_name,s.id`, [scope.id, teacherId])).rows;
  return validateDocumentObservationRoster({contract, students: rows.map(s => ({
    studentId: s.id, name: [s.first_name, s.last_name].filter(Boolean).join(' ').trim(), age: Number(s.age)
  }))}, scope.ages);
}

export function validateDocumentObservationRoster(value, ages, {maxStudents=45}={}) {
  if (!value || value.contract !== contract || !Array.isArray(value.students) || value.students.length > maxStudents
    || Object.keys(value).some(k => !['contract', 'students'].includes(k))) throw new TypeError('El registro necesita la nómina guardada de esta actividad.');
  const ids = new Set();
  for (const s of value.students) {
    if (!s || Object.keys(s).some(k => !['studentId', 'name', 'age'].includes(k)) || !validCurriculumId(s.studentId)
      || ids.has(s.studentId) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 220 || !ages.includes(s.age)) {
      throw new TypeError('Revisa los nombres y las edades curriculares de la nómina del aula.');
    }
    ids.add(s.studentId);
  }
  return {contract, students: value.students.map(s => ({...s}))};
}
