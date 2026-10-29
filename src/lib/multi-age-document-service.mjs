import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { CurriculumPermissionError, curriculumAges, validCurriculumId } from './classroom-curriculum-scope.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { loadMultiAgeActivityDocument } from './multi-age-activity-document.mjs';
import { loadMultiAgeProjectDocument,listMultiAgeProjectDocuments } from './multi-age-project-document.mjs';
import {listMultiAgeWorkshopDocuments,loadMultiAgeWorkshopDocument} from './multi-age-workshops.mjs';

const kinds={annual_plan:'annual_plans',diagnostic_student_review:'diagnostic_student_reviews',diagnostic_group_review:'diagnostic_group_reviews'};
const instant=value=>value instanceof Date?value.toISOString():String(value??'');
function storedContext(kind,row){return kind==='annual_plan'?row.document_context:row.details;}
function exportReady(kind,row){const context=storedContext(kind,row);return (kind==='annual_plan'?['active','archived'].includes(row.status):row.status==='confirmed')
  &&context?.document_identity?.contract==='multi-age-document-identity-v1'&&Array.isArray(context.document_identity.ages)
  &&(kind==='annual_plan'||kind==='diagnostic_group_review'?Array.isArray(context.curriculum_reference):Array.isArray(context.curriculum_reference?.competencies)&&Boolean(context.curriculum_reference?.official_performance_catalog?.version));}
function validateSnapshot(kind,row){
  const context=storedContext(kind,row),identity=context?.document_identity,snapshot=context?.curriculum_snapshot;
  if(!exportReady(kind,row))throw new VersionConflictError('Este documento aún no tiene una versión confirmada con sus datos de exportación. Conserva el anterior y confirma una nueva revisión.');
  if(snapshot?.contract!==2||identity.classroom_id!==row.classroom_id||snapshot.classroom_id!==row.classroom_id||!validCurriculumId(identity.school_year_id))throw new CurriculumPermissionError();
  const ages=curriculumAges(identity.ages);
  if(kind==='annual_plan'){
    if(identity.school_year_id!==row.school_year_id||JSON.stringify(ages)!==JSON.stringify(snapshot.ages)||context.calendar?.projects?.length!==15||row.proposal?.proposals?.length!==15)throw new CurriculumPermissionError();
  }else if(kind==='diagnostic_group_review'){
    if(snapshot.school_year_id!==identity.school_year_id||JSON.stringify(ages)!==JSON.stringify(snapshot.ages)||row.source_snapshot?.contract!=='multi-age-group-sources-v1'||row.source_snapshot.classroom_id!==row.classroom_id||!Array.isArray(context.readings))throw new CurriculumPermissionError();
  }else if(identity.student_id!==row.student_id||!ages.includes(snapshot.age)||!Array.isArray(row.source_snapshot?.observations)||!Array.isArray(context.findings))throw new CurriculumPermissionError();
  return context;
}

/** Isolated V2 library over canonical rows. It never writes document copies or alters a source. */
export async function listMultiAgeDocuments(db,teacherId,{classroomId=null}={}){
  assertMultiAgeLocalDb(db);if(!validCurriculumId(teacherId)||classroomId!==null&&!validCurriculumId(classroomId))throw new CurriculumPermissionError();
  const documents=[];
  for(const [kind,table]of Object.entries(kinds)){
    const rows=(await db.query(`select d.*,c.status as classroom_status from ${table} d join classrooms c on c.id=d.classroom_id join school_years sy on sy.id=c.school_year_id
      where c.teacher_id=$1 and sy.owner_id=$1 and c.curriculum_contract_version=2 and d.curriculum_contract_version=2 and ($2::uuid is null or d.classroom_id=$2) order by d.version desc,d.id`,[teacherId,classroomId])).rows;
    for(const row of rows){const identity=storedContext(kind,row)?.document_identity;
      documents.push({id:row.id,kind,classroomId:row.classroom_id,title:kind==='annual_plan'?(row.proposal?.title??'Mi año multiedad'):kind==='diagnostic_group_review'?'Diagnóstico del grupo':`Diagnóstico de ${identity?.student_name??'un niño'}`,
        studentId:row.student_id??null,ages:kind==='annual_plan'||kind==='diagnostic_group_review'?identity?.ages??[]:[row.details?.curriculum_snapshot?.age].filter(Boolean),schoolYear:identity?.school_year??null,
        version:Number(row.version),status:row.status,historical:row.status==='archived'||row.classroom_status==='archived',exportReady:exportReady(kind,row),confirmedAt:row.teacher_confirmed_at??null});
    }
  }
  for(const document of documents)if(document.kind==='diagnostic_student_review'&&documents.some(other=>other.kind===document.kind&&other.studentId===document.studentId&&other.status==='confirmed'&&other.version>document.version))document.historical=true;
  for(const document of documents)if(document.kind==='diagnostic_group_review'&&documents.some(other=>other.kind===document.kind&&other.classroomId===document.classroomId&&other.status==='confirmed'&&other.version>document.version))document.historical=true;
  documents.push(...await listMultiAgeProjectDocuments(db,teacherId,classroomId,documents.filter(d=>d.kind==='annual_plan')));
  documents.push(...await listMultiAgeWorkshopDocuments(db,teacherId,classroomId));
  return documents.sort((a,b)=>instant(b.confirmedAt).localeCompare(instant(a.confirmedAt))||b.version-a.version||a.id.localeCompare(b.id));
}
export async function loadMultiAgeDocument(db,teacherId,kind,id){
  if(kind==='workshop')return loadMultiAgeWorkshopDocument(db,teacherId,id);
  if(kind==='activity')return loadMultiAgeActivityDocument(db,teacherId,id,loadMultiAgeDocument);
  if(kind==='project')return loadMultiAgeProjectDocument(db,teacherId,id,loadMultiAgeDocument);
  assertMultiAgeLocalDb(db);if(!Object.hasOwn(kinds,kind)||!validCurriculumId(teacherId)||!validCurriculumId(id))throw new CurriculumPermissionError();
  const row=(await db.query(`select d.* from ${kinds[kind]} d join classrooms c on c.id=d.classroom_id join school_years sy on sy.id=c.school_year_id
    where d.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.curriculum_contract_version=2 and d.curriculum_contract_version=2`,[id,teacherId])).rows[0];
  if(!row)throw new CurriculumPermissionError();
  const context=validateSnapshot(kind,row);
  return {contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,id:row.id,kind,status:row.status,version:Number(row.version),confirmedAt:row.teacher_confirmed_at,
    identity:context.document_identity,curriculumSnapshot:context.curriculum_snapshot,curriculumReference:context.curriculum_reference,
    ...(kind==='annual_plan'?{...(context.document_presentation_version===2?{documentPresentationVersion:2}:{}),content:row.proposal,calendar:context.calendar,sourceSnapshot:context.source_snapshot}:kind==='diagnostic_group_review'?{content:{readings:context.readings,organization:context.organization,groups:row.source_snapshot.groups,eligibleReadings:row.source_snapshot.eligibleReadings,familyContexts:row.source_snapshot.familyContexts},sourceSnapshot:row.source_snapshot}:{content:{findings:context.findings,pendingCompetencyIds:context.pending_competency_ids},sourceSnapshot:row.source_snapshot})};
}

/** Compose a download from the immutable master and its own prepared activities only. */
export async function loadDocumentGeneratorProjectExport(db,teacherId,id){
  const document=await loadMultiAgeDocument(db,teacherId,'project',id);
  const source=document.sourceSnapshot;
  const rows=(await db.query(`select a.id from activities a
    join learning_experiences p on p.id=a.experience_id join classrooms c on c.id=p.classroom_id
    join school_years sy on sy.id=c.school_year_id
    where a.experience_id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.curriculum_contract_version=2
      and a.details->'activity_contract'->>'curriculum_contract_version'='2'
      and (a.details->'activity_contract'->>'project_revision_id') is not distinct from $3::text
      and a.teacher_confirmed_at is not null and a.status in ('active','archived')
    order by a.occurs_on,a.id`,[source.projectId,teacherId,source.projectRevisionId??null])).rows;
  const activityRoute=[],positions=new Set();
  for(const row of rows){
    const activity=await loadMultiAgeDocument(db,teacherId,'activity',row.id);
    if(activity.sourceSnapshot.projectId!==source.projectId||activity.sourceSnapshot.projectFingerprint!==source.projectFingerprint
      ||positions.has(activity.content.position))throw new VersionConflictError('La ruta no coincide con la edición guardada del proyecto.');
    positions.add(activity.content.position);
    activityRoute.push({id:activity.id,position:activity.content.position,date:activity.content.occursOn,title:activity.content.title,
      purpose:activity.content.purpose,materials:activity.content.activityPlanning?.materials.map(m=>`${m.name}${m.availability==='to_verify'?' · por verificar':''}`)??[],competencies:[...new Map(activity.curriculumReference.map(r=>[r.competency_id,{id:r.competency_id,name:r.name}])).values()]});
  }
  return {document,activityRoute};
}
