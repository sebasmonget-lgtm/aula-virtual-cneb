import {randomUUID} from 'node:crypto';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {classroomCurriculumScope,curriculumRequest,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {multiAgeStableHash} from './multi-age-projects.mjs';
import {periodModel} from './multi-age-period.mjs';
import {writeMultiAgeClassroom,writeMultiAgeEnrollment,multiAgeClassroomConfiguration} from './multi-age-local-service.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {listMultiAgeDocuments} from './multi-age-document-service.mjs';

async function transitionContext(db,teacherId,classroomId){

 const scope=await classroomCurriculumScope(db,teacherId,classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
 const students=(await db.query(`select s.id,s.first_name,s.last_name,s.preferred_name,s.birth_date::text,a.id as assignment_id,ag.age_years as age from students s join student_curriculum_assignments a on a.student_id=s.id and a.status='active' join age_grades ag on ag.id=a.age_grade_id where s.classroom_id=$1 and s.status='active' order by s.id`,[classroomId])).rows;
 const ids=(await db.query("select id from evaluation_periods where school_year_id=$1 and kind='bimester' order by ordinal",[scope.school_year_id])).rows;
 const periods=[];for(const {id}of ids){const {overview}=await periodModel(db,teacherId,{classroomId,periodId:id});periods.push({id,label:overview.period.label,closed:overview.closure.closed,current:overview.closure.current,closureVersionId:overview.closure.currentVersionId,sourceFingerprint:overview.sourceFingerprint});}
 const jobs=(await db.query("select id,status from multi_age_generation_jobs where classroom_id=$1 and status in ('queued','running','interrupted') order by id",[classroomId])).rows;
 const source={scope:{id:scope.id,year:scope.year,schoolYearId:scope.school_year_id,revision:scope.curriculum_revision,ages:scope.ages},students,periods,jobs};
 const pendingJobs=jobs.filter(j=>j.status!=='interrupted').length,interruptedJobs=jobs.length-pendingJobs;
 return {classroomId,year:Number(scope.year),nextYear:Number(scope.year)+1,ages:scope.ages,students,periods,pendingJobs,interruptedJobs,ready:periods.length===4&&periods.every(p=>p.closed&&p.current)&&!pendingJobs,sourceFingerprint:multiAgeStableHash(source)};
}
export async function multiAgeYearTransitionContext(db,teacherId,classroomId){assertMultiAgeLocalDb(db);return db.transaction(async tx=>{await tx.query('set transaction isolation level repeatable read read only');return transitionContext(tx,teacherId,classroomId);});}

/** New enrollment rows have explicit lineage; no old evidence, interview, grade or review becomes current. */
export async function confirmMultiAgeYearTransition(db,teacherId,input){
 assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true||input.historyAcknowledged!==true)throw new TypeError('Revisa la nueva matrícula y confirma que el historial se conserva en el año anterior.');
 const reason=typeof input.reason==='string'?input.reason.trim():'';if(reason.length<3||reason.length>1000)throw new TypeError('Indica el motivo de la apertura del nuevo año.');
 const configuration=multiAgeClassroomConfiguration(input.nextClassroom);
 if(configuration.calendarPolicy!=='institutional')throw new TypeError('Confirma las fechas institucionales del nuevo año.');
 return curriculumRequest(db,teacherId,input.clientRequestId,'year_transition',input,async tx=>{
  const current=await transitionContext(tx,teacherId,input.classroomId);
  if(current.sourceFingerprint!==input.sourceFingerprint)throw new VersionConflictError('Cambió el año anterior. Revisa otra vez los cierres y la matrícula.');
  if(!current.ready)throw new VersionConflictError('Antes de abrir otro año, cierra y revisa los cuatro bimestres y resuelve las preparaciones pendientes.');
  if(current.interruptedJobs&&input.discardInterruptedPreparations!==true)throw new TypeError('Confirma que no utilizarás las preparaciones interrumpidas del año anterior. No se repetirá ninguna llamada a IA.');
  if(configuration.year!==current.nextYear)throw new TypeError('La transición corresponde al año siguiente.');
  const choices=input.students;if(!Array.isArray(choices)||choices.length!==current.students.length||new Set(choices.map(c=>c.studentId)).size!==choices.length)throw new TypeError('Confirma una decisión para cada niño del año anterior.');
  for(const choice of choices){const child=current.students.find(s=>s.id===choice.studentId);if(!child||!['continue','leave'].includes(choice.action)
   ||choice.action==='continue'&&(!configuration.ages.includes(choice.age)||choice.age<child.age||choice.age>child.age+1)||choice.action==='leave'&&choice.age!=null)throw new TypeError('Revisa la continuidad y el grupo curricular de cada niño. No se promueve automáticamente.');}
  if((await tx.query('select 1 from school_years where owner_id=$1 and year=$2',[teacherId,configuration.year])).rows.length)throw new VersionConflictError('El año de destino ya existe. No se mezcla con otra matrícula.');
  if(current.interruptedJobs)await tx.query("update multi_age_generation_jobs set status='stale',error_code='teacher_discarded_for_new_year',updated_at=now() where classroom_id=$1 and status='interrupted'",[current.classroomId]);
  await tx.query("update classrooms set status='archived' where id=$1",[current.classroomId]);
  const next=await writeMultiAgeClassroom(tx,teacherId,input.nextClassroom,configuration),lineage=[];
  for(const choice of choices){const child=current.students.find(s=>s.id===choice.studentId);if(choice.action==='leave'){lineage.push({previousStudentId:child.id,previousAge:child.age,action:'leave'});continue;}
   const enrolled=await writeMultiAgeEnrollment(tx,teacherId,{classroomId:next.classroomId,expectedRevision:1,age:choice.age,firstName:child.first_name,lastName:child.last_name,preferredName:child.preferred_name??'',birthDate:child.birth_date??''});
   lineage.push({previousStudentId:child.id,previousAssignmentId:child.assignment_id,previousAge:child.age,action:'continue',studentId:enrolled.studentId,assignmentId:enrolled.assignmentId,age:choice.age});
  }
  const id=randomUUID();await tx.query('insert into multi_age_year_transitions(id,teacher_id,previous_classroom_id,classroom_id,manifest) values($1,$2,$3,$4,$5::jsonb)',[id,teacherId,current.classroomId,next.classroomId,JSON.stringify({contract:'multi-age-year-transition-v1',source:current,reason,lineage,newCalendar:configuration.calendar,policy:'Previous evidence, interviews, diagnoses, plans, grades and reports remain historical and are never copied as current sources.'})]);
  return {...next,transitionId:id,lineage};
 });
}

export async function multiAgeYearHistory(db,teacherId){
 assertMultiAgeLocalDb(db);const classrooms=(await db.query(`select c.id,c.section,sy.year from classrooms c join school_years sy on sy.id=c.school_year_id where c.teacher_id=$1 and sy.owner_id=$1 and c.curriculum_contract_version=2 and c.status='archived' order by sy.year desc`,[teacherId])).rows;
 const years=[];for(const classroom of classrooms){const documents=await listMultiAgeDocuments(db,teacherId,{classroomId:classroom.id}),reports=(await db.query(`select r.id,r.student_id,r.period_start::text,r.period_end::text,s.first_name,s.last_name from family_reports r join students s on s.id=r.student_id where s.classroom_id=$1 and r.teacher_confirmed_at is not null and r.status in ('active','archived') order by r.id`,[classroom.id])).rows,
 closures=(await db.query('select v.id,v.version,p.label from period_closure_versions v join evaluation_periods p on p.id=v.evaluation_period_id where v.classroom_id=$1 order by p.ordinal,v.version',[classroom.id])).rows;
  years.push({...classroom,documents,reports,closures});}
 return {years};
}
