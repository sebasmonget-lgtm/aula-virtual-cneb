import { randomUUID } from 'node:crypto';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumHash, curriculumRequest, curriculumDocumentIdentity, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { studentCurriculumScope } from './student-curriculum-service.mjs';
import { buildDiagnosticExperienceCatalog } from './diagnostic-experiences-v4.mjs';
import { loadDiagnosticCatalog } from './diagnostic-catalog-v4.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { officialPerformanceContext, OFFICIAL_PERFORMANCE_VERSION } from './official-performance-references.mjs';
import { applicableCompetencyCards } from './competency-applicability.mjs';
import { validCurriculumDay } from './age-scoped-criteria.mjs';
import { guidedObservationActive } from './guided-observation-state.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { correctionReason } from './multi-age-corrections.mjs';
import { assertPeriodDatesOpen } from './period-edit-guard.mjs';

export const MULTI_AGE_DIAGNOSTIC_PROMPT_VERSION='multi-age-diagnostic-local-v1';
export const MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS='Lee únicamente las fuentes del niño y su edad curricular confirmada. Los relatos familiares son contexto, no evidencia observada ni logros. Relaciona cada lectura docente con IDs de observaciones de la misma competencia; no inventes fuentes, dificultades, diagnósticos clínicos o niveles AD/A/B/C. La falta de registro es información pendiente. No compares edades ni extrapoles a compañeros. Conserva referentes de ciclo cuando no existe desempeño específico. Devuelve una propuesta para revisión docente, nunca una evaluación final.';
const requireConfirmation=input=>{if(input.teacherConfirmed!==true)throw new TypeError('La profesora debe confirmar lo revisado.');};
const note=(value,max=4000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new TypeError('Escribe un texto dentro del tamaño permitido.');return value.trim();};
export const studentCurriculumSnapshot=scope=>({contract:2,classroom_id:scope.classroom.id,school_year_id:scope.classroom.school_year_id,classroom_revision:scope.classroom.curriculum_revision,
  assignment_id:scope.assignment.id,assignment_revision:scope.assignment.revision,age:scope.age,official_performance_version:OFFICIAL_PERFORMANCE_VERSION,
  conditions:{castellano_l2_applicable:scope.classroom.castellano_l2_applicable,religion_applicable:scope.classroom.religion_applicable}});
async function childScope(db,teacherId,studentId){const scope=await studentCurriculumScope(db,teacherId,studentId);if(scope.classroom.contract!==2)throw new CurriculumPermissionError();return scope;}
async function catalogFor(scope){const kb=await loadKnowledgeBaseV4();return buildDiagnosticExperienceCatalog(kb,{age:scope.age,castellanoL2Applicable:scope.classroom.castellano_l2_applicable,religionApplicable:scope.classroom.religion_applicable},await loadDiagnosticCatalog(kb.competencyCards));}

export async function recordMultiAgeDiagnosticObservation(db,teacherId,input){
  assertMultiAgeLocalDb(db);requireConfirmation(input);const text=note(input.observationText);
  if(!['demonstrated','with_support','not_yet_demonstrated','insufficient_information','observed_without_judgment'].includes(input.observationStatus))throw new TypeError('Selecciona el estado de la observación.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'diagnostic_observation',input,async tx=>{
    const scope=await childScope(tx,teacherId,input.studentId);
    if(input.expectedAssignmentId!==scope.assignment.id)throw new VersionConflictError('La matrícula cambió. Revisa el grupo curricular.');
    if(!validCurriculumDay(input.observedOn)||input.observedOn<scope.classroom.starts_on||input.observedOn>scope.classroom.ends_on)throw new TypeError('Elige una fecha del año escolar.');
    const experience=(await catalogFor(scope)).find(e=>e.id===input.experienceId),aspect=experience?.aspects.find(a=>a.id===input.aspectId);
    if(!aspect)throw new TypeError('El aspecto diagnóstico no corresponde al niño y su edad.');
    const id=randomUUID(),snapshot={...studentCurriculumSnapshot(scope),catalog_version:experience.catalog_version,age_reference:aspect.age_reference,official_performance_version:OFFICIAL_PERFORMANCE_VERSION};
    await tx.query(`insert into diagnostic_experience_observations(id,classroom_id,student_id,experience_id,aspect_id,competency_v4_id,observation_status,observation_text,observed_at,created_by,catalog_version,experience_title_snapshot,aspect_prompt_snapshot,curriculum_assignment_id,curriculum_snapshot)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10,$11,$12,$13,$14,$15::jsonb)`,[id,scope.classroom.id,scope.student.id,experience.id,aspect.id,aspect.competency_id,input.observationStatus,text,`${input.observedOn}T12:00:00-05:00`,teacherId,experience.catalog_version,experience.title,aspect.prompt,scope.assignment.id,JSON.stringify(snapshot)]);
    return {classroomId:scope.classroom.id,studentId:scope.student.id,observationId:id};
  });
}

/** Text-only family source for the local slice; attachments never enter an AI context. */
export async function confirmMultiAgeFamilyContext(db,teacherId,input){
  assertMultiAgeLocalDb(db);requireConfirmation(input);const text=note(input.familyText);
  return curriculumRequest(db,teacherId,input.clientRequestId,'diagnostic_family_context',input,async tx=>{
    const scope=await childScope(tx,teacherId,input.studentId);
    if(input.expectedAssignmentId!==scope.assignment.id)throw new VersionConflictError();
    if((await tx.query("select id from student_family_interviews where student_id=$1 and curriculum_contract_version=2 and status='draft'",[scope.student.id])).rows.length)throw new VersionConflictError('Hay un cuestionario familiar en progreso. Revisa y confirma ese avance antes de crear otra versión.');
    const previous=(await tx.query("select id from student_family_interviews where student_id=$1 and status='confirmed' and curriculum_contract_version=2 order by version desc limit 1",[scope.student.id])).rows[0];
    if((input.expectedInterviewId??null)!==(previous?.id??null))throw new VersionConflictError('Revisa el contexto familiar vigente antes de confirmar otra versión.');
    const reason=previous?correctionReason(input):null;
    if(previous)await assertPeriodDatesOpen(tx,scope.classroom.id,scope.student.enrolled_on??scope.classroom.starts_on,scope.classroom.ends_on);
    const version=Number((await tx.query('select coalesce(max(version),0)+1 n from student_family_interviews where student_id=$1',[scope.student.id])).rows[0].n),id=randomUUID();
    const details={contract:'multi-age-family-context-local-v1',source_kind:'family_report',family_text:text,curriculum_snapshot:studentCurriculumSnapshot(scope),...(previous?{supersedes_id:previous.id,correction_reason:reason}:{})};
    await tx.query(`insert into student_family_interviews(id,classroom_id,student_id,version,status,details,created_by,teacher_confirmed_at,curriculum_contract_version) values($1,$2,$3,$4,'confirmed',$5::jsonb,$6,now(),2)`,[id,scope.classroom.id,scope.student.id,version,JSON.stringify(details),teacherId]);
    return {classroomId:scope.classroom.id,studentId:scope.student.id,interviewId:id};
  });
}

export async function multiAgeDiagnosticContext(db,teacherId,studentId){
  const scope=await childScope(db,teacherId,studentId),kb=await loadKnowledgeBaseV4(),snapshot=studentCurriculumSnapshot(scope);
  const observations=(await db.query(`select o.id,o.experience_id,o.aspect_id,o.competency_v4_id,o.observation_status,
    coalesce(e.after_snapshot->>'text',o.observation_text) as observation_text,o.observed_at,o.curriculum_assignment_id,o.curriculum_snapshot from diagnostic_experience_observations o
    left join lateral(select action,after_snapshot from multi_age_correction_events where entity_kind='diagnostic_observation' and entity_id=o.id order by revision desc limit 1)e on true
    where o.student_id=$1 and o.classroom_id=$2 and o.curriculum_assignment_id=$3 and coalesce(e.action,'correct')<>'void' and ${guidedObservationActive('o')} order by o.observed_at,o.id`,[studentId,scope.classroom.id,scope.assignment.id])).rows;
  const interview=(await db.query(`select id,version,details from student_family_interviews where student_id=$1 and classroom_id=$2 and status='confirmed' and curriculum_contract_version=2 order by version desc limit 1`,[studentId,scope.classroom.id])).rows[0]??null;
  const cards=applicableCompetencyCards(kb.competencyCards,scope.age,{castellanoL2Applicable:scope.classroom.castellano_l2_applicable,religionApplicable:scope.classroom.religion_applicable});
  const identityCorrection=(await db.query("select id from multi_age_correction_events where entity_kind='student' and student_id=$1 order by revision desc limit 1",[studentId])).rows[0];
  const catalog=await catalogFor(scope),sources={curriculum:snapshot,knowledge_version:kb.version,diagnostic_catalog_version:catalog[0]?.catalog_version??null,observations,family:interview,...(identityCorrection?{student_identity_revision:identityCorrection.id}:{})},sourceFingerprint=curriculumHash(sources);
  return {scope,catalog,sources,sourceFingerprint,
    context:{contract:'AyniDiagnosticContext/v2',prompt_version:MULTI_AGE_DIAGNOSTIC_PROMPT_VERSION,scope:'individual',curricular_age:scope.age,curriculum_snapshot:snapshot,
      teacher_observations:observations.map(o=>({id:o.id,competency_id:o.competency_v4_id,status:o.observation_status,text:o.observation_text,observed_at:o.observed_at,age_reference:o.curriculum_snapshot.age_reference})),
      family_reports:interview?[{id:interview.id,source_kind:'family_report',text:interview.details.family_text}]:[],
      curriculum:cards.map(c=>({id:c.id,name:c.official_name,cycle_standard_ai:c.cycle_ii_standard_ai,semantic_text_policy:c.text_policy,age_reference:c.ages[String(scope.age)]})),official_performance_catalog:officialPerformanceContext(cards.map(c=>c.id),scope.age),instructions:MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS}};
}

export function validateMultiAgeDiagnosticFindings(findings,context){
  if(!Array.isArray(findings)||findings.length>context.curriculum.length)throw new TypeError('Lecturas diagnósticas inválidas.');
  const seen=new Set();
  for(const f of findings){
    if(!f||Object.keys(f).some(k=>!['competency_id','observation_ids','teacher_reading','planning_priority'].includes(k))||seen.has(f.competency_id)
      ||!context.curriculum.some(c=>c.id===f.competency_id)||!Array.isArray(f.observation_ids)||!f.observation_ids.length||new Set(f.observation_ids).size!==f.observation_ids.length
      ||f.observation_ids.some(id=>!context.teacher_observations.some(o=>o.id===id&&o.competency_id===f.competency_id&&o.status!=='insufficient_information'))
      ||!['usual','consider','prioritize'].includes(f.planning_priority))throw new TypeError('Cada lectura necesita observaciones propias de la misma competencia; los relatos familiares no acreditan logros.');
    note(f.teacher_reading,1500);seen.add(f.competency_id);
  }
  return findings;
}
export async function confirmMultiAgeDiagnosticReview(db,teacherId,input){
  assertMultiAgeLocalDb(db);requireConfirmation(input);
  return curriculumRequest(db,teacherId,input.clientRequestId,'diagnostic_review',input,async tx=>{
    const data=await multiAgeDiagnosticContext(tx,teacherId,input.studentId);
    if(input.generationJobId)await (await import('./multi-age-generation-jobs.mjs')).assertMultiAgeGenerationUse(tx,teacherId,input.generationJobId,'diagnostic',{...input,classroomId:data.scope.classroom.id});
    if(input.sourceFingerprint!==data.sourceFingerprint)throw new VersionConflictError('Las fuentes diagnósticas cambiaron. Revísalas antes de confirmar.');
    const findings=validateMultiAgeDiagnosticFindings(input.findings,data.context);
    const previous=(await tx.query("select id from diagnostic_student_reviews where student_id=$1 and status='confirmed' and curriculum_contract_version=2 order by version desc limit 1",[input.studentId])).rows[0];
    if((input.expectedReviewId??null)!==(previous?.id??null))throw new VersionConflictError('Revisa la versión diagnóstica vigente antes de confirmar otra.');
    const reason=previous?correctionReason(input):null;
    if(previous)await assertPeriodDatesOpen(tx,data.scope.classroom.id,data.scope.student.enrolled_on??data.scope.classroom.starts_on,data.scope.classroom.ends_on);
    if(input.pendingInformationAcknowledged!==true)throw new TypeError('Confirma que las competencias sin observación quedan pendientes, sin asignar niveles.');
    const version=Number((await tx.query('select coalesce(max(version),0)+1 n from diagnostic_student_reviews where student_id=$1',[input.studentId])).rows[0].n),id=randomUUID();
    const details={...(input.generationJobId?{generation_job_id:input.generationJobId}:{}),contract:'multi-age-diagnostic-review-local-v1',curriculum_snapshot:studentCurriculumSnapshot(data.scope),findings,pending_competency_ids:data.context.curriculum.filter(c=>!findings.some(f=>f.competency_id===c.id)).map(c=>c.id),source_fingerprint:data.sourceFingerprint,prompt_version:MULTI_AGE_DIAGNOSTIC_PROMPT_VERSION,
      ...(previous?{supersedes_id:previous.id,correction_reason:reason}:{}),document_identity:await curriculumDocumentIdentity(tx,teacherId,data.scope.classroom,data.scope.student),curriculum_reference:{knowledge_version:data.sources.knowledge_version,competencies:data.context.curriculum,official_performance_catalog:data.context.official_performance_catalog}};
    await tx.query(`insert into diagnostic_student_reviews(id,classroom_id,student_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at,curriculum_contract_version) values($1,$2,$3,$4,'confirmed',$5::jsonb,$6::jsonb,$7,now(),2)`,[id,data.scope.classroom.id,input.studentId,version,JSON.stringify(details),JSON.stringify(data.sources),teacherId]);
    return {classroomId:data.scope.classroom.id,studentId:input.studentId,reviewId:id};
  });
}

export async function multiAgeDiagnosticWorkspace(db,teacherId,classroomId){
  const classroom=await classroomCurriculumScope(db,teacherId,classroomId);if(classroom.contract!==2)throw new CurriculumPermissionError();
  const children=(await db.query("select id,first_name,last_name from students where classroom_id=$1 and status='active' order by last_name,first_name,id",[classroomId])).rows,students=[];
  for(const child of children){
    const data=await multiAgeDiagnosticContext(db,teacherId,child.id),review=(await db.query(`select * from diagnostic_student_reviews where student_id=$1 and status='confirmed' and curriculum_contract_version=2 order by version desc limit 1`,[child.id])).rows[0]??null;
    students.push({...child,age:data.scope.age,assignmentId:data.scope.assignment.id,catalog:data.catalog,observations:data.sources.observations,family:data.sources.family,sourceFingerprint:data.sourceFingerprint,review,current:Boolean(review&&review.details.source_fingerprint===data.sourceFingerprint),pendingCompetencyIds:review?.details.pending_competency_ids??data.context.curriculum.map(c=>c.id)});
  }
  const kb=await loadKnowledgeBaseV4();
  const groups=classroom.ages.map(age=>{const members=students.filter(s=>s.age===age),cards=applicableCompetencyCards(kb.competencyCards,age,{castellanoL2Applicable:classroom.castellano_l2_applicable,religionApplicable:classroom.religion_applicable});
    return {age,enrolled:members.length,reviewed:members.filter(s=>s.current).length,withObservations:members.filter(s=>s.observations.length).length,withFamilyContext:members.filter(s=>s.family).length,
      coverage:cards.map(c=>({competency_id:c.id,name:c.official_name,enrolled:members.length,withTeacherSources:members.filter(s=>s.observations.some(o=>o.competency_v4_id===c.id&&o.observation_status!=='insufficient_information')).length,
        withConfirmedReading:members.filter(s=>s.current&&s.review.details.findings.some(f=>f.competency_id===c.id)).length}))};});
  // The annual fingerprint includes roster, assignments, source content and confirmed readings.
  const sourceSnapshot={contract:2,classroom_id:classroom.id,revision:classroom.curriculum_revision,ages:classroom.ages,students:students.map(s=>({student_id:s.id,age:s.age,assignment_id:s.assignmentId,source_fingerprint:s.sourceFingerprint,review_id:s.review?.id??null,review_version:s.review?.version??null,review:s.review?.details??null,current:s.current}))};
  return {classroom,students,groups,sourceSnapshot,sourceFingerprint:curriculumHash(sourceSnapshot),ready:students.length>0&&students.every(s=>s.current)};
}
