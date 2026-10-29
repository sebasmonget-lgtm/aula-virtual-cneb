import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {classroomCurriculumScope,curriculumRequest,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {validateStudentsForImport} from './student-import.mjs';
import {writeMultiAgeEnrollment} from './multi-age-local-service.mjs';
import {changeStudentEnrollment} from './student-enrollment.mjs';
import {lockClassroomSchedule} from './activity-schedule-integrity.mjs';
import {assertPeriodDatesOpen} from './period-edit-guard.mjs';

export async function importDocumentGeneratorStudents(db,teacherId,input){
 if(!await isDocumentGenerator(db,teacherId)||input.teacherConfirmed!==true)throw new CurriculumPermissionError();
 const students=validateStudentsForImport(input.students);
 return curriculumRequest(db,teacherId,input.clientRequestId,'documents_roster_import',input,async tx=>{
   const scope=await classroomCurriculumScope(tx,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
   const saved=[];
   for(const student of students)saved.push(await writeMultiAgeEnrollment(tx,teacherId,{...input,...student},student));
   return {classroomId:scope.id,studentIds:saved.map(s=>s.studentId)};
 });
}

export async function changeDocumentGeneratorEnrollment(db,teacherId,input){
 if(!await isDocumentGenerator(db,teacherId)||input.teacherConfirmed!==true)throw new CurriculumPermissionError();
 return curriculumRequest(db,teacherId,input.clientRequestId,'documents_roster_enrollment',input,async tx=>{
   const scope=await classroomCurriculumScope(tx,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
   await lockClassroomSchedule(tx,scope.id);
   const student=(await tx.query('select id from students where id=$1 and classroom_id=$2',[input.studentId,scope.id])).rows[0];
   if(!student)throw new CurriculumPermissionError();
   await assertPeriodDatesOpen(tx,scope.id,scope.starts_on,scope.ends_on);
   if(input.status==='active'){
     const count=(await tx.query("select count(*)::int n from students where classroom_id=$1 and status='active'",[scope.id])).rows[0].n;
     if(count>=45)throw new TypeError('El aula admite hasta 45 niños activos.');
   }
   const joined={query:(...args)=>tx.query(...args),transaction:work=>work(joined)};
   const saved=await changeStudentEnrollment(joined,teacherId,input.studentId,input);
   return {classroomId:scope.id,studentId:saved.id};
 });
}
