import { classroomCurriculumScope, curriculumHash, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import {validateOfficialPerformanceRefs} from './official-performance-references.mjs';

export const canonicalCurriculum=value=>Array.isArray(value)?value.map(canonicalCurriculum):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonicalCurriculum(value[k])])):value;
export const multiAgeStableHash=value=>curriculumHash(canonicalCurriculum(value));
/** Presentation and generation both use the same immutable project master, including legacy V2 projects. */
export async function multiAgeProjectContext(db,teacherId,classroomId,projectId){
  const scope=await classroomCurriculumScope(db,teacherId,classroomId);
  let project=(await db.query("select * from learning_experiences where id=$1 and classroom_id=$2 and status='active'",[projectId,classroomId])).rows[0];
  if(scope.contract!==2||!project||project.type!=='project'||project.details?.curriculum_contract_version!==2)throw new CurriculumPermissionError();
  const edition=(await db.query('select * from multi_age_project_versions where project_id=$1 and classroom_id=$2 order by version desc limit 1',[project.id,classroomId])).rows[0];
  if(edition)project={...project,title:edition.title,purpose:edition.purpose,details:edition.details};
  if(JSON.stringify(project.details.participant_age_groups)!==JSON.stringify(scope.ages))throw new VersionConflictError('Revisa los grupos del proyecto antes de preparar otra actividad.');
  const activities=(await db.query(`select id,title,occurs_on::text,details,coalesce((details->'activity_contract'->>'position')::int,1) as position
    from activities where experience_id=$1 and status='active' order by coalesce((details->'activity_contract'->>'position')::int,1),id`,[project.id])).rows;
  return {project,scope,version:edition?.version??1,revisionId:edition?.id??null,commonSequence:project.details.common_sequence??activities[0]?.details.common_sequence,
    fingerprint:multiAgeStableHash(project.details),activities,nextPosition:Math.max(0,...activities.map(a=>a.position))+1};
}
export function validateMultiAgeProjectCriteria(project,blueprint){
  for(const family of blueprint.criteriaFamilies)for(const variant of family.variants){
    const parent=project.details.criteria_families.find(f=>f.competency_id===family.competency_id)?.variants.find(v=>v.curricular_age===variant.curricular_age);
    if(project.details.document_reference_selection_version===2&&parent){
      validateOfficialPerformanceRefs(variant.official_performance_refs,family.competency_id,variant.curricular_age,{required:true});
      continue;
    }
    if(!parent||JSON.stringify([...parent.official_performance_refs].sort())!==JSON.stringify([...variant.official_performance_refs].sort()))
      throw Object.assign(new TypeError('La actividad debe heredar los referentes de su competencia y edad del proyecto confirmado.'),{reason:'activity_references_mismatch'});
  }
}
