import {validateDocumentProjectPlanning} from './document-generator-project-planning.mjs';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {CurriculumPermissionError,curriculumAges,validCurriculumId} from './classroom-curriculum-scope.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {multiAgeStableHash} from './multi-age-projects.mjs';
import {OFFICIAL_PERFORMANCE_VERSION,validateOfficialPerformanceRefs} from './official-performance-references.mjs';

const conflict=()=>new VersionConflictError('El proyecto no conserva todos sus datos confirmados para descargar esta versión. Sus actividades anteriores siguen conservadas.');

/** A document ID addresses the immutable root (v1) or one exact edition, never "latest". */
export async function loadMultiAgeProjectDocument(db,teacherId,id,loadAnnual){
 assertMultiAgeLocalDb(db);if(!validCurriculumId(teacherId)||!validCurriculumId(id))throw new CurriculumPermissionError();
 const row=(await db.query(`select p.*,p.starts_on::text as starts_day,p.ends_on::text as ends_day,
  v.id as edition_id,v.version as edition_version,v.title as edition_title,v.purpose as edition_purpose,
  v.details as edition_details,v.fingerprint as edition_fingerprint,v.confirmed_at as edition_confirmed_at
  from learning_experiences p join classrooms c on c.id=p.classroom_id join school_years sy on sy.id=c.school_year_id
  left join multi_age_project_versions v on v.project_id=p.id and v.id=$1 and v.classroom_id=p.classroom_id
  where (p.id=$1 or v.id=$1) and c.teacher_id=$2 and sy.owner_id=$2 and c.curriculum_contract_version=2
  and p.details->>'curriculum_contract_version'='2'`,[id,teacherId])).rows[0];
 if(!row)throw new CurriculumPermissionError();
 const details=row.edition_details??row.details,version=Number(row.edition_version??1),ages=curriculumAges(details.participant_age_groups),families=details.criteria_families;
 if(!row.teacher_confirmed_at||!['active','archived'].includes(row.status)||!row.annual_plan_id||!Array.isArray(families)||!families.length)throw conflict();
 if(row.edition_id&&(details.project_revision_id!==id||details.project_revision!==version||multiAgeStableHash(details)!==row.edition_fingerprint))throw conflict();
 // Original projects predate master editions: their first confirmed activity pins the shared sequence.
 const first=(await db.query(`select details from activities where experience_id=$1 and teacher_confirmed_at is not null
  and details->'activity_contract'->>'position'='1' order by created_at,id limit 1`,[row.id])).rows[0];
 const sequence=row.edition_id||details.document_planning_version>=1?details.common_sequence:first?.details?.common_sequence;
 if(!sequence||['opening','development','closure'].some(k=>typeof sequence[k]!=='string'||!sequence[k].trim())
  ||!row.edition_id&&(first?.details?.activity_contract?.project_id!==row.id||first.details.activity_contract.project_fingerprint!==multiAgeStableHash(row.details)))throw conflict();
 const annual=await loadAnnual(db,teacherId,'annual_plan',row.annual_plan_id);
 if(annual.identity.classroom_id!==row.classroom_id||JSON.stringify(annual.identity.ages)!==JSON.stringify(ages))throw conflict();
 const references=[],ids=new Set(),competencies=new Set();
 for(const family of families){
  if(competencies.has(family.competency_id)||!Array.isArray(family.variants)||JSON.stringify(family.variants.map(v=>v.curricular_age).sort())!==JSON.stringify(ages))throw conflict();
  competencies.add(family.competency_id);
  for(const variant of family.variants){
   const reference=annual.curriculumReference.find(c=>c.competency_id===family.competency_id&&c.age===variant.curricular_age),refs=variant.official_performance_refs;
   if(!reference||!validCurriculumId(variant.criterion_id)||ids.has(variant.criterion_id)||!variant.criterion_text?.trim()||!variant.expected_evidence?.trim()
    ||!Array.isArray(variant.observation_moments)||!variant.observation_moments.length||variant.observation_moments.some(m=>!['opening','development','closure'].includes(m))
    ||!Array.isArray(refs)||refs.length>3||new Set(refs).size!==refs.length)throw conflict();
   ids.add(variant.criterion_id);
   const installed=reference.official_performance_version===OFFICIAL_PERFORMANCE_VERSION?validateOfficialPerformanceRefs(refs,family.competency_id,variant.curricular_age,{required:true}):null;
   if(!refs.length&&reference.official_performances.length)throw conflict();
   const performances=refs.map(ref=>reference.official_performances.find(p=>p.id===ref)??installed?.find(p=>p.id===ref));
   if(performances.some(p=>!p||p.age!==variant.curricular_age||p.competency_id!==family.competency_id||!p.text))throw conflict();
   references.push({...reference,official_performances:performances});
  }
 }
 return {contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,id,kind:'project',status:row.status,version,confirmedAt:row.edition_confirmed_at??row.teacher_confirmed_at,
  identity:annual.identity,curriculumReference:references,
  sourceSnapshot:{annualPlanId:annual.id,annualPlanVersion:annual.version,projectId:row.id,projectRevisionId:row.edition_id??null,projectFingerprint:multiAgeStableHash(details)},
  content:{...([2,3,4,7,8].includes(details.document_presentation_version)?{documentPresentationVersion:details.document_presentation_version}:{}),title:row.edition_title??row.title,purpose:row.edition_purpose??row.purpose,startsOn:row.starts_day,endsOn:row.ends_day,commonSequence:sequence,criteriaFamilies:families,...(details.document_planning_version>=1?{meaningfulSituation:details.meaningful_situation,...([2,3,4].includes(details.document_planning_version)?{documentPlanning:validateDocumentProjectPlanning(details.document_planning,{complete:true,ages})}:{})}:{}),
   annualContext:(()=>{const position=annual.content.proposals.find(p=>p.slot_id===details.annual_slot_id);return position?{index:annual.content.proposals.findIndex(p=>p.slot_id===position.slot_id),rationale:position.rationale??'',invitation:position.common_invitation,organization:position.one_teacher_organization,childActions:position.opportunities.map(o=>o.age+' años: '+o.child_action),supports:[...new Set(position.opportunities.map(o=>o.supports).filter(Boolean))]}:{};})()}};
}

/** Library index is a live read projection; it is deliberately outside the frozen Word content. */
export async function listMultiAgeProjectDocuments(db,teacherId,classroomId,annuals){
 assertMultiAgeLocalDb(db);
 const projects=(await db.query(`select p.*,p.starts_on::text as starts_day,c.status as classroom_status from learning_experiences p
  join classrooms c on c.id=p.classroom_id join school_years sy on sy.id=c.school_year_id
  where c.teacher_id=$1 and sy.owner_id=$1 and c.curriculum_contract_version=2 and p.type='project' and p.details->>'curriculum_contract_version'='2'
  and ($2::uuid is null or p.classroom_id=$2)`,[teacherId,classroomId])).rows;
 if(!projects.length)return [];
 const projectIds=projects.map(p=>p.id),editions=(await db.query('select * from multi_age_project_versions where project_id=any($1::uuid[]) order by version',[projectIds])).rows;
 const activities=(await db.query(`select a.*,a.occurs_on::text as activity_day from activities a where experience_id=any($1::uuid[])
  and a.details->'activity_contract'->>'curriculum_contract_version'='2' order by a.occurs_on,a.id`,[projectIds])).rows;
 const result=[];
 for(const p of projects){
  const annual=annuals.find(d=>d.id===p.annual_plan_id),versions=editions.filter(v=>v.project_id===p.id),latest=versions.at(-1)?.version??1;
  const common={classroomId:p.classroom_id,studentId:null,projectId:p.id,ages:p.details.participant_age_groups??[],schoolYear:annual?.schoolYear??null};
  for(const version of [{id:p.id,version:1,title:p.title,details:p.details,confirmed_at:p.teacher_confirmed_at},...versions]){
   const first=activities.find(a=>a.experience_id===p.id&&a.details.activity_contract.position===1&&a.teacher_confirmed_at);
   const sequence=version.version===1?first?.details.common_sequence:version.details.common_sequence;
   result.push({...common,id:version.id,kind:'project',title:version.title,version:Number(version.version),status:p.status,
    historical:p.status==='archived'||p.classroom_status==='archived'||version.version<latest,
    exportReady:Boolean(annual?.exportReady&&version.confirmed_at&&Array.isArray(version.details.criteria_families)&&sequence&&['opening','development','closure'].every(k=>typeof sequence[k]==='string'&&sequence[k].trim())&&['active','archived'].includes(p.status)),
    confirmedAt:version.confirmed_at,date:p.starts_day});
  }
  for(const a of activities.filter(a=>a.experience_id===p.id)){
   const contract=a.details.activity_contract,edition=contract.project_revision_id?versions.find(v=>v.id===contract.project_revision_id):null;
   result.push({...common,id:a.id,kind:'activity',title:a.title,version:1,status:a.status,
    historical:a.status==='archived'||p.status==='archived'||p.classroom_status==='archived',exportReady:Boolean(annual?.exportReady&&a.teacher_confirmed_at&&p.teacher_confirmed_at&&(!contract.project_revision_id||edition)&&['active','archived'].includes(a.status)),
    confirmedAt:a.teacher_confirmed_at,date:a.activity_day,position:contract.position,projectDocumentId:contract.project_revision_id??p.id,projectVersion:edition?.version??1});
  }
 }
 return result;
}
