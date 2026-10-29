import {importDocumentGeneratorStudents,changeDocumentGeneratorEnrollment} from '../src/lib/document-generator-roster.mjs';
import { prepareDocumentGeneratorConversation } from '../src/lib/multi-age-planning-decisions.mjs';
import {useDocumentGeneratorYear} from '../src/lib/document-generator-year.mjs';
import {readDocumentGeneratorProjectPreparation,startDocumentGeneratorProjectPreparation,retryDocumentGeneratorProjectPreparation} from '../src/lib/document-generator-project-preparation.mjs';
import { assertMultiAgeLocalDb, multiAgeLocalStorage } from './multi-age-local-db.mjs';
import { enqueueMultiAgeGeneration, loadMultiAgeGeneration, retryMultiAgeGeneration, listMultiAgeGenerationJobs } from '../src/lib/multi-age-generation-jobs.mjs';
import { confirmMultiAgeActivityBatch } from '../src/lib/multi-age-activity-batch.mjs';
import { readMultiAgeConversation } from '../src/lib/multi-age-conversation.mjs';
import { confirmMultiAgePlanningDecision } from '../src/lib/multi-age-planning-decisions.mjs';
import { classroomCurriculumScope, CurriculumPermissionError } from '../src/lib/classroom-curriculum-scope.mjs';
import { createMultiAgeClassroom, enrollMultiAgeStudent, confirmMultiAgeActivity, observeMultiAgeStudent,
  multiAgeAssessmentContext, confirmMultiAgeGrade, confirmMultiAgeConclusion, confirmMultiAgeFamilyReport,
  multiAgeFamilyDocument, multiAgeLocalWorkspace } from '../src/lib/multi-age-local-service.mjs';
import { recordMultiAgeDiagnosticObservation, confirmMultiAgeFamilyContext, confirmMultiAgeDiagnosticReview,
  multiAgeDiagnosticContext, multiAgeDiagnosticWorkspace } from '../src/lib/multi-age-diagnostic.mjs';
import { multiAgeAnnualWorkspace, saveMultiAgeAnnualDraft, confirmMultiAgeAnnualPlan, MultiAgeAnnualCalendarError } from '../src/lib/multi-age-annual.mjs';
import { listMultiAgeDocuments, loadMultiAgeDocument,loadDocumentGeneratorProjectExport } from '../src/lib/multi-age-document-service.mjs';
import {isDocumentGenerator} from '../src/lib/ayni-product-mode.mjs';
import {documentGeneratorSavedFilename} from '../src/lib/document-generator-downloads.mjs';
import {buildDocumentGeneratorProjectZip} from '../src/lib/document-generator-project-zip.mjs';
import {downloadContentDisposition,normalizedDownloadName,savedDocumentDownloadName} from '../src/lib/document-download-name.mjs';
import {multiAgeFamilyQuestionnaireWorkspace,saveMultiAgeFamilyQuestionnaire,confirmMultiAgeFamilyQuestionnaire} from '../src/lib/multi-age-family-questionnaire.mjs';
import {multiAgeGroupDiagnosticWorkspace,saveMultiAgeGroupDiagnostic,confirmMultiAgeGroupDiagnostic} from '../src/lib/multi-age-group-diagnostic.mjs';
import {multiAgeWorkshopLibrary,confirmMultiAgeWorkshop} from '../src/lib/multi-age-workshops.mjs';
import {multiAgeYearTransitionContext,confirmMultiAgeYearTransition,multiAgeYearHistory} from '../src/lib/multi-age-year-transition.mjs';
import { renderMultiAgePlanningWord } from '../src/lib/multi-age-planning-word.mjs';
import { multiAgePeriodOverview, filterMultiAgePeriodRows, closeMultiAgePeriod, reopenMultiAgePeriod, loadMultiAgePeriodClosure, multiAgePeriodExcel } from '../src/lib/multi-age-period.mjs';
import { renderFamilyReportWord } from '../src/lib/family-report-word.mjs';
import { loadKnowledgeBaseV4 } from '../src/lib/knowledge-base-v4.mjs';
import { httpStatusForError, publicErrorMessage } from '../src/lib/version-integrity.mjs';
import { multiAgeProjectEditContext,confirmMultiAgeProjectEdit } from '../src/lib/multi-age-project-edit.mjs';
import { correctMultiAgeStudent, correctMultiAgeOrdinaryObservation, correctMultiAgeDiagnosticObservation, multiAgeCorrectionHistory } from '../src/lib/multi-age-corrections.mjs';

/** Fail closed before any database, storage, credentials or migrations are opened. */
export function multiAgeAppLocalEnabled(env = process.env) {
  if (env.AYNI_MULTI_AGE_LOCAL !== '1') return false;
  if(!['memory','persistent'].includes(env.AYNI_MULTI_AGE_STORAGE??'memory'))throw new Error('Elige almacenamiento local temporal o persistente.');
  if (env.NODE_ENV === 'production' || env.VERCEL === '1' || env.VERCEL_ENV || env.AYNI_SERVERLESS === '1'
    || (env.AYNI_AUTH_MODE ?? 'local') !== 'local' || (env.AYNI_DB_MODE ?? 'local') !== 'local'
    || !['127.0.0.1', 'localhost', '::1'].includes(env.AYNI_API_HOST ?? '127.0.0.1'))
    throw new Error('La integración multiedad de prueba requiere desarrollo local, identidad local y base temporal.');
  return true;
}

export async function multiAgeAppEntry(db, teacherId, enabled) {
  // Disabled deployments do not depend on the new schema or touch existing rows.
  if (!enabled) return { enabled: false };
  assertMultiAgeLocalDb(db);
  const rows = (await db.query("select id,curriculum_contract_version from classrooms where teacher_id=$1 and status='active' order by id", [teacherId])).rows;
  if (rows.length > 1) throw new Error('Hay más de un aula activa. Revisa la selección antes de continuar.');
  const row = rows[0];
  return { enabled: true, contract: row ? Number(row.curriculum_contract_version) : null, classroomId: row?.id ?? null, storage: multiAgeLocalStorage(db).storage };
}

const operations = {
  '/document-year/use':useDocumentGeneratorYear,
  '/roster/import':importDocumentGeneratorStudents, '/roster/enrollment':changeDocumentGeneratorEnrollment, '/conversation/prepare':prepareDocumentGeneratorConversation, '/classroom': createMultiAgeClassroom, '/enroll': enrollMultiAgeStudent, '/activity': confirmMultiAgeActivity,
  '/activity/batch': confirmMultiAgeActivityBatch,
  '/workshops/confirm':confirmMultiAgeWorkshop,
  '/years/transition':confirmMultiAgeYearTransition,
  '/observe': observeMultiAgeStudent, '/grade': confirmMultiAgeGrade, '/conclusion': confirmMultiAgeConclusion,
  '/family': confirmMultiAgeFamilyReport, '/diagnostic/observe': recordMultiAgeDiagnosticObservation,
  '/diagnostic/family': confirmMultiAgeFamilyContext, '/diagnostic/review': confirmMultiAgeDiagnosticReview,
  '/diagnostic/questionnaire/draft':saveMultiAgeFamilyQuestionnaire,'/diagnostic/questionnaire/confirm':confirmMultiAgeFamilyQuestionnaire,
  '/diagnostic/group/draft':saveMultiAgeGroupDiagnostic,'/diagnostic/group/confirm':confirmMultiAgeGroupDiagnostic,
  '/annual/draft': saveMultiAgeAnnualDraft, '/annual/confirm': confirmMultiAgeAnnualPlan,
  '/annual/reorder':saveMultiAgeAnnualDraft,'/projects/edit':confirmMultiAgeProjectEdit,
  '/conversation/decision': confirmMultiAgePlanningDecision,
  '/periods/close': closeMultiAgePeriod, '/periods/reopen': reopenMultiAgePeriod,
  '/corrections/student':correctMultiAgeStudent,'/corrections/ordinary':correctMultiAgeOrdinaryObservation,'/corrections/diagnostic':correctMultiAgeDiagnosticObservation,
};

/** Runs after normal application authentication. Identity always comes from that context. */
export async function handleMultiAgeAppRoutes({ request, response, url, context, enabled, origin, send, readJson, aiConfig={mode:'off'} }) {
  const entryRoute = url.pathname === '/api/curriculum/entry';
  const prefix = '/api/multi-age';
  if (!entryRoute && !url.pathname.startsWith(prefix + '/')) return false;
  try {
    if (entryRoute && request.method === 'GET') {
      send(response, 200, await multiAgeAppEntry(context.db, context.teacherId, enabled), origin); return true;
    }
    if (!enabled) { send(response, 404, { error: 'Recorrido no disponible.' }, origin); return true; }
    assertMultiAgeLocalDb(context.db);
    const route = url.pathname.slice(prefix.length), db = context.db, teacherId = context.teacherId;
    if(request.method==='GET'&&route==='/document-project'){send(response,200,await readDocumentGeneratorProjectPreparation(db,teacherId,{classroomId:url.searchParams.get('classroomId'),annualPlanId:url.searchParams.get('annualPlanId'),annualSlotId:url.searchParams.get('annualSlotId')}),origin);return true;}
    if(request.method==='GET'&&route==='/workshops'){send(response,200,await multiAgeWorkshopLibrary(db,teacherId,url.searchParams.get('classroomId')),origin);return true;}
    if(request.method==='GET'&&route==='/years/transition'){send(response,200,await multiAgeYearTransitionContext(db,teacherId,url.searchParams.get('classroomId')),origin);return true;}
    if(request.method==='GET'&&route==='/years/history'){send(response,200,await multiAgeYearHistory(db,teacherId),origin);return true;}
    if(request.method==='GET'&&route==='/projects/edit'){send(response,200,await multiAgeProjectEditContext(db,teacherId,{classroomId:url.searchParams.get('classroomId'),projectId:url.searchParams.get('projectId')}),origin);return true;}
    if(request.method==='GET'&&route==='/corrections/history'){send(response,200,await multiAgeCorrectionHistory(db,teacherId,url.searchParams.get('studentId')),origin);return true;}
    const periodInput={classroomId:url.searchParams.get('classroomId'),periodId:url.searchParams.get('periodId')};
    const filters={age:url.searchParams.get('age'),studentId:url.searchParams.get('studentId'),competencyId:url.searchParams.get('competencyId'),status:url.searchParams.get('status')??'all'};
    if(request.method==='GET'&&(route==='/periods/overview'||route==='/periods/consolidated')){
      const overview=await multiAgePeriodOverview(db,teacherId,periodInput);
      send(response,200,route.endsWith('/overview')?overview:{rows:filterMultiAgePeriodRows(overview.rows,filters)},origin);return true;
    }
    const closureRoute=/^\/periods\/closures\/([0-9a-f-]{36})(\.xlsx)?$/i.exec(route);
    if(request.method==='GET'&&closureRoute&&!closureRoute[2]){send(response,200,await loadMultiAgePeriodClosure(db,teacherId,closureRoute[1]),origin);return true;}
    if(request.method==='GET'&&(route==='/periods/consolidated.xlsx'||closureRoute?.[2])){
      const bytes=await multiAgePeriodExcel(db,teacherId,closureRoute?{closureVersionId:closureRoute[1]}:periodInput,filters);
      let closureName=null;
      if(await isDocumentGenerator(db,teacherId)){
        const saved=closureRoute?await loadMultiAgePeriodClosure(db,teacherId,closureRoute[1]):null;
        const period=saved?.manifest.period??(await multiAgePeriodOverview(db,teacherId,periodInput)).period;
        const identity=saved?.manifest.identity??(await db.query(`select c.section,sy.year as school_year from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`,[periodInput.classroomId,teacherId])).rows[0];
        closureName=normalizedDownloadName(['Consolidado',period.label,identity.school_year,`Aula ${identity.section}`,saved?`v${String(saved.version).padStart(2,'0')}`:''],'xlsx');
      }
      response.writeHead(200,{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':closureName?downloadContentDisposition(closureName):'attachment; filename="consolidado-ayni.xlsx"',
        'cache-control':'private, no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-expose-headers':'content-disposition',vary:'Origin'}:{})});
      response.end(bytes);return true;
    }
    if (request.method === 'GET' && route === '/state') {
      const entry = await multiAgeAppEntry(db, teacherId, true);
      const classroomId = url.searchParams.get('classroomId') ?? entry.classroomId;
      const capabilities={storage:entry.storage,ai:aiConfig.mode};
      if (!classroomId) { send(response, 200, { workspace: null, diagnostic: null, planning: null, documents: [], capabilities }, origin); return true; }
      const workspace = await multiAgeLocalWorkspace(db, teacherId, classroomId);
      const diagnostic = await multiAgeDiagnosticWorkspace(db, teacherId, classroomId);
      diagnostic.groupReview=await multiAgeGroupDiagnosticWorkspace(db,teacherId,classroomId,diagnostic);
      let planning = null, planningUnavailable = null;
      try { planning = await multiAgeAnnualWorkspace(db, teacherId, classroomId); }
      catch (error) { if (!(error instanceof MultiAgeAnnualCalendarError)) throw error; planningUnavailable = error.message; }
      send(response, 200, { workspace, diagnostic, planning, planningUnavailable, capabilities, documents: await listMultiAgeDocuments(db, teacherId, { classroomId }) }, origin); return true;
    }
    const jobRoute=/^\/generation\/([0-9a-f-]{36})(\/retry)?$/i.exec(route);
    if(request.method==='GET'&&route==='/conversation'){send(response,200,await readMultiAgeConversation(db,teacherId,{classroomId:url.searchParams.get('classroomId'),projectId:url.searchParams.get('projectId'),annualPlanId:url.searchParams.get('annualPlanId'),annualSlotId:url.searchParams.get('annualSlotId')}),origin);return true;}
    if(request.method==='GET'&&route==='/generation') {send(response,200,{jobs:await listMultiAgeGenerationJobs(db,teacherId,url.searchParams.get('classroomId'))},origin);return true;}
    if(request.method==='GET'&&jobRoute&&!jobRoute[2]) {send(response,200,await loadMultiAgeGeneration(db,teacherId,jobRoute[1]),origin);return true;}
    if (request.method === 'GET' && route === '/context') {
      send(response, 200, await multiAgeAssessmentContext(db, teacherId, {
        studentId: url.searchParams.get('studentId'), competencyId: url.searchParams.get('competencyId'), periodId: url.searchParams.get('periodId'),
      }), origin); return true;
    }
    if (request.method === 'GET' && route === '/diagnostic/context') {
      const data = await multiAgeDiagnosticContext(db, teacherId, url.searchParams.get('studentId'));
      send(response, 200, { context: data.context, sourceFingerprint: data.sourceFingerprint }, origin); return true;
    }
    if(request.method==='GET'&&route==='/diagnostic/questionnaire'){send(response,200,await multiAgeFamilyQuestionnaireWorkspace(db,teacherId,url.searchParams.get('studentId')),origin);return true;}
    if(request.method==='GET'&&route==='/diagnostic/group'){send(response,200,await multiAgeGroupDiagnosticWorkspace(db,teacherId,url.searchParams.get('classroomId')),origin);return true;}
    const bundle=/^\/documents\/project\/([0-9a-f-]{36})\/bundle\.zip$/i.exec(route);
    if(request.method==='GET'&&bundle){
      const result=await buildDocumentGeneratorProjectZip(db,teacherId,bundle[1]);
      response.writeHead(200,{'content-type':'application/zip','content-disposition':downloadContentDisposition(result.filename),
        'content-length':String(result.bytes.length),'cache-control':'private, no-store','x-content-type-options':'nosniff',
        ...(origin?{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-expose-headers':'content-disposition',vary:'Origin'}:{})});
      response.end(result.bytes);return true;
    }
    const document = /^\/documents\/(annual_plan|diagnostic_student_review|diagnostic_group_review|activity|project|workshop)\/([0-9a-f-]{36})\.docx$/i.exec(route);
    const documentRead = /^\/documents\/(annual_plan|diagnostic_student_review|diagnostic_group_review|activity|project|workshop)\/([0-9a-f-]{36})$/i.exec(route);
    if(request.method==='GET'&&documentRead){send(response,200,await loadMultiAgeDocument(db,teacherId,documentRead[1],documentRead[2]),origin);return true;}
    const family = /^\/reports\/([0-9a-f-]{36})\.docx$/i.exec(route);
    if (request.method === 'GET' && (document || family)) {
      let bytes,filename='documento-ayni.docx';
      const documentsOnly=await isDocumentGenerator(db,teacherId);
      if(document?.[1]==='project'&&documentsOnly){
        const prepared=await loadDocumentGeneratorProjectExport(db,teacherId,document[2]);
        bytes=await renderMultiAgePlanningWord(prepared.document,{activityRoute:prepared.activityRoute,practical:true});
        filename=await documentGeneratorSavedFilename(db,teacherId,prepared.document);
      }else if (document){
        const saved=await loadMultiAgeDocument(db, teacherId, document[1], document[2]);
        bytes=await renderMultiAgePlanningWord(saved,{practical:documentsOnly&&['activity','annual_plan'].includes(saved.kind)});
        if(documentsOnly)filename=await documentGeneratorSavedFilename(db,teacherId,saved);
      }else{
        const report=await multiAgeFamilyDocument(db,teacherId,family[1]);
        bytes=await renderFamilyReportWord(report,(await loadKnowledgeBaseV4()).competencyCards);
        if(documentsOnly)filename=savedDocumentDownloadName({...report,kind:'family_report',school_year:report.period_start?.slice(0,4)});
      }
      response.writeHead(200, { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'content-disposition': documentsOnly?downloadContentDisposition(filename):'attachment; filename="documento-ayni.docx"', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
        ...(origin ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-expose-headers': 'content-disposition', vary: 'Origin' } : {}) });
      response.end(bytes); return true;
    }
    const operation = operations[route];
    const projectOperation=route==='/document-project/start'?startDocumentGeneratorProjectPreparation:route==='/document-project/retry'?retryDocumentGeneratorProjectPreparation:null;
    if (request.method !== 'POST' || (!operation&&!projectOperation&&route!=='/generation'&&!(jobRoute&&jobRoute[2]))) { send(response, 404, { error: 'Ruta no disponible.' }, origin); return true; }
    // Main handler validates the configured allowlist; require Origin even with local identity.
    if (!origin || !String(request.headers['content-type'] ?? '').startsWith('application/json')) {
      send(response, 403, { error: 'Inicia esta operación desde la aplicación.' }, origin); return true;
    }
    const input = await readJson(request);
    if (!input || typeof input !== 'object' || Array.isArray(input) || 'teacherId' in input || 'ownerId' in input)
      throw new CurriculumPermissionError();
    if(projectOperation){send(response,200,await projectOperation(db,teacherId,input,aiConfig),origin);return true;}
    if(route==='/generation'){send(response,200,await enqueueMultiAgeGeneration(db,teacherId,input,aiConfig),origin);return true;}
    if(jobRoute&&jobRoute[2]){send(response,200,await retryMultiAgeGeneration(db,teacherId,jobRoute[1],aiConfig),origin);return true;}
    if (route === '/classroom' && input.teachingMode !== 'single_teacher_multi_age')
      throw new TypeError('Elige Unidocencia expresamente al configurar el aula.');
    if (route === '/classroom'&&input.calendarPolicy!=='institutional') input.calendarPolicy = 'national-2026';
    if (route === '/activity' && (!input.annualPlanId || !input.annualSlotId))
      throw new TypeError('Prepara la actividad desde una posición confirmada de Mi año.');
    if(input.generationJobId&&!['/diagnostic/review','/annual/draft','/document-year/use','/activity','/activity/batch'].includes(route))throw new TypeError('Esta operación no usa una propuesta generada.');
    send(response, 200, await operation(db, teacherId, input), origin); return true;
  } catch (error) {
    send(response, httpStatusForError(error), { error: publicErrorMessage(error) }, origin); return true;
  }
}

/** Never pass a V2 classroom to legacy writers/readers with a scalar age. */
export async function multiAgeLegacyRouteBlocked(context, enabled) {
  if (!enabled) return false;
  const entry = await multiAgeAppEntry(context.db, context.teacherId, true);
  if (entry.contract !== 2) return false;
  const scope = await classroomCurriculumScope(context.db, context.teacherId, entry.classroomId);
  return scope.contract === 2;
}
