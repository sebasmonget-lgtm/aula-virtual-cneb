import { createHash } from 'node:crypto';
import { VersionConflictError, versionTransaction } from './version-integrity.mjs';

export const curriculumHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const validCurriculumId = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export class CurriculumPermissionError extends Error {
  constructor() { super('El aula o registro curricular no está disponible.'); this.code = '42501'; }
}
export function curriculumAges(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some(age => ![3,4,5].includes(age)) || new Set(value).size !== value.length)
    throw new TypeError('Selecciona grupos distintos de 3, 4 o 5 años.');
  return [...value].sort();
}
/** Presentation identity is frozen at confirmation/save, never reconstructed from a later roster. */
export async function curriculumDocumentIdentity(db,teacherId,classroom,student=null){
  const profile=(await db.query('select display_name from profiles where user_id=$1',[teacherId])).rows[0];
  if(!profile||classroom.teacher_id!==teacherId||classroom.contract!==2)throw new CurriculumPermissionError();
  return {contract:'multi-age-document-identity-v1',classroom_id:classroom.id,school_year_id:classroom.school_year_id,school_year:Number(classroom.year),
    section:classroom.section,institution_name:classroom.institution_name,teacher_name:profile.display_name,ages:[...classroom.ages],
    ...(student?{student_id:student.id,student_name:[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(' ')}:{})};
}
export async function classroomCurriculumScope(db, teacherId, classroomId) {
  if (!validCurriculumId(teacherId) || !validCurriculumId(classroomId)) throw new CurriculumPermissionError();
  const c = (await db.query(`select c.*,sy.year,sy.starts_on::text,sy.ends_on::text,ag.age_years as legacy_age
    from classrooms c join school_years sy on sy.id=c.school_year_id left join age_grades ag on ag.id=c.age_grade_id
    where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.status='active'`, [classroomId,teacherId])).rows[0];
  if (!c) throw new CurriculumPermissionError();
  if (Number(c.curriculum_contract_version ?? 1) === 1) return { ...c, contract:1, ages:[Number(c.legacy_age)], groups:[], assignment_source:'legacy_inherited' };
  const groups = (await db.query(`select g.id,g.age_grade_id,ag.age_years as age from classroom_age_groups g
    join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=$1 and g.status='active' order by ag.age_years`,[c.id])).rows;
  const ages=curriculumAges(groups.map(g=>Number(g.age)));
  if ((c.age_mode==='multi') !== (ages.length>1)) throw new VersionConflictError('La composición curricular del aula necesita revisión.');
  const calendar=(await db.query('select definition from multi_age_calendars where classroom_id=$1',[c.id])).rows[0];
  return {...c,contract:2,ages,groups,...(calendar?{institutional_calendar:calendar.definition}:{})};
}

/** Request receipt commits with the result. Callers must use the passed transaction. */
export async function curriculumRequest(db, teacherId, requestId, kind, input, work) {
  if (!validCurriculumId(teacherId) || !validCurriculumId(requestId)) throw new TypeError('Solicitud curricular inválida.');
  const fingerprint=curriculumHash({kind,input});
  return versionTransaction(db,`multi-age:${teacherId}`,async tx=>{
    const saved=(await tx.query('select * from multi_age_requests where teacher_id=$1 and client_request_id=$2',[teacherId,requestId])).rows[0];
    if(saved){if(saved.kind!==kind||saved.fingerprint!==fingerprint)throw new VersionConflictError('Esta solicitud ya guardó otro contenido.');return {...saved.result,replayed:true};}
    // Match the row lock taken by ordinary capture before re-reading evaluation sources.
    const studentClassroom=input.studentId?(await tx.query(`select s.classroom_id from students s
      join classrooms c on c.id=s.classroom_id where s.id=$1 and c.teacher_id=$2`,[input.studentId,teacherId])).rows[0]?.classroom_id:null;
    if(input.studentId&&input.classroomId&&input.classroomId!==studentClassroom)throw new CurriculumPermissionError();
    const classroomId=studentClassroom??input.classroomId;
    if(classroomId)await tx.query('select id from classrooms where id=$1 and teacher_id=$2 for update',[classroomId,teacherId]);
    const result=await work(tx);
    await tx.query(`insert into multi_age_requests(teacher_id,client_request_id,classroom_id,kind,fingerprint,result)
      values($1,$2,$3,$4,$5,$6::jsonb)`,[teacherId,requestId,result.classroomId,kind,fingerprint,JSON.stringify(result)]);
    return {...result,replayed:false};
  });
}
