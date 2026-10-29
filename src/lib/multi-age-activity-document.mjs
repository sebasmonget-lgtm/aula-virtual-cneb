import {validateDocumentActivityPlanning} from './document-generator-project-planning.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { CurriculumPermissionError, curriculumAges, validCurriculumId } from './classroom-curriculum-scope.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { multiAgeStableHash } from './multi-age-projects.mjs';
import { OFFICIAL_PERFORMANCE_VERSION, validateOfficialPerformanceRefs } from './official-performance-references.mjs';
import {validateDocumentObservationRoster} from './document-generator-observation-roster.mjs';

const conflict=()=>new VersionConflictError('La actividad no conserva todos sus datos confirmados para descargarla. Conserva la versión anterior y revisa sus fuentes.');

/** Read-only export of the confirmed activity. Never uses today's roster, profile or AI. */
export async function loadMultiAgeActivityDocument(db,teacherId,id,loadAnnual){
  assertMultiAgeLocalDb(db);
  if(!validCurriculumId(teacherId)||!validCurriculumId(id))throw new CurriculumPermissionError();
  const row=(await db.query(`select a.*,a.occurs_on::text as activity_day,p.id as project_id,p.classroom_id,p.title as project_title,
    p.details as project_details,p.annual_plan_id,p.teacher_confirmed_at as project_confirmed_at
    from activities a join learning_experiences p on p.id=a.experience_id join classrooms c on c.id=p.classroom_id
    join school_years sy on sy.id=c.school_year_id where a.id=$1 and c.teacher_id=$2 and sy.owner_id=$2
    and c.curriculum_contract_version=2 and a.details->'activity_contract'->>'curriculum_contract_version'='2'
    and p.details->>'curriculum_contract_version'='2'`,[id,teacherId])).rows[0];
  if(!row)throw new CurriculumPermissionError();
  const contract=row.details?.activity_contract,families=row.details?.criteria_families,sequence=row.details?.common_sequence;
  if(contract?.project_revision_id){
    const edition=(await db.query('select details,title,fingerprint from multi_age_project_versions where id=$1 and project_id=$2 and classroom_id=$3',[contract.project_revision_id,row.project_id,row.classroom_id])).rows[0];
    if(!edition||edition.fingerprint!==contract.project_fingerprint)throw conflict();
    row.project_details=edition.details;row.project_title=edition.title;
  }
  if(!row.teacher_confirmed_at||!row.project_confirmed_at||!['active','archived'].includes(row.status)||!row.annual_plan_id
    ||contract.project_id!==row.project_id||contract.project_fingerprint!==multiAgeStableHash(row.project_details)
    ||!Number.isInteger(contract.position)||contract.position<1||!Array.isArray(families)||!families.length
    ||!sequence||['opening','development','closure'].some(key=>typeof sequence[key]!=='string'))throw conflict();
  const annual=await loadAnnual(db,teacherId,'annual_plan',contract.source_annual_plan_id??row.annual_plan_id);
  const ages=curriculumAges(row.details.participant_age_groups);
  if(annual.identity.classroom_id!==row.classroom_id||ages.some(age=>!annual.identity.ages.includes(age)))throw conflict();
  const criteria=(await db.query(`select * from activity_criteria where activity_id=$1 order by display_order,curricular_age,id`,[id])).rows;
  const references=[],variants=families.flatMap(f=>f.variants??[]),criterionIds=new Set(variants.map(v=>v.criterion_id));
  if(criteria.length!==variants.length||criterionIds.size!==variants.length)throw conflict();
  for(const family of families){
    if(!Array.isArray(family.variants)||JSON.stringify(family.variants.map(v=>v.curricular_age).sort())!==JSON.stringify(ages))throw conflict();
    for(const variant of family.variants){
      const criterion=criteria.find(c=>c.id===variant.criterion_id),reference=annual.curriculumReference.find(c=>c.competency_id===family.competency_id&&c.age===variant.curricular_age);
      const parent=row.project_details.criteria_families?.find(f=>f.competency_id===family.competency_id)?.variants.find(v=>v.criterion_id===variant.source_project_criterion_id&&v.curricular_age===variant.curricular_age);
      if(!criterion||criterion.status!=='active'||criterion.curriculum_contract_version!==2||!criterion.teacher_confirmed_at
        ||criterion.curricular_age!==variant.curricular_age||criterion.competency_v4_id!==family.competency_id||criterion.criterion_text!==variant.criterion_text
        ||!parent||!reference||criterion.details.official_performance_version!==reference.official_performance_version
        ||['expected_evidence','observation_moments','official_performance_refs','source_project_criterion_id'].some(key=>JSON.stringify(criterion.details[key])!==JSON.stringify(variant[key])))throw conflict();
      const refs=variant.official_performance_refs;
      if(!Array.isArray(refs)||refs.length>3||new Set(refs).size!==refs.length||row.project_details.document_reference_selection_version!==2&&refs.some(ref=>!parent.official_performance_refs.includes(ref)))throw conflict();
      // Older activities already pin their catalog version. Resolve only that exact version;
      // a future catalog cannot silently rewrite an old export. Prefer the annual's frozen text.
      const installed=reference.official_performance_version===OFFICIAL_PERFORMANCE_VERSION
        ?validateOfficialPerformanceRefs(refs,family.competency_id,variant.curricular_age,{required:true}):null;
      if(!installed&&!refs.length&&reference.official_performances.length)throw conflict();
      const performances=refs.map(ref=>reference.official_performances.find(p=>p.id===ref)??installed?.find(p=>p.id===ref));
      if(performances.some(p=>!p||p.age!==variant.curricular_age||p.competency_id!==family.competency_id||!p.text))throw conflict();
      references.push({...reference,official_performances:performances});
    }
  }
  return {contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,id:row.id,kind:'activity',status:row.status,version:1,confirmedAt:row.teacher_confirmed_at,
    identity:{...annual.identity,ages},curriculumReference:references,
    sourceSnapshot:{annualPlanId:annual.id,annualPlanVersion:annual.version,projectId:row.project_id,projectFingerprint:contract.project_fingerprint},
    content:{...([2,3,4,5,6,7].includes(row.details.document_presentation_version)?{documentPresentationVersion:row.details.document_presentation_version}:{}),...([6,7].includes(row.details.document_presentation_version)?{observationRoster:validateDocumentObservationRoster(row.details.observation_roster,ages)}:{}),...([3,4].includes(row.project_details.document_planning?.version)?{documentRouteVersion:row.project_details.document_planning.version}:{}),title:row.title,purpose:row.purpose,occursOn:row.activity_day,projectTitle:row.project_title,position:contract.position,commonSequence:sequence,criteriaFamilies:families,...(row.details.activity_document_planning?{activityPlanning:validateDocumentActivityPlanning(row.details.activity_document_planning,ages)}:{})}};
}
