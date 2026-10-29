import { randomUUID } from 'node:crypto';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { curriculumHash, curriculumRequest, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { studentCurriculumScope } from './student-curriculum-service.mjs';
import { validateStudentsForImport } from './student-import.mjs';
import { assertPeriodDatesOpen } from './period-edit-guard.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { reviseOrdinaryObservation } from './ordinary-observation-service.mjs';
import { confirmOrdinaryAttribution } from './ordinary-attribution-service.mjs';

export function correctionReason(input){
  if(input.teacherConfirmed!==true)throw new TypeError('La profesora debe confirmar la corrección.');
  const reason=typeof input.reason==='string'?input.reason.trim():'';
  if(reason.length<3||reason.length>500)throw new TypeError('Explica el motivo de la corrección en 3 a 500 caracteres.');
  return reason;
}
async function scopeFor(db,teacherId,studentId){const scope=await studentCurriculumScope(db,teacherId,studentId);if(scope.classroom.contract!==2)throw new CurriculumPermissionError();return scope;}
export function studentCorrectionFingerprint(student,assignmentId){return curriculumHash({id:student.id,first_name:student.first_name,last_name:student.last_name,preferred_name:student.preferred_name??null,birth_date:student.birth_date??null,assignment_id:assignmentId});}
export async function appendMultiAgeCorrection(db,teacherId,scope,{kind,id,action='correct',reason,before,after}){
  const revision=Number((await db.query('select coalesce(max(revision),0)+1 n from multi_age_correction_events where entity_kind=$1 and entity_id=$2',[kind,id])).rows[0].n);
  const eventId=randomUUID();
  await db.query(`insert into multi_age_correction_events(id,classroom_id,student_id,entity_kind,entity_id,revision,action,reason,before_snapshot,after_snapshot,created_by)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)`,[eventId,scope.classroom.id,scope.student.id,kind,id,revision,action,reason,JSON.stringify(before),JSON.stringify(after),teacherId]);
  return {eventId,revision};
}
async function archiveDerived(db,studentId,{starts,ends,competencyIds=null}){
  const args=[studentId,starts,ends,competencyIds];
  const grades=(await db.query(`update competency_assessments set status='archived',updated_at=now() where student_id=$1 and status in ('active','draft')
    and period_start<=$3::date and period_end>=$2::date and ($4::text[] is null or competency_v4_id=any($4::text[])) returning id`,args)).rows;
  const conclusions=(await db.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and status='active'
    and period_start<=$3::date and period_end>=$2::date and ($4::text[] is null or competency_v4_id=any($4::text[])) returning id`,args)).rows;
  const reports=(await db.query(`update family_reports set status='archived',updated_at=now() where student_id=$1 and status in ('active','draft')
    and period_start<=$3::date and period_end>=$2::date returning id`,args.slice(0,3))).rows;
  return {assessment_ids:grades.map(r=>r.id),conclusion_ids:conclusions.map(r=>r.id),report_ids:reports.map(r=>r.id)};
}
async function freezeFamilyIdentities(db,teacherId,studentId){
  // Freeze the currently downloadable identity BEFORE changing the roster, including older V2 reports.
  await db.query(`insert into multi_age_family_document_snapshots(report_id,classroom_id,identity,created_by)
    select r.id,c.id,coalesce(r.details->'document_identity',jsonb_build_object('student_name',s.first_name||' '||s.last_name,'section',c.section,
      'institution_name',c.institution_name,'teacher_name',p.display_name)),$2 from family_reports r join students s on s.id=r.student_id
    join classrooms c on c.id=s.classroom_id join profiles p on p.user_id=c.teacher_id where s.id=$1 and c.teacher_id=$2
    on conflict(report_id) do nothing`,[studentId,teacherId]);
}
export async function correctMultiAgeStudent(db,teacherId,input){
  assertMultiAgeLocalDb(db);const reason=correctionReason(input),data=validateStudentsForImport([input])[0];
  if(input.impactsAcknowledged!==true)throw new TypeError('Confirma que revisaste el efecto de la corrección en los registros y documentos.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'student_correct',input,async tx=>{
    const scope=await scopeFor(tx,teacherId,input.studentId);
    if(input.expectedAssignmentId!==scope.assignment.id||input.expectedStudentFingerprint!==studentCorrectionFingerprint(scope.student,scope.assignment.id))throw new VersionConflictError('La matrícula cambió; revisa sus datos antes de corregir.');
    const group=scope.classroom.groups.find(g=>g.age===input.age);if(!group)throw new TypeError('Elige uno de los grupos atendidos por el aula.');
    await assertPeriodDatesOpen(tx,scope.classroom.id,scope.student.enrolled_on??scope.classroom.starts_on,scope.classroom.ends_on);
    const before={...scope.student,age:scope.age,assignment_id:scope.assignment.id};
    const sameIdentity=data.firstName===scope.student.first_name&&data.lastName===scope.student.last_name&&data.preferredName===scope.student.preferred_name&&data.birthDate===scope.student.birth_date;
    if(sameIdentity&&scope.age===input.age)throw new TypeError('No hay cambios en la matrícula.');
    await freezeFamilyIdentities(tx,teacherId,scope.student.id);
    let assignmentId=scope.assignment.id,archived=null;
    if(scope.age!==input.age){
      archived=await archiveDerived(tx,scope.student.id,{starts:scope.classroom.starts_on,ends:scope.classroom.ends_on});
      await tx.query("update student_curriculum_assignments set status='archived' where id=$1",[scope.assignment.id]);
      assignmentId=randomUUID();
      await tx.query(`insert into student_curriculum_assignments(id,student_id,classroom_id,school_year_id,classroom_group_id,age_grade_id,revision,source,confirmed_by,reason,supersedes_assignment_id)
        values($1,$2,$3,$4,$5,$6,$7,'teacher_confirmed',$8,$9,$10)`,[assignmentId,scope.student.id,scope.classroom.id,scope.classroom.school_year_id,group.id,group.age_grade_id,Number(scope.assignment.revision)+1,teacherId,reason,scope.assignment.id]);
    }else{
      const reports=(await tx.query("update family_reports set status='archived',updated_at=now() where student_id=$1 and status in ('active','draft') returning id",[scope.student.id])).rows;
      archived={assessment_ids:[],conclusion_ids:[],report_ids:reports.map(r=>r.id)};
    }
    await tx.query('update students set first_name=$2,last_name=$3,preferred_name=$4,birth_date=$5::date where id=$1',[scope.student.id,data.firstName,data.lastName,data.preferredName,data.birthDate]);
    const after={first_name:data.firstName,last_name:data.lastName,preferred_name:data.preferredName,birth_date:data.birthDate,age:input.age,assignment_id:assignmentId,archived};
    const event=await appendMultiAgeCorrection(tx,teacherId,scope,{kind:'student',id:scope.student.id,reason,before,after});
    return {classroomId:scope.classroom.id,studentId:scope.student.id,assignmentId,...event};
  });
}
export async function correctMultiAgeOrdinaryObservation(db,teacherId,input){
  assertMultiAgeLocalDb(db);const reason=correctionReason(input);
  if(!['correct','void'].includes(input.action)||input.impactsAcknowledged!==true)throw new TypeError('Confirma la corrección y la revisión de sus valoraciones e informes.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'ordinary_correct',input,async tx=>{
    const scope=await scopeFor(tx,teacherId,input.studentId);
    const row=(await tx.query(`select o.*,r.corrected_text,ac.competency_v4_id,ac.curricular_age from ordinary_observations o
      left join lateral(select corrected_text from ordinary_observation_revisions where observation_id=o.id order by revision desc limit 1)r on true
      left join activity_criteria ac on ac.id=o.captured_criterion_id where o.id=$1 and o.student_id=$2 and o.created_by=$3`,[input.observationId,scope.student.id,teacherId])).rows[0];
    if(!row)throw new CurriculumPermissionError();
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.occurred_at));
    await assertPeriodDatesOpen(tx,scope.classroom.id,day,day);
    if(input.expectedAssignmentId!==scope.assignment.id)throw new VersionConflictError('Cambió el grupo curricular del niño.');
    if(input.action==='correct'&&(row.curriculum_assignment_id!==scope.assignment.id||row.curricular_age!==scope.age))throw new VersionConflictError('Este registro conserva una matrícula anterior. Registra una nueva observación con los criterios del grupo actual.');
    // The canonical writers use versionTransaction. Join this existing transaction;
    // any failure propagates to the outer receipt and rolls back the entire correction.
    const joined={query:(...args)=>tx.query(...args),transaction:work=>work(joined)};
    const revised=await reviseOrdinaryObservation(joined,teacherId,row.id,{expectedRevision:input.expectedRevision,action:input.action,reason,correctedText:input.correctedText});
    const previous=(await tx.query('select * from ordinary_observation_attributions where observation_id=$1 order by version desc limit 1',[row.id])).rows[0];
    const competencies=[...new Set([row.competency_v4_id,...(previous?.confirmed_competency_ids??[])].filter(Boolean))];
    if(input.action==='correct'){
      if(input.criterionConfirmed!==true||!row.captured_criterion_id)throw new TypeError('Confirma que el texto corregido corresponde al criterio mostrado.');
      await confirmOrdinaryAttribution(joined,teacherId,row.id,{expectedVersion:previous?.version??0,competencyIds:[row.competency_v4_id],criterionIds:[row.captured_criterion_id],allowedIds:[row.competency_v4_id],reason});
    }
    const period=(await tx.query('select starts_on::text,ends_on::text from evaluation_periods where school_year_id=$1 and $2::date between starts_on and ends_on',[scope.classroom.school_year_id,day])).rows[0];
    const archived=period?await archiveDerived(tx,scope.student.id,{starts:period.starts_on,ends:period.ends_on,competencyIds:competencies}):null;
    const event=await appendMultiAgeCorrection(tx,teacherId,scope,{kind:'ordinary_observation',id:row.id,action:input.action,reason,
      before:{raw_text:row.raw_text,text:row.corrected_text??row.raw_text,source_revision:row.source_revision,status:row.status,curriculum_assignment_id:row.curriculum_assignment_id},
      after:{text:input.action==='correct'?input.correctedText.trim():null,source_revision:revised.source_revision,status:revised.status,archived}});
    return {classroomId:scope.classroom.id,studentId:scope.student.id,observationId:row.id,sourceRevision:revised.source_revision,...event};
  });
}
export async function correctMultiAgeDiagnosticObservation(db,teacherId,input){
  assertMultiAgeLocalDb(db);const reason=correctionReason(input);
  if(!['correct','void'].includes(input.action))throw new TypeError('Elige corregir o retirar el registro.');
  if(input.action==='correct'&&(typeof input.observationText!=='string'||!input.observationText.trim()||input.observationText.length>4000))throw new TypeError('Escribe la observación corregida.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'diagnostic_observation_correct',input,async tx=>{
    const scope=await scopeFor(tx,teacherId,input.studentId),row=(await tx.query('select * from diagnostic_experience_observations where id=$1 and student_id=$2 and created_by=$3',[input.observationId,scope.student.id,teacherId])).rows[0];
    if(!row)throw new CurriculumPermissionError();
    const previous=(await tx.query("select * from multi_age_correction_events where entity_kind='diagnostic_observation' and entity_id=$1 order by revision desc limit 1",[row.id])).rows[0];
    if((previous?.revision??0)!==input.expectedRevision||input.expectedAssignmentId!==scope.assignment.id)throw new VersionConflictError('El registro o la matrícula cambiaron.');
    if(previous?.action==='void')throw new TypeError('El registro retirado se conserva en el historial y no se puede corregir.');
    if(input.action==='correct'&&row.curriculum_assignment_id!==scope.assignment.id)throw new VersionConflictError('Conserva el registro anterior y observa con las orientaciones del grupo actual.');
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.observed_at));
    await assertPeriodDatesOpen(tx,scope.classroom.id,day,day);
    const before=previous?.after_snapshot??{text:row.observation_text,status:row.observation_status,assignment_id:row.curriculum_assignment_id};
    const event=await appendMultiAgeCorrection(tx,teacherId,scope,{kind:'diagnostic_observation',id:row.id,action:input.action,reason,before,
      after:{text:input.action==='correct'?input.observationText.trim():before.text,status:before.status,assignment_id:row.curriculum_assignment_id}});
    return {classroomId:scope.classroom.id,studentId:scope.student.id,observationId:row.id,...event};
  });
}

export async function multiAgeCorrectionHistory(db,teacherId,studentId){
  assertMultiAgeLocalDb(db);const scope=await scopeFor(db,teacherId,studentId);
  const events=(await db.query('select * from multi_age_correction_events where student_id=$1 and classroom_id=$2 order by created_at,revision,id',[studentId,scope.classroom.id])).rows;
  const assignments=(await db.query('select a.id,a.revision,a.status,a.reason,a.supersedes_assignment_id,a.confirmed_at,ag.age_years as age from student_curriculum_assignments a join age_grades ag on ag.id=a.age_grade_id where a.student_id=$1 order by a.revision',[studentId])).rows;
  const ordinary=(await db.query(`select o.id,o.raw_text,o.source_revision,o.status,o.curriculum_assignment_id,ag.age_years as age,
    (o.occurred_at at time zone 'America/Lima')::date::text as observed_on,coalesce(r.corrected_text,o.raw_text) as text,
    ac.criterion_text,ac.competency_v4_id,ac.curricular_age,
    coalesce((select jsonb_agg(to_jsonb(v) order by v.revision) from ordinary_observation_revisions v where v.observation_id=o.id),'[]'::jsonb) as revisions
    from ordinary_observations o left join lateral(select corrected_text from ordinary_observation_revisions where observation_id=o.id and corrected_text is not null order by revision desc limit 1)r on true
    join student_curriculum_assignments a on a.id=o.curriculum_assignment_id join age_grades ag on ag.id=a.age_grade_id
    left join activity_criteria ac on ac.id=o.captured_criterion_id where o.student_id=$1 and o.created_by=$2 order by o.occurred_at,o.id`,[studentId,teacherId])).rows;
  const diagnostic=(await db.query(`select o.id,o.observation_text as original_text,coalesce(e.after_snapshot->>'text',o.observation_text) as text,
    o.observation_status,o.curriculum_assignment_id,o.curriculum_snapshot->>'age' as age,o.aspect_prompt_snapshot,
    (o.observed_at at time zone 'America/Lima')::date::text as observed_on,coalesce(e.revision,0) as revision,e.action
    from diagnostic_experience_observations o left join lateral(select * from multi_age_correction_events where entity_kind='diagnostic_observation' and entity_id=o.id order by revision desc limit 1)e on true
    where o.student_id=$1 and o.created_by=$2 order by o.observed_at,o.id`,[studentId,teacherId])).rows;
  const reviews=(await db.query("select id,version,details,teacher_confirmed_at from diagnostic_student_reviews where student_id=$1 and curriculum_contract_version=2 and status='confirmed' order by version desc",[studentId])).rows;
  const familyContexts=(await db.query("select id,version,details,teacher_confirmed_at from student_family_interviews where student_id=$1 and curriculum_contract_version=2 and status='confirmed' order by version desc",[studentId])).rows;
  return {studentId,classroomId:scope.classroom.id,assignmentId:scope.assignment.id,studentFingerprint:studentCorrectionFingerprint(scope.student,scope.assignment.id),events,assignments,
    ordinary:ordinary.map(o=>({...o,currentAssignment:o.curriculum_assignment_id===scope.assignment.id})),diagnostic:diagnostic.map(o=>({...o,currentAssignment:o.curriculum_assignment_id===scope.assignment.id})),reviews,familyContexts};
}

export async function currentMultiAgeObservationRows(db,rows){
  if(!rows.length)return rows;
  const ids=new Set((await db.query(`select o.id from ordinary_observations o join student_curriculum_assignments a on a.id=o.curriculum_assignment_id and a.status='active'
    join age_grades ag on ag.id=a.age_grade_id join activity_criteria ac on ac.id=o.captured_criterion_id and ac.curricular_age=ag.age_years
    where o.id=any($1::uuid[])`,[[...new Set(rows.map(r=>r.id))]])).rows.map(r=>r.id));
  return rows.filter(row=>ids.has(row.id));
}
