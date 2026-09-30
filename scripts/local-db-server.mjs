import { createServer } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createDatabase } from "./database-adapter.mjs";
import { resolveDailyState } from "../src/lib/daily-state.mjs";
import { teacherTodayActions } from "../src/lib/teacher-today-actions.mjs";
import { readQADailyClock } from "../src/lib/qa-daily-clock.mjs";
const qaDailyClock = readQADailyClock();
import { isValidStepIndex } from "../src/lib/activity-runner.mjs";
import { buildStudentPedagogicalContext, refreshStudentContextSnapshot } from "../src/lib/student-context-service.mjs";
import { getCurrentClassroomContext, publicClassroomContext } from "../src/lib/classroom-context-service.mjs";
import { buildClassroomStatistics } from "../src/lib/statistics-service.mjs";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { competencyApplicability } from "../src/lib/competency-applicability.mjs";
import { generateTeacherActivity } from "../src/lib/ai-activity-ui-service.mjs";
import { generateTeacherAnnualPlan } from "../src/lib/ai-annual-plan-ui-service.mjs";
import { ANNUAL_PREPLAN_FORMAT, AnnualPreplanError, ageFilteredAnnualCurriculum, generateAnnualPreplan, validateAnnualPreplan } from "../src/lib/annual-preplan-service.mjs";
import { persistAnnualProjectSlots } from "../src/lib/annual-project-slots.mjs";
import { developConfirmedAnnualPlan } from "../src/lib/annual-formal-service.mjs";
import { DiagnosticSuggestionError, suggestDiagnosticGroupReview } from "../src/lib/ai-diagnostic-evaluation-service.mjs";
import { DiagnosticPriorityError, prepareDiagnosticPriorities, suggestDiagnosticPriorities, saveDiagnosticPriorities, confirmDiagnosticPriorities } from "../src/lib/diagnostic-priority-service.mjs";
import { generateTeacherLearningExperience } from "../src/lib/ai-learning-experience-ui-service.mjs";
import { generateProjectPreview, generateProjectDependents, generateProjectMaster, generateProjectFormal,
  instructionalDates, validateProjectDecisions, validateProjectDependents, validateEditedActivityMap,
  projectDetails, preserveTeacherMapEdits, suggestEmergentProposal } from "../src/lib/project-flow-service.mjs";
import { nextAnnualPlanVersion, safeAnnualGenerationMetadata } from "../src/lib/annual-plan-persistence.mjs";
import { copyConfirmedAnnualPlan, confirmAnnualPlanVersion } from "../src/lib/annual-plan-version-service.mjs";
import { copyConfirmedLearningExperience, confirmLearningExperienceVersion } from "../src/lib/learning-experience-version-service.mjs";
import { assertFutureProjectMapEdits, assertProtectedCalendarDates, retainProtectedProjectRows } from "../src/lib/project-map-version-guard.mjs";
import { confirmedProjectFormalContext } from "../src/lib/direct-ai-context-contracts.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT, validateAnnualPlanProposal } from "../src/lib/annual-plan-contract.mjs";
import { annualCalendarDay } from "../src/lib/annual-plan-schedule.mjs";
import { buildFlexibleAnnualSchedule, buildEditableAnnualSchedule, defaultInitialStage, nationalCalendarBlocks2026, nationalSchoolHolidays2026, validateAnnualCalendar } from "../src/lib/annual-plan-calendar.mjs";
import { candidateProjectDates, ensureSchoolCalendar, loadEffectiveCalendar, reprogramActivity, saveClassroomOverride,
  validateSelectedInstructionalDates } from "../src/lib/school-calendar-service.mjs";
import { listSavedDocuments, loadSavedDocument } from "../src/lib/document-library-service.mjs";
import { prepareWordDownload } from "../src/lib/document-word-export.mjs";
import { prepareConfirmedDocumentArtifact, listConfirmedDocumentArtifacts, listDocumentArtifactStates,
  readConfirmedDocumentArtifact } from "../src/lib/document-artifact-service.mjs";
import { createLocalPrivateDocumentArtifactStorage,
  createSupabasePrivateDocumentArtifactStorage } from "../src/lib/private-document-artifact-storage.mjs";
import { buildAuthorizedDocumentZip } from "../src/lib/document-sync-package.mjs";
import { saveWordToLocalDownloads } from "../src/lib/local-word-save.mjs";
import { buildInstitutionInitialsLogo, loadInstitutionLogoForDocuments, normalizeInstitutionLogoUpload } from "../src/lib/institution-logo.mjs";
import { displayPersonName } from "../src/lib/person-name.mjs";
import { validateLearningExperienceProposal } from "../src/lib/learning-experience-validation.mjs";
import { inheritedActivityCriterion, routeItemFor, saveActivityDetails, saveExperienceDetails } from "../src/lib/experience-lineage.mjs";
import { activityCriteriaV3, activityPreparationV3, inheritedActivityEnabled, stampActivityV3 } from "../src/lib/activity-v3-snapshot.mjs";
import { activityV3, validateActivityV3, canonicalProjectDetails, canonicalProjectRoute, planningV3ReadEnabled, projectMasterV3, resolveAnnualProposal, validateProjectMasterV3 } from "../src/lib/planning-contract-v3.mjs";
import { simpleProjectEnabled, stampProjectV3, retainProjectCriterionIds } from "../src/lib/project-v3-snapshot.mjs";
import { confirmActivityWithCriterion } from "../src/lib/activity-confirmation.mjs";
import { copyConfirmedActivity } from "../src/lib/activity-version-service.mjs";
import { copyConfirmedCriterion, confirmCriterionVersion } from "../src/lib/criterion-version-service.mjs";
import { normalizeActivityMaterials, publicActivityParent, validateActivityV4 } from "../src/lib/activity-v4-validation.mjs";
import { validateCriterionEvidenceV4 } from "../src/lib/criterion-evidence-validation.mjs";
import { generateCriterionEvidence } from "../src/lib/ai-criterion-evidence-ui-service.mjs";
import { criterionMatchesConfirmedActivity, validateEvidenceCaptureV4 } from "../src/lib/evidence-capture-v4.mjs";
import { reassignEvidenceStudent } from "../src/lib/evidence-student-correction.mjs";
import { listOrdinaryObservations, reviseOrdinaryObservation, saveOrdinaryObservation, validateOrdinaryObservation } from "../src/lib/ordinary-observation-service.mjs";
import { confirmOrdinaryAttribution, ordinaryAttributionHistory, ordinaryReviewQueue,
  recordOrdinarySuggestion } from "../src/lib/ordinary-attribution-service.mjs";
import { createAssessmentRouteHandler } from "./assessment-routes.mjs";
import { createAssessmentMasterRouteHandler } from "./assessment-master-routes.mjs";
import { createDescriptiveConclusionRouteHandler } from "./descriptive-conclusion-routes.mjs";
import { createFamilyReportRouteHandler } from "./family-report-routes.mjs";
import { createPeriodEvaluationRouteHandler } from "./period-evaluation-routes.mjs";
import { createWorkshopRouteHandler } from "./workshop-routes.mjs";
import { generateWorkshopDay, workshopItemIsSelected } from "../src/lib/workshop-master-service.mjs";
import { availableSheets } from "../src/lib/workshop-sheet-catalog.mjs";
import { activeWorkshopForProject, insertDailyPair, linkedWorkshopDraft, updateDailyPair } from "./daily-workshop-persistence.mjs";
import { createPendingAIGenerationsStore } from "../src/lib/pending-ai-generations-store.mjs";
import { createPilotClassroom, importStudentsForTeacher, parseStudentCsv } from "../src/lib/pilot-onboarding-service.mjs";
import { createLocalPrivateEvidenceStorage, createSupabasePrivateEvidenceStorage } from "../src/lib/private-evidence-storage.mjs";
import { createSupabasePrivateObservationStorage } from "../src/lib/private-observation-storage.mjs";
import { validateShortAudio, transcribeAndPolishAudio, AUDIO_MIME_TYPES } from "../src/lib/audio-note-service.mjs";
import { buildClassifierOptions } from "../src/lib/openai-competency-classifier.mjs";
import { createJevCompetencySuggester, anonymousDecisionText } from "../src/lib/jev-competency-suggestion.mjs";
import { jevFeatureEnabled } from "../src/lib/jev-openrouter-decision.mjs";
import { eligibleProjectImages, publicProjectImage, suggestProjectImage } from "../src/lib/jev-project-image.mjs";
import { createLocalPrivateInterviewStorage, createSupabasePrivateInterviewStorage } from "../src/lib/private-interview-storage.mjs";
import { createSupabasePrivateLogoStorage } from "../src/lib/private-logo-storage.mjs";
import { recordOperationalEvent } from "../src/lib/operational-events.mjs";
import { loadStudentTrajectory } from "../src/lib/student-trajectory-service.mjs";
import { withAiUsageContext, loadTeacherAiUsage } from "../src/lib/ai-usage-service.mjs";
import { completeDiagnosticReviewForTeacher, diagnosticProgressForTeacher, diagnosticStepProgressForTeacher, DiagnosticReviewError } from "../src/lib/diagnostic-review-service.mjs";
import { DiagnosticExperienceError, loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "../src/lib/diagnostic-experiences-v4.mjs";
import { DiagnosticAssessmentError, loadDiagnosticAssessmentWorkspace, prepareDiagnosticSynthesis, saveDiagnosticSynthesis, confirmDiagnosticSynthesis, prepareDiagnosticStudentReview, saveDiagnosticStudentReview, confirmDiagnosticStudentReview, prepareDiagnosticGroupReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview, saveStudentInitialContext, diagnosticPlanningSummary } from "../src/lib/diagnostic-assessment-v4.mjs";
import { DiagnosticSourceError, loadFamilyInterview, listFamilyInterviewStatuses, saveFamilyInterview, confirmFamilyInterview, saveAndConfirmFamilyInterview, attachFamilyInterview, familyInterviewAttachmentPath, recordSpontaneousObservation, recordMatrixDiagnosticObservation, loadSpontaneousObservations, correctSpontaneousClassification, markSpontaneousNeedsReview, suggestSpontaneousV24, loadSpontaneousV24Metrics } from "../src/lib/diagnostic-sources-v4.mjs";
import { createObservationV24Classifier, observationV24Enabled } from "../src/lib/observation-v24-classifier.mjs";
import { neutralizeAssessmentText } from "../src/lib/assessment-v4-service.mjs";
import { loadPlanningFeedback, planningFeedbackText, resolveProjectPlanningFeedback } from "../src/lib/planning-feedback.mjs";
import { expectedRevision, assertRevision, conflictPayload, httpStatusForError, isVersionConflict, versionTransaction, VersionConflictError, publicErrorMessage } from "../src/lib/version-integrity.mjs";
import { createRequestAuth, RequestAuthError } from "./request-auth.mjs";
import { authorizeRequestSelectors, RequestAccessError } from "./request-authorization.mjs";
import { loadLibraryResources, publicLibraryResource, saveLibraryResourceToDownloads } from "./library-resources.mjs";

const root = process.cwd();
const dataDir = process.env.AYNI_LOCAL_DATA_DIR ? path.resolve(process.env.AYNI_LOCAL_DATA_DIR) : path.join(root, ".local", "pgdata");
const migrationsDir = path.join(root, "local-db", "migrations");
const assetsDir = path.join(root, ".local", "assets");
const evidenceAssetsDir = path.join(assetsDir, "evidences");
const port = Number(process.env.AYNI_LOCAL_DB_PORT ?? 8788);
const authMode = process.env.AYNI_AUTH_MODE ?? "local";
const dbMode = process.env.AYNI_DB_MODE ?? (authMode === "local" ? "local" : "postgres");
const storageConfig = { url: process.env.AYNI_SUPABASE_URL, serviceRoleKey: process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY };
const evidenceStorage = dbMode === "local" ? createLocalPrivateEvidenceStorage(evidenceAssetsDir)
  : process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY ? createSupabasePrivateEvidenceStorage(storageConfig) : null;
const interviewStorage = dbMode === "local" ? createLocalPrivateInterviewStorage(path.join(assetsDir, "family-interviews"))
  : process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY ? createSupabasePrivateInterviewStorage(storageConfig) : null;
const logoStorage = dbMode === "local" ? null
  : process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY ? createSupabasePrivateLogoStorage(storageConfig) : null;
const ordinaryStorage = dbMode === "local" ? evidenceStorage : process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY
  ? createSupabasePrivateObservationStorage(storageConfig) : null;
const documentArtifactStorage = dbMode === "local"
  ? createLocalPrivateDocumentArtifactStorage(path.join(assetsDir,"document-artifacts"))
  : process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY
    ? createSupabasePrivateDocumentArtifactStorage(storageConfig) : null;
const curricularReviewEnabled = process.env.AYNI_CURRICULAR_REVIEW === "1";
const testAuthWithPglite = process.env.NODE_ENV === "test" && process.env.AYNI_TEST_AUTH_PGLITE === "1";
if ((authMode === "local") !== (dbMode === "local") && !testAuthWithPglite) {
  throw new Error("Usa Auth local con PGlite o Auth Supabase con PostgreSQL.");
}
if (process.env.NODE_ENV === "production" && authMode === "local") throw new Error("El modo local de identidad no está disponible en producción.");
const listenHost = process.env.AYNI_API_HOST ?? "127.0.0.1";
if (authMode === "local" && !["127.0.0.1", "localhost", "::1"].includes(listenHost)) {
  throw new Error("El modo local de identidad solo puede escuchar en este equipo.");
}
const localTeacherId = authMode === "local" ? (process.env.AYNI_LOCAL_TEACHER_ID || "00000000-0000-4000-8000-000000000001") : undefined;
const requestAuth = createRequestAuth({ mode: authMode, localTeacherId,
  supabaseUrl: process.env.AYNI_SUPABASE_URL,
  publishableKey: process.env.AYNI_SUPABASE_PUBLISHABLE_KEY,
  dniPepper: process.env.AYNI_DNI_LOGIN_PEPPER,
  dniAliasDomain: process.env.AYNI_DNI_ALIAS_DOMAIN,
  sessionSigningKey: process.env.AYNI_SESSION_SIGNING_KEY,
  secureCookie: process.env.AYNI_AUTH_COOKIE_SECURE !== "0" });
const corsMethods = "GET,POST,PUT,OPTIONS";
const allowedOrigins = new Set([
  ...(authMode === "local" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
  ...(process.env.AYNI_ALLOWED_ORIGIN ? [process.env.AYNI_ALLOWED_ORIGIN] : []),
]);
const exportTables = [
  "profiles", "curriculum_source_documents", "curriculum_versions", "levels", "cycles", "age_grades", "curriculum_areas",
  "competencies", "capacities", "standards", "performances", "transversal_approaches", "school_years", "classrooms",
  "institution_assets", "institution_profiles", "students", "learning_experiences", "ai_usage_events",
  "activities", "activity_criteria", "evidences", "ordinary_observations", "ordinary_observation_revisions", "ordinary_observation_attributions", "ordinary_observation_criterion_links", "competency_observation_guides",
  "document_templates", "document_versions", "diagnostic_sessions",
  "diagnostic_entries", "observation_references", "student_observations", "diagnostic_experience_observations", "diagnostic_spontaneous_observations", "student_family_interviews", "student_family_interview_attachments", "diagnostic_competency_reviews", "diagnostic_student_reviews", "diagnostic_group_reviews", "diagnostic_priority_reviews",
  "class_schedule_entries", "daily_execution_logs", "attendance_records", "calendar_exceptions", "calendar_blocks", "initial_stages", "project_slots", "school_calendar_versions", "school_calendar_holidays", "school_calendar_days", "classroom_calendar_overrides", "project_calendar_selections", "project_instructional_dates", "activity_schedule_changes", "evaluation_periods", "period_competency_scope", "period_closures", "period_closure_versions", "period_evaluation_map_versions", "period_evaluation_map_entries", "competency_display_labels", "classroom_period_reports", "period_closure_workflows", "student_context_snapshots", "annual_plans", "annual_plan_formal_content", "annual_plan_competencies", "annual_plan_changes", "competency_assessments", "competency_descriptive_conclusions", "family_reports",
];

if (dbMode === "local") {
  await mkdir(path.dirname(dataDir), { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await mkdir(evidenceAssetsDir, { recursive: true });
}
const database = await createDatabase({ mode: dbMode, dataDir, connectionString: process.env.SUPABASE_DB_URL });
const requestDatabaseScope = new AsyncLocalStorage();
const db = new Proxy(database.db, {
  get(target, property) {
    const active = requestDatabaseScope.getStore() ?? target;
    const value = active[property];
    return typeof value === "function" ? value.bind(active) : value;
  },
});
if (dbMode === "local") await migrate();
else {
  const schema = (await db.query(`select to_regclass('public.profiles') as profiles,
    to_regclass('public.ai_pending_generations') as generations,
    to_regclass('public.period_closure_versions') as closures,
    to_regclass('public.ai_usage_events') as usage_events`)).rows[0];
  if (!schema?.profiles || !schema.generations || !schema.closures || !schema.usage_events) {
    await database.close();
    throw new Error("Faltan migraciones Supabase; aplícalas antes de iniciar Ayni.");
  }
  const permission = (await db.query(`select has_table_privilege(current_user, 'public.profiles', 'INSERT') as backend_writes,
    has_table_privilege(current_user, 'public.ai_usage_events', 'INSERT') as usage_writes`)).rows[0];
  if (!permission?.backend_writes || !permission.usage_writes) {
    await database.close();
    throw new Error("La conexión PostgreSQL del backend necesita permiso de escritura.");
  }
  if (process.env.AYNI_ORDINARY_OBSERVATIONS === "1") {
    const rawSchema = (await db.query(`select to_regclass('public.ordinary_observations') as observations,
      to_regclass('public.ordinary_observation_revisions') as revisions`)).rows[0];
    if (!rawSchema?.observations || !rawSchema?.revisions) {
      await database.close();
      throw new Error("Faltan migraciones F5 de observaciones; la captura nueva no puede iniciar.");
    }
    if (curricularReviewEnabled && !(await db.query(`select to_regclass('public.ordinary_observation_attributions') as attributions`)).rows[0]?.attributions) {
      await database.close();
      throw new Error("Falta la migración F6 de atribuciones; la revisión curricular no puede iniciar.");
    }
  }
}
const pendingAIGenerations = createPendingAIGenerationsStore(db);
await pendingAIGenerations.pruneExpired();
let diagnosticClassificationQueue = Promise.resolve();
const diagnosticClassificationInFlight = new Set();
const jevCompetencySuggester = jevFeatureEnabled("competencies") ? createJevCompetencySuggester() : null;
const observationV24Active = observationV24Enabled();
let observationV24ClassifierPromise;
const observationV24Classifier = { classify: async (input) => {
  observationV24ClassifierPromise ??= createObservationV24Classifier();
  return (await observationV24ClassifierPromise).classify(input);
} };
const jevProjectImageEnabled = jevFeatureEnabled("project_image");
function queueDiagnosticClassification(id, studentId, teacherId) {
  if (!observationV24Active) return;
  if (diagnosticClassificationInFlight.has(id)) return;
  diagnosticClassificationInFlight.add(id);
  diagnosticClassificationQueue = diagnosticClassificationQueue.then(() => withAiUsageContext({ teacherId, db }, async () => {
    try {
      await suggestSpontaneousV24(db, teacherId, id, observationV24Classifier);
      await refreshStudentContextSnapshot(db, studentId);
    } catch {
      await markSpontaneousNeedsReview(db, teacherId, id).catch(() => {});
      recordOperationalEvent("diagnostic_classification_failed", { workflow: "diagnostic" });
    } finally { diagnosticClassificationInFlight.delete(id); }
  }));
  return diagnosticClassificationQueue;
}
const pendingDiagnosticRows = observationV24Active && authMode === "local" ? (await db.query(`select o.id,o.student_id from diagnostic_spontaneous_observations o
  join classrooms c on c.id=o.classroom_id where c.teacher_id=$1 and o.classification_status='pending'
  and o.classifier_version='CURRENT_V2_4_RAW'
  order by o.observed_at,o.id`, [localTeacherId])).rows : [];
for (const row of pendingDiagnosticRows) queueDiagnosticClassification(row.id, row.student_id, localTeacherId);

const ordinarySuggestionInFlight = new Set();
async function suggestOrdinaryObservation(teacherId, observationId) {
  const { observation, latest } = await ordinaryAttributionHistory(db, teacherId, observationId);
  if (["confirmed", "unclassified"].includes(latest?.state) && latest.raw_revision === observation.source_revision) return latest;
  const kb = await loadKnowledgeBaseV4();
  const conditions = { castellanoL2Applicable: observation.castellano_l2_applicable === true,
    religionApplicable: observation.religion_applicable === true };
  const applicable = kb.competencyCards.filter(card =>
    competencyApplicability(card, observation.age, conditions).planning_available);
  const allowedIds = applicable.map(card => card.id);
  const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`,
    [observation.classroom_id])).rows.flatMap(row => [row.first_name,row.last_name,row.preferred_name]).filter(Boolean);
  const anonymousText = observation.status === "voided" ? null : anonymousDecisionText(observation.effective_text, names);
  if (!anonymousText || !jevCompetencySuggester) {
    if (observation.captured_criterion_id) return latest;
    return recordOrdinarySuggestion(db, teacherId, observationId, { expectedVersion: latest?.version ?? 0,
      allowedIds, unavailable: true, provenance: { reason: anonymousText ? "jev_unavailable" : "privacy_or_text_blocked" } });
  }
  const options = buildClassifierOptions(applicable, observation.age, allowedIds);
  const decision = await withAiUsageContext({ teacherId, db }, () =>
    jevCompetencySuggester.classify({ observation: anonymousText, age: observation.age, options }));
  return recordOrdinarySuggestion(db, teacherId, observationId, { expectedVersion: latest?.version ?? 0,
    candidateIds: decision.candidate_ids, allowedIds,
    provenance: { source: "jev", kb_version: kb.version, decision_metadata: decision.decision_metadata ?? null } });
}
function queueOrdinarySuggestion(teacherId, observationId) {
  if (ordinarySuggestionInFlight.has(observationId)) return Promise.resolve();
  ordinarySuggestionInFlight.add(observationId);
  const work = async () => {
    try { await suggestOrdinaryObservation(teacherId, observationId); }
    catch { recordOperationalEvent("ordinary_suggestion_failed", { workflow: "ordinary_observation" }); }
    finally { ordinarySuggestionInFlight.delete(observationId); }
  };
  if (process.env.AYNI_SERVERLESS === "1") return work();
  setImmediate(work);
}

async function migrate() {
  await db.exec(`create table if not exists local_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await db.query("select 1 from local_schema_migrations where version = $1", [file]);
    if (applied.rows.length) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await db.exec("begin");
    try {
      await db.exec(sql);
      await db.query("insert into local_schema_migrations(version) values ($1)", [file]);
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
}

function send(response, status, payload, origin, extraHeaders = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": corsMethods,
    "access-control-allow-headers": "content-type, authorization",
  };
  if (origin && allowedOrigins.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
    headers.vary = "Origin";
  }
  Object.assign(headers, extraHeaders);
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

function sendAsset(response, status, body, mimeType, origin, cacheControl = "private, max-age=60") {
  const headers = {
    "content-type": mimeType,
    "cache-control": response.hasHeader("set-cookie") ? "private, no-store" : cacheControl,
    "x-content-type-options": "nosniff",
  };
  if (origin && allowedOrigins.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
    headers.vary = "Origin";
  }
  response.writeHead(status, headers);
  response.end(body);
}

function cleanText(value, maximum = 200) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

const parsedBodies = new WeakMap();
function readJson(request) {
  if (!parsedBodies.has(request)) parsedBodies.set(request, (async () => {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 11_000_000) throw new Error("El contenido excede el límite permitido.");
    }
    return JSON.parse(body || "{}");
  })());
  return parsedBodies.get(request);
}

async function decodePrivateMedia(value) {
  if (!value) return null;
  const mimeType = value.mimeType;
  const audio = AUDIO_MIME_TYPES.has(mimeType);
  if (!audio && !["image/jpeg", "image/png", "image/webp"].includes(mimeType))
    throw new TypeError("Usa una foto JPEG, PNG o WebP, o un audio WebM, MP3, M4A, WAV u OGG.");
  const encoded = value.base64;
  if (typeof encoded !== "string" || encoded.length > 10_700_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new TypeError("El archivo no tiene un formato válido.");
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > (audio ? 8_000_000 : 3_000_000))
    throw new TypeError(audio ? "El audio debe pesar como máximo 8 MB." : "La foto debe pesar como máximo 3 MB.");
  if (audio) await validateShortAudio(bytes, mimeType);
  return { bytes, mimeType, audio };
}

async function handleAuthenticatedRequest({ teacherId, requestId, db }, request, response) {
async function dashboard() {
  const classroomResult = await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId]);
  const classroomId = classroomResult.rows[0]?.id;
  if (!classroomId) return null;
  const v4CompetencyNames = new Map((await loadKnowledgeBaseV4()).competencyCards.map((card) => [card.id, card.official_name]));
  const normalizeCriteria = (criteria = []) => criteria.map((criterion) => ({ ...criterion, competency_text: criterion.competency_text ?? v4CompetencyNames.get(criterion.competency_v4_id) ?? criterion.competency_v4_id ?? "Competencia curricular" }));
  const activityResult = await db.query(`
    select a.id, a.title, a.purpose, a.occurs_on, e.title as experience_title,
           coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'criterion_text', c.criterion_text,
             'competency_id', c.competency_id, 'competency_v4_id', c.competency_v4_id, 'competency_text', co.official_text,
             'performance_id', c.performance_id, 'evidence_kind', c.evidence_kind, 'details', c.details) order by c.display_order) filter (where c.id is not null), '[]'::jsonb) as criteria
      from activities a
      join learning_experiences e on e.id = a.experience_id
      left join activity_criteria c on c.activity_id = a.id and c.status = 'active'
      left join competencies co on co.id = c.competency_id
     where a.status = 'active' and e.classroom_id = $1
     group by a.id, e.title
     order by a.occurs_on desc
     limit 1
  `, [classroomId]);
  const studentsResult = await db.query(`
    select s.id, coalesce(s.preferred_name, s.first_name) as name,
           concat_ws(' ', coalesce(s.preferred_name, s.first_name), s.last_name) as full_name,
           coalesce(records.evidence_count, 0)::int as evidence_count,
           coalesce(records.competency_count, 0)::int as competency_count,
           records.last_observed_at
      from students s
      left join lateral (
        select count(*)::int as evidence_count,
               count(distinct ac.competency_v4_id)::int as competency_count,
               max(ev.observed_at) as last_observed_at
          from evidences ev
          left join activity_criteria ac on ac.id = ev.criterion_id
         where ev.student_id = s.id
      ) records on true
     where s.classroom_id = $1 and s.status = 'active'
     order by coalesce(s.preferred_name, s.first_name)
  `, [classroomId]);
  const metricsResult = await db.query(`
    select
      (select count(*)::int from students where classroom_id=$1 and status = 'active') as students_total,
      (select count(*)::int from evidences ev join students s on s.id=ev.student_id where s.classroom_id=$1 and ev.observed_at >= now() - interval '7 days') as evidences_week,
      (select count(distinct ev.student_id)::int from evidences ev join students s on s.id=ev.student_id where s.classroom_id=$1) as students_observed
  `, [classroomId]);
  const profileResult = await db.query(`
    select p.display_name as teacher_name, ip.display_name as institution_name,
           ip.institution_code, ip.district, ip.ugel, ip.director_name,
           ip.logo_asset_id, c.section, ag.label as age_label, ag.age_years,
           ia.original_path as logo_path, sy.year as school_year
      from profiles p
      join classrooms c on c.teacher_id = p.user_id
      join school_years sy on sy.id = c.school_year_id
      join age_grades ag on ag.id = c.age_grade_id
      left join institution_profiles ip on ip.owner_user_id = p.user_id
      left join institution_assets ia on ia.id = ip.logo_asset_id
     where p.user_id = $1 and c.id=$2
     limit 1
  `, [teacherId, classroomId]);
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const today = qaDailyClock?.date ?? dateFormatter.format(new Date());
  const now = qaDailyClock?.time ?? timeFormatter.format(new Date());
  const attendanceResult = await db.query(`
    select count(*)::int as recorded_count from attendance_records
     where classroom_id = $1 and attendance_date = $2::date
  `, [classroomId, today]);
  const exceptionResult = await db.query(`
    select type, label, is_instructional from calendar_exceptions
     where classroom_id = $1 and exception_date = $2::date limit 1
  `, [classroomId, today]);
  let effectiveCalendarDay=null;
  try{effectiveCalendarDay=(await loadEffectiveCalendar(db,{teacherId,classroomId,from:today,to:today})).days[0]??null;}catch{}
  const todayBlocks = await db.query(`
    select se.id, se.start_time::text, se.end_time::text, se.block_type, coalesce(se.title, a.title) as title,
           se.activity_id, a.purpose, a.details as activity_details, le.title as experience_title,
           coalesce(criteria.criteria, '[]'::jsonb) as criteria,
           coalesce(a.preparation->'materials', '[]'::jsonb) as materials, coalesce(a.preparation->'steps', '[]'::jsonb) as steps,
           coalesce(del.status, 'planned') as status, coalesce(del.current_override, false) as current_override,
           least(coalesce(del.current_step_index, 0), greatest(coalesce(jsonb_array_length(a.preparation->'steps'), 0) - 1, 0))::int as current_step_index,
           del.closure_type, del.teacher_closure_note
      from class_schedule_entries se
      join classrooms cl on cl.id = se.classroom_id
      left join activities a on a.id = se.activity_id and a.status in ('active','archived')
      left join learning_experiences le on le.id = a.experience_id
      left join lateral (
        select jsonb_agg(jsonb_build_object('id', ac.id, 'criterion_text', ac.criterion_text,
          'competency_id', ac.competency_id, 'competency_v4_id', ac.competency_v4_id, 'competency_text', co.official_text,
          'performance_id', ac.performance_id, 'evidence_kind', ac.evidence_kind, 'details', ac.details) order by ac.display_order) as criteria
        from activity_criteria ac left join competencies co on co.id = ac.competency_id
        where ac.activity_id = a.id and ac.status = 'active'
      ) criteria on true
      left join daily_execution_logs del on del.schedule_entry_id = se.id and del.execution_date = $2::date
     where cl.teacher_id = $1 and (se.scheduled_on = $2::date or (se.scheduled_on is null and se.weekday = extract(dow from $2::date)))
       and not (se.scheduled_on is null and se.block_type='workshop' and exists (
         select 1 from class_schedule_entries exact where exact.classroom_id=se.classroom_id
           and exact.scheduled_on=$2::date and exact.block_type='workshop'))
     order by se.start_time, se.sort_order
  `, [teacherId, today]);
  const rawBlocks = todayBlocks.rows.map((block) => ({ ...block, materials: block.materials ?? [], steps: block.steps ?? [], criteria: normalizeCriteria(block.criteria ?? []) }));
  const attendanceRecorded = Number(attendanceResult.rows[0]?.recorded_count ?? 0) > 0;
  const legacyException=exceptionResult.rows[0]??null;
  const calendarException=legacyException??(effectiveCalendarDay&&!effectiveCalendarDay.is_instructional?{
    type:effectiveCalendarDay.calendar_type,label:effectiveCalendarDay.reason,is_instructional:false}:null);
  const journey = resolveDailyState({ now, scheduleEntries: rawBlocks, attendanceRecorded, calendarException });
  const blocks = rawBlocks.map((block) => ({
    ...block,
    display_status: block.id === journey.currentBlock?.id ? "active" : block.status === "planned" && now >= block.end_time.slice(0, 5) ? "ready_to_close" : block.status,
  }));

  return {
    classroom_id: classroomId,
    activity: activityResult.rows[0] ? { ...activityResult.rows[0], criteria: normalizeCriteria(activityResult.rows[0].criteria ?? []) } : null,
    today: {
      date: today, now, ...(qaDailyClock ? { qa_clock: qaDailyClock } : {}), blocks, attendance: { recorded: attendanceRecorded, recorded_count: Number(attendanceResult.rows[0]?.recorded_count ?? 0) },
      calendar_exception: calendarException,
      journey: { mode: journey.mode, current_block_id: journey.currentBlock?.id ?? null, next_block_id: journey.nextBlock?.id ?? null, primary_action: journey.primaryAction, pending_items: journey.pendingItems },
    },
    students: studentsResult.rows.map((student) => ({ ...student, name: displayPersonName(student.name), full_name: displayPersonName(student.full_name) })),
    metrics: metricsResult.rows[0],
    profile: profileResult.rows[0] ? {
      ...profileResult.rows[0],
      logo_url: profileResult.rows[0].logo_asset_id
        ? `http://127.0.0.1:${port}/api/assets/${profileResult.rows[0].logo_asset_id}`
        : null,
    } : null,
  };
}

async function studentProfile(studentId) {
  const allowed = await db.query(`
    select s.id from students s join classrooms c on c.id = s.classroom_id
     where s.id = $1 and c.teacher_id = $2
  `, [studentId, teacherId]);
  if (!allowed.rows.length) return null;
  const context = await buildStudentPedagogicalContext(db, studentId);
  const birthDate = (await db.query(`select birth_date::text as birth_date from students where id=$1`, [studentId])).rows[0]?.birth_date ?? null;
  const snapshot = (await db.query(`select generated_at, source_updated_at from student_context_snapshots
    where student_id = $1 and version = 1`, [studentId])).rows[0] ?? null;
  return { ...context, student: { ...context.student, name: displayPersonName(context.student.name),
    first_name: displayPersonName(context.student.first_name), last_name: displayPersonName(context.student.last_name), birth_date: birthDate }, snapshot };
}

async function activeClassroomForActivityGeneration() {
  return (await db.query(`select c.id, c.section, ag.age_years as age
    from classrooms c join age_grades ag on ag.id = c.age_grade_id
    where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0] ?? null;
}


async function annualCalendarForClassroom(row) {
  let blocks = (await db.query(`select id,type,label,start_date,end_date,editable,sort_order from calendar_blocks where school_year_id=$1 order by sort_order`, [row.school_year_id])).rows;
  if (!blocks.length && Number(row.year) === 2026) {
    for (const block of nationalCalendarBlocks2026()) {
      await db.query(`insert into calendar_blocks(id,school_year_id,type,label,start_date,end_date,editable,sort_order)
        values($1,$2,$3,$4,$5::date,$6::date,true,$7) on conflict(school_year_id,sort_order) do nothing`,
      [randomUUID(), row.school_year_id, block.type, block.label, block.start_date, block.end_date, block.sort_order]);
    }
    blocks = (await db.query(`select id,type,label,start_date,end_date,editable,sort_order from calendar_blocks where school_year_id=$1 order by sort_order`, [row.school_year_id])).rows;
  }
  let stage = (await db.query(`select id,name,duration_weeks,purpose,suggested_experiences,what_to_observe,family_actions,diagnostic_focus,teacher_notes
    from initial_stages where school_year_id=$1`, [row.school_year_id])).rows[0];
  if (!stage && Number(row.year) === 2026) {
    const value = defaultInitialStage();
    await db.query(`insert into initial_stages(id,school_year_id,name,duration_weeks,purpose,suggested_experiences,what_to_observe,family_actions,diagnostic_focus,teacher_notes)
      values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10) on conflict(school_year_id) do nothing`,
    [randomUUID(), row.school_year_id, value.name, value.duration_weeks, value.purpose, JSON.stringify(value.suggested_experiences),
      JSON.stringify(value.what_to_observe), JSON.stringify(value.family_actions), JSON.stringify(value.diagnostic_focus), value.teacher_notes]);
    stage = (await db.query(`select id,name,duration_weeks,purpose,suggested_experiences,what_to_observe,family_actions,diagnostic_focus,teacher_notes
      from initial_stages where school_year_id=$1`, [row.school_year_id])).rows[0];
  }
  const exceptions = (await db.query(`select exception_date,type,label,is_instructional from calendar_exceptions where classroom_id=$1 order by exception_date`, [row.id])).rows;
  const datedExceptions = exceptions.map((item) => ({ ...item, exception_date: annualCalendarDay(item.exception_date) }));
  const customDates = new Set(datedExceptions.map((item) => item.exception_date));
  const defaultHolidays = Number(row.year) === 2026 ? nationalSchoolHolidays2026().filter((item) => !customDates.has(item.exception_date)) : [];
  return { school_year: row.year, starts_on: annualCalendarDay(row.starts_on), ends_on: annualCalendarDay(row.ends_on),
    blocks: blocks.map((block) => ({ ...block, start_date: annualCalendarDay(block.start_date), end_date: annualCalendarDay(block.end_date) })),
    initial_stage: stage ?? null,
    exceptions: [...defaultHolidays, ...datedExceptions].sort((a, b) => a.exception_date.localeCompare(b.exception_date)) };
}

async function replaceAnnualProjectSlots(planId, schedule, runner = db) {
  return persistAnnualProjectSlots(runner, planId, schedule);
}

async function annualPlanningContext() {
  const row = (await db.query(`select c.id, c.section, c.context, c.castellano_l2_applicable, c.religion_applicable, ag.age_years as age, sy.id as school_year_id, sy.year, sy.starts_on, sy.ends_on, sy.annual_planning_context, cv.id as curriculum_version_id,
      p.display_name as teacher_name, coalesce(ip.display_name,c.institution_name) as institution_name, ip.institution_code, ip.district, ip.ugel
    from classrooms c join age_grades ag on ag.id=c.age_grade_id join school_years sy on sy.id=c.school_year_id join profiles p on p.user_id=c.teacher_id join curriculum_versions cv on cv.active=true left join institution_profiles ip on ip.owner_user_id=c.teacher_id
    where c.teacher_id=$1 and sy.owner_id=$1 and c.status='active' limit 1`, [teacherId])).rows[0];
  if (!row) return null;
  await ensureSchoolCalendar(db,row.school_year_id);
  const group = (await db.query(`select id,version,details from diagnostic_group_reviews where classroom_id=$1 and status='confirmed' order by version desc limit 1`, [row.id])).rows[0];
  const priorityReview = group ? (await db.query(`select id,details from diagnostic_priority_reviews
    where classroom_id=$1 and group_review_id=$2 and status='confirmed' order by version desc limit 1`,
  [row.id, group.id])).rows[0] : null;
  const studentNames = group ? (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [row.id])).rows
    .flatMap((item) => [item.first_name, item.last_name, item.preferred_name, [item.first_name, item.last_name].filter(Boolean).join(" ")]).filter(Boolean) : [];
  const contextV4 = publicClassroomContext(await getCurrentClassroomContext(db, teacherId, row.id));
  const groupSummary = group ? diagnosticPlanningSummary(group.details, studentNames) : null;
  const diagnostic_group = group ? {
    ...Object.fromEntries(["strengths", "needs", "planning_priorities"]
      .map((field) => [field, diagnosticPlanningSummary({ [field]: group.details?.[field] }, studentNames) ?? ""])),
    competency_priorities: priorityReview?.details?.priorities?.flatMap((item) => item.related_competency_ids.map((competency_id) => ({
      competency_id, emphasis: item.importance === "higher" ? "prioritize" : item.importance === "observe_more" ? "observe_more" : "maintain", reason: item.reason,
    }))) ?? group.details?.competency_priorities ?? [],
  } : null;
  const startDay = annualCalendarDay(row.starts_on);
  const endDay = annualCalendarDay(row.ends_on);
  return { ...row, starts_on: startDay, ends_on: endDay,
    calendar: await annualCalendarForClassroom(row), group_context: neutralizeAssessmentText((typeof row.context === "string" ? row.context : row.context?.group_context) || `Aula ${row.section} de ${row.age} años`, studentNames), school_context: row.institution_name || undefined, available_resources: Array.isArray(row.context?.available_resources) ? row.context.available_resources.filter((item) => typeof item === "string" && item.trim()).map((item) => neutralizeAssessmentText(item, studentNames)) : [], diagnostic_summary: groupSummary || undefined, diagnostic_group, confirmed_priorities: priorityReview?.details?.priorities ?? [], source_diagnostic_review_id: group?.id ?? null, source_priority_review_id: priorityReview?.id ?? null, annual_planning_context: row.annual_planning_context ?? {}, language_context: row.castellano_l2_applicable ? { castellano_l2_applicable: true } : undefined, context_v4: contextV4 };
}
function annualDocumentContext(context) {
  return { template_version: "annual-unified-v1",
    source_diagnostic_review_id: context.source_diagnostic_review_id ?? null,
    source_priority_review_id: context.source_priority_review_id ?? null,
    source_context_fingerprint: context.context_v4?.source_fingerprint ?? null,
    institution_name: context.institution_name ?? "", institution_code: context.institution_code ?? "",
    district: context.district ?? "", ugel: context.ugel ?? "", teacher_name: context.teacher_name ?? "",
    classroom_section: context.section ?? "", age: context.age, school_year: context.year,
    starts_on: context.starts_on, ends_on: context.ends_on,
    student_count: context.context_v4?.students_total ?? null,
    diagnostic_group: context.diagnostic_group ?? null,
    group_interests: (context.context_v4?.common_interests ?? []).map((item) => item.label),
    calendar: context.calendar ? { ...context.calendar, initial_stage: context.calendar.initial_stage
      ? { ...context.calendar.initial_stage, teacher_notes: "" } : null } : null,
  };
}
async function activityGenerationOptions() {
  return competencyOptionsForWorkflow("activity");
}
async function competencyOptionsForWorkflow(workflow) {
  const classroom = await annualPlanningContext();
  if (!classroom || !["annual_plan", "project", "unit", "activity"].includes(workflow)) return { age: null, competencies: [] };
  const knowledgeBase = await loadKnowledgeBaseV4();
  const age = String(classroom.age);
  const applicability = { castellanoL2Applicable: classroom.castellano_l2_applicable === true, religionApplicable: classroom.religion_applicable === true };
  return { age: classroom.age, competencies: knowledgeBase.competencyCards
    .filter((card) => competencyApplicability(card, age, applicability).planning_available)
    .map((card) => ({ id: card.id, name: card.official_name,
      has_age_performance: competencyApplicability(card, age, applicability).has_age_performance,
      reference_kind: competencyApplicability(card, age, applicability).reference_kind })) };
}
async function applicableCompetencyIds(workflow, classroom) {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const applicability = { castellanoL2Applicable: classroom.castellano_l2_applicable === true, religionApplicable: classroom.religion_applicable === true };
  return new Set(knowledgeBase.competencyCards.filter((card) => competencyApplicability(card, classroom.age, applicability).planning_available).map((card) => card.id));
}
function validateExperienceDates(body, context) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startsOn ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(body.endsOn ?? "") || body.startsOn > body.endsOn || body.startsOn < context.starts_on || body.endsOn > context.ends_on) throw new Error("Las fechas deben estar dentro del año escolar y en orden válido.");
}
async function activeLearningExperience(id, classroomId) {
  return (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='active' and type in ('project','unit')`, [id, classroomId])).rows[0] ?? null;
}
async function existingLearningExperience(id, classroomId) {
  return (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status in ('active','archived') and type in ('project','unit')`, [id, classroomId])).rows[0] ?? null;
}
async function activityParentContext(experience) {
  const prior = (await db.query(`select occurs_on,title,purpose,details->>'closure_or_continuity' as closure_or_continuity from activities where experience_id=$1 and status='active' order by occurs_on desc limit 5`, [experience.id])).rows;
  return publicActivityParent(experience, prior);
}
async function activityAllowedCompetencies(experience, classroom) {
  const parentIds = new Set([...(experience.details?.primary_competency_ids ?? []), ...(experience.details?.possible_secondary_competency_ids ?? [])]);
  const applicable = await applicableCompetencyIds("activity", classroom);
  return new Set([...parentIds].filter((id) => applicable.has(id)));
}
function persistInheritedActivity(activity, details, experience) {
  const enabled = activity.details?.activity_contract?.contract_version === "activity-v3" ||
    (inheritedActivityEnabled() && experience.details?.contract_version === "project-master-v3");
  if (enabled) return stampActivityV3(activity, details, experience);
  if (details.activity_contract) throw new Error("La actividad no puede declarar un contrato V3 por sí misma.");
  if (details.additional_criteria?.length) throw new Error("Los criterios adicionales requieren una actividad V3 heredada.");
  return details;
}
async function validateStoredActivityCriterion(current, classroom) {
  const competencyId = current.activity_details?.competency_id;
  if (current.activity_details?.competency_status !== "confirmed" || !competencyId || current.competency_v4_id !== competencyId) {
    throw new Error("El criterio ya no corresponde a esta actividad.");
  }
  const allowed = await activityAllowedCompetencies({ details: current.parent_details }, classroom);
  if (!allowed.has(competencyId)) throw new Error("El criterio ya no corresponde a esta actividad.");
}
function validateActivityDate(occursOn, experience, classroom) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occursOn ?? "") || occursOn < annualCalendarDay(experience.starts_on) || occursOn > annualCalendarDay(experience.ends_on) || occursOn < annualCalendarDay(classroom.starts_on) || occursOn > annualCalendarDay(classroom.ends_on)) throw new Error("La fecha debe estar dentro de la experiencia y del año escolar.");
}

async function diagnosticWorkspace() {
  const experienceWorkspace = await loadDiagnosticExperienceWorkspace(db, teacherId);
  const { classroom } = experienceWorkspace;
  const guides = (await db.query(`
    select g.id, g.competency_id, g.short_meaning, g.suggested_contexts,
           g.observe_for, g.suggested_actions, g.caution_text,
           c.official_text as competency_text, ca.name as area_name
      from competency_observation_guides g
      join competencies c on c.id = g.competency_id
      join curriculum_areas ca on ca.id = c.area_id
     where g.age = $1 and g.is_active = true
     order by ca.name, c.official_text
  `, [classroom.age_years])).rows;
  const references = (await db.query(`
    select r.id, r.guide_id, r.short_observable_text, r.performance_ids,
           r.evidence_recommendation, r.sort_order, g.competency_id,
           bool_and(p.source_ref <> 'seed-local-no-oficial') as official_verified
      from observation_references r
      join competency_observation_guides g on g.id = r.guide_id
      join lateral jsonb_array_elements_text(r.performance_ids) pid on true
      join performances p on p.id = pid.value::uuid and p.competency_id = g.competency_id
     where r.is_active = true and r.reviewed_at is not null
       and g.is_active = true and g.age = $1 and p.age_grade_id = (
         select id from age_grades where age_years = $1 limit 1
       )
     group by r.id, g.competency_id
     having count(*) = jsonb_array_length(r.performance_ids)
     order by r.sort_order
  `, [classroom.age_years])).rows;
  const sessionResult = await db.query(`
    select id, title, status, started_at from diagnostic_sessions
     where classroom_id = $1
     order by started_at desc limit 1
  `, [classroom.id]);
  const session = sessionResult.rows[0] ?? null;
  const reviewed = (await db.query(`select exists(select 1 from diagnostic_sessions where classroom_id = $1 and status = 'completed') as reviewed`, [classroom.id])).rows[0].reviewed;
  const entries = session ? (await db.query(`
    select de.id, de.student_id, de.competency_id, de.observation_context,
           de.observation_text, de.teacher_interpretation,
           de.teacher_confirmed, de.status, de.updated_at
      from diagnostic_entries de where de.session_id = $1
  `, [session.id])).rows : [];
  const observations = session ? (await db.query(`
    select so.id, so.diagnostic_entry_id, so.reference_id, so.status,
           so.note, so.observed_at, de.student_id, de.competency_id
      from student_observations so
      join diagnostic_entries de on de.id = so.diagnostic_entry_id
     where de.session_id = $1
  `, [session.id])).rows : [];
  const step_progress = await diagnosticStepProgressForTeacher(db, teacherId);
  return { ...experienceWorkspace, guides, references, session, reviewed, entries, observations, step_progress };
}

const handleAssessmentMasterRoute = createAssessmentMasterRouteHandler({ db, teacherId, annualPlanningContext, readJson, send, pending: pendingAIGenerations, metadataForAudit: safeAnnualGenerationMetadata });
const handleAssessmentRoute = createAssessmentRouteHandler({ db, annualPlanningContext, readJson, send, pending: pendingAIGenerations, metadataForAudit: safeAnnualGenerationMetadata, refreshStudentContext: refreshStudentContextSnapshot });
const handleDescriptiveConclusionRoute = createDescriptiveConclusionRouteHandler({ db, annualPlanningContext, readJson, send, pending: pendingAIGenerations, metadataForAudit: safeAnnualGenerationMetadata, refreshStudentContext: refreshStudentContextSnapshot });
const handleFamilyReportRoute = createFamilyReportRouteHandler({ db, teacherId, annualPlanningContext, readJson, send, pending: pendingAIGenerations, metadataForAudit: safeAnnualGenerationMetadata });
const handlePeriodEvaluationRoute = createPeriodEvaluationRouteHandler({ db, teacherId, evidenceStorage, mediaAvailable: Boolean(evidenceStorage), readJson, send, pending: pendingAIGenerations, metadataForAudit: safeAnnualGenerationMetadata, refreshStudentContext: refreshStudentContextSnapshot });
const handleWorkshopRoute = createWorkshopRouteHandler({ db, teacherId, readJson, send });
{
  const origin = request.headers.origin;
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (origin && !allowedOrigins.has(origin)) {
    send(response, 403, { error: "Origen no permitido." });
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": origin ?? "http://localhost:5173",
      "access-control-allow-methods": corsMethods,
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  try {
    if (request.method === "POST" && url.pathname === "/api/audio/transcribe") {
      try {
        const body = await readJson(request);
        const purpose = body.purpose ?? "observation";
        if (!["observation", "raw_observation", "interview", "teacher_comment", "group_summary"].includes(purpose) ||
          (body.scope !== undefined && body.scope !== "classroom") ||
          (body.scope === "classroom" && (purpose !== "group_summary" || body.studentId || body.classroomId)) ||
          (purpose === "group_summary" && body.scope !== "classroom"))
          throw new TypeError("El propósito de la grabación no es válido.");
        const owned = body.scope === "classroom"
          ? (await db.query(`select id from classrooms where teacher_id=$1 and status='active' limit 1`, [teacherId])).rows[0]
          : (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
            where s.id=$1 and s.status='active' and c.status='active' and c.teacher_id=$2`, [body.studentId,teacherId])).rows[0];
        if (!owned) { send(response, 404, { error: body.scope === "classroom" ? "Aula no encontrada." : "Niño no encontrado." }, origin); return; }
        const media = await decodePrivateMedia(body.audio);
        if (!media?.audio) throw new TypeError("Selecciona un audio de hasta un minuto.");
        const names = purpose === "observation" ? (await db.query(`select s.first_name,s.last_name,s.preferred_name from students s
          join classrooms c on c.id=s.classroom_id where c.teacher_id=$1 and c.status='active'`, [teacherId])).rows
          .flatMap((row) => [row.first_name,row.last_name,row.preferred_name]).filter(Boolean) : [];
        const result = await transcribeAndPolishAudio({ bytes: media.bytes, mimeType: media.mimeType,
          context: body.context, names, purpose });
        send(response, 200, { transcript: result.transcript, improved_text: result.improved_text }, origin);
      } catch (error) {
        recordOperationalEvent("audio_transcription_failed", { requestId, workflow: "audio" });
        send(response, error instanceof TypeError ? 422 : 503,
          { error: error instanceof TypeError ? error.message : "No se pudo transcribir el audio. Puedes escribir la observación." }, origin);
      }
      return;
    }
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { ok: true, engine: dbMode, ...(dbMode === "local" ? { storage: ".local/pgdata" } : {}) }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/pilot/setup") {
      const classroom = (await db.query(`select id from classrooms where teacher_id=$1 and status='active'`, [teacherId])).rows[0];
      send(response, 200, { configured: Boolean(classroom) }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/pilot/setup") {
      try {
        const body = await readJson(request);
        if (!logoStorage && dbMode === "postgres" && (body.logoUpload || body.createLogo)) {
          send(response, 503, { error: "La carga de logos estará disponible al conectar Storage." }, origin);
          return;
        }
        await createPilotClassroom(db, teacherId, body, { assetsDir, logoStorage });
        send(response, 201, { dashboard: await dashboard() }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/students/import") {
      try {
        const body = await readJson(request);
        const rows = body.csv === undefined ? body.students : parseStudentCsv(body.csv);
        const count = await importStudentsForTeacher(db, teacherId, rows);
        send(response, 201, { count, dashboard: await dashboard() }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const current = await dashboard();
      send(response, current ? 200 : 409, current ?? { error: "Configura primero la institución y el aula." }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/teacher/today") {
      const current = await dashboard();
      if (!current) { send(response, 409, { error: "Configura primero el aula." }, origin); return; }
      const pending = curricularReviewEnabled ? (await ordinaryReviewQueue(db, teacherId, current.classroom_id)).length : 0;
      const next = (await db.query(`select se.scheduled_on::text as date,
          coalesce(se.title,a.title) as title, se.activity_id
        from class_schedule_entries se join classrooms c on c.id=se.classroom_id
        left join activities a on a.id=se.activity_id
        where c.id=$1 and c.teacher_id=$2 and se.scheduled_on>$3::date
          and se.activity_id is not null
        order by se.scheduled_on,se.start_time limit 1`, [current.classroom_id, teacherId, current.today.date])).rows[0] ?? null;
      send(response, 200, { date: current.today.date, classroom_id: current.classroom_id,
        pending_observation_count: pending, next_activity: next,
        actions: teacherTodayActions({ pendingObservations: pending, nextActivity: next }) }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/library/resources") {
      send(response, 200, { resources: (await loadLibraryResources()).map(publicLibraryResource) }, origin);
      return;
    }
    if (request.method === "GET" && /^\/api\/library\/resources\/[a-z0-9-]+\/download$/.test(url.pathname)) {
      const id = url.pathname.split("/")[4];
      const resource = (await loadLibraryResources()).find((item) => item.id === id);
      if (!resource) { send(response, 404, { error: "Recurso no disponible." }, origin); return; }
      const bytes = await readFile(resource.download.path);
      const headers = {
        "content-type": resource.download.mimeType,
        "content-disposition": `attachment; filename="${resource.download.filename}"`,
        "content-length": String(bytes.length),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      };
      if (origin && allowedOrigins.has(origin)) {
        headers["access-control-allow-origin"] = origin;
        headers["access-control-allow-credentials"] = "true";
        headers["access-control-expose-headers"] = "content-disposition";
        headers.vary = "Origin";
      }
      response.writeHead(200, headers);
      response.end(bytes);
      return;
    }
    if (request.method === "POST" && /^\/api\/library\/resources\/[a-z0-9-]+\/save-local$/.test(url.pathname)) {
      if (authMode !== "local") { send(response, 404, { error: "Ruta local no disponible." }, origin); return; }
      const id = url.pathname.split("/")[4];
      const resource = (await loadLibraryResources()).find((item) => item.id === id);
      if (!resource) { send(response, 404, { error: "Recurso no disponible." }, origin); return; }
      const saved = await saveLibraryResourceToDownloads(resource, path.join(homedir(), "Downloads"));
      send(response, 200, { filename: saved.filename, folder: "Descargas", alreadyExists: saved.alreadyExists }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/export") {
      if (dbMode !== "local" || origin || process.env.AYNI_ALLOW_LOCAL_EXPORT !== "1") {
        send(response, 403, { error: "Exportación local deshabilitada." }, origin);
        return;
      }
      const tables = {};
      for (const table of exportTables) tables[table] = (await db.query(`select * from ${table}`)).rows;
      send(response, 200, { format: "ayni-supabase-transfer-v1", exportedAt: new Date().toISOString(), tables });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/assets/")) {
      if (dbMode === "postgres" && !logoStorage) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
      const assetId = url.pathname.split("/").at(-1);
      const assetResult = await db.query(`
        select original_path, mime_type from institution_assets
         where id = $1 and owner_user_id = $2 and type = 'logo'
      `, [assetId, teacherId]);
      if (!assetResult.rows.length) {
        send(response, 404, { error: "Logo no encontrado." }, origin);
        return;
      }
      let bytes;
      if (logoStorage) bytes = await logoStorage.read(assetResult.rows[0].original_path, teacherId);
      else {
        const filePath = path.resolve(root, assetResult.rows[0].original_path);
        if (!filePath.startsWith(path.resolve(assetsDir) + path.sep)) {
          send(response, 403, { error: "Ruta de logo no permitida." }, origin);
          return;
        }
        bytes = await readFile(filePath);
      }
      sendAsset(response, 200, bytes, assetResult.rows[0].mime_type, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/profile") {
      const body = await readJson(request);
      if (dbMode === "postgres" && !logoStorage && (body.logoUpload || body.createLogo)) {
        send(response, 503, { error: "La carga de logos estará disponible al conectar Storage." }, origin);
        return;
      }
      const teacherName = cleanText(body.teacherName, 100);
      const institutionName = cleanText(body.institutionName, 200);
      const section = cleanText(body.section, 80);
      if (teacherName.length < 2 || institutionName.length < 2 || section.length < 1) {
        send(response, 400, { error: "Completa docente, institución y sección." }, origin);
        return;
      }
      const classroom = (await db.query("select id from classrooms where teacher_id = $1 and status = 'active' limit 1", [teacherId])).rows[0];
      const institution = (await db.query("select id, logo_asset_id from institution_profiles where owner_user_id = $1", [teacherId])).rows[0];
      let logoAssetId = institution?.logo_asset_id ?? null;
      if (body.createLogo && body.logoUpload) { send(response, 400, { error: "Elige subir un logo o crearlo con iniciales." }, origin); return; }
      let newLogo = null;
      if (body.logoUpload) {
        try {
          const bytes = await normalizeInstitutionLogoUpload(body.logoUpload);
          const id = randomUUID();
          newLogo = { id, bytes, relativePath: `.local/assets/${id}.png`, mimeType: "image/png", width: 384, height: 384 };
          logoAssetId = id;
        } catch (error) { send(response, httpStatusForError(error, 400), { error: publicErrorMessage(error) }, origin); return; }
      }
      if (body.createLogo) {
        const assetId = randomUUID();
        const relativePath = `.local/assets/${assetId}.svg`;
        newLogo = { id: assetId, bytes: buildInstitutionInitialsLogo({ initials: body.logoInitials,
          primary: body.logoPrimary, accent: body.logoAccent }), relativePath, mimeType: "image/svg+xml", width: 512, height: 512 };
        logoAssetId = assetId;
      }
      await db.exec("begin");
      let createdLogoPath = null;
      try {
        if (newLogo) {
          if (logoStorage) {
            createdLogoPath = await logoStorage.save({ teacherId, assetId: newLogo.id,
              mimeType: newLogo.mimeType, bytes: newLogo.bytes });
            newLogo.relativePath = createdLogoPath;
          } else {
            createdLogoPath = path.join(assetsDir, path.basename(newLogo.relativePath));
            await writeFile(createdLogoPath, newLogo.bytes, { flag: "wx", mode: 0o600 });
          }
          await db.query(`insert into institution_assets
            (id, owner_user_id, type, original_path, normalized_path, mime_type, width, height)
            values ($1, $2, 'logo', $3, $3, $4, $5, $6)`, [newLogo.id, teacherId, newLogo.relativePath,
            newLogo.mimeType, newLogo.width, newLogo.height]);
        }
        await db.query("update profiles set display_name = $1, updated_at = now() where user_id = $2", [teacherName, teacherId]);
        await db.query("update classrooms set institution_name = $1, section = $2 where id = $3", [institutionName, section, classroom.id]);
        await db.query(`update institution_profiles set display_name = $1, institution_code = $2,
          district = $3, ugel = $4, director_name = $5, logo_asset_id = $6, updated_at = now()
          where owner_user_id = $7`, [institutionName, cleanText(body.institutionCode, 40) || null,
          cleanText(body.district, 100) || null, cleanText(body.ugel, 100) || null,
          cleanText(body.directorName, 120) || null, logoAssetId, teacherId]);
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        if (createdLogoPath) {
          if (logoStorage) await logoStorage.remove(createdLogoPath, teacherId).catch(() => {});
          else await unlink(createdLogoPath).catch(() => {});
        }
        throw error;
      }
      send(response, 200, { dashboard: await dashboard() }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/diagnostics") {
      send(response, 200, await diagnosticWorkspace(), origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/diagnostics/progress") {
      send(response, 200, await diagnosticProgressForTeacher(db, teacherId), origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/diagnostics/family-interview-status") {
      send(response, 200, await listFamilyInterviewStatuses(db, teacherId), origin);
      return;
    }
    if (url.pathname.startsWith("/api/diagnostics/students/") && url.pathname.includes("/family-interview")) {
      const parts = url.pathname.split("/");
      const studentId = parts[4];
      try {
        if (request.method === "GET" && parts.length === 6) send(response, 200, await loadFamilyInterview(db, teacherId, studentId), origin);
        else if (request.method === "PUT" && parts.length === 6) {
          const saved = await saveFamilyInterview(db, teacherId, studentId, (await readJson(request)).details);
          await refreshStudentContextSnapshot(db, studentId);
          send(response, 200, saved, origin);
        } else if (request.method === "POST" && parts.length === 7 && parts[6] === "save-and-confirm") {
          const saved = await saveAndConfirmFamilyInterview(db, teacherId, studentId, (await readJson(request)).details);
          await refreshStudentContextSnapshot(db, studentId);
          send(response, 200, saved, origin);
        } else if (request.method === "POST" && parts[6] === "confirm") {
          const saved = await confirmFamilyInterview(db, teacherId, studentId);
          await refreshStudentContextSnapshot(db, studentId);
          send(response, 200, saved, origin);
        } else if (request.method === "POST" && parts[6] === "attachment") {
          if (!interviewStorage) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
          const interview = await loadFamilyInterview(db, teacherId, studentId);
          if (!interview.draft && !interview.confirmed) throw new DiagnosticSourceError("invalid_attachment", "Guarda primero la entrevista.");
          const body = await readJson(request);
          if (typeof body.base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64) || body.base64.length > 4_000_000) throw new DiagnosticSourceError("invalid_attachment", "Adjunto inválido.");
          const storagePath = await interviewStorage.save({ teacherId, studentId, mimeType: body.mimeType, bytes: Buffer.from(body.base64, "base64") });
          let saved;
          try { saved = await attachFamilyInterview(db, teacherId, studentId, storagePath, body.mimeType); }
          catch (error) { await interviewStorage.remove(storagePath, teacherId, studentId); throw error; }
          const { replaced_storage_paths: replaced, ...publicSaved } = saved;
          for (const oldPath of replaced) await interviewStorage.remove(oldPath, teacherId, studentId).catch(() =>
            recordOperationalEvent("interview_attachment_cleanup_failed", { workflow: "diagnostic" }));
          send(response, 200, publicSaved, origin);
        } else if (request.method === "GET" && parts[6] === "attachment") {
          if (!interviewStorage) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
          const storagePath = await familyInterviewAttachmentPath(db, teacherId, studentId);
          if (!storagePath) { send(response, 404, { error: "Adjunto no encontrado." }, origin); return; }
          const attachment = await interviewStorage.read(storagePath, teacherId, studentId);
          sendAsset(response, 200, attachment.bytes, attachment.mimeType, origin, "private, no-store");
        } else send(response, 404, { error: "Ruta de entrevista no encontrada." }, origin);
      } catch (error) {
        if (isVersionConflict(error)) send(response, 409, conflictPayload(error), origin);
        else if (error instanceof DiagnosticSourceError || error instanceof TypeError) send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin);
        else throw error;
      }
      return;
    }
    if (url.pathname.startsWith("/api/diagnostics/spontaneous-observations")) {
      try {
        if (request.method === "GET" && /^\/api\/diagnostics\/spontaneous-observations\/[0-9a-f-]+\/media$/i.test(url.pathname)) {
          if (!evidenceStorage) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
          const id = url.pathname.split("/")[4];
          const row = (await db.query(`select o.student_id,o.media_path from diagnostic_spontaneous_observations o
            join classrooms c on c.id=o.classroom_id where o.id=$1 and c.teacher_id=$2`, [id,teacherId])).rows[0];
          if (!row?.media_path) { send(response, 404, { error: "Archivo no encontrado." }, origin); return; }
          const media = await evidenceStorage.read(row.media_path, { teacherId, studentId: row.student_id });
          sendAsset(response, 200, media.data, media.mimeType, origin, "private, no-store");
        }
        else if (request.method === "GET" && url.pathname === "/api/diagnostics/spontaneous-observations/metrics") {
          send(response, 200, await loadSpontaneousV24Metrics(db, teacherId), origin);
        }
        else if (request.method === "GET" && url.pathname === "/api/diagnostics/spontaneous-observations") {
          if (!observationV24Active) await db.query(`update diagnostic_spontaneous_observations o
            set classification_status='needs_review',classifier_status='disabled',classification_reason='unavailable'
            from classrooms c where o.classroom_id=c.id and c.teacher_id=$1 and o.created_by=$1
              and o.classifier_version='CURRENT_V2_4_RAW' and o.classifier_status='pending'`, [teacherId]);
          const result = await loadSpontaneousObservations(db, teacherId);
          send(response, 200, { ...result, classifier_enabled: observationV24Active }, origin);
          for (const row of result.observations.filter((item) => item.classification_status === "pending")) {
            if (process.env.AYNI_SERVERLESS === "1") await queueDiagnosticClassification(row.id, row.student_id, teacherId);
            else setImmediate(() => queueDiagnosticClassification(row.id, row.student_id, teacherId));
          }
        }
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/spontaneous-observations/matrix") {
          const saved = await recordMatrixDiagnosticObservation(db, teacherId, await readJson(request));
          await refreshStudentContextSnapshot(db, saved.student_id);
          send(response, 201, saved, origin);
        }
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/spontaneous-observations") {
          const body = await readJson(request);
          if (!evidenceStorage && body.media) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
          const owned = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
            where s.id=$1 and s.status='active' and c.teacher_id=$2 and c.status='active'`, [body.studentId,teacherId])).rows[0];
          if (!owned) { send(response, 404, { error: "Niño no encontrado." }, origin); return; }
          const media = await decodePrivateMedia(body.media);
          const mediaPath = media ? await evidenceStorage.save({ teacherId, studentId: body.studentId,
            mimeType: media.mimeType, bytes: media.bytes }) : null;
          let saved;
          try { saved = await recordSpontaneousObservation(db, teacherId, { ...body, classifierEnabled: observationV24Active,
            mediaPath, mediaMimeType: media?.mimeType }); }
          catch (error) { if (mediaPath) await evidenceStorage.delete(mediaPath).catch(() => {}); throw error; }
          await refreshStudentContextSnapshot(db, saved.student_id);
          send(response, 201, saved, origin);
          if (observationV24Active) {
            if (process.env.AYNI_SERVERLESS === "1") await queueDiagnosticClassification(saved.id, saved.student_id, teacherId);
            else setImmediate(() => queueDiagnosticClassification(saved.id, saved.student_id, teacherId));
          }
        } else if (request.method === "POST" && /^\/api\/diagnostics\/spontaneous-observations\/[0-9a-f-]+\/(?:suggest|suggest-jev)$/i.test(url.pathname)) {
          await readJson(request);
          const id = url.pathname.split("/")[4];
          const target = (await db.query(`select o.student_id from diagnostic_spontaneous_observations o
            join classrooms c on c.id=o.classroom_id where o.id=$1 and c.teacher_id=$2 and o.created_by=$2`, [id,teacherId])).rows[0];
          if (!target) { send(response, 404, { error: "Observación no encontrada." }, origin); return; }
          try {
            const result = observationV24Active
              ? await suggestSpontaneousV24(db, teacherId, id, observationV24Classifier, { allowRetry: true })
              : { id, status: "needs_review", recommendation_state: "unavailable" };
            await refreshStudentContextSnapshot(db, target.student_id);
            send(response, 200, result, origin);
          } catch (error) {
            if (error instanceof DiagnosticSourceError) throw error;
            await markSpontaneousNeedsReview(db, teacherId, id);
            await refreshStudentContextSnapshot(db, target.student_id);
            recordOperationalEvent("diagnostic_classification_failed", { workflow: "diagnostic" });
            send(response, 503, { error: "Ayni no pudo preparar la recomendación. Puedes reintentar o elegir una competencia." }, origin);
          }
        } else if (request.method === "PUT" && url.pathname.endsWith("/classification")) {
          const id = url.pathname.split("/")[4];
          const body = await readJson(request);
          const saved = await correctSpontaneousClassification(db, teacherId, id, body.competencyIds ?? body.competencyId ?? null);
          await refreshStudentContextSnapshot(db, saved.student_id);
          send(response, 200, saved, origin);
        } else send(response, 404, { error: "Ruta de observación no encontrada." }, origin);
      } catch (error) {
        if (error instanceof DiagnosticSourceError) send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error), reason: error.reason }, origin);
        else throw error;
      }
      return;
    }
    if (url.pathname.startsWith("/api/diagnostics/reviews") || url.pathname.startsWith("/api/diagnostics/student-reviews") || url.pathname.startsWith("/api/diagnostics/group-review") || url.pathname.startsWith("/api/diagnostics/priorities") || url.pathname.startsWith("/api/diagnostics/students/")) {
      try {
        const parts = url.pathname.split("/");
        let result;
        if (request.method === "GET" && url.pathname === "/api/diagnostics/reviews") result = await loadDiagnosticAssessmentWorkspace(db, teacherId);
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/reviews/prepare") result = await prepareDiagnosticSynthesis(db, teacherId, await readJson(request));
        else if (request.method === "PUT" && parts.length === 5 && parts[3] === "reviews") result = await saveDiagnosticSynthesis(db, teacherId, parts[4], (await readJson(request)).details);
        else if (request.method === "POST" && parts.length === 6 && parts[3] === "reviews" && parts[5] === "confirm") {
          result = await confirmDiagnosticSynthesis(db, teacherId, parts[4]);
          try { await refreshStudentContextSnapshot(db, result.student_id); }
          catch { recordOperationalEvent("student_context_refresh_failed", { workflow: "diagnostic" }); }
        }
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/student-reviews/prepare") result = await prepareDiagnosticStudentReview(db, teacherId, (await readJson(request)).studentId);
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/student-reviews/suggest") {
          send(response, 422, { error: "El comentario individual lo escribe o dicta la docente.", reason: "teacher_comment_only" }, origin); return;
        }
        else if (request.method === "PUT" && parts.length === 5 && parts[3] === "student-reviews") result = await saveDiagnosticStudentReview(db, teacherId, parts[4], (await readJson(request)).details);
        else if (request.method === "POST" && parts.length === 6 && parts[3] === "student-reviews" && parts[5] === "confirm") {
          result = await confirmDiagnosticStudentReview(db, teacherId, parts[4]);
          try { await refreshStudentContextSnapshot(db, result.student_id); }
          catch { recordOperationalEvent("student_context_refresh_failed", { workflow: "diagnostic_student" }); }
        }
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/group-review/prepare") result = await prepareDiagnosticGroupReview(db, teacherId);
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/group-review/suggest") result = await suggestDiagnosticGroupReview(db, teacherId, (await readJson(request)).draftId);
        else if (request.method === "PUT" && parts.length === 5 && parts[3] === "group-review") result = await saveDiagnosticGroupReview(db, teacherId, parts[4], (await readJson(request)).details);
        else if (request.method === "POST" && parts.length === 6 && parts[3] === "group-review" && parts[5] === "confirm") result = await confirmDiagnosticGroupReview(db, teacherId, parts[4]);
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/priorities/prepare") result = await prepareDiagnosticPriorities(db, teacherId);
        else if (request.method === "POST" && url.pathname === "/api/diagnostics/priorities/suggest") result = await suggestDiagnosticPriorities(db, teacherId, (await readJson(request)).draftId);
        else if (request.method === "PUT" && parts.length === 5 && parts[3] === "priorities") result = await saveDiagnosticPriorities(db, teacherId, parts[4], (await readJson(request)).details);
        else if (request.method === "POST" && parts.length === 6 && parts[3] === "priorities" && parts[5] === "confirm") result = await confirmDiagnosticPriorities(db, teacherId, parts[4]);
        else if (request.method === "PUT" && parts.length === 6 && parts[3] === "students" && parts[5] === "initial-context") result = await saveStudentInitialContext(db, teacherId, parts[4], (await readJson(request)).initialContext);
        else { send(response, 404, { error: "Ruta de diagnóstico no encontrada." }, origin); return; }
        send(response, 200, result, origin);
      } catch (error) {
        if (error instanceof DiagnosticSuggestionError) {
          send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error), reason: error.reason }, origin);
        } else if (error instanceof DiagnosticPriorityError) {
          send(response, error.reason === "not_found" ? 404 : error.reason === "stale" ? 409 : 422,
            { error: publicErrorMessage(error), reason: error.reason }, origin);
        } else if (error instanceof DiagnosticAssessmentError) {
          send(response, ["no_classroom", "invalid_student", "not_editable"].includes(error.reason) ? 404 : 422,
            { error: publicErrorMessage(error), reason: error.reason }, origin);
        } else throw error;
      }
      return;
    }
    if (request.method === "GET" && /^\/api\/students\/[0-9a-f-]+\/trajectory$/i.test(url.pathname)) {
      if (process.env.AYNI_F8_EVALUATION !== "1") { send(response, 404, { error: "Trayectoria no habilitada." }, origin); return; }
      const studentId = url.pathname.split("/")[3];
      const result = await loadStudentTrajectory(db, teacherId, studentId, { includeOrdinary: true });
      send(response, result ? 200 : 404, result ?? { error: "Niño no encontrado en el aula activa." }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/students/")) {
      const studentId = url.pathname.split("/").at(-1);
      const profile = await studentProfile(studentId);
      if (!profile) {
        send(response, 404, { error: "Niño no encontrado en el aula activa." }, origin);
        return;
      }
      send(response, 200, profile, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/statistics") {
      const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
      send(response, 200, await buildClassroomStatistics(db, classroom.id), origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/annual-plan/context") {
      const context = await annualPlanningContext(); send(response, context ? 200 : 404, context ?? { error: "No se encontró un aula activa." }, origin); return;
    }
    if (request.method === "PUT" && url.pathname === "/api/annual-preplan/context") {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
      const body = await readJson(request);
      const additionalNotes = typeof body?.additional_notes === "string" ? body.additional_notes.trim() : null;
      if (additionalNotes === null || additionalNotes.length > 2000) {
        send(response, 422, { error: "El contexto adicional debe tener menos de 2000 caracteres." }, origin); return;
      }
      const value = { additional_notes: additionalNotes };
      await db.query(`update school_years set annual_planning_context=$1::jsonb where id=$2 and owner_id=$3`,
        [JSON.stringify(value), context.school_year_id, teacherId]);
      send(response, 200, { annual_planning_context: value }, origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/annual-preplan/generate") {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
      if (!context.source_diagnostic_review_id || !context.source_priority_review_id) {
        send(response, 422, { error: "Confirma primero «Así está mi grupo» y «Prioridades del año»." }, origin); return;
      }
      const prior = (await db.query(`select id from annual_plans where school_year_id=$1 and status='draft' limit 1`,
        [context.school_year_id])).rows[0];
      if (prior) { send(response, 409, { error: "Ya tienes un preplan en revisión. Ábrelo para continuar." }, origin); return; }
      try {
        const curriculum = await ageFilteredAnnualCurriculum(context);
        const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [context.id])).rows
          .flatMap((item) => [item.first_name, item.last_name, item.preferred_name,
            [item.first_name, item.last_name].filter(Boolean).join(" ")]).filter(Boolean);
        const safeContext = { ...context, annual_planning_context: {
          additional_notes: neutralizeAssessmentText(context.annual_planning_context?.additional_notes ?? "", names) },
          confirmed_priorities: (context.confirmed_priorities ?? []).map((item) => ({ ...item,
            title: neutralizeAssessmentText(item.title ?? "", names),
            reason: neutralizeAssessmentText(item.reason ?? "", names) })) };
        const generated = await generateAnnualPreplan({ context: safeContext, curriculum });
        const schedule = buildEditableAnnualSchedule(context.calendar, generated.proposal.proposed_experiences);
        const saved = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
          if ((await tx.query(`select 1 from annual_plans where school_year_id=$1 and status='draft'`, [context.school_year_id])).rows.length)
            throw new VersionConflictError("Ya existe un preplan en revisión.");
          const active = (await tx.query(`select id from annual_plans where school_year_id=$1 and status='active'`,
            [context.school_year_id])).rows[0];
          const version = nextAnnualPlanVersion(Number((await tx.query(`select coalesce(max(version),0) as latest
            from annual_plans where school_year_id=$1`, [context.school_year_id])).rows[0].latest));
          const id = randomUUID();
          await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,
            proposal,generation_metadata,document_context,supersedes_plan_id,source_diagnostic_review_id,source_priority_review_id,source_context_fingerprint)
            values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12)`,
          [id,context.id,context.school_year_id,context.curriculum_version_id,version,JSON.stringify(generated.proposal),
            JSON.stringify({ workflow: "annual_preplan", ...generated.metadata }),
            JSON.stringify(annualDocumentContext(context)), active?.id ?? null,
            context.source_diagnostic_review_id, context.source_priority_review_id, context.context_v4.source_fingerprint]);
          await replaceAnnualProjectSlots(id, schedule, tx);
          return { id, version, revision: 1, status: "draft", proposal: generated.proposal };
        });
        send(response, 201, saved, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No pudimos preparar el preplan." }, origin); }
      return;
    }
    if (request.method === "PUT" && /^\/api\/annual-preplans\/[0-9a-f-]+$/i.test(url.pathname)) {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
      try {
        const body = await readJson(request);
        const curriculum = await ageFilteredAnnualCurriculum(context);
        const proposal = validateAnnualPreplan(body?.proposal, curriculum.map((card) => card.id), context.year);
        const schedule = buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences);
        const id = url.pathname.split("/")[3];
        const saved = await versionTransaction(db, `annual:${context.school_year_id}`, async (tx) => {
          const row = (await tx.query(`select id,revision,source_priority_review_id from annual_plans
            where id=$1 and classroom_id=$2 and school_year_id=$3 and status='draft' for update`,
          [id,context.id,context.school_year_id])).rows[0];
          if (!row) throw new AnnualPreplanError("not_found", "Preplan no disponible.");
          assertRevision(row, expectedRevision(body.expectedRevision));
          if (row.source_priority_review_id !== context.source_priority_review_id)
            throw new VersionConflictError("Las prioridades confirmadas cambiaron. Revisa la nueva versión antes de guardar.");
          const updated = (await tx.query(`update annual_plans set proposal=$1::jsonb,document_context=$2::jsonb,updated_at=now()
            where id=$3 and revision=$4 and status='draft' returning revision`,
          [JSON.stringify(proposal), JSON.stringify(annualDocumentContext(context)), id, row.revision])).rows[0];
          if (!updated) throw new VersionConflictError();
          await replaceAnnualProjectSlots(id, schedule, tx);
          return { id, revision: Number(updated.revision), proposal };
        });
        send(response, 200, saved, origin);
      } catch (error) { send(response, error?.reason === "not_found" ? 404 : httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) :
        { error: publicErrorMessage(error) || "No se pudo guardar el preplan." }, origin); }
      return;
    }
    if (request.method === "POST" && /^\/api\/annual-preplans\/[0-9a-f-]+\/formalize$/i.test(url.pathname)) {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
      try {
        const result = await developConfirmedAnnualPlan(db, teacherId, url.pathname.split("/")[3], context);
        send(response, 200, { ready: true, already_ready: result.already_ready }, origin);
      } catch (error) { send(response, error?.reason === "not_found" ? 404 : httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No se pudo preparar el Word. Puedes reintentar." }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/planning-feedback") {
      try { const context=await annualPlanningContext();if(!context)throw new Error("Aula no disponible.");
        const periods=(await db.query(`select id,label,starts_on,ends_on from evaluation_periods where school_year_id=$1 order by starts_on desc`,[context.school_year_id])).rows;
        const selected=url.searchParams.get("periodId")||periods[0]?.id;
        const feedback=selected?await loadPlanningFeedback(db,{teacherId,classroomId:context.id,periodId:selected}):null;
        send(response,200,{periods:periods.map((period)=>({id:period.id,label:period.label,starts_on:annualCalendarDay(period.starts_on),ends_on:annualCalendarDay(period.ends_on)})),feedback},origin);
      }catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if (process.env.AYNI_DOCUMENT_ARTIFACTS === "1" && request.method === "GET" && url.pathname === "/api/documents/artifacts") {
      send(response,200,{ artifacts: await listConfirmedDocumentArtifacts(db,teacherId) },origin); return;
    }
    if (process.env.AYNI_DOCUMENT_ARTIFACTS === "1" && process.env.AYNI_DOCUMENT_SYNC === "1"
      && request.method === "GET" && url.pathname === "/api/documents/artifacts/states") {
      send(response,200,{ states: await listDocumentArtifactStates(db,teacherId) },origin); return;
    }
    if (process.env.AYNI_DOCUMENT_ARTIFACTS === "1" && request.method === "POST" && url.pathname === "/api/documents/artifacts/prepare") {
      if (!documentArtifactStorage) { send(response,503,{error:"Storage documental privado no configurado."},origin); return; }
      try {
        const body = await readJson(request);
        const knowledgeBase = await loadKnowledgeBaseV4();
        const cards = knowledgeBase.competencyCards.map(card => ({ id:card.id,name:card.official_name,
          area_name:card.area_name,capacities:card.capacities,ages:card.ages }));
        const logo = await loadInstitutionLogoForDocuments(db, teacherId, logoStorage ?? assetsDir);
        const artifact = await prepareConfirmedDocumentArtifact(db,documentArtifactStorage,teacherId,
          body?.kind,body?.sourceId,{cards,logo});
        if (!artifact) { send(response,404,{error:"Documento no disponible."},origin); return; }
        send(response,200,{artifact},origin);
      } catch (error) { send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin); }
      return;
    }
    if (process.env.AYNI_DOCUMENT_ARTIFACTS === "1" && process.env.AYNI_DOCUMENT_SYNC === "1"
      && request.method === "POST" && url.pathname === "/api/documents/artifacts/zip") {
      if (!documentArtifactStorage) { send(response,503,{error:"Storage documental privado no configurado."},origin); return; }
      try {
        const body = await readJson(request);
        const result = await buildAuthorizedDocumentZip(db,documentArtifactStorage,teacherId,body?.artifactIds);
        if (!result) { send(response,404,{error:"Documento no disponible."},origin); return; }
        response.writeHead(200,{"content-type":"application/zip",
          "content-disposition":"attachment; filename=ayni-documentos.zip",
          "content-length":String(result.bytes.length),"cache-control":"private, no-store",
          "x-content-type-options":"nosniff",...(origin && allowedOrigins.has(origin)
            ? {"access-control-allow-origin":origin,"access-control-allow-credentials":"true",
              "access-control-expose-headers":"content-disposition",vary:"Origin"} : {})});
        response.end(result.bytes);
      } catch (error) { send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin); }
      return;
    }
    const artifactDownload = process.env.AYNI_DOCUMENT_ARTIFACTS === "1"
      && /^\/api\/documents\/artifacts\/[0-9a-f-]{36}\/download$/i.exec(url.pathname);
    if (request.method === "GET" && artifactDownload) {
      if (!documentArtifactStorage) { send(response,503,{error:"Storage documental privado no configurado."},origin); return; }
      try {
        const artifact = await readConfirmedDocumentArtifact(db,documentArtifactStorage,teacherId,
          url.pathname.split("/")[4]);
        if (!artifact) { send(response,404,{error:"Documento no disponible."},origin); return; }
        response.writeHead(200,{ "content-type":artifact.mime_type,
          "content-disposition":`attachment; filename="${artifact.filename}"`,
          "content-length":String(artifact.bytes.length),"cache-control":"private, no-store",
          "x-content-type-options":"nosniff",...(origin && allowedOrigins.has(origin)
            ? {"access-control-allow-origin":origin,"access-control-allow-credentials":"true",
              "access-control-expose-headers":"content-disposition",vary:"Origin"} : {}) });
        response.end(artifact.bytes);
      } catch (error) { send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/documents") {
      send(response, 200, { documents: await listSavedDocuments(db, teacherId) }, origin); return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/documents/") && url.pathname.endsWith("/download")) {
      const parts = url.pathname.split("/");
      if (parts.length !== 6 || parts[5] !== "download") { send(response, 404, { error: "Documento no disponible." }, origin); return; }
      if (parts[3] === "period_closure") { send(response, 409, { error: "El Word del cierre estará disponible cuando se incorpore su plantilla definitiva." }, origin); return; }
      const requestedDocument = await loadSavedDocument(db, teacherId, parts[3], parts[4]);
      if (requestedDocument?.kind === "experience" && requestedDocument.content?.document_template_version === "experience-unified-v2" && !requestedDocument.formal_ready) {
        send(response, 409, { error: "Prepara primero el Word de este proyecto. Puedes hacerlo desde esta página." }, origin); return;
      }
      const knowledgeBase = await loadKnowledgeBaseV4();
      const cards = knowledgeBase.competencyCards.map((card) => ({ id: card.id, name: card.official_name,
        area_name: card.area_name, capacities: card.capacities, ages: card.ages }));
      const logo = await loadInstitutionLogoForDocuments(db, teacherId, logoStorage ?? assetsDir);
      const download = await prepareWordDownload(db, teacherId, parts[3], parts[4], cards, { logo });
      if (!download) { send(response, 404, { error: "Documento no disponible." }, origin); return; }
      const headers = {
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${download.filename}"`,
        "content-length": String(download.buffer.length), "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      };
      if (origin && allowedOrigins.has(origin)) {
        headers["access-control-allow-origin"] = origin;
        headers["access-control-allow-credentials"] = "true";
        headers["access-control-expose-headers"] = "content-disposition";
        headers.vary = "Origin";
      }
      response.writeHead(200, headers);
      response.end(download.buffer);
      return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/documents/") && url.pathname.endsWith("/save-local")) {
      if (authMode !== "local") { send(response, 404, { error: "Ruta local no disponible." }, origin); return; }
      const parts = url.pathname.split("/");
      if (parts.length !== 6 || parts[5] !== "save-local") { send(response, 404, { error: "Documento no disponible." }, origin); return; }
      if (parts[3] === "period_closure") { send(response, 409, { error: "El Word del cierre estará disponible cuando se incorpore su plantilla definitiva." }, origin); return; }
      const requestedDocument = await loadSavedDocument(db, teacherId, parts[3], parts[4]);
      if (requestedDocument?.kind === "experience" && requestedDocument.content?.document_template_version === "experience-unified-v2" && !requestedDocument.formal_ready) {
        send(response, 409, { error: "Prepara primero el Word de este proyecto. Puedes hacerlo desde esta página." }, origin); return;
      }
      const knowledgeBase = await loadKnowledgeBaseV4();
      const cards = knowledgeBase.competencyCards.map((card) => ({ id: card.id, name: card.official_name,
        area_name: card.area_name, capacities: card.capacities, ages: card.ages }));
      const logo = await loadInstitutionLogoForDocuments(db, teacherId, logoStorage ?? assetsDir);
      const download = await prepareWordDownload(db, teacherId, parts[3], parts[4], cards, { logo });
      if (!download) { send(response, 404, { error: "Documento no disponible." }, origin); return; }
      const saved = await saveWordToLocalDownloads(download, path.join(homedir(), "Downloads"));
      send(response, 200, { filename: saved.filename, folder: "Descargas", alreadyExists: saved.alreadyExists }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/documents/")) {
      const parts = url.pathname.split("/");
      const document = parts.length === 5 ? await loadSavedDocument(db, teacherId, parts[3], parts[4]) : null;
      if (!document) { send(response, 404, { error: "Documento no disponible." }, origin); return; }
      const knowledgeBase = await loadKnowledgeBaseV4();
      send(response, 200, { document: { ...document, competencies: knowledgeBase.competencyCards.map((card) => ({ id: card.id, name: card.official_name })) } }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/classroom/context") {
      const classroom = (await db.query(`select id from classrooms where teacher_id=$1 and status='active' limit 1`, [teacherId])).rows[0];
      if (!classroom) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      send(response, 200, publicClassroomContext(await getCurrentClassroomContext(db, teacherId, classroom.id)), origin);
      return;
    }
    if (request.method === "PUT" && url.pathname === "/api/annual-calendar") {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const savedPlans = (await db.query(`select id,status,proposal from annual_plans where school_year_id=$1`, [context.school_year_id])).rows;
      const preplanCalendarAllowed = savedPlans.some((plan) => plan.status === "active" && plan.proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT)
        && !savedPlans.some((plan) => plan.status === "draft");
      const existing = savedPlans.find((plan) => plan.status === "draft") ?? null;
      try {
        const body = await readJson(request);
        if (savedPlans.some((plan) => plan.status !== "draft") && !existing && !(body?.forPreplan === true && preplanCalendarAllowed)) {
          send(response, 409, { error: "Prepara una nueva versión antes de cambiar el calendario vigente." }, origin); return;
        }
        const blocks = body?.blocks;
        const stage = body?.initial_stage;
        if (!Array.isArray(blocks) || blocks.length > 32 || !stage || !Number.isInteger(stage.duration_weeks)
          || stage.duration_weeks < 1 || stage.duration_weeks > 4 || typeof stage.name !== "string" || !stage.name.trim()
          || typeof stage.purpose !== "string" || !stage.purpose.trim() || stage.purpose.length > 2000
          || typeof stage.teacher_notes !== "string" || stage.teacher_notes.length > 2000
          || !["suggested_experiences", "what_to_observe", "family_actions", "diagnostic_focus"].every((field) =>
            Array.isArray(stage[field]) && stage[field].length <= 20 && stage[field].every((item) => typeof item === "string" && item.length <= 500))) {
          throw new Error("Revisa la duración y los datos de la etapa inicial.");
        }
        if (blocks.some((block) => typeof block.label !== "string" || !block.label.trim() || block.label.length > 120)) throw new Error("Cada bloque necesita un nombre breve.");
        const valid = validateAnnualCalendar({ school_year: context.year, blocks });
        const originalById = new Map(context.calendar.blocks.map((block) => [block.id, block]));
        for (const original of context.calendar.blocks.filter((block) => block.editable === false)) {
          const next = valid.blocks.find((block) => block.id === original.id);
          if (!next || ["type", "label", "start_date", "end_date"].some((field) => next[field] !== original[field])) throw new Error("Hay un bloque del calendario que no se puede modificar.");
        }
        await db.exec("begin");
        if (existing) await db.query(`update project_slots set calendar_block_id=null where annual_plan_id=$1`, [existing.id]);
        await db.query(`delete from calendar_blocks where school_year_id=$1`, [context.school_year_id]);
        for (const [index, block] of valid.blocks.entries()) {
          await db.query(`insert into calendar_blocks(id,school_year_id,type,label,start_date,end_date,editable,sort_order)
            values($1,$2,$3,$4,$5::date,$6::date,$7,$8)`, [originalById.has(block.id) ? block.id : randomUUID(),
            context.school_year_id, block.type, block.label.trim(), block.start_date, block.end_date, block.editable !== false, index]);
        }
        await db.query(`insert into initial_stages(id,school_year_id,name,duration_weeks,purpose,suggested_experiences,what_to_observe,family_actions,diagnostic_focus,teacher_notes)
          values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10)
          on conflict(school_year_id) do update set name=excluded.name,duration_weeks=excluded.duration_weeks,purpose=excluded.purpose,
          suggested_experiences=excluded.suggested_experiences,what_to_observe=excluded.what_to_observe,family_actions=excluded.family_actions,
          diagnostic_focus=excluded.diagnostic_focus,teacher_notes=excluded.teacher_notes`,
        [context.calendar.initial_stage?.id ?? randomUUID(), context.school_year_id, stage.name.trim(), stage.duration_weeks, stage.purpose.trim(),
          JSON.stringify(stage.suggested_experiences), JSON.stringify(stage.what_to_observe), JSON.stringify(stage.family_actions),
          JSON.stringify(stage.diagnostic_focus), stage.teacher_notes]);
        const updatedCalendar = await annualCalendarForClassroom(context);
        if (existing) {
          if (existing.proposal?.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT) {
            const schedule = buildFlexibleAnnualSchedule(updatedCalendar, existing.proposal.proposed_experiences);
            await replaceAnnualProjectSlots(existing.id, schedule);
          } else if (existing.proposal?.plan_format === ANNUAL_PREPLAN_FORMAT) {
            await replaceAnnualProjectSlots(existing.id, buildEditableAnnualSchedule(updatedCalendar, existing.proposal.proposed_experiences));
          }
          await db.query(`update annual_plans set document_context=$1::jsonb,updated_at=now() where id=$2 and status='draft'`,
            [JSON.stringify(annualDocumentContext({ ...context, calendar: updatedCalendar })), existing.id]);
        }
        await db.exec("commit");
        send(response, 200, { calendar: updatedCalendar }, origin);
      } catch (error) { await db.exec("rollback").catch(() => {}); send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No se pudo guardar el calendario." }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/annual-plan/generate") {
      const classroom = await annualPlanningContext(); if (!classroom) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const body = (await readJson(request)) ?? {};
      const plans = (await db.query(`select id,classroom_id,status,proposal from annual_plans where school_year_id=$1 and status in ('active','draft')`, [classroom.school_year_id])).rows;
      const active = plans.find((item) => item.status === "active");
      const draft = plans.find((item) => item.status === "draft");
      const replacementPlanId = typeof body.replacementPlanId === "string" ? body.replacementPlanId : null;
      const replacingLegacy = Boolean(active && active.id === replacementPlanId && active.classroom_id === classroom.id &&
        active.proposal?.plan_format !== ANNUAL_PLAN_TEMPLATE_FORMAT && !draft);
      if (draft || (active && !replacingLegacy) || (!active && replacementPlanId)) {
        send(response, 409, { error: "Ya existe un plan o borrador para este año. Abre el plan disponible." }, origin); return;
      }
      if (!classroom.source_diagnostic_review_id || !classroom.diagnostic_summary) { send(response, 422, { error: "Confirma primero el resumen diagnóstico del aula antes de preparar el plan anual.", reason: "diagnostic_review_required" }, origin); return; }
      try {
        const studentNames = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [classroom.id])).rows
          .flatMap((item) => [item.first_name, item.last_name, item.preferred_name, [item.first_name, item.last_name].filter(Boolean).join(" ")]).filter(Boolean);
        const safeRequest = { ...body, teacherRequest: neutralizeAssessmentText(body.teacherRequest ?? "", studentNames) };
        const generated = await generateTeacherAnnualPlan({ classroom, request: safeRequest });
        const generationId = randomUUID();
        await pendingAIGenerations.set(generationId, { workflow: generated.internalMetadata.workflow, metadata: safeAnnualGenerationMetadata(generated.internalMetadata), classroom_id: classroom.id, source_diagnostic_review_id: classroom.source_diagnostic_review_id, source_context_fingerprint: classroom.context_v4.source_fingerprint, replacement_plan_id: replacingLegacy ? active.id : null, createdAt: Date.now() });
        send(response, 200, { proposal: generated.proposal, generation_id: generationId, document_context: annualDocumentContext(classroom) }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No pudimos preparar el plan anual.", reason: error?.reason ?? "unknown" }, origin); } return;
    }
    if (request.method === "POST" && /^\/api\/annual-plans\/[0-9a-f-]+\/new-version$/i.test(url.pathname)) {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try {
        const body=await readJson(request);
        const copied = await copyConfirmedAnnualPlan(db, teacherId, context, url.pathname.split("/")[3], annualDocumentContext(context), expectedRevision(body.expectedRevision));
        send(response, 201, copied, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error), reason: error.reason ?? "version_unavailable" }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/annual-plans") {
      const context = await annualPlanningContext(); const body = await readJson(request);
      if (!context || !body.proposal) { send(response, 400, { error: "Falta propuesta o aula activa." }, origin); return; }
      let annualSchedule = null;
      try { validateAnnualPlanProposal(body.proposal, await applicableCompetencyIds("annual_plan", context), context.year);
        if (body.proposal.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT) annualSchedule = buildFlexibleAnnualSchedule(context.calendar, body.proposal.proposed_experiences); }
      catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error), reason: error.reason, details: error.details }, origin); return; }
      const existingId = typeof body.planId === "string" ? body.planId : null;
      const pending = typeof body.generationId === "string" ? await pendingAIGenerations.get(body.generationId) : null;
      if (!existingId && (!pending || pending.classroom_id !== context.id || pending.workflow !== "annual_plan")) { send(response, 422, { error: "La generación anual ya no está disponible. Genera nuevamente el borrador." }, origin); return; }
      if (!existingId && (!context.source_diagnostic_review_id || pending.source_diagnostic_review_id !== context.source_diagnostic_review_id)) { send(response, 409, { error: "Se confirmó un nuevo resumen diagnóstico. Prepara nuevamente el borrador del plan." }, origin); return; }
      try {
        const saved=await versionTransaction(db,`annual:${context.school_year_id}`,async(tx)=>{
        if (existingId) {
          const revision=expectedRevision(body.expectedRevision);
          const current=(await tx.query(`select id,revision from annual_plans where id=$1 and classroom_id=$2 and school_year_id=$3 and status='draft' for update`,[existingId,context.id,context.school_year_id])).rows[0];
          assertRevision(current,revision);
          const updated = await tx.query(`update annual_plans set proposal=$1::jsonb, updated_at=now() where id=$2 and status='draft' and revision=$3 returning id,revision`, [JSON.stringify(body.proposal), existingId,revision]);
          if (!updated.rows[0]) throw new VersionConflictError();
          if (annualSchedule) await replaceAnnualProjectSlots(existingId, annualSchedule,tx);
          return {id:existingId,status:"draft",revision:Number(updated.rows[0].revision)};
        }
        const currentPlans = await tx.query(`select id,classroom_id,status,proposal from annual_plans where school_year_id=$1 and status in ('active','draft')`, [context.school_year_id]);
        const active = currentPlans.rows.find((item) => item.status === "active");
        const draft = currentPlans.rows.find((item) => item.status === "draft");
        const replacingLegacy = Boolean(active && active.id === body.replacementPlanId && active.classroom_id === context.id &&
          active.id === pending?.replacement_plan_id && active.proposal?.plan_format !== ANNUAL_PLAN_TEMPLATE_FORMAT &&
          body.proposal.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT && !draft);
        if (draft || (active && !replacingLegacy) || (!active && body.replacementPlanId)) {
          throw new VersionConflictError("Ya existe un plan anual vigente o borrador para este año escolar.");
        }
        const latest = await tx.query(`select coalesce(max(version), 0) as max_version from annual_plans where classroom_id=$1 and school_year_id=$2`, [context.id, context.school_year_id]);
        const version = nextAnnualPlanVersion(Number(latest.rows[0].max_version)); const id = randomUUID();
        await tx.query(`insert into annual_plans (id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,generation_metadata,document_context,supersedes_plan_id,source_diagnostic_review_id,source_context_fingerprint) values ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)`, [id, context.id, context.school_year_id, context.curriculum_version_id, version, JSON.stringify(body.proposal), JSON.stringify(pending?.metadata ?? {}), JSON.stringify({ ...annualDocumentContext(context), supersedes_plan_id: replacingLegacy ? active.id : null }), replacingLegacy ? active.id : null, context.source_diagnostic_review_id, context.context_v4.source_fingerprint]);
        if (annualSchedule) await replaceAnnualProjectSlots(id, annualSchedule,tx);
        return {id,version,status:"draft",revision:1};
        });
        if (pending) await pendingAIGenerations.delete(body.generationId);
        send(response, 200, saved, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) || "No se pudo guardar el borrador." }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/annual-plans/") && url.pathname.endsWith("/confirm")) {
      const id = url.pathname.split("/")[3];
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try {
        const body=await readJson(request),revision=expectedRevision(body.expectedRevision);
        const result=await confirmAnnualPlanVersion(db,context,id,revision,async(draft,tx)=>{
          const sourceDiagnosticId=draft.source_diagnostic_review_id??draft.document_context?.source_diagnostic_review_id;
          if(!context.source_diagnostic_review_id || (sourceDiagnosticId&&sourceDiagnosticId!==context.source_diagnostic_review_id)) throw new VersionConflictError("Se confirmó un nuevo resumen diagnóstico. Revisa el plan antes de confirmar.",draft.revision);
          if (draft.proposal.plan_format === ANNUAL_PREPLAN_FORMAT) {
            if (!context.source_priority_review_id || draft.source_priority_review_id !== context.source_priority_review_id)
              throw new VersionConflictError("Las prioridades confirmadas cambiaron. Revisa el preplan antes de confirmar.", draft.revision);
            validateAnnualPreplan(draft.proposal, await applicableCompetencyIds("annual_plan", context), context.year);
            await replaceAnnualProjectSlots(id, buildEditableAnnualSchedule(context.calendar, draft.proposal.proposed_experiences), tx);
          } else {
            validateAnnualPlanProposal(draft.proposal,await applicableCompetencyIds("annual_plan",context),context.year);
            if(draft.proposal.plan_format===ANNUAL_PLAN_TEMPLATE_FORMAT) await replaceAnnualProjectSlots(id,buildFlexibleAnnualSchedule(context.calendar,draft.proposal.proposed_experiences),tx);
          }
        });
        send(response,200,result,origin);
      } catch (error) { send(response, httpStatusForError(error, error?.reason?422:404), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) || "Plan anual no disponible para confirmar.", ...(error?.reason ? { reason: error.reason, details: error.details } : {}) }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/annual-plans/current") {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const plans = (await db.query(`select ap.id,ap.classroom_id,ap.version,ap.revision,ap.status,ap.proposal,ap.document_context,ap.supersedes_plan_id,ap.source_diagnostic_review_id,ap.source_priority_review_id,ap.source_context_fingerprint,ap.created_at,ap.updated_at,af.annual_plan_id is not null as formal_ready,
        case when ap.generation_metadata->>'workflow'='bimester_replan' then ap.generation_metadata->>'source_period_label' else null end as adjustment_label,
        c.section as source_section,ag.age_years as source_age,p.display_name as source_teacher_name,
        coalesce(ip.display_name,c.institution_name) as source_institution_name,ip.institution_code as source_institution_code,
        ip.district as source_district,ip.ugel as source_ugel,sy.year as source_year,sy.starts_on as source_starts_on,sy.ends_on as source_ends_on
        from annual_plans ap join school_years sy on sy.id=ap.school_year_id join classrooms c on c.id=ap.classroom_id
        join age_grades ag on ag.id=c.age_grade_id join profiles p on p.user_id=c.teacher_id
        left join institution_profiles ip on ip.owner_user_id=c.teacher_id
        left join annual_plan_formal_content af on af.annual_plan_id=ap.id
        where ap.school_year_id=$1 and sy.owner_id=$2 order by ap.version desc`, [context.school_year_id, teacherId])).rows.map((row) => ({
          id: row.id, classroom_id: row.classroom_id, version: row.version, revision: Number(row.revision), status: row.status,
          supersedes_plan_id: row.supersedes_plan_id, source_diagnostic_review_id: row.source_diagnostic_review_id, source_priority_review_id: row.source_priority_review_id, formal_ready: row.formal_ready, adjustment_label: row.adjustment_label,
          proposal: row.proposal, created_at: row.created_at, updated_at: row.updated_at,
          document_context: Object.keys(row.document_context ?? {}).length ? row.document_context : annualDocumentContext({
            institution_name: row.source_institution_name, institution_code: row.source_institution_code,
            district: row.source_district, ugel: row.source_ugel, teacher_name: row.source_teacher_name,
            section: row.source_section, age: row.source_age, year: row.source_year,
            starts_on: row.source_starts_on, ends_on: row.source_ends_on,
          }),
        }));
      const activePlan = plans.find((plan) => plan.status === "active") ?? null;
      if (activePlan) activePlan.project_slots = (await db.query(`select id,proposal_id,slot_index,starts_on::text,ends_on::text,duration_weeks
        from project_slots where annual_plan_id=$1 order by slot_index`, [activePlan.id])).rows;
      send(response, 200, { active: activePlan, draft: plans.find((plan) => plan.status === "draft") ?? null, archived: plans.filter((plan) => plan.status === "archived") }, origin); return;
    }
    async function projectFlowSource(planId, proposalId, allowArchived = false, fallbackIndex = null) {
      const classroom = await annualPlanningContext();
      if (!classroom) throw new Error("No se encontró un aula activa.");
      const plan = (await db.query(`select id,version,status,proposal,document_context,source_priority_review_id from annual_plans
        where id=$1 and classroom_id=$2 and school_year_id=$3 and status in ('active','archived')`,
      [planId, classroom.id, classroom.school_year_id])).rows[0];
      if (!plan || (!allowArchived && plan.status !== "active")) throw new Error("El plan anual vigente no está disponible.");
      const slots = (await db.query(`select id,proposal_id,slot_index,starts_on::text,ends_on::text,duration_weeks
        from project_slots where annual_plan_id=$1 order by slot_index`, [plan.id])).rows;
      const sourceId = proposalId ?? (Number.isInteger(fallbackIndex)
        ? slots.find((item) => Number(item.slot_index) === fallbackIndex + 1)?.id : null);
      const resolved = resolveAnnualProposal(plan, slots, sourceId);
      if (!resolved || !["project", "unit"].includes(resolved.proposal.experience_type))
        throw new Error("La propuesta no pertenece a este plan anual.");
      const { proposal: source, proposalId: canonicalProposalId, index, slot } = resolved;
      const curriculum = await ageFilteredAnnualCurriculum(classroom);
      const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [classroom.id])).rows
        .flatMap((item) => [item.first_name, item.last_name, item.preferred_name]).filter(Boolean);
      const safe = (value) => neutralizeAssessmentText(String(value ?? ""), names);
      const priorityReview = plan.source_priority_review_id ? (await db.query(`select details from diagnostic_priority_reviews
        where id=$1 and classroom_id=$2 and status='confirmed'`, [plan.source_priority_review_id,classroom.id])).rows[0] : null;
      const planPriorities = priorityReview?.details?.priorities ?? classroom.confirmed_priorities;
      const aiContext = { school_year: classroom.year, age: classroom.age,
        group_context: safe(plan.document_context?.diagnostic_group?.strengths || classroom.group_context),
        group_needs: safe(plan.document_context?.diagnostic_group?.needs || classroom.diagnostic_group?.needs),
        confirmed_priorities: planPriorities.map((item) => ({ title: safe(item.title), reason: safe(item.reason),
          competency_ids: item.related_competency_ids })),
        group_interests: (plan.document_context?.group_interests ?? []).map(safe),
        annual_proposal: source, calendar: { starts_on: slot.starts_on, ends_on: slot.ends_on,
          duration_weeks: slot.duration_weeks }, curriculum };
      const selection = (await db.query(`select pcs.id,pcs.status,pcs.revision from project_calendar_selections pcs
        join learning_experiences e on e.id=pcs.learning_experience_id
        where e.annual_plan_id=$1 and e.source_proposal_index=$2 and e.origin='planned'
        order by pcs.updated_at desc limit 1`,[plan.id,index])).rows[0];
      const selectedDates = selection?.status === "confirmed" ? (await db.query(`select date::text from project_instructional_dates
        where selection_id=$1 and selected=true order by date`,[selection.id])).rows.map((item)=>item.date) : null;
      return { classroom, plan, source, proposalId: canonicalProposalId, index, slot, aiContext, selection,
        dates: selectedDates?.length ? selectedDates : instructionalDates(plan.document_context?.calendar ?? classroom.calendar, slot.starts_on, slot.ends_on) };
    }
    async function projectFlowRow(id) {
      const classroom = await annualPlanningContext();
      const row = classroom && (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2
        and type in ('project','unit')`, [id, classroom.id])).rows[0];
      return { classroom, row };
    }
    async function projectFlowFeedback(source, body, persisted = null) {
      return resolveProjectPlanningFeedback({request:body,persisted,loadFeedback:periodId=>
        loadPlanningFeedback(db,{teacherId,classroomId:source.classroom.id,periodId})});
    }
    async function protectedProjectVersion(row) {
      if (!row?.supersedes_experience_id) return null;
      const source = (await db.query(`select details from learning_experiences where id=$1 and classroom_id=$2
        and type in ('project','unit')`, [row.supersedes_experience_id, row.classroom_id])).rows[0];
      if (!source) throw new VersionConflictError("La versión anterior del proyecto ya no está disponible.");
      const today = (await db.query(`select to_char((now() at time zone 'America/Lima')::date,'YYYY-MM-DD') as today`)).rows[0].today;
      const records = (await db.query(`select distinct a.details->>'route_item_id' as route_item_id from activities a
        where a.experience_id=$1 and a.details->>'route_item_id' is not null
        and (exists(select 1 from evidences e where e.activity_id=a.id)
          or exists(select 1 from class_schedule_entries se join daily_execution_logs d
            on d.schedule_entry_id=se.id where se.activity_id=a.id and d.status<>'planned'))`,
      [row.supersedes_experience_id])).rows;
      return { sourceRoute: canonicalProjectRoute(source.details), today,
        recordedRouteIds: records.map((item) => item.route_item_id) };
    }
    async function ensureProjectCalendarSelection(row, source) {
      let selection=(await db.query(`select * from project_calendar_selections where learning_experience_id=$1`,[row.id])).rows[0];
      if(!selection){
        selection=(await db.query(`insert into project_calendar_selections(id,learning_experience_id,starts_on,ends_on)
          values($1,$2,$3::date,$4::date) returning *`,[randomUUID(),row.id,source.slot.starts_on,source.slot.ends_on])).rows[0];
      }
      const calendar=await loadEffectiveCalendar(db,{teacherId,classroomId:source.classroom.id,from:source.slot.starts_on,to:source.slot.ends_on});
      const existing=(await db.query(`select id,date::text,selected,exclusion_reason from project_instructional_dates where selection_id=$1 order by date`,[selection.id])).rows;
      if(!existing.length){
        for(const day of calendar.days.filter((item)=>item.is_instructional))await db.query(`insert into project_instructional_dates(id,selection_id,calendar_day_id,date,selected)
          values($1,$2,$3,$4::date,true)`,[randomUUID(),selection.id,day.id,day.date]);
      }
      const stored=(await db.query(`select id,date::text,selected,exclusion_reason from project_instructional_dates where selection_id=$1 order by date`,[selection.id])).rows;
      const exclusions=stored.filter((item)=>!item.selected);
      const days=candidateProjectDates(calendar.days,source.slot.starts_on,source.slot.ends_on,exclusions);
      return { selection:{...selection,starts_on:annualCalendarDay(selection.starts_on),ends_on:annualCalendarDay(selection.ends_on)},days,
        selected_dates:stored.filter((item)=>item.selected).map((item)=>item.date) };
    }
    if(request.method==="GET"&&url.pathname==="/api/school-calendar"){
      try{const classroom=await annualPlanningContext();if(!classroom){send(response,404,{error:"Aula no disponible."},origin);return;}
        const data=await loadEffectiveCalendar(db,{teacherId,classroomId:classroom.id,from:url.searchParams.get("from"),to:url.searchParams.get("to")});send(response,200,data,origin);}
      catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if(request.method==="PUT"&&url.pathname==="/api/school-calendar/override"){
      try{const body=await readJson(request),classroom=await annualPlanningContext();if(!classroom){send(response,404,{error:"Aula no disponible."},origin);return;}
        const value=await saveClassroomOverride(db,{teacherId,classroomId:classroom.id,date:body.date,isInstructional:body.isInstructional===true,reason:body.reason,confirmOfficialException:body.confirmOfficialException===true});send(response,200,value,origin);}
      catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if(request.method==="GET"&&/^\/api\/project-flow\/[0-9a-f-]+\/calendar$/i.test(url.pathname)){
      try{const id=url.pathname.split("/")[3],{row}=await projectFlowRow(id);if(!row){send(response,404,{error:"Proyecto no disponible."},origin);return;}
        const source=await projectFlowSource(row.annual_plan_id,row.source_proposal_id,true,row.source_proposal_index);send(response,200,await ensureProjectCalendarSelection(row,source),origin);}
      catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if(request.method==="PUT"&&/^\/api\/project-flow\/[0-9a-f-]+\/calendar$/i.test(url.pathname)){
      try{const id=url.pathname.split("/")[3],body=await readJson(request),{row}=await projectFlowRow(id);if(!row||row.status!=="draft"){send(response,404,{error:"Borrador no disponible."},origin);return;}
        const source=await projectFlowSource(row.annual_plan_id,row.source_proposal_id,true,row.source_proposal_index),review=await ensureProjectCalendarSelection(row,source);
        const calendar=await loadEffectiveCalendar(db,{teacherId,classroomId:source.classroom.id,from:source.slot.starts_on,to:source.slot.ends_on});
        const selected=validateSelectedInstructionalDates(calendar.days,body.selectedDates,source.slot.starts_on,source.slot.ends_on),selectedSet=new Set(selected);
        const protectedVersion = await protectedProjectVersion(row);
        if (protectedVersion) assertProtectedCalendarDates(protectedVersion.sourceRoute, selected, protectedVersion);
        for(const day of calendar.days.filter((item)=>item.is_instructional)){
          const reason=String(body.exclusions?.[day.date]??"").trim()||null;
          await db.query(`insert into project_instructional_dates(id,selection_id,calendar_day_id,date,selected,exclusion_reason)
            values($1,$2,$3,$4::date,$5,$6) on conflict(selection_id,date) do update set selected=excluded.selected,exclusion_reason=excluded.exclusion_reason,updated_at=now()`,
          [randomUUID(),review.selection.id,day.id,day.date,selectedSet.has(day.date),selectedSet.has(day.date)?null:reason]);
        }
        const updated=(await db.query(`update project_calendar_selections set status=$1,confirmed_at=case when $1='confirmed' then now() else null end,
          confirmed_by=case when $1='confirmed' then $2::uuid else null end,revision=revision+1,updated_at=now() where id=$3 returning *`,
        [body.confirm===true?"confirmed":"draft",teacherId,review.selection.id])).rows[0];
        send(response,200,{selection:updated,selected_dates:selected},origin);
      }catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if(request.method==="POST"&&/^\/api\/activities\/[0-9a-f-]+\/reschedule$/i.test(url.pathname)){
      try{const body=await readJson(request);send(response,200,await reprogramActivity(db,{teacherId,activityId:url.pathname.split("/")[3],newDate:body.newDate,reason:body.reason,changeType:body.changeType}),origin);}
      catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);}return;
    }
    if (request.method === "POST" && url.pathname === "/api/project-flow/emergent-preview") {
      try {
        const body = await readJson(request), classroom = await annualPlanningContext();
        if (!classroom) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
        const situation = String(body.situation ?? "").trim();
        if (situation.length < 20 || situation.length > 1000) throw new Error("Describe brevemente qué interés o situación apareció en el grupo.");
        const active = (await db.query(`select id,proposal,document_context from annual_plans
          where classroom_id=$1 and school_year_id=$2 and status='active'`, [classroom.id,classroom.school_year_id])).rows[0];
        if (!active || active.proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT) throw new Error("Confirma primero «Mi año» para añadir una propuesta.");
        const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [classroom.id])).rows
          .flatMap((item) => [item.first_name,item.last_name,item.preferred_name]).filter(Boolean);
        const curriculum = await ageFilteredAnnualCurriculum(classroom);
        const result = await suggestEmergentProposal({ allowedIds: curriculum.map((card) => card.id),
          context: { age: classroom.age, school_year: classroom.year,
            situation: neutralizeAssessmentText(situation, names),
            diagnostic_group: active.document_context?.diagnostic_group,
            priorities: classroom.confirmed_priorities.map((item) => ({ title: neutralizeAssessmentText(item.title, names),
              reason: neutralizeAssessmentText(item.reason, names), competency_ids: item.related_competency_ids })),
            curriculum } });
        let competency_suggestion = null;
        if (jevCompetencySuggester) {
          const anonymousSituation = anonymousDecisionText(situation, names);
          if (anonymousSituation) {
            try {
              const options = buildClassifierOptions((await loadKnowledgeBaseV4()).competencyCards,
                classroom.age, curriculum.map((card) => card.id));
              competency_suggestion = (await jevCompetencySuggester.suggestPlanning({
                situation: anonymousSituation, age: classroom.age, options })).candidate_ids;
            } catch { /* The generated proposal remains available for teacher review. */ }
          }
        }
        send(response, 200, { proposal: result.output, competency_suggestion }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/project-flow/emergent-annual-draft") {
      try {
        const body = await readJson(request), classroom = await annualPlanningContext();
        if (!classroom) { send(response, 404, { error: "Aula no disponible." }, origin); return; }
        const active = (await db.query(`select * from annual_plans where id=$1 and classroom_id=$2
          and school_year_id=$3 and status='active'`, [body.annualPlanId,classroom.id,classroom.school_year_id])).rows[0];
        if (!active || active.proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT) throw new Error("El plan anual vigente no está disponible.");
        if (!["keep", "postpone", "replace"].includes(body.mode)) throw new Error("Elige qué hacer con la propuesta prevista.");
        const rows = [...active.proposal.proposed_experiences];
        const index = rows.findIndex((item) => item.proposal_id === body.targetProposalId);
        if (index < 0) throw new Error("La propuesta prevista ya no está disponible.");
        const target = rows[index];
        const candidate = { proposal_id: randomUUID(), experience_type: "project", title: String(body.proposal?.title ?? "").trim(),
          period: target.period, month: target.month, duration_weeks: Number(body.proposal?.duration_weeks ?? 2),
          rationale: String(body.proposal?.rationale ?? "").trim(), purpose: String(body.proposal?.purpose ?? "").trim(),
          primary_competency_ids: body.proposal?.primary_competency_ids };
        if (body.mode === "replace") rows[index] = candidate;
        else rows.splice(index + (body.mode === "keep" ? 1 : 0), 0, candidate);
        const curriculum = await ageFilteredAnnualCurriculum(classroom);
        const proposal = validateAnnualPreplan({ ...active.proposal, proposed_experiences: rows },
          curriculum.map((card) => card.id), classroom.year);
        let schedule;
        try { schedule = buildEditableAnnualSchedule(classroom.calendar, proposal.proposed_experiences); }
        catch { throw new Error("No hay semanas lectivas suficientes para conservar ambas propuestas. Puedes reemplazar una o ajustar el calendario de «Mi año»."); }
        const copied = await copyConfirmedAnnualPlan(db, teacherId, classroom, active.id,
          annualDocumentContext(classroom), expectedRevision(body.expectedRevision));
        await versionTransaction(db, `annual:${classroom.school_year_id}`, async (tx) => {
          const changed = (await tx.query(`update annual_plans set proposal=$1::jsonb,updated_at=now()
            where id=$2 and classroom_id=$3 and status='draft' and revision=$4 returning revision`,
          [JSON.stringify(proposal),copied.id,classroom.id,copied.revision])).rows[0];
          if (!changed) throw new VersionConflictError("Abre el borrador de «Mi año» para continuar.");
          await replaceAnnualProjectSlots(copied.id, schedule, tx);
        });
        send(response, 201, { id: copied.id, proposal_id: candidate.proposal_id,
          message: "Nueva versión de «Mi año» lista para revisar. Confírmala antes de desarrollar el proyecto." }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "GET" && /^\/api\/project-flow\/[0-9a-f-]+\/image-options$/i.test(url.pathname)) {
      const { classroom, row } = await projectFlowRow(url.pathname.split("/")[3]);
      if (!row) { send(response, 404, { error: "Proyecto no disponible." }, origin); return; }
      const images = await eligibleProjectImages({ title: row.title, purpose: row.purpose,
        situation: row.details?.decisions?.context_summary }, classroom.age);
      send(response, 200, { images: images.map(publicProjectImage), selected_id: row.details?.image_id ?? null,
        suggested_id: row.details?.image_suggested_id ?? null }, origin); return;
    }
    if (request.method === "POST" && /^\/api\/project-flow\/[0-9a-f-]+\/image-suggestion$/i.test(url.pathname)) {
      try {
        const body = await readJson(request);
        const { classroom, row } = await projectFlowRow(url.pathname.split("/")[3]);
        if (!row || row.status !== "draft" || row.details?.stage !== "map_review") {
          send(response, 404, { error: "Proyecto en revisión no disponible." }, origin); return;
        }
        if (!jevFeatureEnabled("project_image")) {
          send(response, 503, { error: "Ayni no pudo recomendar una imagen. Puedes elegirla manualmente." }, origin); return;
        }
        if (Number(body.expectedRevision) !== Number(row.revision)) throw new VersionConflictError("El proyecto cambió. Vuelve a abrirlo.");
        const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`,
          [classroom.id])).rows.flatMap((item) => [item.first_name,item.last_name,item.preferred_name]).filter(Boolean);
        const suggested = await suggestProjectImage({ project: { title: row.title, purpose: row.purpose,
          situation: row.details?.decisions?.context_summary }, age: classroom.age, knownNames: names });
        send(response, 200, { suggested_id: suggested.suggested_id,
          images: suggested.candidates, reason: suggested.reason }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422),
        isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error, "Ayni no pudo recomendar una imagen.") }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai-usage") {
      send(response, 200, await loadTeacherAiUsage(db, teacherId), origin);
      return;
    }
    if (request.method === "GET" && /^\/api\/project-flow\/images\/[a-z0-9_]+$/i.test(url.pathname)) {
      const { classroom, row } = await projectFlowRow(url.searchParams.get("projectId"));
      if (!row) { send(response, 404, { error: "Proyecto no disponible." }, origin); return; }
      const image = (await eligibleProjectImages({ title: row.title, purpose: row.purpose,
        situation: row.details?.decisions?.context_summary }, classroom.age))
        .find((entry) => entry.id === url.pathname.split("/")[4]);
      if (!image) { send(response, 404, { error: "Imagen no disponible." }, origin); return; }
      sendAsset(response, 200, await readFile(image.file), "image/jpeg", origin, "private, max-age=3600"); return;
    }
    if (request.method === "PUT" && /^\/api\/project-flow\/[0-9a-f-]+\/image$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], body = await readJson(request);
        const { classroom, row } = await projectFlowRow(id);
        if (!row || row.status !== "draft" || row.details?.stage !== "map_review") {
          send(response, 404, { error: "Proyecto en revisión no disponible." }, origin); return;
        }
        const images = await eligibleProjectImages({ title: row.title, purpose: row.purpose,
          situation: row.details?.decisions?.context_summary }, classroom.age);
        const selected = body.imageId ?? null;
        if (selected !== null && !images.some((item) => item.id === selected))
          throw new Error("La imagen no pertenece a las opciones elegibles del proyecto.");
        const details = { ...row.details, image_id: selected,
          teacher_overrides: [...(row.details.teacher_overrides ?? []), { field: "image_id",
            from: row.details.image_id ?? null, to: selected, source: "teacher_review", at: new Date().toISOString() }] };
        const saved = (await db.query(`update learning_experiences set details=$1::jsonb
          where id=$2 and classroom_id=$3 and status='draft' and revision=$4 returning *`,
        [JSON.stringify(details), id, classroom.id, expectedRevision(body.expectedRevision)])).rows[0];
        if (!saved) throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
        send(response, 200, { experience: saved }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422),
        isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/project-flow/start") {
      try {
        const body = await readJson(request);
        const source = await projectFlowSource(body.annualPlanId, body.proposalId);
        const previous = (await db.query(`select * from learning_experiences where classroom_id=$1
          and annual_plan_id=$2 and source_proposal_index=$3 and origin='planned'
          and status in ('draft','active') order by version desc limit 1`,
        [source.classroom.id,source.plan.id,source.index])).rows[0];
        if (previous && body.refreshPreview === true) {
          if(previous.status!=='draft'||previous.details?.decisions||previous.details?.dependents||previous.details?.activity_route)
            throw new Error("El contexto ya tiene decisiones revisadas. Actualízalas desde el propósito antes de preparar otro mapa.");
          assertRevision(previous,expectedRevision(body.expectedRevision));
          const planningFeedback = await projectFlowFeedback(source,body,previous.details?.planning_feedback);
          const generated = await generateProjectPreview({context:{...source.aiContext,planning_feedback:planningFeedback},workflow:previous.type});
          const details = {...previous.details,preview:generated.output,planning_feedback:planningFeedback};
          const saved=(await db.query(`update learning_experiences set details=$1::jsonb,generation_metadata=$2::jsonb
            where id=$3 and classroom_id=$4 and status='draft' and revision=$5 returning *`,
            [JSON.stringify(details),JSON.stringify({workflow:'project_preview',...generated.metadata}),previous.id,source.classroom.id,expectedRevision(body.expectedRevision)])).rows[0];
          if(!saved)throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
          const calendar_review=await ensureProjectCalendarSelection(saved,source);
          send(response,200,{experience:saved,existing:true,available_dates:calendar_review.selected_dates,calendar_review},origin);return;
        }
        if (previous) { const previousSource = previous.annual_plan_id === source.plan.id ? source
          : await projectFlowSource(previous.annual_plan_id, previous.source_proposal_id, true, previous.source_proposal_index);
          const calendar_review=await ensureProjectCalendarSelection(previous,previousSource);send(response, 200, { experience: previous, existing: true,
          available_dates: calendar_review.selected_dates,calendar_review }, origin); return; }
        const planningFeedback = await projectFlowFeedback(source,body);
        const generated = await generateProjectPreview({ context: {...source.aiContext,planning_feedback:planningFeedback}, workflow: source.source.experience_type });
        const id = randomUUID();
        const details = { flow_version: "project-master-v1", stage: "decisions", preview: generated.output,planning_feedback:planningFeedback };
        const saved = (await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,
          status,details,annual_plan_id,origin,source_proposal_index,source_proposal_id,generation_metadata)
          values($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,'planned',$10,$11,$12::jsonb)
          returning *`, [id,source.classroom.id,source.source.experience_type,source.source.title,source.source.purpose,
          source.slot.starts_on,source.slot.ends_on,JSON.stringify(details),source.plan.id,source.index,source.proposalId,
          JSON.stringify({ workflow: "project_preview", ...generated.metadata })])).rows[0];
        const calendar_review=await ensureProjectCalendarSelection(saved,source);
        send(response, 201, { experience: saved, existing: false, available_dates: calendar_review.selected_dates,calendar_review }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "GET" && /^\/api\/project-flow\/[0-9a-f-]+$/i.test(url.pathname)) {
      const { row } = await projectFlowRow(url.pathname.split("/")[3]);
      const source = row?.annual_plan_id ? await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index) : null;
      const calendar_review=row&&source?await ensureProjectCalendarSelection(row,source):null;
      const protectedVersion = row ? await protectedProjectVersion(row) : null;
      const protected_route_ids = protectedVersion?.sourceRoute.filter((item) =>
        item.date <= protectedVersion.today || protectedVersion.recordedRouteIds.includes(item.id)).map((item) => item.id) ?? [];
      send(response, row ? 200 : 404, row ? { experience: row,
        ...(planningV3ReadEnabled() ? { project_master_v3: projectMasterV3(row,
          {planVersion:source?.plan.version,slotId:source?.slot.id,proposalId:source?.proposalId}) } : {}),
        available_dates: calendar_review?.selected_dates ?? source?.dates ?? [],
        calendar_review, protected_route_ids } : { error: "Proyecto no disponible." }, origin); return;
    }
    if (request.method === "POST" && /^\/api\/project-flow\/[0-9a-f-]+\/dependents$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], body = await readJson(request);
        const { row } = await projectFlowRow(id);
        if (!row || row.status !== "draft" || !["project-master-v1", ...(simpleProjectEnabled() ? ["project-master-v2"] : [])].includes(row.details?.flow_version)) { send(response, 404, { error: "Borrador no disponible." }, origin); return; }
        const source = await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index);
        const allowed = (await ageFilteredAnnualCurriculum(source.classroom)).map((card) => card.id);
        const decisions = validateProjectDecisions(body.decisions, allowed);
        assertRevision(row,expectedRevision(body.expectedRevision));
        const planningFeedback = await projectFlowFeedback(source,body,row.details.planning_feedback);
        const result = await generateProjectDependents({ context: { ...source.aiContext,
          planning_feedback: planningFeedback,
          curriculum: source.aiContext.curriculum.filter((card) => decisions.competency_ids.includes(card.id)) },
          decisions, workflow: row.type });
        const details = { flow_version: "project-master-v1", stage: "dependents", preview: row.details.preview,
          decisions, dependents: simpleProjectEnabled() ? retainProjectCriterionIds(result.output, row.details.dependents) : result.output, planning_feedback: planningFeedback,
          previous_map: row.details.activity_route ?? row.details.previous_map ?? null,
          teacher_overrides: row.details.teacher_overrides ?? [],
          ...(Object.hasOwn(row.details, "image_id") ? { image_id: row.details.image_id } : {}),
          image_suggested_id: row.details.image_suggested_id ?? null };
        const saved = (await db.query(`update learning_experiences set purpose=$1,details=$2::jsonb
          where id=$3 and status='draft' and revision=$4 returning *`, [decisions.purpose,JSON.stringify(details),id,
          expectedRevision(body.expectedRevision)])).rows[0];
        if (!saved) throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
        send(response, 200, { experience: saved }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && /^\/api\/project-flow\/[0-9a-f-]+\/master$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], body = await readJson(request);
        const { row } = await projectFlowRow(id);
        if (!row || row.status !== "draft" || !["project-master-v1", ...(simpleProjectEnabled() ? ["project-master-v2"] : [])].includes(row.details?.flow_version)) { send(response, 404, { error: "Borrador no disponible." }, origin); return; }
        if (!row.details.decisions || !row.details.dependents) throw new Error("Elige primero el propósito y revisa las preguntas.");
        const source = await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index);
        const calendarReview=await ensureProjectCalendarSelection(row,source);
        if(calendarReview.selection.status!=="confirmed")throw new Error("Confirma primero los días del proyecto.");
        const dependents = validateProjectDependents(body.dependents ?? row.details.dependents, row.details.decisions.competency_ids);
        const generated = await generateProjectMaster({ context: { ...source.aiContext,
          planning_feedback: row.details.planning_feedback ?? null,
          curriculum: source.aiContext.curriculum.filter((card) => row.details.decisions.competency_ids.includes(card.id)) },
          decisions: row.details.decisions,
          dependents, availableDates: calendarReview.selected_dates, workflow: row.type });
        const base = projectDetails({ source: source.source, preview: row.details.preview,
          decisions: row.details.decisions, dependents, master: generated.output, previous: row.details });
        let imageSuggestion = null;
        if (jevProjectImageEnabled && !Object.hasOwn(row.details, "image_id")) {
          try {
            const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`,
              [source.classroom.id])).rows.flatMap((item) =>
              [item.first_name,item.last_name,item.preferred_name]).filter(Boolean);
            imageSuggestion = await suggestProjectImage({ project: { title: source.source.title,
              purpose: row.details.decisions.purpose, situation: row.details.decisions.context_summary },
              age: source.classroom.age, knownNames: names });
          } catch { /* Image is optional; leave it unset for teacher review. */ }
        }
        let route = preserveTeacherMapEdits(base.activity_route, row.details.previous_map ?? row.details.activity_route,
          row.details.teacher_overrides, row.details.decisions);
        const protectedVersion = simpleProjectEnabled() ? await protectedProjectVersion(row) : null;
        if (protectedVersion) {
          route = retainProtectedProjectRows(protectedVersion.sourceRoute, route, protectedVersion);
          assertFutureProjectMapEdits(protectedVersion.sourceRoute, route, protectedVersion);
        }
        validateEditedActivityMap(route, row.details.decisions, dependents, calendarReview.selected_dates);
        let details = { ...base, activity_route: route, previous_map: row.details.previous_map ?? null,
          image_id: Object.hasOwn(row.details, "image_id") ? row.details.image_id : imageSuggestion?.suggested_id ?? null,
          image_suggested_id: imageSuggestion?.suggested_id ?? row.details.image_suggested_id ?? null,
          stage: "map_review" };
        if (simpleProjectEnabled()) details = stampProjectV3(row, details, source,
          (await loadKnowledgeBaseV4()).version, calendarReview.selected_dates, protectedVersion);
        const saved = (await db.query(`update learning_experiences set title=$1,purpose=$2,details=$3::jsonb,
          generation_metadata=$4::jsonb where id=$5 and status='draft' and revision=$6 returning *`,
        [details.title,details.purpose,JSON.stringify(details),JSON.stringify({ workflow: "project_master", ...generated.metadata }),
          id,expectedRevision(body.expectedRevision)])).rows[0];
        if (!saved) throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
        send(response, 200, { experience: saved }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "PUT" && /^\/api\/project-flow\/[0-9a-f-]+\/map$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], body = await readJson(request);
        const { row } = await projectFlowRow(id);
        if (!row || row.status !== "draft" || row.details?.stage !== "map_review") { send(response, 404, { error: "Mapa no disponible." }, origin); return; }
        const source = await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index);
        const calendarReview=await ensureProjectCalendarSelection(row,source);
        if(calendarReview.selection.status!=="confirmed")throw new Error("Confirma primero los días del proyecto.");
        const route = validateEditedActivityMap(body.activity_route, row.details.decisions, row.details.dependents, calendarReview.selected_dates);
        const protectedVersion = await protectedProjectVersion(row);
        if (protectedVersion) assertFutureProjectMapEdits(protectedVersion.sourceRoute, route, protectedVersion);
        const overrides = [...(row.details.teacher_overrides ?? [])];
        for (const before of row.details.activity_route ?? []) {
          if (!route.some((item) => item.id === before.id))
            overrides.push({ field: "removed", route_item_id: before.id, date: before.date,
              source: "teacher_review", at: new Date().toISOString() });
        }
        for (const item of route) {
          const before = row.details.activity_route?.find((entry) => entry.id === item.id);
          if (!before) { overrides.push({ field: "added", route_item_id: item.id,
            source: "teacher_review", at: new Date().toISOString() }); continue; }
          for (const field of ["date", "title", "specific_purpose", "role_in_project", "expected_progression",
            "competency_ids", "criterion_competency_id", "evaluation_criterion", "expected_evidence",
            "pedagogical_intention", "acceptable_evidence_variations", "observation_focus", "materials",
            "mediation_notes", "continuity_from_previous", "continuity_to_next", "flexibility_notes"]) {
            if (JSON.stringify(before[field]) !== JSON.stringify(item[field]))
              overrides.push({ field, route_item_id: item.id, from: before[field] ?? null,
                to: item[field] ?? null, source: "teacher_review", at: new Date().toISOString() });
          }
        }
        let details = canonicalProjectDetails({ ...row.details, activity_route: route,
          teacher_overrides: overrides });
        if (row.details.contract_version === "project-master-v3") details = stampProjectV3(row, details, source,
          row.details.kb_version, calendarReview.selected_dates, protectedVersion);
        const saved = (await db.query(`update learning_experiences set details=$1::jsonb
          where id=$2 and status='draft' and revision=$3 returning *`, [JSON.stringify(details),id,
          expectedRevision(body.expectedRevision)])).rows[0];
        if (!saved) throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
        send(response, 200, { experience: saved }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && /^\/api\/project-flow\/[0-9a-f-]+\/confirm$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], body = await readJson(request);
        const { row } = await projectFlowRow(id);
        if (row?.status === "active") { send(response, 200, { id: row.id, status: row.status, teacher_confirmed_at: row.teacher_confirmed_at, version: row.version, revision: row.revision, already_confirmed: true }, origin); return; }
        if (!row || row.status !== "draft" || row.details?.stage !== "map_review") { send(response, 404, { error: "Proyecto no disponible para confirmar." }, origin); return; }
        const source = await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index);
        const calendarReview=await ensureProjectCalendarSelection(row,source);
        if(calendarReview.selection.status!=="confirmed")throw new Error("Confirma primero los días del proyecto.");
        const route = validateEditedActivityMap(row.details.activity_route, row.details.decisions, row.details.dependents, calendarReview.selected_dates);
        if (row.details.contract_version === "project-master-v3") validateProjectMasterV3(projectMasterV3(row), {
          instructionalDates: calendarReview.selected_dates,
          allowedCompetencyIds: (await ageFilteredAnnualCurriculum(source.classroom)).map((card) => card.id),
        });
        const protectedVersion = await protectedProjectVersion(row);
        if (protectedVersion) assertFutureProjectMapEdits(protectedVersion.sourceRoute, route, protectedVersion);
        if (row.details.image_id && !(await eligibleProjectImages({ title: row.title, purpose: row.purpose,
          situation: row.details.decisions?.context_summary }, source.classroom.age))
          .some((item) => item.id === row.details.image_id))
          throw new Error("La imagen elegida ya no está disponible para este proyecto.");
        const confirmed = await confirmLearningExperienceVersion(db, source.classroom.id, id, expectedRevision(body.expectedRevision));
        send(response, 200, confirmed, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error) ? conflictPayload(error) : { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && /^\/api\/project-flow\/[0-9a-f-]+\/formalize$/i.test(url.pathname)) {
      try {
        const id = url.pathname.split("/")[3], { row } = await projectFlowRow(id);
        if (!row || row.status !== "active" || !["project-master-v1","project-master-v2"].includes(row.details?.flow_version)) { send(response, 404, { error: "Proyecto confirmado no disponible." }, origin); return; }
        const prior = (await db.query(`select id from experience_formal_contents where experience_id=$1`, [id])).rows[0];
        if (prior) { send(response, 200, { ready: true, already_ready: true }, origin); return; }
        const source = await projectFlowSource(row.annual_plan_id, row.source_proposal_id, true, row.source_proposal_index);
        const generated = await generateProjectFormal({ workflow: row.type, context: { ...source.aiContext,
          curriculum: source.aiContext.curriculum.filter((card) => row.details.decisions?.competency_ids.includes(card.id)),
          confirmed_project_master: confirmedProjectFormalContext(row) } });
        await db.query(`insert into experience_formal_contents(id,experience_id,content,source_revision,generation_metadata)
          values($1,$2,$3::jsonb,$4,$5::jsonb) on conflict (experience_id) do nothing`,
        [randomUUID(),id,JSON.stringify(generated.output),row.revision,JSON.stringify(generated.metadata)]);
        send(response, 200, { ready: true, already_ready: false }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/learning-experiences") {
      const context = await annualPlanningContext(); if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const experiences = (await db.query(`select id,type,title,purpose,starts_on,ends_on,status,annual_plan_id,origin,planning_reason,source_proposal_index,source_proposal_id,details,teacher_confirmed_at,version,revision,lineage_id,supersedes_experience_id,superseded_at from learning_experiences where classroom_id=$1 order by starts_on desc, version desc, id desc`, [context.id])).rows;
      send(response, 200, { experiences }, origin); return;
    }
    if (request.method === "POST" && /^\/api\/learning-experiences\/[0-9a-f-]+\/new-version$/i.test(url.pathname)) {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try { const body=await readJson(request);send(response, 201, await copyConfirmedLearningExperience(db, teacherId, context.id, url.pathname.split("/")[3],expectedRevision(body.expectedRevision)), origin); }
      catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error), reason: error.reason ?? "version_unavailable" }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/competency-options") {
      send(response, 200, await competencyOptionsForWorkflow(url.searchParams.get("workflow") ?? ""), origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/learning-experiences/generate") {
      const classroom = await annualPlanningContext(); if (!classroom) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try {
        const body = await readJson(request); let parent = null;
        const revision = body.sourceExperienceId ? (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='draft' and supersedes_experience_id is not null and type in ('project','unit')`, [body.sourceExperienceId, classroom.id])).rows[0] : null;
        if (body.sourceExperienceId && (!revision || revision.type !== body.workflow)) throw new Error("La versión que quieres regenerar ya no está disponible.");
        if (!revision && !(await db.query(`select 1 from annual_plans where classroom_id=$1 and school_year_id=$2 and status='active' limit 1`, [classroom.id, classroom.school_year_id])).rows.length)
          throw new Error("Confirma primero el plan anual antes de preparar un proyecto o unidad.");
        if (revision?.origin === "emergent") {
          const key = revision.type === "project" ? "project_trigger_or_interest" : "learning_need_or_context";
          body[key] = body[key]?.trim() || revision.details?.[revision.type === "project" ? "trigger_or_interest" : "learning_need_or_context"] || revision.planning_reason;
        }
        if (revision?.origin === "planned" || (!revision && body.origin === "planned")) {
          const annualPlanId = revision ? revision.annual_plan_id : body.annualPlanId;
          const proposalIndex = revision ? revision.source_proposal_index : body.sourceProposalIndex;
          parent = (await db.query(`select id,proposal,status from annual_plans where id=$1 and classroom_id=$2 and status in ('active','archived')`, [annualPlanId, classroom.id])).rows[0];
          const source = parent?.proposal?.proposed_experiences?.[proposalIndex];
          if (!source || source.experience_type !== body.workflow || (!revision && parent.status !== "active")) throw new Error("La propuesta anual activa no coincide con esta experiencia.");
          const contextKey = body.workflow === "project" ? "project_trigger_or_interest" : "learning_need_or_context";
          const primary = Array.isArray(body.primary_competency_ids) ? body.primary_competency_ids : source.primary_competency_ids;
          const secondary = Array.isArray(body.possible_secondary_competency_ids) ? body.possible_secondary_competency_ids : source.possible_secondary_competency_ids ?? [];
          Object.assign(body, { [contextKey]: body[contextKey]?.trim() || source.context_or_trigger || source.rationale, competency_ids: [...new Set([...primary, ...secondary])], planned_experience: { title: source.title, period: source.period, rationale: source.rationale, purpose: source.purpose, context_or_trigger: source.context_or_trigger || source.rationale, primary_competency_ids: primary, possible_secondary_competency_ids: secondary, expected_evidence_categories: source.expected_evidence_categories ?? [], flexibility_notes: source.flexibility_notes ?? "Se ajustará según el interés del grupo.", annual_plan_id: parent.id, source_proposal_index: proposalIndex } });
        }
        const applicable = await applicableCompetencyIds(body.workflow, classroom);
        if (!Array.isArray(body.competency_ids) || body.competency_ids.length < 1 || body.competency_ids.length > 6 || body.competency_ids.some((id) => typeof id !== "string" || !applicable.has(id))) throw new Error("Selecciona al menos una competencia aplicable para esta aula.");
        if(body.usePlanningFeedback===true){
          const feedback=await loadPlanningFeedback(db,{teacherId,classroomId:classroom.id,periodId:body.planningFeedbackPeriodId});
          const summary=planningFeedbackText(feedback);
          if(summary)body.teacher_request=`${String(body.teacher_request||body[body.workflow==="project"?"project_trigger_or_interest":"learning_need_or_context"]||"").slice(0,900)}\n${summary}`;
        }
        const generated = await generateTeacherLearningExperience({ classroom, request: body }); const generationId = randomUUID();
        await pendingAIGenerations.set(generationId, { workflow: generated.internalMetadata.workflow, classroom_id: classroom.id, metadata: safeAnnualGenerationMetadata(generated.internalMetadata), generated_proposal: generated.proposal, createdAt: Date.now(), revision_experience_id: revision?.id ?? null, parent: parent ? { annual_plan_id: parent.id, source_proposal_index: revision ? revision.source_proposal_index : body.sourceProposalIndex } : null });
        send(response, 200, { proposal: generated.proposal, generation_id: generationId }, origin);
      } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No se pudo generar la experiencia.", reason: error?.reason ?? "unknown" }, origin); } return;
    }
    if (request.method === "POST" && url.pathname === "/api/learning-experiences") {
      const context = await annualPlanningContext(); const body = await readJson(request); const pending = typeof body.generationId === "string" ? await pendingAIGenerations.get(body.generationId) : null;
      if (!context || !body.proposal || !["project", "unit"].includes(body.type) || !pending || pending.classroom_id !== context.id || pending.workflow !== body.type) { send(response, 422, { error: "Falta una generación válida de proyecto o unidad." }, origin); return; }
      if (!(await db.query(`select 1 from annual_plans where classroom_id=$1 and school_year_id=$2 and status='active' limit 1`, [context.id, context.school_year_id])).rows.length) { send(response, 422, { error: "Confirma primero el plan anual antes de guardar un proyecto o unidad." }, origin); return; }
      const originType = body.origin === "emergent" ? "emergent" : "planned"; const proposalIndex = originType === "planned" && Number.isInteger(body.sourceProposalIndex) ? body.sourceProposalIndex : null;
      if (originType === "planned" && (!body.annualPlanId || proposalIndex === null)) { send(response, 422, { error: "Falta la propuesta de origen del plan anual." }, origin); return; }
      if (originType === "planned" && (pending.parent?.annual_plan_id !== body.annualPlanId || pending.parent?.source_proposal_index !== proposalIndex)) { send(response, 422, { error: "La propuesta ya no coincide con el plan que inició este proyecto." }, origin); return; }
      if (originType === "emergent" && pending.parent) { send(response, 422, { error: "Esta generación pertenece a una propuesta del plan anual." }, origin); return; }
      if (originType === "emergent" && !cleanText(body.planningReason, 500)) { send(response, 422, { error: "Explica la razón de esta experiencia emergente." }, origin); return; }
      try { validateExperienceDates(body, context); validateLearningExperienceProposal(body.type, body.proposal, await applicableCompetencyIds(body.type, context)); } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); return; }
      if (originType === "planned") {
        const parent = (await db.query(`select proposal from annual_plans where id=$1 and classroom_id=$2 and status in ('active','archived')`, [body.annualPlanId, context.id])).rows[0];
        const source = parent?.proposal?.proposed_experiences?.[proposalIndex];
        if (!source || source.experience_type !== body.type) { send(response, 422, { error: "La propuesta de origen ya no coincide con esta experiencia." }, origin); return; }
      }
      try { const id = randomUUID(); const details = saveExperienceDetails(body.proposal, null, pending.generated_proposal); await db.query(`insert into learning_experiences (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,planning_reason,source_proposal_index,generation_metadata) values ($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,$10,$11,$12,$13::jsonb)`, [id, context.id, body.type, details.title, details.purpose, body.startsOn, body.endsOn, JSON.stringify(details), body.annualPlanId ?? null, originType, body.planningReason ?? null, proposalIndex, JSON.stringify(pending.metadata)]); await pendingAIGenerations.delete(body.generationId); send(response, 200, { id, status: "draft",revision:1 }, origin); } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) || "No se pudo guardar la experiencia." }, origin); } return;
    }
    if (request.method === "PUT" && url.pathname.startsWith("/api/learning-experiences/")) {
      const id = url.pathname.split("/")[3]; const context = await annualPlanningContext(); const body = await readJson(request);
      const current = context && (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='draft'`, [id, context.id])).rows[0];
      if (!current) { send(response, 404, { error: "Borrador no disponible para editar." }, origin); return; }
      const pending = body.generationId ? await pendingAIGenerations.get(body.generationId) : null;
      if (body.generationId && (!pending || pending.workflow !== current.type || pending.classroom_id !== context.id || pending.revision_experience_id !== id ||
          (current.origin === "planned" && (pending.parent?.annual_plan_id !== current.annual_plan_id || pending.parent?.source_proposal_index !== current.source_proposal_index)) ||
          (current.origin === "emergent" && pending.parent))) { send(response, 422, { error: "La regeneración no corresponde a este borrador." }, origin); return; }
      try { const revision=expectedRevision(body.expectedRevision);validateExperienceDates(body, context); validateLearningExperienceProposal(current.type, body.proposal, await applicableCompetencyIds(current.type, context)); if (current.origin === "emergent" && !cleanText(body.planningReason, 500)) throw new Error("Explica la razón de esta experiencia emergente."); const details = saveExperienceDetails(body.proposal, current.details, pending?.generated_proposal); const saved=await versionTransaction(db,`experience:${current.lineage_id}`,async(tx)=>{const result=(await tx.query(`update learning_experiences set title=$1,purpose=$2,starts_on=$3::date,ends_on=$4::date,details=$5::jsonb,planning_reason=$6 where id=$7 and status='draft' and revision=$8 returning revision`, [details.title, details.purpose, body.startsOn, body.endsOn, JSON.stringify(details), current.origin === "emergent" ? body.planningReason : current.planning_reason, id,revision])).rows[0];if(!result){const now=(await tx.query(`select revision from learning_experiences where id=$1`,[id])).rows[0];throw new VersionConflictError(undefined,now?.revision??null);}return result;}); if (pending) await pendingAIGenerations.delete(body.generationId); send(response, 200, { id, status: "draft",revision:Number(saved.revision) }, origin); } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) }, origin); } return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/learning-experiences/") && url.pathname.endsWith("/confirm")) {
      const id = url.pathname.split("/")[3]; const context = await annualPlanningContext(); const current = context && (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2`, [id, context.id])).rows[0];
      if (!current) { send(response, 404, { error: "Experiencia no disponible para confirmar." }, origin); return; }
      if (current.status !== "draft") { send(response, 409, conflictPayload(new VersionConflictError("El proyecto o unidad ya fue confirmado o reemplazado.", current.revision)), origin); return; }
      try {
        validateExperienceDates({ startsOn: annualCalendarDay(current.starts_on), endsOn: annualCalendarDay(current.ends_on) }, context); validateLearningExperienceProposal(current.type, current.details, await applicableCompetencyIds(current.type, context));
        if (current.origin === "emergent" && !cleanText(current.planning_reason, 500)) throw new Error("Explica la razón de esta experiencia emergente.");
        if (current.origin === "planned") { const parent = (await db.query(`select proposal from annual_plans where id=$1 and classroom_id=$2 and status in ('active','archived')`, [current.annual_plan_id, context.id])).rows[0]; const source = parent?.proposal?.proposed_experiences?.[current.source_proposal_index]; if (!source || source.experience_type !== current.type) throw new Error("La propuesta de origen ya no coincide con esta experiencia."); }
        const body=await readJson(request);
        send(response, 200, await confirmLearningExperienceVersion(db, context.id, id,expectedRevision(body.expectedRevision)), origin);
      } catch (error) { send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) }, origin); } return;
    }
    if (request.method === "GET" && url.pathname === "/api/activities") {
      const context = await annualPlanningContext(); const experience = context && await existingLearningExperience(url.searchParams.get("experienceId"), context.id);
      if (!experience) { send(response, 404, { error: "Experiencia confirmada no disponible." }, origin); return; }
      const activities = (await db.query(`select a.id,a.occurs_on,a.title,a.purpose,a.status,a.details,a.preparation,a.teacher_confirmed_at,a.version,a.revision,a.lineage_id,a.supersedes_activity_id,a.superseded_at,
        (select jsonb_build_object('id',w.id,'status',w.status,'revision',w.revision,'details',w.details)
          from activities w join learning_experiences wm on wm.id=w.experience_id and wm.type='workshop'
          where w.linked_main_activity_id=a.id and w.status in ('draft','active','archived')
          order by case w.status when 'draft' then 0 when 'active' then 1 else 2 end,w.version desc limit 1) as workshop,
        (select coalesce(jsonb_agg(jsonb_build_object('id',se.id,'scheduled_on',se.scheduled_on) order by se.scheduled_on),'[]'::jsonb)
          from class_schedule_entries se where se.activity_id=a.id and se.scheduled_on > (now() at time zone 'America/Lima')::date
          and not exists(select 1 from daily_execution_logs del where del.schedule_entry_id=se.id)) as future_schedules
        from activities a where a.experience_id=$1 order by a.occurs_on,a.version`, [experience.id])).rows; send(response, 200, { experience: await activityParentContext(experience), activities }, origin); return;
    }
    if (request.method === "POST" && /^\/api\/activities\/[^/]+\/copy$/.test(url.pathname)) {
      const id=url.pathname.split("/")[3],context=await annualPlanningContext();
      if (!context) { send(response,404,{error:"Aula no disponible."},origin); return; }
      if (await db.query(`select 1 from activities wa join learning_experiences wm on wm.id=wa.experience_id
        where wa.linked_main_activity_id=$1 and wm.classroom_id=$2 and wm.type='workshop'
        and wa.status in ('draft','active') limit 1`, [id, context.id]).then((result) => result.rows.length)) {
        send(response, 422, { error: "Este día tiene un taller vinculado. Prepara una nueva planificación del día desde el proyecto." }, origin); return;
      }
      try { const body=await readJson(request);send(response,200,await copyConfirmedActivity(db,teacherId,context.id,id,expectedRevision(body.expectedRevision)),origin); }
      catch(error) { send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin); }
      return;
    }
    if (request.method === "POST" && /^\/api\/activities\/[^/]+\/switch-schedule$/.test(url.pathname)) {
      const id=url.pathname.split("/")[3],body=await readJson(request),context=await annualPlanningContext();
      const activity=context&&(await db.query(`select a.id,a.supersedes_activity_id from activities a join learning_experiences e on e.id=a.experience_id
        where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[id,context.id])).rows[0];
      if (!activity?.supersedes_activity_id || !body.scheduleEntryId) { send(response,422,{error:"Elige una actividad nueva y un bloque futuro."},origin); return; }
      const changed=await db.query(`update class_schedule_entries se set activity_id=$1 where se.id=$2 and se.classroom_id=$3
        and se.activity_id=$4 and se.scheduled_on > (now() at time zone 'America/Lima')::date
        and not exists(select 1 from daily_execution_logs del where del.schedule_entry_id=se.id)
        returning se.id`,[id,body.scheduleEntryId,context.id,activity.supersedes_activity_id]);
      if (!changed.rows[0]) { send(response,422,{error:"El bloque no es futuro, pertenece a otra actividad o ya tiene ejecución. No se cambió."},origin); return; }
      send(response,200,{id:changed.rows[0].id,activity_id:id},origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/activities/generate") {
      const context = await annualPlanningContext(); const body = await readJson(request); const experience = context && await activeLearningExperience(body.experienceId, context.id);
      if (context && !(await db.query(`select 1 from annual_plans where classroom_id=$1 and school_year_id=$2 and status='active' limit 1`, [context.id, context.school_year_id])).rows.length) { send(response, 422, { error: "Confirma primero el plan anual antes de preparar una actividad." }, origin); return; }
      if (!experience) { send(response, 422, { error: "Selecciona un Project o Unit confirmado." }, origin); return; }
      const routeItem = routeItemFor(experience, body.routeItemId);
      if ((experience.details?.activity_route?.length && !routeItem) || (body.routeItemId && !routeItem)) { send(response, 422, { error: "Elige una actividad de la ruta confirmada." }, origin); return; }
      const allowed = await activityAllowedCompetencies(experience, context);
      if ((routeItem?.competency_id || body.competencyId) && !allowed.has(routeItem?.competency_id || body.competencyId)) { send(response, 422, { error: "La competencia no pertenece a la experiencia." }, origin); return; }
      try { if(body.usePlanningFeedback===true){const feedback=await loadPlanningFeedback(db,{teacherId,classroomId:context.id,periodId:body.planningFeedbackPeriodId});const summary=planningFeedbackText(feedback);if(summary)body.context=`${String(body.context||"").slice(0,500)}\n${summary}`.slice(0,1000);}
        const generated = await generateTeacherActivity({ request: body, classroom: context, learningExperience: await activityParentContext(experience) });
        const routeIndex = routeItem ? experience.details.activity_route.findIndex((item) => item.id === routeItem.id) + 1 : null;
        const master = routeIndex ? (await db.query(`select * from learning_experiences where parent_project_id=$1 and type='workshop' and status='active'`, [experience.id])).rows[0] : null;
        let workshop = null;
        let workshopError = null;
        if (master && workshopItemIsSelected(master.details.items?.[routeIndex - 1])) {
          const item = master.details.items?.[routeIndex - 1];
          try {
            const sheet = item?.sheet_id ? (await availableSheets({ age: context.age, competencyId: item.competency_id }))
              .find((candidate) => candidate.id === item.sheet_id) : null;
            if (item?.sheet_id && !sheet) throw new Error("La ficha elegida para este día ya no está disponible.");
            workshop = await generateWorkshopDay({ classroom: context, project: experience, master,
              itemIndex: routeIndex, mainActivity: generated.proposal, sheet });
          } catch (error) { workshopError = publicErrorMessage(error) || "No se pudo preparar el taller opcional."; }
        }
        const generationId = randomUUID();
        await pendingAIGenerations.set(generationId, { workflow: "activity", classroom_id: context.id,
          learning_experience_id: experience.id, route_item_id: routeItem?.id ?? null,
          workshop_master_id: workshop ? master.id : null, workshop_item_index: workshop ? routeIndex : null,
          workshop_metadata: workshop?.metadata ?? null,
          metadata: safeAnnualGenerationMetadata(generated.internalMetadata), createdAt: Date.now() });
        send(response, 200, { proposal: inheritedActivityEnabled() ? { ...generated.proposal, teacher_context: cleanText(body.context, 1000) } : generated.proposal, workshop_proposal: workshop?.proposal ?? null,
          workshop_error: workshopError,
          generation_id: generationId }, origin); } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No se pudo generar la actividad." }, origin); } return;
    }
    if (request.method === "POST" && url.pathname === "/api/activities") {
      const context = await annualPlanningContext(); const body = await readJson(request); const experience = context && await activeLearningExperience(body.experienceId, context.id); const pending = await pendingAIGenerations.get(body.generationId);
      if (context && !(await db.query(`select 1 from annual_plans where classroom_id=$1 and school_year_id=$2 and status='active' limit 1`, [context.id, context.school_year_id])).rows.length) { send(response, 422, { error: "Confirma primero el plan anual antes de guardar una actividad." }, origin); return; }
      if (!experience || !pending || pending.workflow !== "activity" || pending.classroom_id !== context.id || pending.learning_experience_id !== experience.id) { send(response, 422, { error: "La generación de actividad no corresponde a esta experiencia." }, origin); return; }
      try {
        const routeItem = routeItemFor(experience, pending.route_item_id);
        if (experience.details?.activity_route?.length && !routeItem) throw new Error("La actividad de origen ya no está en la ruta confirmada.");
        const occursOn = routeItem?.planned_date ?? routeItem?.date ?? body.occursOn;
        validateActivityDate(occursOn, experience, context);
        const calendar = await loadEffectiveCalendar(db, { teacherId, classroomId: context.id, from: occursOn, to: occursOn });
        validateSelectedInstructionalDates(calendar.days, [occursOn], annualCalendarDay(experience.starts_on), annualCalendarDay(experience.ends_on));
        validateActivityV4(body.proposal, await activityAllowedCompetencies(experience, context));
        const master = body.workshopProposal ? await activeWorkshopForProject(db, experience.id) : null;
        if (body.workshopProposal && pending.workshop_master_id !== (master?.id ?? null))
          throw new VersionConflictError("El maestro de talleres cambió. Puedes guardar solo la actividad o preparar de nuevo el día.");
        const id = randomUUID();
        const details = persistInheritedActivity({ id, experience_id: experience.id, version: 1, status: "draft", occurs_on: occursOn },
          saveActivityDetails(body.proposal, routeItem, null, Boolean(body.workshopProposal)), experience);
        const pair = await insertDailyPair(db, { experience, occursOn, mainId: id, mainDetails: details,
          materials: normalizeActivityMaterials([...(routeItem?.materials ?? []), ...normalizeActivityMaterials(body.materials)]), mainMetadata: pending.metadata,
          master, workshopIndex: pending.workshop_item_index, workshopProposal: body.workshopProposal,
          workshopMetadata: pending.workshop_metadata });
        await pendingAIGenerations.delete(body.generationId);
        send(response, 200, { id, workshopId: pair.workshopId, status: "draft", revision: 1,
          workshopRevision: pair.workshopId ? 1 : null, occurs_on: occursOn }, origin); } catch(error) { send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin); } return;
    }
    if (request.method === "PUT" && url.pathname.startsWith("/api/activities/")) {
      const id=url.pathname.split("/")[3]; const context=await annualPlanningContext(); const body=await readJson(request); const current=context&&(await db.query(`select a.*,e.classroom_id,e.version as experience_version,e.status as experience_status,e.details as experience_details,e.starts_on as experience_starts_on,e.ends_on as experience_ends_on from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='draft'`,[id,context.id])).rows[0];
      if(!current||!["active","archived"].includes(current.experience_status)){send(response,404,{error:"Borrador no disponible."},origin);return;} const pending=typeof body.generationId==="string"?await pendingAIGenerations.get(body.generationId):null; if(body.generationId&&(!pending||pending.workflow!=="activity"||pending.classroom_id!==context.id||pending.learning_experience_id!==current.experience_id)){send(response,422,{error:"La regeneración no corresponde a esta actividad."},origin);return;} try {
        const revision = expectedRevision(body.expectedRevision);
        const parent = { id: current.experience_id, version: current.experience_version, status: current.experience_status, details: current.experience_details };
        const routeItem = routeItemFor(parent, current.details?.route_item_id);
        if (current.experience_details?.activity_route?.length && !routeItem) throw new Error("La actividad ya no corresponde a la ruta del proyecto.");
        const occursOn = routeItem?.planned_date ?? routeItem?.date ?? annualCalendarDay(current.planned_date ?? current.occurs_on);
        validateActivityDate(occursOn, { starts_on: current.experience_starts_on, ends_on: current.experience_ends_on }, context);
        const calendar = await loadEffectiveCalendar(db, { teacherId, classroomId: context.id, from: occursOn, to: occursOn });
        validateSelectedInstructionalDates(calendar.days, [occursOn], annualCalendarDay(current.experience_starts_on), annualCalendarDay(current.experience_ends_on));
        validateActivityV4(body.proposal, await activityAllowedCompetencies(parent, context));
        const workshopDraft = await linkedWorkshopDraft(db, id, context.id);
        if (workshopDraft && pending && pending.workshop_master_id !== workshopDraft.experience_id)
          throw new VersionConflictError("El taller generado corresponde a otra versión del maestro.");
        const details = persistInheritedActivity({ ...current, occurs_on: occursOn },
          saveActivityDetails(body.proposal, routeItem, current.details, Boolean(workshopDraft)), parent);
        const saved = await updateDailyPair(db, { mainId: id, lineageId: current.lineage_id, revision,
          mainValues: [occursOn, details.title, details.purpose, JSON.stringify(details),
            JSON.stringify(activityPreparationV3(details, normalizeActivityMaterials([...(routeItem?.materials ?? []), ...normalizeActivityMaterials(body.materials)])))],
          mainMetadata: pending?.metadata, workshopDraft,
          workshopProposal: body.workshopProposal ?? workshopDraft?.details,
          workshopRevision: workshopDraft ? expectedRevision(body.workshopRevision) : null,
          workshopMetadata: pending?.workshop_metadata });
        if (pending) await pendingAIGenerations.delete(body.generationId);
        send(response, 200, { id, status: "draft", revision: saved.revision,
          workshopRevision: saved.workshopRevision, occurs_on: occursOn }, origin);
      }catch(error){send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin);}return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/activities/") && url.pathname.endsWith("/confirm")) {
      const id = url.pathname.split("/")[3];
      const context = await annualPlanningContext();
      const current = context && (await db.query(`select a.*,e.classroom_id,e.version as experience_version,e.status as experience_status,e.details as experience_details,e.starts_on as experience_starts_on,e.ends_on as experience_ends_on from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2`, [id, context.id])).rows[0];
      if (!current || !["active", "archived"].includes(current.experience_status)) {
        send(response, 404, { error: "Actividad no disponible." }, origin);
        return;
      }
      if (current.status !== "draft") { send(response, 409, conflictPayload(new VersionConflictError("La actividad ya fue confirmada o reemplazada.", current.revision)), origin); return; }
      try {
        validateActivityDate(annualCalendarDay(current.occurs_on), { starts_on: current.experience_starts_on, ends_on: current.experience_ends_on }, context);
        validateActivityV4(current.details, await activityAllowedCompetencies({ details: current.experience_details }, context));
        const routeItem = routeItemFor({ details: current.experience_details }, current.details?.route_item_id);
        if (current.experience_details?.activity_route?.length && !routeItem) throw new Error("La actividad ya no pertenece a la ruta confirmada.");
        let criterion = inheritedActivityCriterion(current.details, routeItem);
        if (current.details.activity_contract?.contract_version === "activity-v3") {
          const parent = { id: current.experience_id, version: current.experience_version, status: current.experience_status, details: current.experience_details };
          validateActivityV3(activityV3({ ...current, occurs_on: annualCalendarDay(current.occurs_on) }, parent), projectMasterV3(parent));
          criterion = activityCriteriaV3(current.details);
        }
        const body=await readJson(request);
        const workshopDraft = await linkedWorkshopDraft(db, id, context.id);
        if (current.details?.document_template_version === "activity-with-workshop-v1" && !workshopDraft)
          throw new Error("El taller del día debe revisarse antes de confirmar la actividad.");
        const workshop = workshopDraft ? { id: workshopDraft.id,
          competencyId: workshopDraft.details.competency_id,
          expectedRevision: expectedRevision(body.workshopRevision) } : null;
        const confirmed = await confirmActivityWithCriterion(db, id, criterion, randomUUID(), expectedRevision(body.expectedRevision), workshop);
        send(response, 200, confirmed, origin);
      } catch (error) {
        send(response, httpStatusForError(error, 422), isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) }, origin);
      }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/activity-criteria") {
      const context=await annualPlanningContext();const activity=context&&(await db.query(`select a.*,e.details as experience_details,e.title as experience_title,e.purpose as experience_purpose from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[url.searchParams.get("activityId"),context.id])).rows[0];if(!activity){send(response,404,{error:"Actividad confirmada no disponible."},origin);return;}const criteria=(await db.query(`select id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at,version,revision,lineage_id,supersedes_criterion_id,superseded_at from activity_criteria where activity_id=$1 and competency_v4_id=$2 order by case status when 'draft' then 0 when 'active' then 1 else 2 end,version desc`,[activity.id,activity.details?.competency_id])).rows;send(response,200,{activity:{id:activity.id,title:activity.title,details:activity.details},criteria},origin);return;
    }
    if(request.method==="POST" && /^\/api\/activity-criteria\/[^/]+\/copy$/.test(url.pathname)) {
      const id=url.pathname.split("/")[3],context=await annualPlanningContext();
      if(!context){send(response,404,{error:"Aula no disponible."},origin);return;}
      try {const body=await readJson(request);send(response,200,await copyConfirmedCriterion(db,teacherId,context.id,id,expectedRevision(body.expectedRevision)),origin);}
      catch(error){send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin);}
      return;
    }
    if(request.method==="POST"&&url.pathname==="/api/ai/activity-criteria/generate"){
      const context=await annualPlanningContext();const body=await readJson(request);const activity=context&&(await db.query(`select a.*,e.id as parent_id,e.type as parent_type,e.title as parent_title,e.purpose as parent_purpose,e.details as parent_details from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[body.activityId,context.id])).rows[0];if(!activity||activity.details?.competency_status!=="confirmed"||!activity.details?.competency_id){send(response,422,{error:"Confirma la competencia de la actividad antes de preparar el criterio."},origin);return;}const allowed=await activityAllowedCompetencies({details:activity.parent_details},context);if(!allowed.has(activity.details.competency_id)){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{const generated=await generateCriterionEvidence({classroom:context,activity,parent:{id:activity.parent_id,type:activity.parent_type,title:activity.parent_title,purpose:activity.parent_purpose,details:activity.parent_details},note:cleanText(body.note,1000)});const generationId=randomUUID();await pendingAIGenerations.set(generationId,{workflow:"criterion_realignment",classroom_id:context.id,activity_id:activity.id,competency_v4_id:activity.details.competency_id,metadata:safeAnnualGenerationMetadata(generated.internalMetadata),createdAt:Date.now()});send(response,200,{proposal:generated.proposal,generation_id:generationId},origin);}catch{send(response,422,{error:"No pudimos generar un criterio válido."},origin);}return;
    }
    if(request.method==="POST"&&url.pathname==="/api/activity-criteria"){
      const context=await annualPlanningContext();const body=await readJson(request);const pending=await pendingAIGenerations.get(body.generationId);const activity=context&&(await db.query(`select a.*,e.details as parent_details from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[body.activityId,context.id])).rows[0];if(!activity||!pending||pending.workflow!=="criterion_realignment"||pending.classroom_id!==context.id||pending.activity_id!==activity.id||pending.competency_v4_id!==activity.details?.competency_id){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{const allowed=await activityAllowedCompetencies({details:activity.parent_details},context);if(activity.details?.competency_status!=="confirmed"||!allowed.has(activity.details.competency_id))throw new Error("El criterio ya no corresponde a esta actividad.");validateCriterionEvidenceV4(body.proposal,activity.details.competency_id);const existing=(await db.query(`select id,revision,lineage_id,status from activity_criteria where activity_id=$1 and competency_v4_id=$2 and status='draft'`,[activity.id,activity.details.competency_id])).rows[0];const active=(await db.query(`select id from activity_criteria where activity_id=$1 and competency_v4_id=$2 and status='active'`,[activity.id,activity.details.competency_id])).rows[0];if(active&&!existing)throw new Error("Prepara una nueva versión del criterio confirmado antes de regenerarlo.");const id=existing?.id??randomUUID();let revision=1;if(existing){const expected=expectedRevision(body.expectedRevision);const saved=await versionTransaction(db,`criterion:${existing.lineage_id}`,async(tx)=>{const result=(await tx.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,generation_metadata=$3::jsonb,updated_at=now() where id=$4 and status='draft' and revision=$5 returning revision`,[body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata),id,expected])).rows[0];if(!result)throw new VersionConflictError(undefined,(await tx.query(`select revision from activity_criteria where id=$1`,[id])).rows[0]?.revision??null);return result;});revision=Number(saved.revision);}else await db.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,details,generation_metadata,status) values($1,$2,null,$3,null,$4,$5::jsonb,$6::jsonb,'draft')`,[id,activity.id,activity.details.competency_id,body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata)]);await pendingAIGenerations.delete(body.generationId);send(response,200,{id,status:"draft",revision},origin);}catch(error){send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin);}return;
    }
    if(request.method==="PUT"&&url.pathname.startsWith("/api/activity-criteria/")){
      const id=url.pathname.split("/")[3],context=await annualPlanningContext(),body=await readJson(request);const current=context&&(await db.query(`select ac.*,a.details as activity_details,e.classroom_id,e.details as parent_details from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where ac.id=$1 and e.classroom_id=$2 and a.status='active'`,[id,context.id])).rows[0];if(!current){send(response,404,{error:"Criterio no disponible."},origin);return;}if(current.status!=="draft"){send(response,409,conflictPayload(new VersionConflictError("El criterio ya fue confirmado o reemplazado.",current.revision)),origin);return;}const pending=body.generationId&&await pendingAIGenerations.get(body.generationId);if(body.generationId&&(!pending||pending.workflow!=="criterion_realignment"||pending.activity_id!==current.activity_id||pending.classroom_id!==context.id||pending.competency_v4_id!==current.competency_v4_id)){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{const revision=expectedRevision(body.expectedRevision);await validateStoredActivityCriterion(current,context);validateCriterionEvidenceV4(body.proposal,current.activity_details.competency_id);const saved=await versionTransaction(db,`criterion:${current.lineage_id}`,async(tx)=>{const result=pending?await tx.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,generation_metadata=$3::jsonb,updated_at=now() where id=$4 and status='draft' and revision=$5 returning revision`,[body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata),id,revision]):await tx.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,updated_at=now() where id=$3 and status='draft' and revision=$4 returning revision`,[body.proposal.criterion_text,JSON.stringify(body.proposal),id,revision]);if(!result.rows[0])throw new VersionConflictError(undefined,(await tx.query(`select revision from activity_criteria where id=$1`,[id])).rows[0]?.revision??null);return result.rows[0];});if(pending)await pendingAIGenerations.delete(body.generationId);send(response,200,{id,status:"draft",revision:Number(saved.revision)},origin)}catch(error){send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin)}return;
    }
    if(request.method==="POST"&&url.pathname.startsWith("/api/activity-criteria/")&&url.pathname.endsWith("/confirm")){
      const id=url.pathname.split("/")[3],context=await annualPlanningContext();const current=context&&(await db.query(`select ac.*,a.details as activity_details,e.classroom_id,e.details as parent_details from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where ac.id=$1 and e.classroom_id=$2 and a.status='active'`,[id,context.id])).rows[0];if(!current){send(response,404,{error:"Criterio no disponible."},origin);return;}if(current.status!=="draft"){send(response,409,conflictPayload(new VersionConflictError("El criterio ya fue confirmado o reemplazado.",current.revision)),origin);return;}try{const body=await readJson(request);await validateStoredActivityCriterion(current,context);validateCriterionEvidenceV4(current.details,current.activity_details.competency_id);const result=await confirmCriterionVersion(db,id,current.activity_id,expectedRevision(body.expectedRevision));send(response,200,result,origin)}catch(error){send(response,httpStatusForError(error,422),isVersionConflict(error)?conflictPayload(error):{error:publicErrorMessage(error)},origin)}return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/activity/options") {
      send(response, 200, await activityGenerationOptions(), origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/activity/generate") {
      const classroom = await activeClassroomForActivityGeneration();
      if (!classroom) {
        send(response, 403, { error: "No se encontró un aula activa para generar la actividad." }, origin);
        return;
      }
      const body = await readJson(request);
      try {
        const generated = await generateTeacherActivity({ request: body, classroom });
        // Metadata and provenance stay on the server boundary for future audit storage; the UI receives only the validated proposal.
        send(response, 200, { proposal: generated.proposal }, origin);
      } catch (error) {
        send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) || "No pudimos preparar la actividad." }, origin);
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/diagnostics/complete") {
      try { await completeDiagnosticReviewForTeacher(db, teacherId); }
      catch (error) {
        if (error instanceof DiagnosticReviewError) { send(response, error.reason === "no_classroom" ? 404 : 422, { error: publicErrorMessage(error) }, origin); return; }
        throw error;
      }
      send(response, 200, { workspace: await diagnosticWorkspace() }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/diagnostics/experience-observations") {
      try {
        const saved = await recordDiagnosticExperienceObservation(db, teacherId, await readJson(request));
        try { await refreshStudentContextSnapshot(db, saved.studentId); }
        catch { recordOperationalEvent("student_context_refresh_failed", { workflow: "diagnostic" }); }
        send(response, 201, { workspace: await diagnosticWorkspace() }, origin);
      } catch (error) {
        if (error instanceof DiagnosticExperienceError) {
          send(response, error.reason === "invalid_student" ? 403 : error.reason === "no_classroom" ? 404 : 400,
            { error: publicErrorMessage(error) }, origin);
          return;
        }
        throw error;
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/diagnostics") {
      const body = await readJson(request);
      const context = cleanText(body.observationContext, 240);
      const observation = cleanText(body.observationText, 4000);
      const interpretation = cleanText(body.teacherInterpretation, 2000);
      const status = body.referenceStatus;
      const allowedStatuses = new Set(["observed", "with_support", "not_observed_yet", "need_more_information"]);
      if (!body.studentId || !body.competencyId || !body.referenceId || !allowedStatuses.has(status)) {
        send(response, 400, { error: "Selecciona estudiante, referente y estado observacional." }, origin);
        return;
      }
      const allowed = await db.query(`
        select s.classroom_id, r.guide_id from students s
        join classrooms c on c.id = s.classroom_id
        join age_grades ag on ag.id = c.age_grade_id
        join competency_observation_guides g on g.competency_id = $2 and g.age = ag.age_years and g.is_active = true
        join observation_references r on r.guide_id = g.id and r.id = $3 and r.is_active = true and r.reviewed_at is not null
        where s.id = $1 and c.teacher_id = $4 and
          jsonb_array_length(r.performance_ids) > 0 and not exists (
            select 1 from jsonb_array_elements_text(r.performance_ids) pid
            left join performances p on p.id = pid.value::uuid and p.competency_id = g.competency_id
              and p.age_grade_id = c.age_grade_id
            where p.id is null
          )
      `, [body.studentId, body.competencyId, body.referenceId, teacherId]);
      if (!allowed.rows.length) {
        send(response, 403, { error: "La selección no pertenece al aula o guía activa." }, origin);
        return;
      }
      let session = (await db.query(`select id from diagnostic_sessions where classroom_id = $1 and status = 'active' order by started_at desc limit 1`, [allowed.rows[0].classroom_id])).rows[0];
      if (!session) {
        session = { id: randomUUID() };
        await db.query(`insert into diagnostic_sessions (id, classroom_id, title, created_by)
          values ($1, $2, $3, $4)`, [session.id, allowed.rows[0].classroom_id, `Diagnóstico inicial ${new Date().getFullYear()}`, teacherId]);
      }
      const confirmed = body.teacherConfirmed === true;
      const existing = (await db.query(`select id from diagnostic_entries where session_id = $1 and student_id = $2 and competency_id = $3`, [session.id, body.studentId, body.competencyId])).rows[0];
      const entryId = existing?.id ?? randomUUID();
      await db.exec("begin");
      try {
      await db.query(`insert into diagnostic_entries
        (id, session_id, student_id, competency_id, guide_id, observation_context,
         observation_text, teacher_interpretation, teacher_confirmed, status)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (session_id, student_id, competency_id) do update set
          guide_id = excluded.guide_id, observation_context = excluded.observation_context,
          observation_text = excluded.observation_text, teacher_interpretation = excluded.teacher_interpretation,
          teacher_confirmed = excluded.teacher_confirmed, status = excluded.status, updated_at = now()
      `, [entryId, session.id, body.studentId, body.competencyId, allowed.rows[0].guide_id,
        context || "Observación en aula", observation || null, interpretation || null, confirmed, confirmed ? "confirmed" : "draft"]);
      await db.query(`insert into student_observations
        (id, diagnostic_entry_id, reference_id, status, note, author_id)
        values ($1,$2,$3,$4,$5,$6)
        on conflict (diagnostic_entry_id, reference_id) do update set
          status = excluded.status, note = excluded.note, observed_at = now()
      `, [randomUUID(), entryId, body.referenceId, status, observation || null, teacherId]);
      await refreshStudentContextSnapshot(db, body.studentId);
      await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
      send(response, 201, { workspace: await diagnosticWorkspace() }, origin);
      return;
    }
    if (await handleWorkshopRoute({ request, url, response, origin })) return;
    if (await handlePeriodEvaluationRoute({ request, url, response, origin })) return;
    if (await handleAssessmentMasterRoute({ request, url, response, origin })) return;
    if (await handleAssessmentRoute({ request, url, response, origin })) return;
    if (await handleDescriptiveConclusionRoute({ request, url, response, origin })) return;
    if (await handleFamilyReportRoute({ request, url, response, origin })) return;
    if (url.pathname.startsWith("/api/ordinary-observations")) {
      if (process.env.AYNI_ORDINARY_OBSERVATIONS !== "1") {
        send(response, 404, { error: "Captura de observaciones no habilitada." }, origin); return;
      }
      try {
        if (request.method === "GET" && url.pathname === "/api/ordinary-observations/queue" && curricularReviewEnabled) {
          send(response, 200, { observations: await ordinaryReviewQueue(db, teacherId) }, origin);
        } else if (request.method === "GET" && /^\/api\/ordinary-observations\/[0-9a-f-]+\/attributions$/i.test(url.pathname) && curricularReviewEnabled) {
          const history = await ordinaryAttributionHistory(db, teacherId, url.pathname.split("/")[3]);
          const kb = await loadKnowledgeBaseV4();
          const conditions = { castellanoL2Applicable: history.observation.castellano_l2_applicable === true,
            religionApplicable: history.observation.religion_applicable === true };
          const competencies = kb.competencyCards.filter(card =>
            competencyApplicability(card, history.observation.age, conditions).planning_available)
            .map(card => ({ id: card.id, name: card.official_name }));
          const criteria = history.observation.activity_id ? (await db.query(`select id,competency_id,competency_v4_id,criterion_text
            from activity_criteria where activity_id=$1 and status='active'
            order by teacher_confirmed_at,id`, [history.observation.activity_id])).rows : [];
          send(response, 200, { ...history, competencies, criteria }, origin);
        } else if (request.method === "POST" && /^\/api\/ordinary-observations\/[0-9a-f-]+\/suggest$/i.test(url.pathname) && curricularReviewEnabled) {
          await readJson(request);
          const result = await suggestOrdinaryObservation(teacherId, url.pathname.split("/")[3]);
          send(response, 200, { attribution: result }, origin);
        } else if (request.method === "POST" && /^\/api\/ordinary-observations\/[0-9a-f-]+\/attributions$/i.test(url.pathname) && curricularReviewEnabled) {
          const observationId = url.pathname.split("/")[3], body = await readJson(request);
          const { observation } = await ordinaryAttributionHistory(db, teacherId, observationId);
          const kb = await loadKnowledgeBaseV4();
          const conditions = { castellanoL2Applicable: observation.castellano_l2_applicable === true,
            religionApplicable: observation.religion_applicable === true };
          const allowedIds = kb.competencyCards.filter(card =>
            competencyApplicability(card, observation.age, conditions).planning_available).map(card => card.id);
          const attribution = await confirmOrdinaryAttribution(db, teacherId, observationId, { ...body, allowedIds });
          send(response, 201, { attribution }, origin);
        } else if (request.method === "GET" && url.pathname === "/api/ordinary-observations") {
          send(response, 200, { observations: await listOrdinaryObservations(db, teacherId, url.searchParams.get("studentId")) }, origin);
        } else if (request.method === "POST" && url.pathname === "/api/ordinary-observations") {
          const body = await readJson(request);
          validateOrdinaryObservation({ ...body, hasMedia: Boolean(body.photo) });
          const owned = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
            where s.id=$1 and s.status='active' and c.status='active' and c.teacher_id=$2`, [body.studentId,teacherId])).rows[0];
          if (!owned) { send(response, 403, { error: "El alumno no pertenece a tu aula." }, origin); return; }
          if (!ordinaryStorage && body.photo) {
            send(response, 503, { error: "La foto requiere Storage privado configurado; puedes guardar el texto." }, origin); return;
          }
          const media = await decodePrivateMedia(body.photo);
          if (media?.audio) throw new TypeError("Adjunta una foto; el dictado se guarda como texto transcrito.");
          if (media && !(media.mimeType === "image/png" && media.bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
            && !(media && media.mimeType === "image/jpeg" && media.bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")))
            && !(media && media.mimeType === "image/webp" && media.bytes.toString("ascii", 0, 4) === "RIFF" && media.bytes.toString("ascii", 8, 12) === "WEBP"))
            throw new TypeError("La foto no coincide con su formato declarado.");
          let mediaPath = null;
          try {
            if (media) mediaPath = await ordinaryStorage.save({ teacherId, studentId: body.studentId,
              mimeType: media.mimeType, bytes: media.bytes });
            const result = await saveOrdinaryObservation(db, teacherId, body, {
              mediaPath, mediaMimeType: media?.mimeType ?? null,
              mediaFingerprint: media ? createHash("sha256").update(media.bytes).digest("hex") : null,
              occurredAt: qaDailyClock ? new Date(`${qaDailyClock.date}T${qaDailyClock.time}:00-05:00`) : new Date(),
            });
            if (!result.created && mediaPath) await ordinaryStorage.delete(mediaPath, { teacherId, studentId: body.studentId });
            send(response, result.created ? 201 : 200, result, origin);
            if (result.created && curricularReviewEnabled) await queueOrdinarySuggestion(teacherId, result.observation.id);
          } catch (error) {
            if (mediaPath) await ordinaryStorage.delete(mediaPath, { teacherId, studentId: body.studentId }).catch(() => {});
            throw error;
          }
        } else if (request.method === "POST" && /^\/api\/ordinary-observations\/[0-9a-f-]+\/revisions$/i.test(url.pathname)) {
          const body = await readJson(request);
          const observation = await reviseOrdinaryObservation(db, teacherId, url.pathname.split("/")[3], body);
          send(response, 200, { observation }, origin);
        } else if (request.method === "GET" && /^\/api\/ordinary-observations\/[0-9a-f-]+\/media$/i.test(url.pathname)) {
          if (!ordinaryStorage) { send(response, 503, { error: "Storage privado no configurado." }, origin); return; }
          const row = (await db.query(`select o.student_id,o.media_path from ordinary_observations o
            join classrooms c on c.id=o.classroom_id where o.id=$1 and o.created_by=$2 and c.teacher_id=$2`,
          [url.pathname.split("/")[3],teacherId])).rows[0];
          if (!row?.media_path) { send(response, 404, { error: "Foto no encontrada." }, origin); return; }
          const media = await ordinaryStorage.read(row.media_path, { teacherId, studentId: row.student_id });
          sendAsset(response, 200, media.data, media.mimeType, origin, "private, no-store");
        } else send(response, 404, { error: "Ruta no encontrada." }, origin);
      } catch (error) {
        send(response, error?.status ?? httpStatusForError(error, error instanceof TypeError ? 400 : 422),
          { error: publicErrorMessage(error) }, origin);
      }
      return;
    }
    if (request.method === "POST" && /^\/api\/evidences\/[^/]+\/reassign$/.test(url.pathname)) {
      try {
        const body = await readJson(request);
        const evidence = await reassignEvidenceStudent(db, { ...body, evidenceId: url.pathname.split('/')[3], teacherId }, refreshStudentContextSnapshot);
        send(response, 200, { evidence }, origin);
      } catch (error) { send(response, httpStatusForError(error), { error: publicErrorMessage(error) }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/evidences") {
      const body = await readJson(request);
      if (!evidenceStorage && (body.photo || body.media)) {
        send(response, 503, { error: "Storage privado no configurado. Guarda la observación como texto." }, origin);
        return;
      }
      let capture;
      try { capture = validateEvidenceCaptureV4(body); } catch (error) { send(response, httpStatusForError(error, 400), { error: publicErrorMessage(error) }, origin); return; }
      const allowed = await db.query(`
        select ac.id, ac.competency_id, ac.competency_v4_id, a.details as activity_details, a.occurs_on,
               a.teacher_confirmed_at as activity_confirmed_at, a.linked_main_activity_id,
               a.workshop_item_index, le.type as experience_type
          from students s
          join classrooms cl on cl.id = s.classroom_id
          join learning_experiences le on le.classroom_id = cl.id
          join activities a on a.experience_id = le.id and (a.status = 'active' or
            (a.status = 'archived' and exists (
              select 1 from class_schedule_entries se where se.activity_id=a.id and se.classroom_id=cl.id
                and (se.scheduled_on=(now() at time zone 'America/Lima')::date or
                  (se.scheduled_on is null and se.weekday=extract(dow from (now() at time zone 'America/Lima')::date)))
            )))
          join activity_criteria ac on ac.activity_id = a.id and ac.status = 'active'
         where s.id = $1 and s.status = 'active' and a.id = $2 and ac.id = $3 and cl.teacher_id = $4 and cl.status = 'active'
      `, [capture.studentId, capture.activityId, capture.criterionId, teacherId]);
      if (!allowed.rows.length) {
        send(response, 403, { error: "El registro no pertenece al aula local activa." }, origin);
        return;
      }
      const criterion = allowed.rows[0];
      if (!criterionMatchesConfirmedActivity(criterion)) {
        send(response, 422, { error: "El criterio v4 ya no coincide con la competencia confirmada de la actividad." }, origin);
        return;
      }
      let mediaPath = null;
      try {
        const media = await decodePrivateMedia(body.media ?? body.photo);
        if (media) mediaPath = await evidenceStorage.save({ teacherId, studentId: capture.studentId,
          mimeType: media.mimeType, bytes: media.bytes });
      } catch (error) {
        if (error instanceof TypeError) { send(response, 422, { error: error.message }, origin); return; }
        recordOperationalEvent("evidence_storage_failure", { requestId, status: 500 }); throw error;
      }
      let result;
      try {
      const period=(await db.query(`select ep.id from evaluation_periods ep join classrooms c on c.school_year_id=ep.school_year_id
        join students s on s.classroom_id=c.id where s.id=$1 and $2::date between ep.starts_on and ep.ends_on
        order by ep.starts_on limit 1`,[capture.studentId,criterion.occurs_on])).rows[0];
      const insert=async(runner)=>runner.query(`
        insert into evidences (
          id, student_id, activity_id, criterion_id, type,
          observation_text, observation_status, media_path, observed_on, source, created_by
        ) values ($1, $2, $3, $4, 'observation', $5, $6, $7, $8::date, 'teacher', $9)
        returning id, student_id, observation_text, observation_status, media_path, observed_at, observed_on
      `, [randomUUID(), capture.studentId, capture.activityId, capture.criterionId, capture.observationText || null, capture.observationStatus, mediaPath, criterion.occurs_on, teacherId]);
      result=period?await versionTransaction(db,`period:${period.id}`,insert):await insert(db);
      } catch (error) { if (mediaPath) await evidenceStorage.delete(mediaPath); throw error; }
      await refreshStudentContextSnapshot(db, capture.studentId);
      send(response, 201, { evidence: result.rows[0] }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/attendance") {
      const body = await readJson(request);
      const records = Array.isArray(body.records) ? body.records : [];
      const allowedStatuses = new Set(["present", "absent", "late", "excused"]);
      const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
      if (!classroom) { send(response, 409, { error: "Configura primero un aula activa." }, origin); return; }
      const currentStudents = (await db.query(`select id from students where classroom_id = $1 and status = 'active'`, [classroom.id])).rows;
      const permittedIds = new Set(currentStudents.map((student) => student.id));
      if (!records.length || records.some((record) => !permittedIds.has(record.studentId) || !allowedStatuses.has(record.status))) {
        send(response, 400, { error: "La asistencia contiene estudiantes o estados no válidos." }, origin);
        return;
      }
      const today = qaDailyClock?.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      await db.exec("begin");
      try {
        for (const record of records) await db.query(`insert into attendance_records
          (id, classroom_id, student_id, attendance_date, status, recorded_by)
          values ($1,$2,$3,$4::date,$5,$6)
          on conflict (student_id, attendance_date) do update set status = excluded.status, recorded_at = now(), recorded_by = excluded.recorded_by
        `, [randomUUID(), classroom.id, record.studentId, today, record.status, teacherId]);
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
      send(response, 200, { dashboard: await dashboard() }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/today/execution") {
      const body = await readJson(request);
      const action = body.action;
      const allowedActions = new Set(["start", "complete", "skip", "keep_current", "set_step"]);
      if (!body.scheduleEntryId || !allowedActions.has(action)) {
        send(response, 400, { error: "La acción de jornada no es válida." }, origin);
        return;
      }
      const entry = (await db.query(`select se.id, coalesce(jsonb_array_length(a.preparation->'steps'), 0)::int as total_steps from class_schedule_entries se join classrooms c on c.id = se.classroom_id left join activities a on a.id = se.activity_id where se.id = $1 and c.teacher_id = $2`, [body.scheduleEntryId, teacherId])).rows[0];
      if (!entry) {
        send(response, 403, { error: "El bloque no pertenece al aula activa." }, origin);
        return;
      }
      const today = qaDailyClock?.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (action === "set_step" && !isValidStepIndex(body.stepIndex, entry.total_steps)) {
        send(response, 400, { error: "El paso no pertenece a esta actividad." }, origin);
        return;
      }
      const status = action === "complete" ? "completed" : action === "skip" ? "skipped" : action === "set_step" ? "active" : "active";
      const closureType = action === "complete" ? (body.closureType === "note" ? "note" : "as_planned") : action === "skip" ? "cancelled" : null;
      const closureNote = cleanText(body.closureNote, 800) || null;
      await db.query(`insert into daily_execution_logs
        (id, schedule_entry_id, execution_date, status, actual_started_at, actual_ended_at, teacher_closure_note, closure_type, current_override, current_step_index)
        values ($1,$2,$3::date,$4,case when $4 = 'active' then now() else null end,case when $4 in ('completed','skipped') then now() else null end,$5,$6,$7,$8)
        on conflict (schedule_entry_id, execution_date) do update set
          status = excluded.status, actual_started_at = coalesce(daily_execution_logs.actual_started_at, excluded.actual_started_at),
          actual_ended_at = excluded.actual_ended_at, teacher_closure_note = excluded.teacher_closure_note,
          closure_type = excluded.closure_type, current_override = excluded.current_override,
          current_step_index = case when $9 = 'set_step' then excluded.current_step_index else daily_execution_logs.current_step_index end
      `, [randomUUID(), entry.id, today, status, closureNote, closureType, action === "keep_current", body.stepIndex ?? 0, action]);
      send(response, 200, { dashboard: await dashboard() }, origin);
      return;
    }
    send(response, 404, { error: "Ruta local no encontrada." }, origin);
  } catch {
    recordOperationalEvent("api_unexpected_failure", { requestId, status: 500 });
    send(response, 500, { error: "No se pudo completar la operación.", request_id: requestId }, origin);
  }
}
}

export async function handleApiRequest(request, response) {
  const origin = request.headers.origin;
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (origin && !allowedOrigins.has(origin)) {
    send(response, 403, { error: "Origen no permitido." });
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      ...(origin && allowedOrigins.has(origin) ? {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
      } : {}),
      "access-control-allow-methods": corsMethods,
      "access-control-allow-headers": "content-type, authorization",
      vary: "Origin",
    });
    response.end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/health") {
    send(response, 200, { ok: true, engine: dbMode, ...(dbMode === "local" ? { storage: ".local/pgdata" } : {}) }, origin);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/config") {
    send(response, 200, { mode: authMode }, origin);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = await readJson(request);
      const session = await requestAuth.signIn(body.dni, body.password);
      send(response, 200, { teacherId: session.teacherId }, origin, {
        "set-cookie": requestAuth.sessionCookies(session),
      });
    } catch (error) {
      const status = error instanceof RequestAuthError ? error.status : 401;
      send(response, status, { error: status === 503 ? "No se pudo verificar el servicio de acceso." : "DNI o contraseña inválidos." }, origin);
    }
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    await requestAuth.signOut(request);
    send(response, 200, { ok: true }, origin, { "set-cookie": requestAuth.clearCookies() });
    return;
  }
  const requestDb = database.requestDb();
  return requestDatabaseScope.run(requestDb, async () => {
  try {
  let context;
  try { context = await requestAuth.resolve(request, requestDb); }
  catch (error) {
    const status = error instanceof RequestAuthError ? error.status : 401;
    send(response, status, { error: status === 503 ? "No se pudo verificar la sesión." : "Inicia sesión para continuar." }, origin,
      status === 401 && authMode === "supabase" && !request.headers.authorization ? { "set-cookie": requestAuth.clearCookies() } : {});
    return;
  }
  if (context.sessionCookies) {
    response.setHeader("set-cookie", context.sessionCookies);
    response.setHeader("cache-control", "private, no-store");
  }
  if (context.authMode === "supabase" && context.tokenSource === "cookie" && !["GET", "HEAD"].includes(request.method) && !origin) {
    send(response, 403, { error: "Origen requerido para esta operación." }, origin);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    send(response, 200, { teacherId: context.teacherId }, origin);
    return;
  }
  if (context.authMode === "supabase") {
    try {
      const body = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ? await readJson(request) : null;
      await authorizeRequestSelectors({ db: context.db, teacherId: context.teacherId, url, body });
    } catch (error) {
      if (error instanceof RequestAccessError) send(response, error.status, { error: error.message }, origin);
      else send(response, 400, { error: "Solicitud inválida." }, origin);
      return;
    }
  }
  await withAiUsageContext({ teacherId: context.teacherId, db },
    () => handleAuthenticatedRequest(context, request, response));
  } finally {
    if (dbMode === "postgres") {
      try { await requestDb.close(); }
      catch { recordOperationalEvent("db_request_cleanup_failed", { requestId: context?.requestId, status: 500 }); }
    }
  }
  });
}

if (process.env.AYNI_SERVERLESS !== "1") {
  const server = createServer(handleApiRequest);
  server.listen(port, listenHost, () => {
    console.log(`Ayni API ready at http://${listenHost}:${port} (${authMode})`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await new Promise((resolve) => server.close(resolve));
      await database.close();
      process.exit(0);
    });
  }
}
