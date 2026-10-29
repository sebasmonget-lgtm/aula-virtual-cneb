import { classroomCurriculumScope, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';

export async function studentCurriculumScope(db, teacherId, studentId) {
  const student=(await db.query(`select s.id,s.classroom_id,s.first_name,s.last_name,s.preferred_name,s.birth_date::text
    from students s join classrooms c on c.id=s.classroom_id where s.id=$1 and c.teacher_id=$2 and s.status='active'`,[studentId,teacherId])).rows[0];
  if(!student)throw new CurriculumPermissionError();
  const classroom=await classroomCurriculumScope(db,teacherId,student.classroom_id);
  if(classroom.contract===1)return {student,classroom,age:classroom.ages[0],assignment:null,source:'legacy_inherited'};
  const enrollment=(await db.query('select starts_on::text from multi_age_enrollment_dates where student_id=$1 and classroom_id=$2',[studentId,student.classroom_id])).rows[0];
  if(enrollment)student.enrolled_on=enrollment.starts_on;
  const assignment=(await db.query(`select a.*,ag.age_years as age from student_curriculum_assignments a
    join age_grades ag on ag.id=a.age_grade_id join classroom_age_groups g on g.id=a.classroom_group_id
    where a.student_id=$1 and a.classroom_id=$2 and a.school_year_id=$3 and a.status='active' and g.status='active'`,[student.id,classroom.id,classroom.school_year_id])).rows[0];
  if(!assignment||!classroom.ages.includes(Number(assignment.age)))throw new Error('Confirma el grupo curricular del niño antes de observar con criterio.');
  return {student,classroom,age:Number(assignment.age),assignment,source:assignment.source};
}

export async function captureCurriculumScope(db, teacherId, studentId, activityId, criterionId) {
  const scope=await studentCurriculumScope(db,teacherId,studentId);
  if(scope.classroom.contract===1)return null;
  let criterion=null;
  if(criterionId){
    criterion=(await db.query(`select ac.*,e.classroom_id from activity_criteria ac join activities a on a.id=ac.activity_id
      join learning_experiences e on e.id=a.experience_id where ac.id=$1 and ac.activity_id=$2 and ac.status='active'`,[criterionId,activityId])).rows[0];
    if(!criterion||criterion.classroom_id!==scope.classroom.id||Number(criterion.curricular_age)!==scope.age||criterion.curriculum_contract_version!==2)
      throw new Error('El criterio no corresponde al grupo curricular del niño.');
  }
  return {curriculum_contract_version:2,curriculum_assignment_id:scope.assignment.id,curricular_age:scope.age,
    assignment_revision:scope.assignment.revision,criterion_id:criterion?.id??null,criterion_revision:criterion?.revision??null,
    official_performance_refs:criterion?.details?.official_performance_refs??[]};
}
