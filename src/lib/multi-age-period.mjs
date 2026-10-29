import { randomUUID } from 'node:crypto';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumDocumentIdentity, curriculumRequest, CurriculumPermissionError, validCurriculumId } from './classroom-curriculum-scope.mjs';
import { multiAgeStableHash } from './multi-age-projects.mjs';
import { individualSource } from './multi-age-local-service.mjs';
import { loadConfirmedOrdinaryEvaluationRows } from './ordinary-evaluation-adapter.mjs';
import { periodEditState, appendPeriodEvent } from './period-edit-guard.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { applicableCompetencyCards } from './competency-applicability.mjs';
import { stableCompetencyLabel, buildGenericAssessmentWorkbook } from './period-assessment-closure-service.mjs';
import { conclusionRequiredForLevel } from './period-evaluation-service.mjs';
import { currentMultiAgeObservationRows } from './multi-age-corrections.mjs';

const levels=['AD','A','B','C'];
const normalized=value=>JSON.parse(JSON.stringify(value));
const key=(student,competency)=>`${student}:${competency}`;
const pendingStates=new Set(['pending','observation_pending']);

async function periodScope(db,teacherId,classroomId,periodId){
  if(!validCurriculumId(periodId))throw new CurriculumPermissionError();
  const classroom=await classroomCurriculumScope(db,teacherId,classroomId);
  if(classroom.contract!==2)throw new CurriculumPermissionError();
  const periods=(await db.query('select *,starts_on::text,ends_on::text from evaluation_periods where school_year_id=$1 order by ordinal,id',[classroom.school_year_id])).rows;
  const period=periods.find(p=>p.id===periodId);if(!period)throw new CurriculumPermissionError();
  return {classroom,period,periods};
}

/** One age-aware source model owns the table, Excel, readiness and closure manifest. No writes on reads. */
export async function periodModel(db,teacherId,{classroomId,periodId}){
  const {classroom,period,periods}=await periodScope(db,teacherId,classroomId,periodId),kb=await loadKnowledgeBaseV4();
  const students=(await db.query(`select s.id,s.first_name,s.last_name,s.preferred_name,a.id as assignment_id,a.revision as assignment_revision,ag.age_years as age
    from students s left join student_curriculum_assignments a on a.student_id=s.id and a.classroom_id=s.classroom_id and a.status='active'
    left join age_grades ag on ag.id=a.age_grade_id where s.classroom_id=$1 and s.status='active' and not exists(select 1 from multi_age_enrollment_dates e where e.student_id=s.id and e.starts_on>$2::date) order by ag.age_years,s.last_name,s.first_name,s.id`,[classroom.id,period.ends_on])).rows;
  if(students.some(s=>!s.assignment_id||!classroom.ages.includes(s.age)))throw new VersionConflictError('Confirma el grupo curricular de cada niño antes de revisar el bimestre.');
  const cardsByAge=new Map(classroom.ages.map(age=>[age,applicableCompetencyCards(kb.competencyCards,age,{castellanoL2Applicable:classroom.castellano_l2_applicable,religionApplicable:classroom.religion_applicable})]));
  const planned=(await db.query(`select ac.id,ac.activity_id,ac.competency_v4_id,ac.curricular_age,ac.revision,ac.details,a.occurs_on::text
    from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id
    where e.classroom_id=$1 and a.status='active' and ac.status='active' and ac.curriculum_contract_version=2
      and a.occurs_on between $2::date and $3::date order by a.occurs_on,ac.curricular_age,ac.competency_v4_id,ac.id`,[classroom.id,period.starts_on,period.ends_on])).rows;
  const observations=await currentMultiAgeObservationRows(db,await loadConfirmedOrdinaryEvaluationRows(db,{classroomId:classroom.id,period}));
  const records=(await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id where s.classroom_id=$1
    and s.status='active' and ca.evaluation_period_id=$2 and ca.status in ('active','draft') order by ca.version desc,ca.id`,[classroom.id,period.id])).rows;
  const conclusions=(await db.query(`select dc.* from competency_descriptive_conclusions dc join students s on s.id=dc.student_id
    where s.classroom_id=$1 and s.status='active' and dc.evaluation_period_id=$2 and dc.status='active' order by dc.version desc,dc.id`,[classroom.id,period.id])).rows;
  const rows=[],snapshots=[];
  for(const student of students){
    const ownCards=cardsByAge.get(student.age),ids=new Set([...planned.filter(c=>c.curricular_age===student.age).map(c=>c.competency_v4_id),
      ...observations.filter(o=>o.student_id===student.id).map(o=>o.competency_v4_id),...records.filter(r=>r.student_id===student.id).map(r=>r.competency_v4_id)]);
    for(const id of [...ids].sort()){
      const card=ownCards.find(c=>c.id===id);if(!card)throw new VersionConflictError('Una competencia requiere revisar su pertinencia para la edad del niño.');
      const source=await individualSource(db,teacherId,{studentId:student.id,competencyId:id,periodId:period.id});
      const grade=records.find(r=>r.student_id===student.id&&r.competency_v4_id===id&&r.status==='active')??null;
      const draft=records.find(r=>r.student_id===student.id&&r.competency_v4_id===id&&r.status==='draft');
      const conclusion=conclusions.find(r=>r.student_id===student.id&&r.competency_v4_id===id)??null;
      const valued=Boolean(grade?.teacher_confirmed_at&&levels.includes(grade.achievement_level)&&source.sourceRows.length&&grade.details?.source_fingerprint===source.sourceFingerprint);
      const concluded=Boolean(valued&&conclusion?.teacher_confirmed_at&&conclusion.assessment_id===grade.id&&conclusion.source_assessment_snapshot?.id===grade.id
        &&Number(conclusion.source_assessment_snapshot.version)===Number(grade.version)&&conclusion.details?.conclusion_text?.trim()
        &&multiAgeStableHash(conclusion.details.curriculum_snapshot)===multiAgeStableHash(source.snapshot));
      const state=draft||grade&&!valued||conclusion&&!concluded?'needs_review':valued?(concluded||!conclusionRequiredForLevel(grade.achievement_level)?'confirmed':'conclusion_pending'):source.sourceRows.length?'pending':'observation_pending';
      const meta=stableCompetencyLabel(card),row={student_id:student.id,student_name:[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(' '),
        curricular_age:student.age,competency_id:id,competency_name:card.official_name,area:meta.area,short_label:meta.short_label,
        achievement_level:valued?grade.achievement_level:null,conclusion:concluded?conclusion.details.conclusion_text:'',state,valuation_confirmed:valued,
        evidence_count:source.sourceRows.length,planned_criteria_count:planned.filter(c=>c.curricular_age===student.age&&c.competency_v4_id===id).length,period_label:period.label};
      rows.push(row);snapshots.push({...row,assignment_id:student.assignment_id,assignment_revision:student.assignment_revision,curriculum_snapshot:source.snapshot,
        source_fingerprint:source.sourceFingerprint,assessment:grade,descriptive_conclusion:conclusion,draft:draft??null,source_rows:source.sourceRows});
    }
  }
  const annualUnvalued=[];
  if(period.id===periods.at(-1)?.id){
    const annualGrades=(await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id
      where s.classroom_id=$1 and s.status='active' and ca.status='active' and ca.teacher_confirmed_at is not null
      and ca.evaluation_period_id=any($2::uuid[]) order by ca.id`,[classroom.id,periods.map(p=>p.id)])).rows,valuedPairs=new Set();
    for(const grade of annualGrades){
      const student=students.find(s=>s.id===grade.student_id);
      if(!student||!levels.includes(grade.achievement_level)||grade.details?.curriculum_snapshot?.assignment_id!==student.assignment_id)continue;
      const source=await individualSource(db,teacherId,{studentId:student.id,competencyId:grade.competency_v4_id,periodId:grade.evaluation_period_id});
      if(source.sourceRows.length&&source.sourceFingerprint===grade.details?.source_fingerprint)valuedPairs.add(key(student.id,grade.competency_v4_id));
    }
    for(const student of students)for(const card of cardsByAge.get(student.age))if(!valuedPairs.has(key(student.id,card.id)))annualUnvalued.push({student_id:student.id,curricular_age:student.age,competency_id:card.id});
  }
  const identity=await curriculumDocumentIdentity(db,teacherId,classroom);
  const reports=(await db.query(`select r.* from family_reports r join students s on s.id=r.student_id where s.classroom_id=$1
    and s.status='active' and r.period_start=$2::date and r.period_end=$3::date and r.status='active' order by r.id`,[classroom.id,period.starts_on,period.ends_on])).rows;
  const snapshot=normalized({contract:'AyniMultiAgePeriod/v1',curriculum_contract_version:2,identity,period,students,rows:snapshots,planned_criteria:planned,family_reports:reports,annual_unvalued:annualUnvalued});
  const fingerprint=multiAgeStableHash(snapshot),edit=await periodEditState(db,classroom.id,period.id);
  const versions=(await db.query(`select id,version,confirmed_at,source_fingerprint from period_closure_versions where classroom_id=$1
    and evaluation_period_id=$2 and manifest->>'curriculum_contract_version'='2' order by version desc`,[classroom.id,period.id])).rows;
  const blockers=rows.filter(r=>!['confirmed',...pendingStates].includes(r.state)).length;
  const overview={rows,period,ages:classroom.ages,sourceFingerprint:fingerprint,
    progress:{total:rows.length,confirmed:rows.filter(r=>r.state==='confirmed').length,concluded:rows.filter(r=>r.conclusion).length,valued:rows.filter(r=>r.valuation_confirmed).length,
      pending:rows.filter(r=>pendingStates.has(r.state)).length,blockers,annualUnvalued:annualUnvalued.length},
    ready:rows.length>0&&!blockers&&!annualUnvalued.length,
    closure:{closed:edit.closed,current:edit.closure?.source_fingerprint===fingerprint,currentVersionId:edit.closure?.current_version_id??null,versions,
      events:edit.state.events??[]}};
  return {classroom,period,snapshot,overview};
}

async function readPeriod(db,teacherId,input){
  return db.transaction(async tx=>{await tx.query('set transaction isolation level repeatable read read only');return periodModel(tx,teacherId,input);});
}
export async function multiAgePeriodOverview(db,teacherId,input){assertMultiAgeLocalDb(db);return (await readPeriod(db,teacherId,input)).overview;}

export function filterMultiAgePeriodRows(rows,filters={}){
  const {age=null,studentId=null,competencyId=null,status='all'}=filters;
  if(age!==null&&(![3,4,5].includes(Number(age))||String(Number(age))!==String(age)))throw new TypeError('Elige un grupo de 3, 4 o 5 años.');
  if(studentId!==null&&(!validCurriculumId(studentId)||!rows.some(r=>r.student_id===studentId)))throw new CurriculumPermissionError();
  if(competencyId!==null&&!rows.some(r=>r.competency_id===competencyId))throw new CurriculumPermissionError();
  if(!['all','pending','complete'].includes(status))throw new TypeError('Elige un filtro de registros válido.');
  return rows.filter(r=>(age===null||r.curricular_age===Number(age))&&(studentId===null||r.student_id===studentId)&&(competencyId===null||r.competency_id===competencyId)
    &&(status==='all'||(status==='complete'?r.state==='confirmed':r.state!=='confirmed')));
}

export async function closeMultiAgePeriod(db,teacherId,input){
  assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true)throw new TypeError('La profesora debe confirmar el cierre.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'period_close',input,async tx=>{
    const {classroom,period,snapshot,overview}=await periodModel(tx,teacherId,input);
    if(input.expectedSourceFingerprint!==overview.sourceFingerprint||input.expectedCurrentVersionId!==overview.closure.currentVersionId)throw new VersionConflictError('Cambió el bimestre. Actualiza el Consolidado antes de cerrar.');
    if(overview.closure.closed)throw new VersionConflictError('El bimestre ya está cerrado. Reábrelo antes de guardar otra versión.');
    if(!overview.ready)throw new VersionConflictError(overview.progress.annualUnvalued?'El cierre anual requiere revisar las competencias sin valoración vigente durante el año.':'Revisa las valoraciones, conclusiones y fuentes antes de cerrar el bimestre.');
    if(overview.progress.pending&&input.pendingAcknowledged!==true)throw new TypeError('Confirma que los registros pendientes se conservarán sin asignarles notas.');
    const id=randomUUID(),version=Number((await tx.query('select coalesce(max(version),0)+1 n from period_closure_versions where classroom_id=$1 and evaluation_period_id=$2',[classroom.id,period.id])).rows[0].n);
    const at=(await tx.query('select now() as at')).rows[0].at,manifest={...snapshot,closed_at:at instanceof Date?at.toISOString():String(at),pending_acknowledged:overview.progress.pending>0};
    await tx.query(`insert into period_closure_versions(id,classroom_id,evaluation_period_id,version,source_fingerprint,confirmed_by,confirmed_at,manifest)
      values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[id,classroom.id,period.id,version,overview.sourceFingerprint,teacherId,at,JSON.stringify(manifest)]);
    await tx.query(`insert into period_closures(id,classroom_id,evaluation_period_id,source_fingerprint,confirmed_by,confirmed_at,current_version_id)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(classroom_id,evaluation_period_id) do update set source_fingerprint=excluded.source_fingerprint,
      confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at,current_version_id=excluded.current_version_id`,[randomUUID(),classroom.id,period.id,overview.sourceFingerprint,teacherId,at,id]);
    await appendPeriodEvent(tx,{classroomId:classroom.id,periodId:period.id,teacherId,reopenedVersionId:null,event:{type:'closed',closure_version_id:id,source_fingerprint:overview.sourceFingerprint,curriculum_contract_version:2}});
    return {classroomId:classroom.id,closureVersionId:id,version,closed:true};
  });
}

export async function reopenMultiAgePeriod(db,teacherId,input){
  assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true)throw new TypeError('La profesora debe confirmar la reapertura.');
  if(typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>1000)throw new TypeError('Explica el motivo de reapertura en 3 a 1000 caracteres.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'period_reopen',input,async tx=>{
    const {classroom,period}=await periodScope(tx,teacherId,input.classroomId,input.periodId),edit=await periodEditState(tx,classroom.id,period.id);
    if(!edit.closure||edit.closure.current_version_id!==input.expectedCurrentVersionId)throw new VersionConflictError();
    if(!edit.closed)throw new VersionConflictError('El bimestre ya está abierto.');
    await appendPeriodEvent(tx,{classroomId:classroom.id,periodId:period.id,teacherId,reopenedVersionId:input.expectedCurrentVersionId,
      event:{type:'reopened',closure_version_id:input.expectedCurrentVersionId,reason:input.reason.trim(),curriculum_contract_version:2}});
    return {classroomId:classroom.id,reopened:true};
  });
}

export async function loadMultiAgePeriodClosure(db,teacherId,id){
  assertMultiAgeLocalDb(db);if(!validCurriculumId(teacherId)||!validCurriculumId(id))throw new CurriculumPermissionError();
  const row=(await db.query(`select v.* from period_closure_versions v join classrooms c on c.id=v.classroom_id join school_years sy on sy.id=c.school_year_id
    where v.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.curriculum_contract_version=2 and v.manifest->>'curriculum_contract_version'='2'`,[id,teacherId])).rows[0];
  if(!row||row.manifest.contract!=='AyniMultiAgePeriod/v1'||row.manifest.identity.classroom_id!==row.classroom_id)throw new CurriculumPermissionError();
  return {id:row.id,version:row.version,confirmedAt:row.confirmed_at,sourceFingerprint:row.source_fingerprint,manifest:row.manifest};
}

export async function multiAgePeriodExcel(db,teacherId,input,filters={}){
  assertMultiAgeLocalDb(db);
  const saved=input.closureVersionId?await loadMultiAgePeriodClosure(db,teacherId,input.closureVersionId):null;
  const snapshot=saved?.manifest??(await readPeriod(db,teacherId,input)).snapshot;
  const rows=filterMultiAgePeriodRows(snapshot.rows,filters),ages=filters.age!=null?[Number(filters.age)]:[...new Set(rows.map(r=>r.curricular_age))];
  return buildGenericAssessmentWorkbook(rows,{curriculum_contract_version:2,...snapshot.identity,ages:ages.length?ages:snapshot.identity.ages,
    period_label:snapshot.period.label,closure_version:saved?.version??null});
}
