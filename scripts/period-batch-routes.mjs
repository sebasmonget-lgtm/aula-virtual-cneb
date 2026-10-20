import { currentFamilyRecommendationFingerprint } from "../src/lib/family-recommendation-fingerprint.mjs";
import { loadConfirmedFamilyContext, summarizeFamilyInterview } from "../src/lib/family-interview-projection.mjs";
import { neutralizeAssessmentText, assessmentSourceSnapshot, validateAssessmentProposal } from "../src/lib/assessment-v4-service.mjs";
import { buildBriefAssessmentInput,validateBriefAssessment,briefAssessmentAsAnalysis } from '../src/lib/assessment-brief.mjs';
import { savePeriodEvaluationDraft } from "../src/lib/period-evaluation-draft-service.mjs";
import { randomUUID, createHash } from "node:crypto";
import { versionTransaction, VersionConflictError } from "../src/lib/version-integrity.mjs";
import { assertPeriodOpen, invalidateStudentFamilyReport, appendPeriodEvent } from "../src/lib/period-edit-guard.mjs";
import { evidenceIsCurrent, conclusionIsCurrent, familyEvaluationReadiness } from "../src/lib/period-evaluation-service.mjs";
import { assessmentStudentNames } from "../src/lib/assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput, sourceAssessmentSnapshot, validateDescriptiveConclusion } from "../src/lib/descriptive-conclusion-v4-service.mjs";
import { preserveConfirmedFamilySections, buildFamilyReportInput, conclusionSourceSnapshot, sameConclusionSourceSnapshot, validateFamilyReport } from "../src/lib/family-report-v4-service.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { loadAssessmentMasterSources, loadComputedAssessmentContext } from "./assessment-master-routes.mjs";
import { assessmentMasterEntry } from "../src/lib/assessment-master-service.mjs";
import { evaluationNeedsEarlyWarning } from '../src/lib/evaluation-preparation.mjs';
import {analysisFailure,analysisOutcome,nextAnalysisTasks,allowManualAnalysisRetry} from '../src/lib/evaluation-analysis-recovery.mjs';
import { limaToday } from '../src/lib/activity-schedule-integrity.mjs';

const WORKFLOW = "period_evaluation_batch_v1";
const ANALYSIS_CONCURRENCY = 12;
import { stableFingerprint } from "../src/lib/source-fingerprint-v4.mjs";
const hash = stableFingerprint;
const taskSource = task => ({key:key(task),snapshot:task.snapshot,...(task.family_context_fingerprint?{family_context_fingerprint:task.family_context_fingerprint}:{})});
const key = task => `${task.student_id}:${task.competency_id ?? "family"}`;
const eligible = row => row.assessment?.achievement_level && row.assessment.teacher_confirmed_at && !row.draft && evidenceIsCurrent(row.assessment,row.sourceRows);
// A confirmed assessment is not weak merely because it has fewer than three records.
export const conclusionReviewReason = row => row.assessment?.details?.information_status === 'insufficient'
  ? 'Falta información para describir esta competencia.' : null;
const reportReviewReason = rows => !rows.length ? 'Este niño aún no tiene conclusiones guardadas.'
  : rows.some(row=>conclusionReviewReason(row)) ? 'Hay una competencia con información pendiente.' : null;

export function batchTasks(model, kind) {
  if (kind === "family" && !familyEvaluationReadiness(model).ready)
    throw new Error("Termina la evaluación del bimestre: guarda las notas y las conclusiones antes de preparar los informes.");
  if(kind==='analysis')return model.rows.filter(row=>row.sourceRows.length>0).map(row=>{
    const current=row.draft??row.assessment;
    const teacherText=row.draft?.draft_teacher_analysis??row.assessment?.details?.evidence_overview;
    const manual=Boolean(row.draft&&teacherText?.trim()&&(!row.draft.generation_metadata?.analysis||teacherText!==row.draft.details?.evidence_overview));
    const reusable=Boolean(teacherText?.trim()&&(manual||evidenceIsCurrent(current,row.sourceRows)));
    return {student_id:row.student_id,competency_id:row.competency_v4_id,snapshot:assessmentSourceSnapshot(row.sourceRows),
      existing:reusable?{id:current.id,details:{...current.details,evidence_overview:teacherText}}:null,
      review_reason:manual&&!evidenceIsCurrent(current,row.sourceRows)?'Conservamos tu análisis docente; revisa las nuevas observaciones.':row.sourceRows.length<3?'Hay pocas evidencias de esta competencia.':null};
  });
  const relevant = model.rows.filter(row => row.sourceRows.length > 0 || row.assessment);
  if ((kind === "conclusions" && !relevant.length) || kind !== 'conclusions' && relevant.some(row => !eligible(row))) throw new Error("Guarda las notas pendientes antes de preparar los textos del período.");
  if (kind === "conclusions") return relevant.filter(eligible).map(row => ({student_id:row.student_id,competency_id:row.competency_v4_id,
    snapshot:sourceAssessmentSnapshot(row.assessment), existing:conclusionIsCurrent(row.conclusion,row.assessment)?row.conclusion:null,
    review_reason:conclusionReviewReason(row) }));
  if (relevant.some(row => !conclusionIsCurrent(row.conclusion,row.assessment))) throw new Error("Guarda primero las conclusiones descriptivas del período.");
  return model.students.map(student => {
    const rows = relevant.filter(row => row.student_id===student.id);
    return {student_id:student.id,competency_id:null,snapshot:conclusionSourceSnapshot(rows.map(row=>row.conclusion)),
      review_reason:reportReviewReason(rows)};
  });
}

export const canonicalFamilySections = preserveConfirmedFamilySections;

export function createPeriodBatchHandler({db,teacherId,context,loadRows,loadEvidence,readJson,send,generate,createProvider,metadataForAudit}) {
  const get = async (id,classroomId,periodId,tx=db) => {
    const row=(await tx.query(`select payload from ai_pending_generations where id=$1 and classroom_id=$2 and workflow=$3 and expires_at>now()`,[id,classroomId,WORKFLOW])).rows[0];
    if(!row||row.payload.teacher_id!==teacherId||row.payload.period_id!==periodId)throw new VersionConflictError("Esta preparación no está disponible.");
    return row.payload;
  };
  const put=async(id,payload,token,tx=db)=>{
    const result=await tx.query(`update ai_pending_generations set payload=$1::jsonb,expires_at=now()+interval '7 days' where id=$2 and classroom_id=$3 and workflow=$4 and payload->>'lease_token'=$5 returning id`,[JSON.stringify(payload),id,payload.classroom_id,WORKFLOW,token]);
    if(!result.rows.length)throw new VersionConflictError("Otra preparación se guardó primero.");
  };
  const publicJob=(id,payload)=>({id,kind:payload.kind,status:payload.status==="running"&&Date.parse(payload.lease_until)<=Date.now()?"uncertain":payload.status,
    total:payload.tasks.length,completed:payload.results.length,error:payload.error??null,items:payload.results.map(({student_id,competency_id,review_reason,proposal,saved_id,achievement_levels,metadata})=>({student_id,competency_id,review_reason,proposal,saved_id,achievement_levels,grade_informed:metadata?.confirmed_grades_context_version===1})),revision:payload.revision});
  const presentJob=async(id,payload,data)=>{
    const result=publicJob(id,payload);
    if(payload.kind!=='analysis')result.items=result.items.map(item=>{
      const task=payload.tasks.find(task=>key(task)===key(item));
      const rows=data.model.rows.filter(row=>row.student_id===item.student_id&&eligible(row));
      if(payload.kind==='conclusions')return {...item,review_reason:conclusionReviewReason(rows.find(row=>row.competency_v4_id===item.competency_id)??{})};
      return {...item,review_reason:reportReviewReason(rows),achievement_levels:rows.filter(row=>task?.snapshot.some(source=>source.id===row.conclusion?.id)).map(row=>({competency_id:row.competency_v4_id,achievement_level:row.assessment.achievement_level}))};
    });
    if(payload.kind==='analysis'){
      const tasks=await freshTasks(data,'analysis');
      if(hash(tasks.map(taskSource))!==payload.source_fingerprint){result.status='stale';result.error='Hay observaciones nuevas. Prepara los análisis pendientes; los textos docentes se conservan.';}
      return result;
    }
    if(payload.status!=="saved"){
      if(payload.status==="ready"){
        let current=false;
        try{const tasks=await freshTasks(data,payload.kind);const selected=payload.tasks.map(task=>tasks.find(item=>key(item)===key(task)));current=selected.every(Boolean)&&hash(selected.map(taskSource))===payload.source_fingerprint;}catch{/* Source review is required before preparing again. */}
        if(!current){result.status="stale";result.items=[];result.completed=0;result.error="Las valoraciones o sus fuentes cambiaron. Prepara otra vez los textos afectados.";}
      }
      return result;
    }
    const model=await loadRows(db,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map(card=>card.id))});
    if(payload.kind==="conclusions"){
      const relevant=model.rows.filter(row=>row.sourceRows.length||row.assessment);
      result.items=relevant.filter(row=>eligible(row)&&conclusionIsCurrent(row.conclusion,row.assessment)).map(row=>({student_id:row.student_id,competency_id:row.competency_v4_id,review_reason:conclusionReviewReason(row),proposal:row.conclusion.details,saved_id:row.conclusion.id}));result.total=relevant.length;
    }else{
      const reports=(await db.query(`select r.* from family_reports r join students s on s.id=r.student_id where s.classroom_id=$1 and s.status='active' and r.evaluation_period_id=$2 and r.status='active'`,[data.classroom.id,data.period.id])).rows;
      result.items=reports.filter(report=>sameConclusionSourceSnapshot(report.source_conclusion_snapshot,conclusionSourceSnapshot(model.rows.filter(row=>row.student_id===report.student_id&&eligible(row)&&conclusionIsCurrent(row.conclusion,row.assessment)).map(row=>row.conclusion)))).map(report=>({student_id:report.student_id,competency_id:null,review_reason:reportReviewReason(model.rows.filter(row=>row.student_id===report.student_id&&eligible(row))),achievement_levels:model.rows.filter(row=>row.student_id===report.student_id&&report.source_conclusion_snapshot.some(source=>source.id===row.conclusion?.id)&&eligible(row)).map(row=>({competency_id:row.competency_v4_id,achievement_level:row.assessment.achievement_level})),proposal:report.details,saved_id:report.id,grade_informed:report.generation_metadata?.confirmed_grades_context_version===1}));result.total=model.students.length;
    }
    result.completed=result.items.length;return result;
  };
  const freshTasks=async(data,kind,tx=db)=>{const tasks=batchTasks(await loadRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map(card=>card.id))}),kind);if(kind==="family")for(const task of tasks)task.family_context_fingerprint=await currentFamilyRecommendationFingerprint(tx,data.classroom.id,task.student_id);return tasks;};
  return async function handle(args) {
    const {request,url,response,origin}=args;
    if(!url.pathname.startsWith("/api/period-evaluations/batches"))return false;
    const body=request.method==="POST"?await readJson(request):{};
    const data=await context(body.classroomId??url.searchParams.get("classroomId"),body.periodId??url.searchParams.get("periodId"));
    const lock=`period:${data.period.id}`;
    if(url.pathname==="/api/period-evaluations/batches" && request.method==="GET") {
      const jobs=(await db.query(`select id,payload from ai_pending_generations where classroom_id=$1 and workflow=$2 and payload->>'period_id'=$3 and payload->>'teacher_id'=$4 and expires_at>now() order by created_at desc`,[data.classroom.id,WORKFLOW,data.period.id,teacherId])).rows;
      const kind=url.searchParams.get("kind");
      send(response,200,{job:jobs.find(row=>row.payload.kind===kind)?await presentJob(jobs.find(row=>row.payload.kind===kind).id,jobs.find(row=>row.payload.kind===kind).payload,data):null},origin);return true;
    }
    if(url.pathname==="/api/period-evaluations/batches" && request.method==="POST") {
      if(!["analysis","conclusions","family"].includes(body.kind))throw new Error("Elige análisis, conclusiones o informes familiares.");
      if(body.kind==='analysis'&&evaluationNeedsEarlyWarning(limaToday(),data.period.ends_on)&&body.acknowledgeEarly!==true)throw new VersionConflictError('El bimestre aún no termina. Confirma si deseas preparar los análisis con lo registrado hasta ahora.');
      if(body.kind==='analysis'&&(body.regenerate||body.edit||body.studentId))throw new Error('La preparación del bimestre conserva los análisis guardados. Revisa un análisis individual para reemplazarlo.');
      const result=await versionTransaction(db,lock,async tx=>{
        await assertPeriodOpen(tx,data.classroom.id,data.period.id);
        if(body.kind==='conclusions'&&body.acknowledgeIncomplete!==true){
          const model=await loadRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map(card=>card.id))});
          if(model.rows.some(row=>(row.sourceRows.length||row.assessment)&&!eligible(row)))throw new VersionConflictError('Aún faltan notas de algunos niños o competencias. Confirma si deseas preparar solo las conclusiones con nota guardada.');
        }
        let tasks=await freshTasks(data,body.kind,tx);
        if(body.studentId)tasks=tasks.filter(task=>task.student_id===body.studentId&&(!body.competencyId||task.competency_id===body.competencyId));
        if(!tasks.length)throw new Error("No hay textos para preparar con estas fuentes.");
        const sourceFingerprint=hash(tasks.map(taskSource));
        const prior=(await tx.query(`select id,payload from ai_pending_generations where classroom_id=$1 and workflow=$2 and payload->>'period_id'=$3 and payload->>'teacher_id'=$4 and payload->>'source_fingerprint'=$5 and payload->>'kind'=$6 and expires_at>now() order by created_at desc limit 1`,[data.classroom.id,WORKFLOW,data.period.id,teacherId,sourceFingerprint,body.kind])).rows[0];
        if(prior && !body.regenerate && !body.edit && !body.refresh)return publicJob(prior.id,prior.payload);
        if(prior?.payload.status==="running")throw new VersionConflictError("Hay una preparación en curso.");
        if(body.kind==="family")for(const task of tasks){
          const report=(await tx.query(`select id,details,source_conclusion_snapshot,generation_metadata from family_reports where student_id=$1 and evaluation_period_id=$2 and status='active' order by version desc limit 1`,[task.student_id,data.period.id])).rows[0];
          const usesNoFamilyContext=!task.snapshot.length && report?.generation_metadata?.source==="no_confirmed_conclusions";
          if(report && (usesNoFamilyContext || (body.edit || report.generation_metadata?.confirmed_grades_context_version===1) && report.generation_metadata?.family_context_fingerprint===task.family_context_fingerprint) && sameConclusionSourceSnapshot(report.source_conclusion_snapshot,task.snapshot))task.existing=report;
        }
        if(body.edit && tasks.some(task=>!task.existing))throw new VersionConflictError("Prepara primero el texto desde las fuentes actuales.");
        const id=randomUUID(),payload={teacher_id:teacherId,classroom_id:data.classroom.id,period_id:data.period.id,kind:body.kind,status:body.edit?"ready":"queued",revision:1,lease_token:randomUUID(),source_fingerprint:sourceFingerprint,
          tasks:tasks.map(task=>({student_id:task.student_id,competency_id:task.competency_id,snapshot:task.snapshot,...(task.family_context_fingerprint?{family_context_fingerprint:task.family_context_fingerprint}:{}),review_reason:task.review_reason})),results:body.regenerate?[]:tasks.filter(task=>task.existing).map(task=>({student_id:task.student_id,competency_id:task.competency_id,snapshot:task.snapshot,...(task.family_context_fingerprint?{family_context_fingerprint:task.family_context_fingerprint}:{}),review_reason:task.review_reason,proposal:task.existing.details,saved_id:task.existing.id,metadata:{...task.existing.generation_metadata,source:"existing_canonical",family_context_fingerprint:task.family_context_fingerprint??null}}))};
        await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at) values($1,$2,$3,$4::jsonb,now(),now()+interval '7 days')`,[id,data.classroom.id,WORKFLOW,JSON.stringify(payload)]);
        return publicJob(id,payload);
      });send(response,202,result,origin);return true;
    }
    const match=/^\/api\/period-evaluations\/batches\/([0-9a-f-]{36})(?:\/(run|save))?$/.exec(url.pathname);
    if(!match)return false;
    const [,id,action]=match;
    if(request.method==="GET"&&!action){send(response,200,await presentJob(id,await get(id,data.classroom.id,data.period.id),data),origin);return true;}
    if(request.method!=="POST")return false;
    const job=await versionTransaction(db,lock,async tx=>{
      const current=await get(id,data.classroom.id,data.period.id,tx);
      if(current.status==="saved")return current;
      await assertPeriodOpen(tx,data.classroom.id,data.period.id);
      let tasks;try{tasks=await freshTasks(data,current.kind,tx);}catch{throw new VersionConflictError("Las fuentes cambiaron. Revisa las valoraciones antes de preparar los textos afectados.");}
      const selected=current.tasks.map(task=>tasks.find(item=>key(item)===key(task)));
      if(selected.some(task=>!task)||hash(selected.map(taskSource))!==current.source_fingerprint)throw new VersionConflictError("Las fuentes cambiaron. Prepara únicamente los textos afectados.");
      if(action==="save") {
        if(current.kind==='analysis')throw new Error('Los análisis se guardan como borradores; las valoraciones requieren confirmación docente individual.');
        if(current.status!=="ready"||Number(body.expectedRevision)!==current.revision)throw new VersionConflictError("Termina la preparación y recarga sus resultados antes de guardar.");
        if(!Array.isArray(body.items)||body.items.length!==current.tasks.length||new Set(body.items.map(key)).size!==current.tasks.length)throw new Error("Revisa todos los textos del lote antes de guardar.");
        const model=await loadRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map(card=>card.id))});
        for(const item of body.items) {
          const original=current.results.find(result=>key(result)===key(item));if(!original)throw new Error("El texto no pertenece a este lote.");
          const rows=model.rows.filter(row=>row.student_id===item.student_id);
          const proposal=item.proposal;
          if(current.kind==="conclusions") {
            const row=rows.find(row=>row.competency_v4_id===item.competency_id);
            validateDescriptiveConclusion(proposal,row.competency_v4_id,row.assessment.details.information_status);
            if(original.saved_id && hash(proposal)===hash(original.proposal))continue;
            await invalidateStudentFamilyReport(tx,{studentId:item.student_id,period:data.period,competencyId:item.competency_id});
            await tx.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status in ('active','draft')`,[item.student_id,item.competency_id,data.period.starts_on,data.period.ends_on]);
            const version=Number((await tx.query(`select coalesce(max(version),0)+1 as n from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`,[item.student_id,item.competency_id,data.period.starts_on,data.period.ends_on])).rows[0].n);
            original.saved_id=randomUUID();
            await tx.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,evaluation_period_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status,teacher_confirmed_at) values($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9::jsonb,$10::jsonb,$11::jsonb,'active',now())`,[original.saved_id,item.student_id,item.competency_id,row.assessment.id,data.period.id,data.period.starts_on,data.period.ends_on,version,JSON.stringify(proposal),JSON.stringify(original.metadata),JSON.stringify(original.snapshot)]);
          } else {
            const sources=rows.filter(row=>eligible(row)).map(row=>row.conclusion),ids=sources.map(row=>row.competency_v4_id).sort();
            const canonical=canonicalFamilySections(proposal,sources);item.proposal=canonical;validateFamilyReport(canonical,ids,original.snapshot);
            if(original.saved_id && hash(canonical)===hash(original.proposal))continue;
            await tx.query(`update family_reports set status='archived',updated_at=now() where student_id=$1 and period_start=$2::date and period_end=$3::date and status in ('active','draft')`,[item.student_id,data.period.starts_on,data.period.ends_on]);
            const version=Number((await tx.query(`select coalesce(max(version),0)+1 as n from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date`,[item.student_id,data.period.starts_on,data.period.ends_on])).rows[0].n);
            original.saved_id=randomUUID();
            await tx.query(`insert into family_reports(id,student_id,evaluation_period_id,period_start,period_end,version,selected_competency_ids,source_conclusion_ids,source_conclusion_snapshot,details,generation_metadata,status,teacher_confirmed_at) values($1,$2,$3,$4::date,$5::date,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,'active',now())`,[original.saved_id,item.student_id,data.period.id,data.period.starts_on,data.period.ends_on,version,JSON.stringify(ids),JSON.stringify(sources.map(row=>row.id)),JSON.stringify(original.snapshot),JSON.stringify(canonical),JSON.stringify(original.metadata)]);
          }
        }
        current.results=body.items.map(item=>({...current.results.find(result=>key(result)===key(item)),proposal:item.proposal}));current.status="saved";current.revision++;
        await appendPeriodEvent(tx,{classroomId:data.classroom.id,periodId:data.period.id,teacherId,event:{type:"batch_saved",kind:current.kind,batch_id:id,count:body.items.length}});
        await put(id,current,current.lease_token,tx);return current;
      }
      if(current.status==="ready")return current;
      if(current.status==="running") {
        if(Date.parse(current.lease_until)>Date.now())throw new VersionConflictError("La preparación sigue en curso. Consulta el avance.");
        if(body.retryUncertain!==true)throw new VersionConflictError("La respuesta se interrumpió. Confirma Reintentar para repetir solo el texto pendiente.");
      }
      if(body.retryUncertain===true)current.failures=allowManualAnalysisRetry(current.failures);
      const prior=current.lease_token;current.lease_token=randomUUID();current.lease_until=new Date(Date.now()+210000).toISOString();current.status="running";current.error=null;
      await put(id,current,prior,tx);return current;
    });
    if(action==="save"||["ready","saved"].includes(job.status)){send(response,200,publicJob(id,job),origin);return true;}
    if(job.kind==='analysis'){
      const todo=nextAnalysisTasks(job,ANALYSIS_CONCURRENCY);
      job.failures??={};
      if(!todo.length){Object.assign(job,analysisOutcome(job));job.revision++;await put(id,job,job.lease_token);send(response,200,publicJob(id,job),origin);return true;}
      // Read the shared classroom context once per group; never cache it across requests.
      const shared=context(data.classroom.id,data.period.id).then(async fresh=>({
        fresh,preparedSource:await loadAssessmentMasterSources(db,fresh.classroom,fresh.period),
        names:assessmentStudentNames(fresh.model.students),
        cachedTasks:new Map(batchTasks(fresh.model,'analysis').map(item=>[key(item),item])),
      }));
      let checkpoint=Promise.resolve();
      // Provider calls overlap; each validated result is saved and checkpointed by one writer.
      // A failed save must not prevent the other independent results from being preserved.
      const persist=build=>{
        const saved=checkpoint.then(async()=>{const result=await build();job.results.push(result);delete job.failures[key(result)];job.revision++;await put(id,job,job.lease_token);});
        checkpoint=saved.catch(()=>{});return saved;
      };
      await Promise.allSettled(todo.map(async task=>{
        let phase='prepare';
        try{
        const {fresh,preparedSource,names,cachedTasks}=await shared;
        const row=fresh.model.rows.find(row=>row.student_id===task.student_id&&row.competency_v4_id===task.competency_id);
        if(!row||hash(assessmentSourceSnapshot(row.sourceRows))!==hash(task.snapshot))throw new VersionConflictError('Las observaciones cambiaron. Revisa los análisis pendientes.');
        const cached=cachedTasks.get(key(task))?.existing;
        if(cached){phase='save';await persist(async()=>({...task,proposal:cached.details,saved_id:cached.id,metadata:{source:'existing_canonical'}}));}
        else{
          const person=fresh.model.students.find(student=>student.id===task.student_id);
          const computed=await loadComputedAssessmentContext(db,fresh.classroom,fresh.period,fresh.cards,row.sourceRows,task.competency_id,names,preparedSource);
          const input=buildBriefAssessmentInput({age:Number(fresh.classroom.age),competencyId:task.competency_id,studentName:[person.first_name,person.last_name].filter(Boolean).join(' '),sourceRows:row.sourceRows,period:fresh.period,
            applicability:{castellanoL2Applicable:fresh.classroom.castellano_l2_applicable,religionApplicable:fresh.classroom.religion_applicable}});
          const plan={...resolveAIExecutionPlan({workflow:'assessment',task:'brief_trial'}),fallback:null};
          phase='generation';const response=await generate(input,{executionPlan:plan,providerFactory:createProvider});
          phase='validation';
          const brief=validateBriefAssessment(response.output,input),generated={...response,output:briefAssessmentAsAnalysis(brief)};
          validateAssessmentProposal(generated.output,task.competency_id,row.sourceRows.length);
          const metadata={analysis:metadataForAudit(generated.metadata),source_batch_id:id,brief_assessment:brief};
          phase='save';await persist(async()=>{const saved=await savePeriodEvaluationDraft(db,{studentId:task.student_id,competencyId:task.competency_id,period:fresh.period,sourceRows:row.sourceRows,analysis:generated.output,metadata,
            teacherAnalysis:generated.output.evidence_overview,provisionalLevel:row.draft?.provisional_level??row.assessment?.achievement_level??null,teacherJustification:row.draft?.draft_teacher_justification??row.assessment?.teacher_justification??'',
            assessmentMasterId:computed.id,assessmentMasterSnapshot:computed.source_snapshot,expectedDraftRevision:row.draft?Number(row.draft.revision):null,expectedEvidenceFingerprint:createHash('sha256').update(JSON.stringify(task.snapshot)).digest('hex'),
            loadCurrent:async tx=>{await assertPeriodOpen(tx,fresh.classroom.id,fresh.period.id);return loadEvidence(tx,{classroomId:fresh.classroom.id,period:fresh.period,studentId:task.student_id,competencyId:task.competency_id});}});
          return {...task,proposal:generated.output,saved_id:saved.id,metadata};});
        }
        }catch(error){job.failures[key(task)]=analysisFailure(error,phase,job.failures[key(task)]);throw error;}
      }));
      await checkpoint;
      // Each settled failure has a safe category in the durable payload, without raw observations or SQL errors.
      Object.assign(job,analysisOutcome(job));
      job.revision++;await put(id,job,job.lease_token);send(response,200,publicJob(id,job),origin);return true;
    }
    // One bounded group per request. Provider calls overlap; checkpoints have one writer.
    const todo=nextAnalysisTasks(job,job.kind==='conclusions'?12:6);
    job.failures??={};
    const outcome=()=>{const value=analysisOutcome(job);return {...value,error:value.error?.replaceAll('análisis','textos')??null};};
    if(!todo.length){Object.assign(job,outcome());job.revision++;await put(id,job,job.lease_token);send(response,200,publicJob(id,job),origin);return true;}
    const shared=context(data.classroom.id,data.period.id).then(async fresh=>({fresh,names:assessmentStudentNames(fresh.model.students),
      preparedSource:job.kind==='conclusions'?await loadAssessmentMasterSources(db,fresh.classroom,fresh.period):null}));
    let checkpoint=Promise.resolve();
    const persist=result=>{
      const saved=checkpoint.then(async()=>{job.results.push(result);delete job.failures[key(result)];job.revision++;await put(id,job,job.lease_token);});
      checkpoint=saved.catch(()=>{});return saved;
    };
    await Promise.allSettled(todo.map(async task=>{
      let phase='prepare';
      try{
        const {fresh,names,preparedSource}=await shared;
        const rows=fresh.model.rows.filter(row=>row.student_id===task.student_id),row=rows.find(row=>row.competency_v4_id===task.competency_id);
        const source=batchTasks(fresh.model,job.kind).find(item=>key(item)===key(task));
        if(!source||hash(source.snapshot)!==hash(task.snapshot))throw new VersionConflictError('Las fuentes cambiaron. Actualiza los textos pendientes.');
        if(job.kind==='family'&&!task.snapshot.length){phase='save';await persist({...task,proposal:{introduction:'Todavía no hay conclusiones guardadas para este niño.',sections:[],closing_note:'Seguiremos recogiendo observaciones.'},achievement_levels:[],metadata:{source:'no_confirmed_conclusions',family_context_fingerprint:task.family_context_fingerprint}});return;}
        const prior=job.kind==='conclusions'?(await db.query(`select details from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and status='active' and period_end<$3::date order by period_end desc limit 1`,[task.student_id,task.competency_id,fresh.period.starts_on])).rows[0]:null;
        const interview=job.kind==='family'?await loadConfirmedFamilyContext(db,fresh.classroom.id,task.student_id):null;
        const familyRecommendationContext=interview?{source_type:'family_reported_context',version:interview.version,summary:neutralizeAssessmentText(summarizeFamilyInterview(interview.details),names)}:null;
        const student=fresh.model.students.find(item=>item.id===task.student_id),studentName=[student?.first_name,student?.last_name].filter(Boolean).join(' ');
        const computed=job.kind==='conclusions'?await loadComputedAssessmentContext(db,fresh.classroom,fresh.period,fresh.cards,row.sourceRows,task.competency_id,names,preparedSource):null;
        const input=job.kind==='conclusions'?buildDescriptiveConclusionInput({age:fresh.classroom.age,studentName,competencyId:task.competency_id,assessment:row.assessment,assessmentMaster:assessmentMasterEntry(computed,task.competency_id),evidenceRows:row.sourceRows,knownNames:names,priorConclusion:prior?.details?.conclusion_text}):buildFamilyReportInput({age:fresh.classroom.age,studentName,competencyIds:task.snapshot.map(source=>source.competency_id),conclusions:rows.filter(eligible).map(row=>row.conclusion),confirmedAssessments:rows.filter(eligible).map(row=>row.assessment),familyRecommendationContext,knownNames:names,castellanoL2Applicable:fresh.classroom.castellano_l2_applicable,religionApplicable:fresh.classroom.religion_applicable});
        const plan=resolveAIExecutionPlan({workflow:job.kind==='conclusions'?'descriptive_conclusion':'family_report',task:'generation'});
        phase='generation';const generated=await generate(input,{providerFactory:candidate=>createProvider(candidate),provider:createProvider(plan),executionPlan:plan});
        phase='validation';const proposal=job.kind==='family'?canonicalFamilySections(generated.output,rows.filter(eligible).map(row=>row.conclusion)):generated.output;
        if(job.kind==='conclusions')validateDescriptiveConclusion(proposal,task.competency_id,row.assessment.details.information_status);
        else validateFamilyReport(proposal,task.snapshot.map(source=>source.competency_id),task.snapshot);
        if(job.kind==='family'&&task.family_context_fingerprint!==await currentFamilyRecommendationFingerprint(db,fresh.classroom.id,task.student_id))throw new VersionConflictError('La entrevista familiar cambió.');
        phase='save';await persist({...task,review_reason:job.kind==='conclusions'?conclusionReviewReason(row):reportReviewReason(rows.filter(eligible)),proposal,
          ...(job.kind==='family'?{achievement_levels:rows.filter(eligible).map(row=>({competency_id:row.competency_v4_id,achievement_level:row.assessment.achievement_level}))}:{}),
          metadata:{...metadataForAudit(generated.metadata),...(job.kind==='family'?{family_context_fingerprint:task.family_context_fingerprint,confirmed_grades_context_version:1}:{})}});
      }catch(error){job.failures[key(task)]=analysisFailure(error,phase,job.failures[key(task)]);throw error;}
    }));
    await checkpoint;
    Object.assign(job,outcome());job.revision++;await put(id,job,job.lease_token);send(response,200,publicJob(id,job),origin);
    return true;
  };
}
