import {randomUUID} from 'node:crypto';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {classroomCurriculumScope,curriculumRequest,curriculumDocumentIdentity,CurriculumPermissionError,validCurriculumId} from './classroom-curriculum-scope.mjs';
import {workshopCatalog,WORKSHOP_CATALOG_VERSION} from './workshop-catalog.mjs';
import {workshopForAge} from './workshop-ages.mjs';
import {officialPerformances,validateOfficialPerformanceRefs,OFFICIAL_PERFORMANCE_VERSION} from './official-performance-references.mjs';
import {validateMultiAgeBlueprint,validCurriculumDay} from './age-scoped-criteria.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {competencyApplicability} from './competency-applicability.mjs';
import {multiAgeStableHash} from './multi-age-projects.mjs';
import {assertPeriodDatesOpen} from './period-edit-guard.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {multiAgeSchoolCalendar} from './multi-age-calendar-definition.mjs';

async function scopeFor(db,teacherId,classroomId){const scope=await classroomCurriculumScope(db,teacherId,classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();return scope;}
function instructional(scope,day){
 if(!validCurriculumDay(day)||day<scope.starts_on||day>scope.ends_on)throw new TypeError('Elige una fecha del año escolar.');
 if(!multiAgeSchoolCalendar(scope).days.find(d=>d.date===day)?.is_instructional)throw new TypeError('El taller necesita un día lectivo disponible.');
}

/** Only authored shared proposals with a genuine adaptation for every classroom age. */
export async function multiAgeWorkshopLibrary(db,teacherId,classroomId){
 assertMultiAgeLocalDb(db);const scope=await scopeFor(db,teacherId,classroomId),kb=await loadKnowledgeBaseV4();
 const workshops=workshopCatalog.filter(w=>Array.isArray(w.ages)&&scope.ages.every(age=>workshopForAge(w,age)))
  .filter(w=>scope.ages.every(age=>competencyApplicability(kb.competencyCards.find(c=>c.id===w.competency_id),age,{castellanoL2Applicable:scope.castellano_l2_applicable,religionApplicable:scope.religion_applicable}).planning_available))
  .map(w=>({id:w.id,title:w.title,type:w.type,competencyId:w.competency_id,materials:w.materials,preparation:w.preparation,resources:w.resources,
   commonSequence:{opening:w.opening.teacher,development:scope.ages.map(age=>{const a=workshopForAge(w,age);return `${age} años: ${a.development.children}\nCómo acompañar: ${a.development.teacher}`;}).join('\n\n'),closure:w.closure.teacher},
   variants:scope.ages.map(age=>{const a=workshopForAge(w,age);return {curricular_age:age,purpose:a.purpose,criterion_text:a.criterion,expected_evidence:a.evidence,observation_moments:['development','closure'],official_performance_refs:[],performances:officialPerformances(w.competency_id,age)};})}));
 return {classroomId,ages:scope.ages,catalogVersion:WORKSHOP_CATALOG_VERSION,sourceFingerprint:multiAgeStableHash({classroomId,revision:scope.curriculum_revision,ages:scope.ages,catalogVersion:WORKSHOP_CATALOG_VERSION,workshops}),workshops};
}

export async function confirmMultiAgeWorkshop(db,teacherId,input){
 assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true)throw new TypeError('Revisa y confirma el taller y los referentes de cada edad.');
 // The library is read at the root handle; the transaction revalidates its complete source below.
 const library=await multiAgeWorkshopLibrary(db,teacherId,input.classroomId);
 return curriculumRequest(db,teacherId,input.clientRequestId,'workshop',input,async tx=>{
  const scope=await scopeFor(tx,teacherId,input.classroomId),w=library.workshops.find(w=>w.id===input.workshopId);
  if(!w||input.sourceFingerprint!==library.sourceFingerprint||Number(input.expectedRevision)!==Number(scope.curriculum_revision))throw new VersionConflictError('El aula o el catálogo de talleres cambió. Vuelve a revisar la propuesta.');
  instructional(scope,input.blueprint?.occursOn);await assertPeriodDatesOpen(tx,scope.id,input.blueprint.occursOn,input.blueprint.occursOn);
  const blueprint=await validateMultiAgeBlueprint(input.blueprint,scope);
  if(JSON.stringify(blueprint.participantAges)!==JSON.stringify(scope.ages)||blueprint.criteriaFamilies.length!==1||blueprint.criteriaFamilies[0].competency_id!==w.competencyId
   ||JSON.stringify(blueprint.criteriaFamilies[0].variants.map(v=>v.curricular_age).sort())!==JSON.stringify(scope.ages))throw new TypeError('El taller conserva su competencia y un criterio propio para cada edad del aula.');
  const duplicate=(await tx.query(`select a.id from activities a join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1 and e.type='workshop' and a.status='active' and a.occurs_on=$2::date`,[scope.id,blueprint.occursOn])).rows[0];
  if(duplicate)throw new VersionConflictError('Ya hay un taller preparado para ese día. Ábrelo desde Hoy antes de programar otro.');
  const experienceId=randomUUID(),activityId=randomUUID(),familyId=randomUUID(),identity=await curriculumDocumentIdentity(tx,teacherId,scope),kb=await loadKnowledgeBaseV4();
  const families=blueprint.criteriaFamilies.map(f=>({...f,family_id:familyId,variants:f.variants.map(v=>({...v,criterion_id:randomUUID()}))}));
  const references=families.flatMap(f=>f.variants.map(v=>{const card=kb.competencyCards.find(c=>c.id===f.competency_id);return {age:v.curricular_age,competency_id:f.competency_id,name:card.official_name,cycle_standard_ai:card.cycle_ii_standard_ai,
   official_performance_version:OFFICIAL_PERFORMANCE_VERSION,official_performances:validateOfficialPerformanceRefs(v.official_performance_refs,f.competency_id,v.curricular_age,{required:true})};}));
  const snapshot={identity,curriculumReference:references,content:{title:blueprint.title,purpose:blueprint.purpose,occursOn:blueprint.occursOn,commonSequence:blueprint.commonSequence,criteriaFamilies:families,materials:w.materials,preparation:w.preparation,resources:w.resources},catalog:{id:w.id,version:library.catalogVersion}};
  const fingerprint=multiAgeStableHash(snapshot),details={curriculum_contract_version:2,contract_version:'multi-age-workshop-v1',participant_age_groups:scope.ages,workshop_snapshot:snapshot,workshop_fingerprint:fingerprint};
  await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,teacher_confirmed_at) values($1,$2,'workshop',$3,$4,$5::date,$5::date,'active',$6::jsonb,now())`,[experienceId,scope.id,blueprint.title,blueprint.purpose,blueprint.occursOn,JSON.stringify(details)]);
  const activityDetails={...details,common_sequence:blueprint.commonSequence,criteria_families:families,activity_contract:{contract_version:'activity-v4',curriculum_contract_version:2,project_id:experienceId,project_fingerprint:fingerprint,blueprint_id:randomUUID(),workshop:true}};
  await tx.query(`insert into activities(id,experience_id,title,purpose,occurs_on,planned_date,status,details,teacher_confirmed_at,preparation) values($1,$2,$3,$4,$5::date,$5::date,'active',$6::jsonb,now(),$7::jsonb)`,[activityId,experienceId,blueprint.title,blueprint.purpose,blueprint.occursOn,JSON.stringify(activityDetails),JSON.stringify({materials:w.materials,instructions:w.preparation})]);
  for(const f of families)for(const v of f.variants)await tx.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at,display_order,curriculum_contract_version,curricular_age,criterion_family_id) values($1,$2,$3,$4,$5::jsonb,'active',now(),0,2,$6,$7)`,[v.criterion_id,activityId,f.competency_id,v.criterion_text,JSON.stringify({...v,competency_id:f.competency_id,official_performance_version:OFFICIAL_PERFORMANCE_VERSION}),v.curricular_age,familyId]);
  return {classroomId:scope.id,activityId,workshopId:experienceId};
 });
}

export async function listMultiAgeWorkshopDocuments(db,teacherId,classroomId=null){
 assertMultiAgeLocalDb(db);const rows=(await db.query(`select a.id,a.title,a.status,a.teacher_confirmed_at,a.occurs_on::text as day,a.details,c.id as classroom_id,c.status as classroom_status from activities a join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id join school_years sy on sy.id=c.school_year_id where c.teacher_id=$1 and sy.owner_id=$1 and c.curriculum_contract_version=2 and e.type='workshop' and a.details->>'contract_version'='multi-age-workshop-v1' and ($2::uuid is null or c.id=$2)`,[teacherId,classroomId])).rows;
 return rows.map(r=>({id:r.id,kind:'workshop',title:r.title,version:1,status:r.status,historical:r.status==='archived'||r.classroom_status==='archived',exportReady:Boolean(r.teacher_confirmed_at),classroomId:r.classroom_id,ages:r.details.participant_age_groups,schoolYear:r.details.workshop_snapshot.identity.school_year,date:r.day,confirmedAt:r.teacher_confirmed_at}));
}
export async function loadMultiAgeWorkshopDocument(db,teacherId,id){
 assertMultiAgeLocalDb(db);if(!validCurriculumId(teacherId)||!validCurriculumId(id))throw new CurriculumPermissionError();
 const r=(await db.query(`select a.*,a.occurs_on::text as day,e.classroom_id,e.type from activities a join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id join school_years sy on sy.id=c.school_year_id where a.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.curriculum_contract_version=2 and e.type='workshop'`,[id,teacherId])).rows[0];
 if(!r)throw new CurriculumPermissionError();const snapshot=r.details.workshop_snapshot;
 if(!r.teacher_confirmed_at||!['active','archived'].includes(r.status)||!snapshot||multiAgeStableHash(snapshot)!==r.details.workshop_fingerprint||snapshot.identity.classroom_id!==r.classroom_id
  ||snapshot.content.title!==r.title||snapshot.content.purpose!==r.purpose||snapshot.content.occursOn!==r.day)throw new VersionConflictError('El taller no conserva su versión confirmada.');
 return {contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,id:r.id,kind:'workshop',version:1,status:r.status,confirmedAt:r.teacher_confirmed_at,identity:snapshot.identity,curriculumReference:snapshot.curriculumReference,content:snapshot.content,sourceSnapshot:{catalog:snapshot.catalog}};
}
