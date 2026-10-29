import {randomUUID} from 'node:crypto';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {curriculumRequest} from './classroom-curriculum-scope.mjs';
import {multiAgeProjectContext,multiAgeStableHash} from './multi-age-projects.mjs';
import {validateMultiAgeBlueprint} from './age-scoped-criteria.mjs';
import {assertPeriodDatesOpen} from './period-edit-guard.mjs';
import {correctionReason} from './multi-age-corrections.mjs';
import {VersionConflictError} from './version-integrity.mjs';

export async function multiAgeProjectEditContext(db,teacherId,input){
 assertMultiAgeLocalDb(db);const data=await multiAgeProjectContext(db,teacherId,input.classroomId,input.projectId);
 const history=(await db.query('select id,version,title,purpose,details,fingerprint,reason,confirmed_at from multi_age_project_versions where project_id=$1 order by version desc',[data.project.id])).rows;
 const base=(await db.query('select id,title,purpose,details,teacher_confirmed_at from learning_experiences where id=$1',[data.project.id])).rows[0];
 history.push({...base,version:1,details:{...base.details,common_sequence:data.activities[0]?.details.common_sequence},fingerprint:multiAgeStableHash(base.details),reason:null,confirmed_at:base.teacher_confirmed_at});
 return {...data,history,sourceFingerprint:multiAgeStableHash({project:data.fingerprint,activities:data.activities})};
}
export async function confirmMultiAgeProjectEdit(db,teacherId,input){
 assertMultiAgeLocalDb(db);const reason=correctionReason(input);
 if(input.preservedActivitiesAcknowledged!==true)throw new TypeError('Confirma que las actividades preparadas conservarán su contenido y que esta versión se aplicará a las próximas.');
 return curriculumRequest(db,teacherId,input.clientRequestId,'project_edit',input,async tx=>{
  const data=await multiAgeProjectContext(tx,teacherId,input.classroomId,input.projectId),source=multiAgeStableHash({project:data.fingerprint,activities:data.activities});
  if(input.expectedSourceFingerprint!==source||input.expectedProjectFingerprint!==data.fingerprint)throw new VersionConflictError('El proyecto o sus actividades cambiaron. Revisa la edición antes de confirmar.');
  await assertPeriodDatesOpen(tx,data.scope.id,data.project.starts_on,data.project.ends_on);
  const blueprint=await validateMultiAgeBlueprint({...input.blueprint,participantAges:data.scope.ages,occursOn:data.activities[0]?.occurs_on??String(data.project.starts_on).slice(0,10)},data.scope);
  const families=blueprint.criteriaFamilies.map(f=>{
   const parent=data.project.details.criteria_families.find(p=>p.competency_id===f.competency_id);
   if(!parent||parent.variants.length!==f.variants.length)throw new TypeError('Esta edición conserva las competencias y edades del proyecto.');
   return {...f,family_id:parent.family_id,variants:f.variants.map(v=>{
    const old=parent.variants.find(p=>p.curricular_age===v.curricular_age);
    if(!old||multiAgeStableHash(old.official_performance_refs)!==multiAgeStableHash(v.official_performance_refs))throw new TypeError('Conserva los referentes oficiales propios de cada edad.');
    const semantic=p=>({curricular_age:p.curricular_age,criterion_text:p.criterion_text,expected_evidence:p.expected_evidence,observation_moments:p.observation_moments,official_performance_refs:p.official_performance_refs});
    return multiAgeStableHash(semantic(old))===multiAgeStableHash(semantic(v))?old:{...v,criterion_id:randomUUID(),supersedes_project_criterion_id:old.criterion_id};
   })};
  });
  if(families.length!==data.project.details.criteria_families.length)throw new TypeError('Conserva las competencias y edades del proyecto.');
  const previous=(await tx.query('select id,version from multi_age_project_versions where project_id=$1 order by version desc limit 1',[data.project.id])).rows[0];
  const id=randomUUID(),version=(previous?.version??1)+1;
  const details={...data.project.details,project_revision_id:id,project_revision:version,common_sequence:blueprint.commonSequence,criteria_families:families,project_title:blueprint.title,project_purpose:blueprint.purpose};
  if(data.project.title===blueprint.title&&data.project.purpose===blueprint.purpose&&multiAgeStableHash(data.commonSequence)===multiAgeStableHash(blueprint.commonSequence)&&multiAgeStableHash(data.project.details.criteria_families)===multiAgeStableHash(families))throw new TypeError('No hay cambios en el proyecto.');
  const fingerprint=multiAgeStableHash(details);
  await tx.query(`insert into multi_age_project_versions(id,classroom_id,project_id,version,supersedes_version_id,title,purpose,details,fingerprint,reason,confirmed_by)
   values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,[id,data.scope.id,data.project.id,version,previous?.id??null,blueprint.title,blueprint.purpose,JSON.stringify(details),fingerprint,reason,teacherId]);
  return {classroomId:data.scope.id,projectId:data.project.id,projectVersionId:id,version,projectFingerprint:fingerprint};
 });
}
