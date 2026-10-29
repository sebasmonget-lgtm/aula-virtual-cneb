import { randomUUID } from 'node:crypto';
import {validateDocumentProjectPlanning,validateDocumentActivityPlanning} from './document-generator-project-planning.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumAges, curriculumHash, curriculumRequest, curriculumDocumentIdentity, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { studentCorrectionFingerprint } from './multi-age-corrections.mjs';
import { annualProjectLinks } from './multi-age-planning-history.mjs';
import { multiAgeStableHash, multiAgeProjectContext } from './multi-age-projects.mjs';
import { studentCurriculumScope } from './student-curriculum-service.mjs';
import { validateStudentsForImport } from './student-import.mjs';
import { validateMultiAgeBlueprint, validCurriculumDay, multiAgePlanningContext, MULTI_AGE_PROMPT_VERSION } from './age-scoped-criteria.mjs';
import { OFFICIAL_PERFORMANCE_VERSION } from './official-performance-references.mjs';
import {captureDocumentObservationRoster} from './document-generator-observation-roster.mjs';
import { saveOrdinaryObservation } from './ordinary-observation-service.mjs';
import { loadConfirmedOrdinaryEvaluationRows } from './ordinary-evaluation-adapter.mjs';
import { buildBriefAssessmentInput, buildBriefAssessmentContext } from './assessment-brief.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { assessmentSourceSnapshot } from './assessment-v4-service.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { validateMultiAgeAnnualActivity } from './multi-age-annual.mjs';
import {validateMultiAgeInstitutionalCalendar} from './multi-age-calendar-definition.mjs';
import { nationalCalendarBlocks2026 } from './annual-plan-calendar.mjs';
import { pilotSchoolYearDefaults } from './pilot-school-year-defaults.mjs';
import { assertPeriodOpen, assertPeriodDatesOpen, periodEditState } from './period-edit-guard.mjs';

const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
async function ownedV2(db,teacherId,classroomId){const scope=await classroomCurriculumScope(db,teacherId,classroomId);if(scope.contract!==2)throw new Error('Esta operación requiere una aula multiedad local.');return scope;}
function confirmed(input){if(input.teacherConfirmed!==true)throw new Error('La confirmación corresponde a la profesora.');}
async function periodForScope(db,scope,periodId){
  const p=(await db.query('select *,starts_on::text,ends_on::text from evaluation_periods where id=$1 and school_year_id=$2',[periodId,scope.school_year_id])).rows[0];
  if(!p)throw new CurriculumPermissionError();
  return p;
}

export function multiAgeClassroomConfiguration(input,{allowSingleAge=false}={}){
  const ages=curriculumAges(input.ages),section=clean(input.section,80),institution=clean(input.institutionName,200);
  const teacherName=input.teacherName===undefined?null:clean(input.teacherName,100),national=input.calendarPolicy==='national-2026';
  if((input.teacherName!==undefined&&teacherName.length<2)||(input.calendarPolicy!==undefined&&!national&&input.calendarPolicy!=='institutional'))throw new TypeError('Revisa la docente y el calendario del aula.');
  const official=national?pilotSchoolYearDefaults(input.year):null;
  if(national&&(!official||input.startsOn!==official.startsOn||input.endsOn!==official.endsOn))throw new TypeError('Conserva las fechas del calendario oficial instalado.');
  if(ages.length<(allowSingleAge?1:2)||!section||!institution||!Number.isInteger(input.year)||input.year<2020||input.year>2100||!validCurriculumDay(input.startsOn)||!validCurriculumDay(input.endsOn)
    ||input.startsOn>input.endsOn||Number(input.startsOn.slice(0,4))!==input.year||Number(input.endsOn.slice(0,4))!==input.year)
    throw new TypeError('Confirma dos o tres edades, institución, aula y fechas del año.');
  const institutional=input.calendarPolicy==='institutional'?validateMultiAgeInstitutionalCalendar(input.calendar,{year:input.year,starts_on:input.startsOn,ends_on:input.endsOn}):null;
  return {ages,section,institution,year:input.year,startsOn:input.startsOn,endsOn:input.endsOn,...(teacherName?{teacherName}:{}),...(national?{calendarPolicy:input.calendarPolicy}:{}),...(institutional?{calendarPolicy:'institutional',calendar:institutional}:{})};
}
export async function createMultiAgeClassroom(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);const normalized=multiAgeClassroomConfiguration(input);
  return curriculumRequest(db,teacherId,input.clientRequestId,'create',normalized,tx=>writeMultiAgeClassroom(tx,teacherId,input,normalized));
}
/** Internal atomic writer, shared with annual transition. Never opens a nested transaction. */
export async function writeMultiAgeClassroom(tx,teacherId,input,normalized=multiAgeClassroomConfiguration(input)){
    const {ages,section,institution,teacherName}=normalized,national=normalized.calendarPolicy==='national-2026';
    if((await tx.query("select 1 from classrooms where teacher_id=$1 and status='active'",[teacherId])).rows.length)throw new VersionConflictError('La docente ya tiene aula activa; no se convierte automáticamente.');
    if(!(await tx.query('select 1 from profiles where user_id=$1',[teacherId])).rows.length)throw new CurriculumPermissionError();
    const level='20000000-0000-4000-8000-000000000001';
    if(!(await tx.query('select id from levels where id=$1',[level])).rows.length)await tx.query("insert into levels(id,name) values($1,'Educación Inicial') on conflict(id) do nothing",[level]);
    for(const age of ages)if(!(await tx.query('select id from age_grades where level_id=$1 and age_years=$2',[level,age])).rows.length)await tx.query('insert into age_grades(id,level_id,label,age_years) values($1,$2,$3,$4) on conflict(level_id,age_years) do nothing',[randomUUID(),level,`${age} años`,age]);
    const existingYear=(await tx.query('select id,starts_on::text,ends_on::text from school_years where owner_id=$1 and year=$2',[teacherId,input.year])).rows[0];
    if(existingYear&&(existingYear.starts_on!==input.startsOn||existingYear.ends_on!==input.endsOn))throw new VersionConflictError('El año de esta cuenta tiene otras fechas. Revisa el calendario antes de crear el aula.');
    const classroomId=randomUUID(),yearId=existingYear?.id??randomUUID();
    if(!existingYear)await tx.query('insert into school_years(id,owner_id,year,starts_on,ends_on) values($1,$2,$3,$4::date,$5::date)',[yearId,teacherId,input.year,input.startsOn,input.endsOn]);
    if(teacherName)await tx.query('update profiles set display_name=$2 where user_id=$1',[teacherId,teacherName]);
    const singleGrade=ages.length===1?(await tx.query('select id from age_grades where level_id=$1 and age_years=$2',[level,ages[0]])).rows[0].id:null;
    await tx.query(`insert into classrooms(id,school_year_id,teacher_id,age_grade_id,institution_name,section,age_mode,curriculum_contract_version)
      values($1,$2,$3,$6,$4,$5,$7,2)`,[classroomId,yearId,teacherId,institution,section,singleGrade,ages.length===1?'single':'multi']);
    for(const age of ages){const grade=(await tx.query('select id from age_grades where level_id=$1 and age_years=$2',[level,age])).rows[0];
      await tx.query('insert into classroom_age_groups(id,classroom_id,age_grade_id) values($1,$2,$3)',[randomUUID(),classroomId,grade.id]);}
    await tx.query('insert into classroom_curriculum_versions(id,classroom_id,revision,snapshot,confirmed_by) values($1,$2,1,$3::jsonb,$4)',[randomUUID(),classroomId,JSON.stringify({...normalized,staffing:'one_teacher_confirmed'}),teacherId]);
    if(normalized.calendar)await tx.query('insert into multi_age_calendars(classroom_id,definition,confirmed_by) values($1,$2::jsonb,$3)',[classroomId,JSON.stringify(normalized.calendar),teacherId]);
    const periods=normalized.calendar?normalized.calendar.periods.map((p,i)=>({...p,ordinal:i+1,label:`Bimestre ${i+1}`})):national?nationalCalendarBlocks2026().filter(b=>b.type==='instructional').map((b,i)=>({ordinal:i+1,label:`Bimestre ${i+1}`,startsOn:b.start_date,endsOn:b.end_date})):[{ordinal:1,label:'Período de prueba local',startsOn:input.startsOn,endsOn:input.endsOn}];
    for(const p of periods)await tx.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,'bimester',$3,$4,$5::date,$6::date) on conflict(school_year_id,kind,ordinal) do nothing`,[randomUUID(),yearId,p.ordinal,p.label,p.startsOn,p.endsOn]);
    const periodId=(await tx.query("select id from evaluation_periods where school_year_id=$1 and kind='bimester' and ordinal=1",[yearId])).rows[0].id;
    return {classroomId,schoolYearId:yearId,periodId};
}

export async function enrollMultiAgeStudent(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);
  const data=validateStudentsForImport([input])[0];
  return curriculumRequest(db,teacherId,input.clientRequestId,'enroll',{...data,classroomId:input.classroomId,age:input.age,expectedRevision:input.expectedRevision,...(input.enrolledOn?{enrolledOn:input.enrolledOn}:{})},tx=>writeMultiAgeEnrollment(tx,teacherId,input,data));
}
export async function writeMultiAgeEnrollment(tx,teacherId,input,data=validateStudentsForImport([input])[0]){
    const scope=await ownedV2(tx,teacherId,input.classroomId);
    if(Number(input.expectedRevision)!==Number(scope.curriculum_revision))throw new VersionConflictError();
    const enrolledOn=input.enrolledOn??null;
    if(enrolledOn!==null&&(!validCurriculumDay(enrolledOn)||enrolledOn<scope.starts_on||enrolledOn>scope.ends_on))throw new TypeError('Elige una fecha de ingreso del año escolar.');
    await assertPeriodDatesOpen(tx,scope.id,enrolledOn??scope.starts_on,scope.ends_on);
    const group=scope.groups.find(g=>Number(g.age)===input.age);if(!group)throw new TypeError('Elige uno de los grupos atendidos.');
    const count=(await tx.query("select count(*)::int n from students where classroom_id=$1 and status='active'",[scope.id])).rows[0].n;
    if(count>=45)throw new Error('El aula admite hasta 45 niños activos en este piloto.');
    const studentId=randomUUID(),assignmentId=randomUUID();
    await tx.query('insert into students(id,classroom_id,first_name,last_name,preferred_name,birth_date) values($1,$2,$3,$4,$5,$6::date)',[studentId,scope.id,data.firstName,data.lastName,data.preferredName,data.birthDate]);
    if(enrolledOn)await tx.query('insert into multi_age_enrollment_dates(student_id,classroom_id,starts_on,confirmed_by) values($1,$2,$3::date,$4)',[studentId,scope.id,enrolledOn,teacherId]);
    await tx.query(`insert into student_curriculum_assignments(id,student_id,classroom_id,school_year_id,classroom_group_id,age_grade_id,source,confirmed_by)
      values($1,$2,$3,$4,$5,$6,'teacher_confirmed',$7)`,[assignmentId,studentId,scope.id,scope.school_year_id,group.id,group.age_grade_id,teacherId]);
    return {classroomId:scope.id,studentId,assignmentId};
}

export async function confirmMultiAgeActivity(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);
  if(input.projectId&&!input.annualPlanId)throw new TypeError('Selecciona el vínculo anual del proyecto.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'activity',{classroomId:input.classroomId,blueprint:input.blueprint,expectedRevision:input.expectedRevision,annualPlanId:input.annualPlanId??null,annualSlotId:input.annualSlotId??null,...(input.projectId?{projectId:input.projectId,expectedProjectFingerprint:input.expectedProjectFingerprint}:{}),...(input.activityPosition?{activityPosition:input.activityPosition}:{}),...(input.generationJobId?{generationJobId:input.generationJobId}:{})},async tx=>{
    if(input.generationJobId)await (await import('./multi-age-generation-jobs.mjs')).assertMultiAgeGenerationUse(tx,teacherId,input.generationJobId,'activity',input);
    return writeConfirmedMultiAgeActivity(tx,teacherId,input);
  });
}
/** Internal writer: callers authorize the proposal and own the receipt/transaction. */
export async function writeConfirmedMultiAgeActivity(tx,teacherId,input){
    const scope=await ownedV2(tx,teacherId,input.classroomId);
    if(Number(input.expectedRevision)!==Number(scope.curriculum_revision))throw new VersionConflictError();
    const blueprint=await validateMultiAgeBlueprint(input.blueprint,scope),annual=await validateMultiAgeAnnualActivity(tx,teacherId,input),projectId=annual?.project?.project.id??randomUUID(),activityId=randomUUID(),blueprintId=randomUUID();
    await assertPeriodDatesOpen(tx,scope.id,blueprint.occursOn,blueprint.occursOn);
    let documentFamilies=annual?.documentProject?[...new Set(annual.documentProject.opportunities.map(o=>o.competency_id))].map(competency_id=>({competency_id,variants:annual.documentProject.opportunities.filter(o=>o.competency_id===competency_id).map(o=>blueprint.criteriaFamilies.find(f=>f.competency_id===competency_id)?.variants.find(v=>v.curricular_age===o.age)??{curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs})})):null;
    if(annual?.documentProject&&!annual.project&&input.generationJobId){
      const saved=(await tx.query("select result from multi_age_generation_jobs where id=$1 and teacher_id=$2 and classroom_id=$3 and status='ready'",[input.generationJobId,teacherId,scope.id])).rows[0];
      if(saved?.result?.projectCriteriaFamilies){
        const master=await validateMultiAgeBlueprint({...blueprint,criteriaFamilies:saved.result.projectCriteriaFamilies},scope),allowed=[...new Set(annual.documentProject.opportunities.map(o=>o.competency_id))];
        if(master.criteriaFamilies.length!==allowed.length||master.criteriaFamilies.some(f=>!allowed.includes(f.competency_id)))throw new TypeError('Los criterios del maestro deben conservar todas sus competencias autorizadas.');
        documentFamilies=master.criteriaFamilies;
      }
    }
    if(!annual?.project&&documentFamilies&&documentFamilies.length<2)throw new TypeError('El proyecto necesita al menos dos competencias. Revisa Mi año antes de prepararlo.');
    const families=annual?.project?.project.details.criteria_families??(documentFamilies??blueprint.criteriaFamilies).map(f=>({...f,family_id:randomUUID(),variants:f.variants.map(v=>({...v,criterion_id:randomUUID()}))}));
    let planning=null,activityPlanning=null,documentPresentationVersion=null,documentReferenceSelectionVersion=null;
    if(annual?.documentProject&&input.generationJobId){
      const saved=(await tx.query("select result from multi_age_generation_jobs where id=$1 and teacher_id=$2 and classroom_id=$3 and status='ready'",[input.generationJobId,teacherId,scope.id])).rows[0];
      if(saved?.result?.promptVersion==='ayni-documents-project-v32')documentPresentationVersion=2;
      if(['ayni-documents-project-v33','ayni-documents-project-v34'].includes(saved?.result?.promptVersion))documentPresentationVersion=3;
      if(saved?.result?.promptVersion==='ayni-documents-project-v35')documentPresentationVersion=4;
      if(saved?.result?.documentReferenceSelectionVersion===2)documentReferenceSelectionVersion=2;
      if(!annual?.project&&saved?.result?.projectPlanning)planning=validateDocumentProjectPlanning(saved.result.projectPlanning,{ages:scope.ages});
      if(saved?.result?.activityPlanning){const annotation=Array.isArray(saved.result.activityPlanning)?saved.result.activityPlanning.find(item=>item.occursOn===blueprint.occursOn)?.planning:saved.result.activityPlanning;activityPlanning=validateDocumentActivityPlanning(annotation,scope.ages);}
    }
    if(activityPlanning?.version===3&&!documentPresentationVersion)documentPresentationVersion=3;
    const projectDetails=annual?.project?.project.details??{...(input.generationJobId?{generation_job_id:input.generationJobId}:{}),contract_version:'project-master-v4',curriculum_contract_version:2,participant_age_groups:blueprint.participantAges,criteria_families:families,blueprint_id:blueprintId,source:'teacher_confirmed_local_blueprint',...(annual?{annual_slot_id:annual.slotId,annual_plan_revision:annual.planRevision,annual_plan_fingerprint:annual.planFingerprint}:{}),...(planning?{document_planning_version:planning.version??1,meaningful_situation:planning.meaningfulSituation,common_sequence:planning.commonSequence,...([2,3,4].includes(planning.version)?{document_planning:planning}:{})}:{})};
    if(!annual?.project&&documentPresentationVersion)projectDetails.document_presentation_version=documentPresentationVersion===4?8:documentPresentationVersion;
    if(!annual?.project&&documentReferenceSelectionVersion)projectDetails.document_reference_selection_version=documentReferenceSelectionVersion;
    const projectHash=multiAgeStableHash(projectDetails);
    const projectTitle=annual?.project?.project.title??annual?.documentProject?.title??blueprint.title;
    const projectPurpose=planning?.version===4?planning.sequence.intendedOutcome:annual?.documentProject?.purpose??blueprint.purpose;
    if(!annual?.project)await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,teacher_confirmed_at,annual_plan_id)
      values($1,$2,'project',$3,$4,$5::date,$6::date,'active',$7::jsonb,now(),$8)`,[projectId,scope.id,projectTitle,projectPurpose,annual?.startsOn??blueprint.occursOn,annual?.endsOn??blueprint.occursOn,JSON.stringify(projectDetails),annual?.planId??null]);
    const daily=blueprint.criteriaFamilies.map(f=>({...f,family_id:randomUUID(),variants:f.variants.map(v=>({...v,source_project_criterion_id:families.find(parent=>parent.competency_id===f.competency_id).variants.find(parent=>parent.curricular_age===v.curricular_age).criterion_id,criterion_id:randomUUID()}))}));
    const details={...(input.generationJobId?{generation_job_id:input.generationJobId}:{}),activity_contract:{contract_version:'activity-v4',curriculum_contract_version:2,project_id:projectId,project_fingerprint:projectHash,blueprint_id:blueprintId,position:annual?.position??1,
      ...(annual?{source_annual_plan_id:annual.planId,project_title_snapshot:projectTitle}:{}),...(annual?.project?.revisionId?{project_revision_id:annual.project.revisionId}:{})},
      participant_age_groups:blueprint.participantAges,common_sequence:blueprint.commonSequence,criteria_families:daily,...(activityPlanning?{activity_document_planning:activityPlanning}:{})};
    // New documentary activities can improve their layout independently of the
    // project. Never update the presentation pinned by an already saved source.
    if(documentPresentationVersion)details.document_presentation_version=documentPresentationVersion===4?7:documentPresentationVersion;
    if([6,7].includes(details.document_presentation_version))details.observation_roster=await captureDocumentObservationRoster(tx,teacherId,scope);
    await tx.query(`insert into activities(id,experience_id,title,purpose,occurs_on,planned_date,status,details,teacher_confirmed_at)
      values($1,$2,$3,$4,$5::date,$5::date,'active',$6::jsonb,now())`,[activityId,projectId,blueprint.title,blueprint.purpose,blueprint.occursOn,JSON.stringify(details)]);
    for(const [index,f] of daily.entries())for(const v of f.variants){
      await tx.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at,display_order,curriculum_contract_version,curricular_age,criterion_family_id)
        values($1,$2,$3,$4,$5::jsonb,'active',now(),$6,2,$7,$8)`,[v.criterion_id,activityId,f.competency_id,v.criterion_text,
        JSON.stringify({...v,competency_id:f.competency_id,official_performance_version:OFFICIAL_PERFORMANCE_VERSION}),index,v.curricular_age,f.family_id]);
    }
    return {classroomId:scope.id,projectId,activityId,projectFingerprint:projectHash};
}

export async function observeMultiAgeStudent(db,teacherId,input){
  assertMultiAgeLocalDb(db);
  const scope=await studentCurriculumScope(db,teacherId,input.studentId);
  if(scope.classroom.contract!==2)throw new Error('La captura multiedad requiere contrato 2.');
  if(!validCurriculumDay(input.observedOn)||input.observedOn<scope.classroom.starts_on||input.observedOn>scope.classroom.ends_on)throw new TypeError('Elige una fecha del año escolar.');
  const period=await periodForScope(db,scope.classroom,input.periodId);
  if(scope.student.enrolled_on&&period.ends_on<scope.student.enrolled_on)throw new TypeError('El niño todavía no había ingresado en este bimestre.');
  if(input.observedOn<period.starts_on||input.observedOn>period.ends_on)throw new TypeError('La fecha no pertenece al período seleccionado.');
  return saveOrdinaryObservation(db,teacherId,{studentId:input.studentId,activityId:input.activityId,criterionId:input.criterionId,sourceKind:'guided',clientRequestId:input.clientRequestId,rawText:input.rawText},
    {occurredAt:new Date(`${input.observedOn}T12:00:00-05:00`)});
}

export async function individualSource(db,teacherId,input){
  const scope=await studentCurriculumScope(db,teacherId,input.studentId);
  if(scope.classroom.contract!==2)throw new Error('El análisis multiedad requiere contrato 2.');
  const period=await periodForScope(db,scope.classroom,input.periodId);
  const all=await loadConfirmedOrdinaryEvaluationRows(db,{classroomId:scope.classroom.id,period,studentId:scope.student.id,competencyId:input.competencyId});
  const sourceRows=[];
  for(const row of all){const captured=(await db.query(`select o.curriculum_assignment_id,ac.curricular_age,ac.revision,ac.details from ordinary_observations o
    join activity_criteria ac on ac.id=o.captured_criterion_id where o.id=$1`,[row.id])).rows[0];
    // Historical records keep their original assignment. A correction never transfers evidence to another age.
    if(!captured||captured.curriculum_assignment_id!==scope.assignment.id||Number(captured.curricular_age)!==scope.age)continue;
    sourceRows.push({...row,details:{...row.details,curriculum_assignment_id:scope.assignment.id,curricular_age:scope.age,criterion_revision:captured.revision,official_performance_refs:captured.details.official_performance_refs}});
  }
  const snapshot={contract:2,assignment_id:scope.assignment.id,assignment_revision:scope.assignment.revision,age:scope.age,competency_id:input.competencyId,
    period_id:period.id,official_performance_version:OFFICIAL_PERFORMANCE_VERSION,sources:assessmentSourceSnapshot(sourceRows)};
  return {scope,period,sourceRows,snapshot,sourceFingerprint:curriculumHash(snapshot)};
}
export async function multiAgeAssessmentContext(db,teacherId,input){
  const data=await individualSource(db,teacherId,input),kb=await loadKnowledgeBaseV4();
  const request=buildBriefAssessmentInput({age:data.scope.age,competencyId:input.competencyId,studentName:[data.scope.student.first_name,data.scope.student.last_name].join(' '),sourceRows:data.sourceRows,period:data.period});
  return {...data,assessmentContext:buildBriefAssessmentContext(request,kb),promptVersion:MULTI_AGE_PROMPT_VERSION};
}

export async function confirmMultiAgeGrade(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);
  if(!['AD','A','B','C'].includes(input.achievementLevel))throw new TypeError('La profesora debe elegir una valoración.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'grade',input,async tx=>{
    const data=await individualSource(tx,teacherId,input);
    await assertPeriodOpen(tx,data.scope.classroom.id,data.period.id);
    if(!data.sourceRows.length)throw new Error('No hay observaciones pertinentes para confirmar esta valoración.');
    if(input.sourceFingerprint!==data.sourceFingerprint)throw new VersionConflictError('Cambió el contexto; revisa las observaciones antes de valorar.');
    const previous=(await tx.query("select * from competency_assessments where student_id=$1 and competency_v4_id=$2 and evaluation_period_id=$3 and status='active'",[input.studentId,input.competencyId,data.period.id])).rows[0];
    if(previous&&input.expectedAssessmentId!==previous.id||!previous&&input.expectedAssessmentId)throw new VersionConflictError('Revisa la valoración vigente antes de confirmar una nueva versión.');
    const reason=typeof input.reason==='string'?input.reason.trim():'';
    if(previous&&(reason.length<3||reason.length>1000))throw new TypeError('Explica el motivo de la corrección en 3 a 1000 caracteres.');
    if(previous){
      await tx.query("update competency_assessments set status='archived',updated_at=now() where id=$1",[previous.id]);
      await tx.query("update competency_descriptive_conclusions set status='archived',updated_at=now() where assessment_id=$1 and status='active'",[previous.id]);
      await tx.query("update family_reports set status='archived',updated_at=now() where student_id=$1 and period_start=$2::date and period_end=$3::date and status in ('active','draft')",[input.studentId,data.period.starts_on,data.period.ends_on]);
    }
    const id=randomUUID(),version=Number((await tx.query('select coalesce(max(version),0)+1 n from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date',[input.studentId,input.competencyId,data.period.starts_on,data.period.ends_on])).rows[0].n);
    await tx.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,evaluation_period_id,version,status,achievement_level,teacher_confirmed_at,source_evidence_ids,source_evidence_snapshot,details,level_confirmed_by)
      values($1,$2,$3,$4::date,$5::date,$6,$11,'active',$7,now(),$8::jsonb,$9::jsonb,$10::jsonb,$12)`,[id,input.studentId,input.competencyId,data.period.starts_on,data.period.ends_on,data.period.id,input.achievementLevel,
      JSON.stringify(data.sourceRows.map(r=>r.id)),JSON.stringify(assessmentSourceSnapshot(data.sourceRows)),JSON.stringify({curriculum_snapshot:data.snapshot,source_fingerprint:data.sourceFingerprint,source:'teacher_confirmed',...(previous?{supersedes_id:previous.id,correction_reason:reason}:{})}),version,teacherId]);
    return {classroomId:data.scope.classroom.id,assessmentId:id};
  });
}

async function relevantPairs(db,teacherId,classroomId,period){
  const rows=await loadConfirmedOrdinaryEvaluationRows(db,{classroomId,period}),pairs=new Map();
  for(const r of rows)pairs.set(`${r.student_id}:${r.competency_v4_id}`,{studentId:r.student_id,competencyId:r.competency_v4_id,periodId:period.id});
  for(const pair of pairs.values()){
    const source=await individualSource(db,teacherId,pair);
    if(!source.sourceRows.length){pairs.delete(`${pair.studentId}:${pair.competencyId}`);continue;}
    const grade=(await db.query("select * from competency_assessments where student_id=$1 and competency_v4_id=$2 and evaluation_period_id=$3 and status='active'",[pair.studentId,pair.competencyId,period.id])).rows[0];
    pair.grade=grade;pair.current=grade?.details?.source_fingerprint===source.sourceFingerprint;
    pair.conclusion=(await db.query("select * from competency_descriptive_conclusions where assessment_id=$1 and status='active'",[grade?.id??null])).rows[0];
  }
  return [...pairs.values()];
}
export async function confirmMultiAgeConclusion(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);const conclusion=clean(input.conclusionText,4000);
  if(!conclusion)throw new TypeError('Escribe y revisa la conclusión antes de confirmar.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'conclusion',input,async tx=>{
    const data=await individualSource(tx,teacherId,input),pairs=await relevantPairs(tx,teacherId,data.scope.classroom.id,data.period);
    await assertPeriodOpen(tx,data.scope.classroom.id,data.period.id);
    if(!pairs.length||pairs.some(p=>!p.current))throw new Error('Primero completa y revisa las valoraciones pertinentes del período.');
    const pair=pairs.find(p=>p.studentId===input.studentId&&p.competencyId===input.competencyId);
    if(!pair||pair.grade.id!==input.assessmentId||input.sourceFingerprint!==data.sourceFingerprint)throw new VersionConflictError();
    if(pair.conclusion&&input.expectedConclusionId!==pair.conclusion.id||!pair.conclusion&&input.expectedConclusionId)throw new VersionConflictError('Revisa la conclusión vigente antes de confirmar una nueva versión.');
    const reason=typeof input.reason==='string'?input.reason.trim():'';
    if(pair.conclusion&&(reason.length<3||reason.length>1000))throw new TypeError('Explica el motivo de la corrección en 3 a 1000 caracteres.');
    if(pair.conclusion){await tx.query("update competency_descriptive_conclusions set status='archived',updated_at=now() where id=$1",[pair.conclusion.id]);
      await tx.query("update family_reports set status='archived',updated_at=now() where student_id=$1 and period_start=$2::date and period_end=$3::date and status in ('active','draft')",[input.studentId,data.period.starts_on,data.period.ends_on]);}
    const id=randomUUID(),version=Number((await tx.query('select coalesce(max(version),0)+1 n from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date',[input.studentId,input.competencyId,data.period.starts_on,data.period.ends_on])).rows[0].n),details={conclusion_text:conclusion,progress_examples:[],support_or_conditions:[],next_steps:[],curriculum_snapshot:data.snapshot,...(pair.conclusion?{supersedes_id:pair.conclusion.id,correction_reason:reason}:{})};
    await tx.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,evaluation_period_id,version,details,status,teacher_confirmed_at,source_assessment_snapshot)
      values($1,$2,$3,$4,$5::date,$6::date,$7,$10,$8::jsonb,'active',now(),$9::jsonb)`,[id,input.studentId,input.competencyId,pair.grade.id,data.period.starts_on,data.period.ends_on,data.period.id,JSON.stringify(details),JSON.stringify({id:pair.grade.id,version:pair.grade.version,curriculum_snapshot:data.snapshot}),version]);
    return {classroomId:data.scope.classroom.id,conclusionId:id};
  });
}

export async function confirmMultiAgeFamilyReport(db,teacherId,input){
  assertMultiAgeLocalDb(db);confirmed(input);
  return curriculumRequest(db,teacherId,input.clientRequestId,'family',input,async tx=>{
    const scope=await studentCurriculumScope(tx,teacherId,input.studentId),period=await periodForScope(tx,scope.classroom,input.periodId);
    await assertPeriodOpen(tx,scope.classroom.id,period.id);
    const pairs=await relevantPairs(tx,teacherId,scope.classroom.id,period);
    if(!pairs.length||pairs.some(p=>!p.current||!p.conclusion))throw new Error('Revisa las valoraciones y conclusiones del período antes de preparar informes.');
    const own=pairs.filter(p=>p.studentId===input.studentId);if(!own.length)throw new Error('Este niño todavía no tiene conclusiones para el período.');
    const existing=(await tx.query("select id from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date and status='active'",[input.studentId,period.starts_on,period.ends_on])).rows[0];
    if(existing)throw new VersionConflictError('El informe confirmado se conserva; no se reemplaza al consultar.');
    const id=randomUUID(),version=Number((await tx.query('select coalesce(max(version),0)+1 n from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date',[input.studentId,period.starts_on,period.ends_on])).rows[0].n),sections=own.map(p=>({competency_id:p.competencyId,information_status:'sufficient',progress_summary:p.conclusion.details.conclusion_text,
      examples:p.conclusion.details.progress_examples,support_or_conditions:p.conclusion.details.support_or_conditions,next_steps:p.conclusion.details.next_steps,family_suggestions:[],insufficiency_note:null}));
    const details={introduction:'',sections,closing_note:'',curriculum_snapshot:{age:scope.age,assignment_id:scope.assignment.id,assignment_revision:scope.assignment.revision},
      achievement_levels:own.map(p=>({competency_id:p.competencyId,achievement_level:p.grade.achievement_level})),source:'confirmed_conclusions_code_only',
      document_identity:await curriculumDocumentIdentity(tx,teacherId,scope.classroom,scope.student)};
    await tx.query(`insert into family_reports(id,student_id,period_start,period_end,version,selected_competency_ids,source_conclusion_ids,source_conclusion_snapshot,details,status,teacher_confirmed_at)
      values($1,$2,$3::date,$4::date,$9,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,'active',now())`,[id,input.studentId,period.starts_on,period.ends_on,JSON.stringify(own.map(p=>p.competencyId)),JSON.stringify(own.map(p=>p.conclusion.id)),JSON.stringify(own.map(p=>({id:p.conclusion.id,details:p.conclusion.details}))),JSON.stringify(details),version]);
    return {classroomId:scope.classroom.id,reportId:id};
  });
}

const familyDocumentSelect=`select r.*,s.first_name,s.last_name,c.section,c.institution_name,c.id as classroom_id,p.display_name as teacher_name,f.identity as frozen_identity
    from family_reports r join students s on s.id=r.student_id join classrooms c on c.id=s.classroom_id join profiles p on p.user_id=c.teacher_id
    left join multi_age_family_document_snapshots f on f.report_id=r.id and f.classroom_id=c.id`;
function familyDocumentFromRow(row){
  if(!row||!row.details.curriculum_snapshot)throw new CurriculumPermissionError();
  const identity=row.frozen_identity??row.details.document_identity;
  return {id:row.id,title:`Informe a la familia de ${identity?.student_name??`${row.first_name} ${row.last_name}`}`,classroom:identity?.section??row.section,institution_name:identity?.institution_name??row.institution_name,teacher_name:identity?.teacher_name??row.teacher_name,
    age:row.details.curriculum_snapshot.age,period_start:String(row.period_start instanceof Date?row.period_start.toISOString():row.period_start).slice(0,10),
    period_end:String(row.period_end instanceof Date?row.period_end.toISOString():row.period_end).slice(0,10),period_label:'Período evaluado',status:row.status,
    content:row.details,achievement_levels:row.details.achievement_levels};
}
export async function multiAgeFamilyDocument(db,teacherId,reportId){
  const row=(await db.query(`${familyDocumentSelect}
    where r.id=$1 and c.teacher_id=$2 and r.status in ('active','archived')`,[reportId,teacherId])).rows[0];
  return familyDocumentFromRow(row);
}

export async function multiAgeLocalWorkspace(db,teacherId,classroomId){
  const classroom=await ownedV2(db,teacherId,classroomId);
  classroom.teacher_name=(await db.query('select display_name from profiles where user_id=$1',[teacherId])).rows[0]?.display_name;
  const students=(await db.query(`select s.id,s.first_name,s.last_name,s.preferred_name,s.birth_date::text,ag.age_years as age,a.id as assignment_id,a.revision as assignment_revision
    from students s join student_curriculum_assignments a on a.student_id=s.id and a.status='active' join age_grades ag on ag.id=a.age_grade_id
    where s.classroom_id=$1 and s.status='active' order by ag.age_years,s.last_name,s.first_name,s.id`,[classroom.id])).rows;
  for(const student of students)student.correction_fingerprint=studentCorrectionFingerprint(student,student.assignment_id);
  const activities=(await db.query(`select a.id,a.title,a.purpose,a.occurs_on::text,a.details,e.type as experience_type,a.experience_id as project_id,coalesce(a.details->'activity_contract'->>'project_title_snapshot',e.title) as project_title,e.details->>'annual_slot_id' as annual_slot_id from activities a join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1 order by a.occurs_on,coalesce((a.details->'activity_contract'->>'position')::int,1),a.created_at,a.id`,[classroom.id])).rows;
  const projectRows=(await db.query("select id from learning_experiences where classroom_id=$1 and type='project' and details->>'curriculum_contract_version'='2' and status='active' order by id",[classroom.id])).rows;
  const activePlan=(await db.query("select id from annual_plans where classroom_id=$1 and curriculum_contract_version=2 and status='active'",[classroom.id])).rows[0],links=activePlan?await annualProjectLinks(db,activePlan.id):[];
  const projects=[];for(const row of projectRows){const p=await multiAgeProjectContext(db,teacherId,classroom.id,row.id);projects.push({id:p.project.id,title:p.project.title,purpose:p.project.purpose,version:p.version,commonSequence:p.commonSequence,annual_plan_id:links.some(l=>l.project_id===p.project.id)?activePlan.id:p.project.annual_plan_id,annual_slot_id:p.project.details.annual_slot_id,fingerprint:p.fingerprint,nextPosition:p.nextPosition,criteriaFamilies:p.project.details.criteria_families,activities:p.activities.map(a=>({id:a.id,title:a.title,occurs_on:a.occurs_on,position:a.position}))});}
  const criteria=(await db.query(`select ac.* from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1 and ac.status='active' order by ac.curricular_age,ac.display_order`,[classroom.id])).rows;
  const periods=(await db.query('select *,starts_on::text,ends_on::text from evaluation_periods where school_year_id=$1 order by ordinal',[classroom.school_year_id])).rows;
  for(const period of periods)period.closed=(await periodEditState(db,classroom.id,period.id)).closed;
  const pairs=[];for(const period of periods)pairs.push(...await relevantPairs(db,teacherId,classroom.id,period));
  const reports=(await db.query(`select r.id,r.student_id,r.period_start::text,r.period_end::text,r.details from family_reports r join students s on s.id=r.student_id where s.classroom_id=$1 and r.status='active'`,[classroom.id])).rows;
  // Document navigation includes prior versions without putting them back into current evaluation.
  // Resolve the same frozen identity as Word, including reports predating identity snapshots.
  const reportHistory=(await db.query(`${familyDocumentSelect}
    where c.id=$1 and c.teacher_id=$2 and r.status in ('active','archived')
    order by r.period_start desc,r.student_id,r.version desc,r.id`,[classroom.id,teacherId])).rows
    .filter(row=>row.details.curriculum_snapshot).map(row=>{
      const document=familyDocumentFromRow(row);
      return {id:row.id,student_id:row.student_id,status:row.status,version:row.version,title:document.title,
        age:document.age,classroom:document.classroom,period_start:document.period_start,period_end:document.period_end,details:row.details};
    });
  const entries=(await db.query('select student_id,starts_on::text from multi_age_enrollment_dates where classroom_id=$1',[classroom.id])).rows;
  for(const s of students){const entry=entries.find(e=>e.student_id===s.id);if(entry)s.enrolled_on=entry.starts_on;}
  return {classroom,students,activities,projects,criteria,periods,pairs,reports,reportHistory,planningContext:await multiAgePlanningContext(classroom,[...new Set(criteria.map(c=>c.competency_v4_id))])};
}
