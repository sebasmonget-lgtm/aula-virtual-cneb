import { createHash, randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { competencyApplicability } from "../src/lib/competency-applicability.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { assessmentSourceSnapshot, buildAssessmentInput, neutralizeAssessmentText, sanitizeEvidenceForAssessment, validateAssessmentProposal } from "../src/lib/assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput, sameAssessmentSnapshot, sourceAssessmentSnapshot, validateDescriptiveConclusion } from "../src/lib/descriptive-conclusion-v4-service.mjs";
import { dateOnly, defaultEvaluationPeriods, loadPeriodEvaluationRows, periodClosureFingerprint } from "../src/lib/period-evaluation-service.mjs";
import { assertSavedEvaluationDraft, savePeriodEvaluationDraft } from "../src/lib/period-evaluation-draft-service.mjs";
import { closePeriodWithManifest } from "../src/lib/period-closure-history.mjs";
import { confirmBimesterReplan, loadBimesterReplanPreview, recommendWorkshops, replanSummary } from "../src/lib/bimester-replan-service.mjs";
import { loadLibraryResources } from "./library-resources.mjs";
import { loadDiagnosticCoverageRecords, projectPedagogicalCoverage } from "../src/lib/pedagogical-coverage.mjs";
import { assessmentState, observeTodaySuggestions } from "../src/lib/evidence-coverage.mjs";
import { AYNI_HEURISTICS } from "../src/lib/ayni-heuristics.mjs";
import { VersionConflictError, conflictPayload, httpStatusForError, isVersionConflict, publicErrorMessage, versionTransaction } from "../src/lib/version-integrity.mjs";
import { assessmentMasterEntry } from "../src/lib/assessment-master-service.mjs";
import { loadAssessmentMasterSources } from "./assessment-master-routes.mjs";
import { getCurrentClassroomContext, publicClassroomContext } from "../src/lib/classroom-context-service.mjs";
import { buildClassroomPeriodReportInput, buildGenericAssessmentWorkbook, buildPeriodStatistics, classroomReportFingerprint,
  isTeacherAchievementLevel, SIAGIE_EXPORT_STATUS, stableCompetencyLabel, syncPeriodEvaluationMap, validateClassroomPeriodReport } from "../src/lib/period-assessment-closure-service.mjs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value, limit = 4000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const safeCsv = (value) => { const raw = String(value ?? ""); const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; };

export function createPeriodEvaluationRouteHandler({ db, teacherId, evidenceStorage, mediaAvailable = true, readJson, send, pending, metadataForAudit, refreshStudentContext, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4, createProvider = createAIProviderForPlan,
  loadClassroomContext = async (classroom) => publicClassroomContext(await getCurrentClassroomContext(db, teacherId, classroom.id)) }) {
  const fail = (response, origin, error, status = 422) => send(response, httpStatusForError(error, status),
    isVersionConflict(error)?conflictPayload(error):{ error: publicErrorMessage(error) }, origin);

  async function ownedYear(yearId) {
    if (!uuid.test(yearId ?? "")) throw new Error("Año escolar inválido.");
    const row = (await db.query(`select id,year,starts_on,ends_on from school_years where id=$1 and owner_id=$2`, [yearId, teacherId])).rows[0];
    if (!row) throw new Error("Año escolar no disponible.");
    return row;
  }
  async function ownedClassroom(classroomId) {
    if (!uuid.test(classroomId ?? "")) throw new Error("Aula inválida.");
    const row = (await db.query(`select c.id,c.school_year_id,c.section,c.age_grade_id,c.castellano_l2_applicable,c.religion_applicable,ag.age_years as age,sy.year from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`, [classroomId, teacherId])).rows[0];
    if (!row) throw new Error("Aula no disponible.");
    return row;
  }
  async function periodForClass(classroom, periodId) {
    if (!uuid.test(periodId ?? "")) throw new Error("Período inválido.");
    const row = (await db.query(`select * from evaluation_periods where id=$1 and school_year_id=$2`, [periodId, classroom.school_year_id])).rows[0];
    if (!row) throw new Error("El período no corresponde al aula.");
    return { ...row, starts_on: dateOnly(row.starts_on), ends_on: dateOnly(row.ends_on) };
  }
  async function studentForClass(classroom, studentId) {
    if (!uuid.test(studentId ?? "")) throw new Error("Estudiante inválido.");
    const row = (await db.query(`select id,first_name,last_name,preferred_name from students where id=$1 and classroom_id=$2 and status='active'`, [studentId, classroom.id])).rows[0];
    if (!row) throw new Error("Estudiante no disponible en esta aula.");
    return row;
  }
  async function cardsForClass(classroom) {
    const knowledge = await loadKnowledgeBase();
    const cards = knowledge.competencyCards.filter((card) => competencyApplicability(card, classroom.age, {
      castellanoL2Applicable: classroom.castellano_l2_applicable === true,
      religionApplicable: classroom.religion_applicable === true,
    }).planning_available);
    return { cards, knowledge };
  }
  async function ensurePeriods(year) {
    let rows = (await db.query(`select * from evaluation_periods where school_year_id=$1 order by ordinal`, [year.id])).rows;
    if (rows.length) return rows.map((row) => ({ ...row, starts_on: dateOnly(row.starts_on), ends_on: dateOnly(row.ends_on) }));
    const blocks = (await db.query(`select type,start_date,end_date from calendar_blocks where school_year_id=$1 order by start_date`, [year.id])).rows;
    for (const item of defaultEvaluationPeriods(year, blocks)) await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,$3,$4,$5,$6::date,$7::date) on conflict(school_year_id,kind,ordinal) do nothing`, [randomUUID(), year.id, item.kind, item.ordinal, item.label, item.starts_on, item.ends_on]);
    rows = (await db.query(`select * from evaluation_periods where school_year_id=$1 order by ordinal`, [year.id])).rows;
    for (const row of rows) {
      await db.query(`update competency_assessments ca set evaluation_period_id=$1 from students s join classrooms c on c.id=s.classroom_id where ca.student_id=s.id and c.school_year_id=$2 and ca.evaluation_period_id is null and ca.period_start=$3::date and ca.period_end=$4::date`, [row.id, year.id, row.starts_on, row.ends_on]);
      await db.query(`update competency_descriptive_conclusions dc set evaluation_period_id=$1 from students s join classrooms c on c.id=s.classroom_id where dc.student_id=s.id and c.school_year_id=$2 and dc.evaluation_period_id is null and dc.period_start=$3::date and dc.period_end=$4::date`, [row.id, year.id, row.starts_on, row.ends_on]);
    }
    return rows.map((row) => ({ ...row, starts_on: dateOnly(row.starts_on), ends_on: dateOnly(row.ends_on) }));
  }
  async function context(classroomId, periodId) {
    const classroom = await ownedClassroom(classroomId), year = await ownedYear(classroom.school_year_id);
    await ensurePeriods(year);
    const period = await periodForClass(classroom, periodId);
    const evaluationMap = await syncPeriodEvaluationMap(db, { classroomId: classroom.id, schoolYearId: classroom.school_year_id, period });
    const { cards, knowledge } = await cardsForClass(classroom);
    const model = await loadPeriodEvaluationRows(db, { classroomId: classroom.id, period, applicableIds: new Set(cards.map((card) => card.id)) });
    const labels = cards.map(stableCompetencyLabel);
    const labelsReady=(await db.query(`select to_regclass('competency_display_labels') is not null as ready`)).rows[0].ready;
    if(labelsReady) for (const label of labels) await db.query(`insert into competency_display_labels(competency_v4_id,short_label,area) values($1,$2,$3)
      on conflict(competency_v4_id) do update set short_label=excluded.short_label,area=excluded.area,updated_at=now()`, [label.competency_id,label.short_label,label.area]);
    return { classroom, period, cards, knowledge, model, evaluationMap, labels };
  }
  async function diagnosticAntecedents(classroom, period, studentId, competencyId) {
    const records = await loadDiagnosticCoverageRecords(db, classroom.id, {
      starts_on: "1900-01-01", ends_on: period.ends_on,
    });
    return records.filter((item) => item.student_id === studentId && item.competency_id === competencyId)
      .map((item) => ({ id: item.id, source_type: item.source_type,
        observed_on: dateOnly(item.observed_at), situation_title: item.situation_title,
        criterion_text: item.criterion_text, observation_text: item.observation_text,
        media_available: false }))
      .sort((a, b) => a.observed_on.localeCompare(b.observed_on) || a.id.localeCompare(b.id));
  }
  async function plannedCompetencyIds(classroom, period) {
    const rows=(await db.query(`select ps.slot_index,ap.proposal from project_slots ps join annual_plans ap on ap.id=ps.annual_plan_id
      where ap.classroom_id=$1 and ap.status='active' and ps.starts_on<=$3::date and ps.ends_on>=$2::date`,
      [classroom.id,period.starts_on,period.ends_on])).rows;
    return [...new Set(rows.flatMap((slot)=>{const proposal=slot.proposal?.proposed_experiences?.[Number(slot.slot_index)-1];
      return [...(proposal?.primary_competency_ids??[]),...(proposal?.possible_secondary_competency_ids??[])];}))];
  }
  function publicRows(model, cards, labels = []) {
    const names = new Map(cards.map((card) => [card.id, card.official_name]));
    const labelMap = new Map(labels.map((item) => [item.competency_id,item]));
    return model.rows.map((row) => ({ student_id: row.student_id, competency_id: row.competency_v4_id, competency_name: names.get(row.competency_v4_id) ?? row.competency_v4_id, short_label: labelMap.get(row.competency_v4_id)?.short_label ?? names.get(row.competency_v4_id), area: labelMap.get(row.competency_v4_id)?.area ?? "Área curricular", evidence_count: row.sourceRows.length, level: row.assessment?.achievement_level ?? null, conclusion: row.conclusion?.details?.conclusion_text ?? null, state: row.state, assessment_id: row.assessment?.id ?? null }));
  }
  async function closureState(classroom, period, model) {
    const row = (await db.query(`select * from period_closures where classroom_id=$1 and evaluation_period_id=$2`, [classroom.id, period.id])).rows[0];
    return row ? { closed: true, current: row.source_fingerprint === periodClosureFingerprint(model.rows), confirmed_at: row.confirmed_at,
      current_version_id:row.current_version_id,source_fingerprint:periodClosureFingerprint(model.rows) }
      : { closed: false, current: false, confirmed_at: null,current_version_id:null,source_fingerprint:periodClosureFingerprint(model.rows) };
  }
  async function selectedRow(body) {
    const data = await context(body.classroomId, body.periodId);
    await studentForClass(data.classroom, body.studentId);
    const row = data.model.rows.find((item) => item.student_id === body.studentId && item.competency_v4_id === body.competencyId);
    if (!row) throw new Error("Esta competencia no está prevista para el período. Agrégala al alcance del aula si se trabajó.");
    return { ...data, row, card: data.cards.find((item) => item.id === body.competencyId) };
  }

  async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/period-evaluations")) return false;
    try {
      const mediaMatch = url.pathname.match(/^\/api\/period-evaluations\/evidence\/([0-9a-f-]{36})\/media$/i);
      if (request.method === "GET" && mediaMatch) {
        if (!mediaAvailable) { send(response, 503, { error: "Los archivos estarán disponibles al conectar Storage." }, origin); return true; }
        const row = (await db.query(`select e.media_path,e.student_id from evidences e join students s on s.id=e.student_id join classrooms c on c.id=s.classroom_id join school_years sy on sy.id=c.school_year_id where e.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`, [mediaMatch[1], teacherId])).rows[0];
        if (!row?.media_path) throw new Error("Adjunto no disponible para esta aula.");
        const media = await evidenceStorage.read(row.media_path, { teacherId, studentId: row.student_id });
        response.writeHead(200, { "content-type": media.mimeType, "cache-control": "private, no-store", "x-content-type-options": "nosniff", ...(origin ? { "access-control-allow-origin": origin } : {}) });
        response.end(media.data); return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/workspace") {
        const years = (await db.query(`select sy.id,sy.year,sy.starts_on,sy.ends_on from school_years sy where sy.owner_id=$1 order by sy.year desc`, [teacherId])).rows;
        const classrooms = (await db.query(`select c.id,c.school_year_id,c.section,ag.age_years as age from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id where c.teacher_id=$1 and sy.owner_id=$1 order by sy.year desc,c.section`, [teacherId])).rows;
        const periods = [];
        for (const year of years) periods.push(...await ensurePeriods(year));
        send(response, 200, { years: years.map((year) => ({ ...year, starts_on: dateOnly(year.starts_on), ends_on: dateOnly(year.ends_on) })), classrooms, periods }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/replan") {
        const data = await context(url.searchParams.get("classroomId"), url.searchParams.get("periodId"));
        const rows = publicRows(data.model, data.cards, data.labels);
        const statistics = buildPeriodStatistics({ rows, mapEntries: data.evaluationMap.entries,
          competencyMeta: data.labels, studentCount: data.model.students.length,
          plannedCompetencyIds: await plannedCompetencyIds(data.classroom, data.period) });
        const closure = await closureState(data.classroom, data.period, data.model);
        send(response, 200, await loadBimesterReplanPreview(db, { teacherId, classroom: data.classroom,
          period: data.period, statistics, model: data.model, closure,
          competencyNames: new Map(data.cards.map((card) => [card.id, data.labels.find((label) => label.competency_id === card.id)?.short_label ?? card.official_name])),
          workshopResources: await loadLibraryResources() }), origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/replan/confirm") {
        const body = await readJson(request);
        const data = await context(body.classroomId, body.periodId);
        const closure = await closureState(data.classroom, data.period, data.model);
        if (!closure.closed || !closure.current) throw new VersionConflictError("Revisa y cierra el período antes de reajustar el plan.");
        const rows = publicRows(data.model, data.cards, data.labels);
        const statistics = buildPeriodStatistics({ rows, mapEntries: data.evaluationMap.entries,
          competencyMeta: data.labels, studentCount: data.model.students.length,
          plannedCompetencyIds: await plannedCompetencyIds(data.classroom, data.period) });
        const summary = replanSummary(statistics, data.model.students, data.period);
        const resources = await loadLibraryResources();
        const result = await confirmBimesterReplan(db, { teacherId, classroom: data.classroom,
          period: data.period, applicableIds: data.cards.map((card) => card.id),
          expected: body.expected, priorities: body.priorities,
          adjustments: body.adjustments, workshops: body.workshops,
          workshopOptions: recommendWorkshops(resources, data.classroom.age, summary.competencies),
          libraryWorkshops: resources.filter((item) => item.kind === "workshop" && Number(item.age) === Number(data.classroom.age))
            .map((item) => ({ resource_id: item.id })) });
        send(response, 200, result, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/configure") {
        const body = await readJson(request), year = await ownedYear(body.yearId);
        if (!["bimester", "trimester"].includes(body.kind)) throw new Error("Elige bimestres o trimestres.");
        const current = await ensurePeriods(year);
        if (current[0]?.kind === body.kind) { send(response, 200, { periods: current }, origin); return true; }
        const used = (await db.query(`select exists(select 1 from competency_assessments ca join students s on s.id=ca.student_id join classrooms c on c.id=s.classroom_id where c.school_year_id=$1 and ca.evaluation_period_id is not null) or exists(select 1 from period_closures pc join classrooms c on c.id=pc.classroom_id where c.school_year_id=$1) as used`, [year.id])).rows[0].used;
        if (used) throw new Error("Ya hay evaluaciones en este año. No se puede cambiar la organización de períodos.");
        const blocks = (await db.query(`select type,start_date,end_date from calendar_blocks where school_year_id=$1 order by start_date`, [year.id])).rows;
        await db.exec("begin");
        try {
          await db.query(`delete from evaluation_periods where school_year_id=$1`, [year.id]);
          for (const item of defaultEvaluationPeriods(year, blocks, body.kind)) await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,$3,$4,$5,$6::date,$7::date)`, [randomUUID(), year.id, item.kind, item.ordinal, item.label, item.starts_on, item.ends_on]);
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
        send(response, 200, { periods: await ensurePeriods(year) }, origin); return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/coverage") {
        const data=await context(url.searchParams.get("classroomId"),url.searchParams.get("periodId"));
        const counts=(await db.query(`select ac.competency_v4_id,count(distinct a.id)::int as activity_count
          from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences le on le.id=a.experience_id
          where le.classroom_id=$1 and a.status='active' and ac.status='active' and a.occurs_on between $2::date and $3::date
          group by ac.competency_v4_id`,[data.classroom.id,data.period.starts_on,data.period.ends_on])).rows;
        const diagnosticRecords=await loadDiagnosticCoverageRecords(db,data.classroom.id,data.period);
        const projection=projectPedagogicalCoverage({students:data.model.students,cards:data.cards,model:data.model,diagnosticRecords,
          today: data.period.ends_on < new Date().toISOString().slice(0,10) ? data.period.ends_on : new Date().toISOString().slice(0,10),
          activityCounts:new Map(counts.map((item)=>[item.competency_v4_id,Number(item.activity_count)]))});
        send(response,200,{period:data.period,classroom_id:data.classroom.id,...projection},origin);return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/observe-today") {
        const activityId=url.searchParams.get("activityId");
        if(!uuid.test(activityId??"")) throw new Error("Actividad inválida.");
        const activity=(await db.query(`select a.id,a.occurs_on,le.classroom_id from activities a
          join learning_experiences le on le.id=a.experience_id join classrooms c on c.id=le.classroom_id
          join school_years sy on sy.id=c.school_year_id
          where a.id=$1 and a.status='active' and c.teacher_id=$2 and sy.owner_id=$2`,[activityId,teacherId])).rows[0];
        if(!activity){send(response,404,{error:"Actividad no disponible."},origin);return true;}
        const classroom=await ownedClassroom(activity.classroom_id);
        const year=await ownedYear(classroom.school_year_id);
        const periods=await ensurePeriods(year);
        const activityDay=dateOnly(activity.occurs_on);
        const period=periods.find((item)=>item.starts_on<=activityDay&&item.ends_on>=activityDay);
        if(!period){send(response,200,{suggestions:[],message:"Esta actividad no pertenece a un período de evaluación."},origin);return true;}
        const data=await context(classroom.id,period.id);
        const criteria=(await db.query(`select id,competency_v4_id from activity_criteria where activity_id=$1 and status='active'`,[activity.id])).rows;
        const diagnostic=await loadDiagnosticCoverageRecords(db,classroom.id,period);
        const students=data.model.students.map((student)=>({id:student.id,name:[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(" ")}));
        const suggestions=[...new Set(criteria.map((item)=>item.competency_v4_id))].flatMap((competencyId)=>{
          const criterionIds=criteria.filter((item)=>item.competency_v4_id===competencyId).map((item)=>item.id);
          const records=[...data.model.rows.filter((row)=>row.competency_v4_id===competencyId).flatMap((row)=>row.sourceRows.map((item)=>({...item,student_id:row.student_id,competency_id:competencyId,situation_id:item.activity_id,criterion_focus_key:item.criterion_id}))),
            ...diagnostic.filter((item)=>item.competency_id===competencyId)];
          return observeTodaySuggestions(students,records,competencyId,criterionIds,{today:activityDay})
            .map((item)=>({...item,competency_name:data.cards.find((card)=>card.id===competencyId)?.official_name??competencyId}));
        }).sort((a,b)=>a.rank-b.rank||a.student_name.localeCompare(b.student_name,"es"))
          .slice(0,AYNI_HEURISTICS.observe_today_limit);
        send(response,200,{period_id:period.id,suggestions},origin);return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/coverage/detail") {
        const data=await context(url.searchParams.get("classroomId"),url.searchParams.get("periodId"));
        const student=await studentForClass(data.classroom,url.searchParams.get("studentId"));
        const competencyId=url.searchParams.get("competencyId");
        if (!data.cards.some((card)=>card.id===competencyId)) throw new Error("Competencia no disponible para esta aula.");
        const row=data.model.rows.find((item)=>item.student_id===student.id&&item.competency_v4_id===competencyId);
        const diagnostic=await diagnosticAntecedents(data.classroom,data.period,student.id,competencyId);
        const timeline=[...(row?.sourceRows??[]).map((item)=>({id:item.id,source_type:"activity_evidence",
          observed_on:dateOnly(item.observed_on),situation_title:item.activity_title,
          criterion_text:item.criterion_text,observation_text:item.observation_text,
          media_available:item.media_available})),...diagnostic]
          .sort((a,b)=>a.observed_on.localeCompare(b.observed_on)||a.id.localeCompare(b.id));
        send(response,200,{student_id:student.id,competency_id:competencyId,assessment_state:assessmentState(row),timeline},origin);return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/overview") {
        const data = await context(url.searchParams.get("classroomId"), url.searchParams.get("periodId"));
        const rows = publicRows(data.model, data.cards, data.labels);
        const completed = rows.filter((row) => row.state === "confirmed" && isTeacherAchievementLevel(row.level) && row.conclusion);
        const studentCount = data.model.students.filter((student) => data.model.scope.length && data.model.scope.every((id) => completed.some((row) => row.student_id === student.id && row.competency_id === id))).length;
        const planned=await plannedCompetencyIds(data.classroom,data.period);
        const statistics=buildPeriodStatistics({rows,mapEntries:data.evaluationMap.entries,competencyMeta:data.labels,studentCount:data.model.students.length,plannedCompetencyIds:planned});
        const master=(await db.query(`select id,status,source_snapshot from assessment_masters where classroom_id=$1 and evaluation_period_id=$2 and status='active'`,[data.classroom.id,data.period.id])).rows[0];
        const featureRelations=(await db.query(`select to_regclass('family_reports') is not null as family_ready,to_regclass('classroom_period_reports') is not null as report_ready`)).rows[0];
        const reports=featureRelations.family_ready?Number((await db.query(`select count(distinct fr.student_id)::int as total from family_reports fr join students s on s.id=fr.student_id where s.classroom_id=$1 and fr.evaluation_period_id=$2 and fr.status='active'`,[data.classroom.id,data.period.id])).rows[0]?.total??0):0;
        const classReport=featureRelations.report_ready?(await db.query(`select id,status,source_fingerprint from classroom_period_reports where classroom_id=$1 and evaluation_period_id=$2 and status='active'`,[data.classroom.id,data.period.id])).rows[0]:null;
        const closure=await closureState(data.classroom,data.period,data.model);
        const reportFingerprint=classroomReportFingerprint(statistics,data.evaluationMap.version);
        const steps=[
          {number:1,label:"Revisar cobertura",done:true},{number:2,label:"Preparar marco de evaluación",done:Boolean(master)&&master.source_snapshot?.evaluation_map_fingerprint===data.evaluationMap.source_fingerprint},
          {number:3,label:"Evaluar alumnos",done:rows.length>0&&rows.every((row)=>isTeacherAchievementLevel(row.level))},{number:4,label:"Conclusiones descriptivas",done:rows.length>0&&rows.every((row)=>Boolean(row.conclusion))},
          {number:5,label:"Consolidado",done:rows.length>0&&rows.every((row)=>isTeacherAchievementLevel(row.level))},{number:6,label:"Informes familiares",done:reports>=data.model.students.length&&data.model.students.length>0},
          {number:7,label:"Informe del aula",done:Boolean(classReport)&&classReport.source_fingerprint===reportFingerprint},{number:8,label:"Cerrar período",done:closure.closed&&closure.current}];
        send(response, 200, { period: data.period, classroom: data.classroom, students: data.model.students, scope: data.model.scope.map((id) => ({ id, name: data.cards.find((card) => card.id === id)?.official_name ?? id, ...data.labels.find((item)=>item.competency_id===id) })), available_competencies: data.cards.map((card) => ({ id: card.id, name: card.official_name, ...stableCompetencyLabel(card) })), rows, evaluation_map:{version:data.evaluationMap.version,source_fingerprint:data.evaluationMap.source_fingerprint,entries:data.evaluationMap.entries},statistics,closure_steps:steps,siagie_export:SIAGIE_EXPORT_STATUS, progress: { students_complete: studentCount, students_total: data.model.students.length, competencies_complete: completed.length, competencies_total: rows.length }, closure }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/scope") {
        const body = await readJson(request), classroom = await ownedClassroom(body.classroomId), period = await periodForClass(classroom, body.periodId);
        const { cards } = await cardsForClass(classroom);
        if (!cards.some((card) => card.id === body.competencyId) || typeof body.included !== "boolean") throw new Error("Competencia no aplicable al aula.");
        if (!body.included && !clean(body.reason, 500)) throw new Error("Explica por qué no se evaluó esta competencia en el período.");
        await versionTransaction(db,`period:${period.id}`,async(tx)=>{
          if (!body.included) {
            const model = await loadPeriodEvaluationRows(tx, { classroomId: classroom.id, period, applicableIds: new Set(cards.map((card) => card.id)) });
            if (model.rows.some((row) => row.competency_v4_id === body.competencyId && (row.sourceRows.length || row.assessment))) throw new Error("Esta competencia ya tiene observaciones o valoraciones. Revísalas antes de retirarla.");
          }
          await tx.query(`insert into period_competency_scope(id,classroom_id,evaluation_period_id,competency_v4_id,included,reason) values($1,$2,$3,$4,$5,$6) on conflict(classroom_id,evaluation_period_id,competency_v4_id) do update set included=excluded.included,reason=excluded.reason,updated_at=now()`, [randomUUID(), classroom.id, period.id, body.competencyId, body.included, clean(body.reason, 500)]);
        });
        send(response, 200, { saved: true }, origin); return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/detail") {
        const data = await selectedRow({ classroomId: url.searchParams.get("classroomId"), periodId: url.searchParams.get("periodId"), studentId: url.searchParams.get("studentId"), competencyId: url.searchParams.get("competencyId") });
        const official = await db.query(`select distinct p.id,p.official_text,p.source_ref from activity_criteria ac join performances p on p.id=ac.performance_id join activities a on a.id=ac.activity_id join learning_experiences le on le.id=a.experience_id where le.classroom_id=$1 and ac.competency_v4_id=$2 and p.age_grade_id=$3 and a.occurs_on between $4::date and $5::date`, [data.classroom.id, data.card.id, data.classroom.age_grade_id, data.period.starts_on, data.period.ends_on]);
        const curriculum = data.knowledge.curriculumReference.competencies.find((item) => item.id === data.card.id);
        const currentFingerprint=hash(assessmentSourceSnapshot(data.row.sourceRows));
        const draft=data.row.draft;
        const diagnostic_antecedents=await diagnosticAntecedents(data.classroom,data.period,data.row.student_id,data.card.id);
        send(response, 200, { classroom_id: data.classroom.id, period_id: data.period.id, student_id: data.row.student_id, competency_id: data.card.id, state: data.row.state, evidence_count: data.row.sourceRows.length, diagnostic_antecedents, evidence_fingerprint: currentFingerprint, timeline: data.row.sourceRows.map((item) => ({ id: item.id, observed_on: dateOnly(item.observed_on), registered_at: item.observed_at, activity_id: item.activity_id, activity_title: item.activity_title, criterion_id: item.criterion_id, criterion_text: item.criterion_text, performance_id: item.performance_id, observation_text: item.observation_text, media_available: item.media_available })), reference: official.rows.length ? { kind: "official", items: official.rows } : { kind: "cycle_standard", competency: curriculum?.canonical_name ?? data.card.official_name, capacities: curriculum?.canonical_capacity_names ?? data.card.capacities?.map((item)=>item.official_name) ?? [], standard_summary: curriculum?.cycle_ii_standard_semantic_summary ?? data.card.cycle_ii_standard_ai ?? "Estándar del ciclo pendiente de verificar.", age_performance: null }, assessment: data.row.assessment ? { id: data.row.assessment.id, achievement_level: data.row.assessment.achievement_level, teacher_justification: data.row.assessment.teacher_justification, details: data.row.assessment.details, teacher_confirmed_at: data.row.assessment.teacher_confirmed_at } : null, draft: draft ? { id:draft.id, revision:Number(draft.revision), current:hash(draft.source_evidence_snapshot??[])===currentFingerprint, teacher_analysis:draft.draft_teacher_analysis??"", conclusion_text:"", provisional_level:draft.provisional_level??null, teacher_justification:draft.draft_teacher_justification??"", details:draft.details } : null, insufficiency_reason: data.row.state === "insufficient_information" ? draft?.details?.insufficiency_reason ?? null : null, conclusion: data.row.conclusion?.details?.conclusion_text ?? null }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/suggest") {
        const body = await readJson(request), data = await selectedRow(body);
        if (!data.row.sourceRows.length) throw new Error("Registra primero observaciones de esta competencia.");
        const student = await studentForClass(data.classroom, body.studentId), names = [student.first_name, student.last_name, student.preferred_name];
        const master = (await db.query(`select * from assessment_masters where classroom_id=$1 and evaluation_period_id=$2 and status='active'`, [data.classroom.id, data.period.id])).rows[0];
        if (!master) throw new Error("Confirma primero el marco de evaluación del período.");
        const contextV4 = await loadClassroomContext(data.classroom);
        const masterSources = await loadAssessmentMasterSources(db, { ...data.classroom, context_v4: contextV4 }, data.period);
        if (master.source_snapshot?.fingerprint !== masterSources.snapshot.fingerprint) throw new Error("El marco de evaluación requiere revisión porque cambió la planificación o un criterio.");
        const masterEntry = assessmentMasterEntry(master, data.card.id);
        if (!masterEntry) throw new Error("La competencia no está incluida en el marco de evaluación confirmado.");
        const input = buildAssessmentInput({ age: data.classroom.age, competencyId: data.card.id, assessmentMaster: masterEntry, evidenceHistory: data.row.sourceRows.map((row) => sanitizeEvidenceForAssessment(row, names)), criteriaHistory: data.row.sourceRows.map((row) => ({ criterion_text: neutralizeAssessmentText(row.criterion_text, names), expected_evidence: neutralizeAssessmentText(row.details?.expected_evidence, names), observation_focus: row.details?.observation_focus ?? [], evidence_scope: row.details?.evidence_scope ?? null })) });
        const analysisPlan = resolveAIExecutionPlan({ workflow: "assessment", task: "generation" });
        const analysis = await generate(input, { providerFactory: (plan) => createProvider(plan), executionPlan: body.deepReview === true ? resolveAIExecutionPlan({ workflow: "assessment_deep_review", task: "generation" }) : analysisPlan });
        validateAssessmentProposal(analysis.output, data.card.id, data.row.sourceRows.length);
        const conclusion = null, conclusionMetadata = null;
        const generationId = randomUUID(), evidenceFingerprint = hash(assessmentSourceSnapshot(data.row.sourceRows));
        const latest = await selectedRow(body);
        if (hash(assessmentSourceSnapshot(latest.row.sourceRows)) !== evidenceFingerprint)
          throw new Error("Las observaciones cambiaron durante la sugerencia. Revísalas otra vez.");
        const draft = await savePeriodEvaluationDraft(db, { studentId: student.id, competencyId: data.card.id, period: data.period,
          sourceRows: latest.row.sourceRows, analysis: analysis.output,
          metadata: { analysis: metadataForAudit(analysis.metadata), conclusion: conclusionMetadata }, assessmentMasterId: master.id, assessmentMasterSnapshot: master.source_snapshot,
          teacherAnalysis: analysis.output.evidence_overview, conclusionText: "",
          expectedDraftRevision:data.row.draft?.revision??null,expectedEvidenceFingerprint:evidenceFingerprint,
          loadCurrent:async(tx)=>{const model=await loadPeriodEvaluationRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map((card)=>card.id))});return model.rows.find((row)=>row.student_id===student.id&&row.competency_v4_id===data.card.id)?.sourceRows??[];} });
        await pending.set(generationId, { workflow: "period_evaluation", classroom_id: data.classroom.id, period_id: data.period.id, student_id: student.id, competency_v4_id: data.card.id, evidence_fingerprint: evidenceFingerprint, analysis: analysis.output, conclusion, analysis_metadata: metadataForAudit(analysis.metadata), conclusion_metadata: conclusionMetadata, createdAt: Date.now() });
        send(response, 200, { generation_id: generationId, draft_id: draft.id, draft_revision:draft.revision,evidence_fingerprint: evidenceFingerprint, analysis: analysis.output, conclusion }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/save-draft") {
        const body=await readJson(request),data=await selectedRow(body);
        const fingerprint=hash(assessmentSourceSnapshot(data.row.sourceRows));
        if(body.evidenceFingerprint!==fingerprint) {fail(response,origin,new Error("Las observaciones cambiaron. Revísalas antes de guardar."),409);return true;}
        if(body.expectedDraftRevision!==null && (!Number.isSafeInteger(body.expectedDraftRevision)||body.expectedDraftRevision<1)) throw new VersionConflictError("Recarga el borrador antes de guardarlo.");
        const saved=await savePeriodEvaluationDraft(db,{studentId:body.studentId,competencyId:body.competencyId,period:data.period,
          sourceRows:data.row.sourceRows,teacherAnalysis:body.teacherAnalysis,conclusionText:body.conclusionText,
          provisionalLevel:body.provisionalLevel||null,teacherJustification:body.teacherJustification,
          expectedDraftRevision:body.expectedDraftRevision,expectedEvidenceFingerprint:body.evidenceFingerprint,
          loadCurrent:async(tx)=>{const model=await loadPeriodEvaluationRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map((card)=>card.id))});return model.rows.find((row)=>row.student_id===body.studentId&&row.competency_v4_id===body.competencyId)?.sourceRows??[];}});
        send(response,200,{draft_id:saved.id,draft_revision:saved.revision,evidence_fingerprint:saved.evidence_fingerprint,saved:true},origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/confirm") {
        const body = await readJson(request), data = await selectedRow(body);
        if(!Number.isSafeInteger(body.expectedDraftRevision)||body.expectedDraftRevision<1)
          throw new VersionConflictError("Recarga el borrador antes de confirmar.");
        const sourceRows = data.row.sourceRows, fingerprint = hash(assessmentSourceSnapshot(sourceRows));
        if (!sourceRows.length) throw new Error("No hay observaciones para valorar esta competencia.");
        if (body.evidenceFingerprint !== fingerprint) throw new VersionConflictError("Las observaciones cambiaron. Revísalas antes de confirmar.",data.row.draft?.revision??null);
        if (!isTeacherAchievementLevel(body.achievementLevel)) throw new Error("Selecciona el nivel que confirmas como docente.");
        const teacherAnalysis = clean(body.teacherAnalysis), conclusionText = "", teacherJustification = clean(body.teacherJustification, 1000);
        if (!teacherAnalysis) throw new Error("Describe brevemente qué muestran las observaciones.");
        if (data.row.assessment && !data.row.draft) throw new VersionConflictError("Esta evaluación ya fue confirmada desde otra pestaña.");
        if (data.row.draft && Number(data.row.draft.revision)!==body.expectedDraftRevision)
          throw new VersionConflictError("El borrador cambió en otra pestaña.",data.row.draft.revision);
        const savedDraft=assertSavedEvaluationDraft(data.row.draft,{fingerprint,teacherAnalysis,conclusionText,
          achievementLevel:body.achievementLevel,teacherJustification});
        const suggestion={analysis:savedDraft.details,analysis_metadata:savedDraft.generation_metadata?.analysis??{},
          conclusion_metadata:savedDraft.generation_metadata?.conclusion??{}};
        if ((sourceRows.length < AYNI_HEURISTICS.assessment_low_records_for_explanation || suggestion?.analysis?.information_status === "insufficient") && !teacherJustification) throw new Error("Explica brevemente el criterio de tu decisión docente.");
        const analysis = suggestion?.analysis ? { ...suggestion.analysis, information_status: "sufficient", evidence_overview: teacherAnalysis, insufficiency_reason: null } : { competency_id: data.card.id, information_status: "sufficient", evidence_overview: teacherAnalysis, observable_patterns: [], strengths_and_advances: [], support_needs: [], next_opportunities: [], teacher_questions: [], insufficiency_reason: null, caution: "Interpretación confirmada por la docente." };
        validateAssessmentProposal(analysis, data.card.id, sourceRows.length);
        const assessment=await versionTransaction(db,`period:${data.period.id}`,async(tx)=>{
          const latestRows = await loadPeriodEvaluationRows(tx, { classroomId: data.classroom.id, period: data.period, applicableIds: new Set(data.cards.map((card) => card.id)) });
          const latest = latestRows.rows.find((row) => row.student_id === body.studentId && row.competency_v4_id === body.competencyId);
          if (!latest || hash(assessmentSourceSnapshot(latest.sourceRows)) !== fingerprint) throw new VersionConflictError("Las observaciones cambiaron durante la confirmación. Vuelve a revisarlas.");
          const lockedDraft=(await tx.query(`select * from competency_assessments where id=$1 and status='draft' for update`,[savedDraft.id])).rows[0];
          if(!lockedDraft||Number(lockedDraft.revision)!==body.expectedDraftRevision) throw new VersionConflictError("El borrador cambió en otra pestaña.",lockedDraft?.revision??null);
          assertSavedEvaluationDraft(lockedDraft,{fingerprint,teacherAnalysis,conclusionText,achievementLevel:body.achievementLevel,teacherJustification});
          if (lockedDraft.assessment_master_id) { const activeMaster=(await tx.query(`select * from assessment_masters where id=$1 and status='active'`,[lockedDraft.assessment_master_id])).rows[0];
            if(!activeMaster||activeMaster.source_snapshot?.fingerprint!==lockedDraft.assessment_master_snapshot?.fingerprint) throw new VersionConflictError("El marco de evaluación cambió. Vuelve a preparar la sugerencia."); }
          await tx.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on]);
          await tx.query(`update competency_assessments set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on]);
          await tx.query(`update competency_assessments set status='archived',updated_at=now() where id=$1 and status='draft' and revision=$2`, [savedDraft.id,body.expectedDraftRevision]);
          const version = Number((await tx.query(`select coalesce(max(version),0)+1 as version from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on])).rows[0].version);
          const confirmed = (await tx.query(`insert into competency_assessments(id,student_id,competency_v4_id,evaluation_period_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,teacher_confirmed_at,achievement_level,suggested_level,suggestion_reason,teacher_justification,level_confirmed_by,assessment_master_id,assessment_master_snapshot) values($1,$2,$3,$4,$5::date,$6::date,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,'active',now(),$12,null,null,$13,$14,$15,$16::jsonb) returning *`, [randomUUID(), body.studentId, body.competencyId, data.period.id, data.period.starts_on, data.period.ends_on, version, JSON.stringify(latest.sourceRows.map((row) => row.id)), JSON.stringify(assessmentSourceSnapshot(latest.sourceRows)), JSON.stringify(analysis), JSON.stringify(suggestion?.analysis_metadata ?? {}), body.achievementLevel, teacherJustification || null, teacherId, lockedDraft.assessment_master_id, lockedDraft.assessment_master_snapshot?JSON.stringify(lockedDraft.assessment_master_snapshot):null])).rows[0];
          return confirmed;
        });
        if (body.generationId) await pending.delete(body.generationId);
        await refreshStudentContext(db, body.studentId);
        send(response, 200, { assessment_id: assessment.id, achievement_level: assessment.achievement_level, confirmed: true }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/conclusion/suggest") {
        const body=await readJson(request),data=await selectedRow(body),assessment=data.row.assessment;
        if (data.row.draft || data.row.state === "needs_review") throw new VersionConflictError("Confirma primero la revisión de la valoración docente.");
        if(!assessment?.achievement_level||!assessment.teacher_confirmed_at) throw new Error("Confirma primero la valoración docente.");
        if(!data.row.sourceRows.length) throw new Error("No hay evidencias para redactar una conclusión.");
        const student=await studentForClass(data.classroom,body.studentId),names=[student.first_name,student.last_name,student.preferred_name];
        const master=assessment.assessment_master_id?(await db.query(`select * from assessment_masters where id=$1 and status in ('active','archived')`,[assessment.assessment_master_id])).rows[0]:null;
        const prior=(await db.query(`select details from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and status='active' and period_end<$3::date order by period_end desc limit 1`,[student.id,data.card.id,data.period.starts_on])).rows[0];
        const input=buildDescriptiveConclusionInput({age:data.classroom.age,competencyId:data.card.id,assessment,
          assessmentMaster:assessmentMasterEntry(master,data.card.id),evidenceRows:data.row.sourceRows,knownNames:names,
          priorConclusion:prior?.details?.conclusion_text,teacherNotes:body.teacherNotes});
        const plan=resolveAIExecutionPlan({workflow:"descriptive_conclusion",task:"generation"});
        const result=await generate(input,{providerFactory:(candidate)=>createProvider(candidate),executionPlan:plan});
        validateDescriptiveConclusion(result.output,data.card.id,assessment.details.information_status);
        const generationId=randomUUID();
        await pending.set(generationId,{workflow:"period_conclusion",classroom_id:data.classroom.id,period_id:data.period.id,
          student_id:student.id,competency_v4_id:data.card.id,assessment_id:assessment.id,
          source_assessment_snapshot:sourceAssessmentSnapshot(assessment),metadata:metadataForAudit(result.metadata),createdAt:Date.now()});
        send(response,200,{generation_id:generationId,proposal:result.output},origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/conclusion/confirm") {
        const body=await readJson(request),data=await selectedRow(body),assessment=data.row.assessment,item=await pending.get(body.generationId);
        if (data.row.draft || data.row.state === "needs_review") throw new VersionConflictError("Confirma primero la revisión de la valoración docente.");
        if(!assessment?.achievement_level||!assessment.teacher_confirmed_at) throw new Error("Confirma primero la valoración docente.");
        if(!item||item.workflow!=="period_conclusion"||item.classroom_id!==data.classroom.id||item.period_id!==data.period.id||item.student_id!==body.studentId||item.competency_v4_id!==body.competencyId||item.assessment_id!==assessment.id) throw new Error("La generación no corresponde a esta valoración.");
        if(!sameAssessmentSnapshot(item.source_assessment_snapshot,sourceAssessmentSnapshot(assessment))) throw new VersionConflictError("La valoración cambió. Genera otra conclusión.");
        validateDescriptiveConclusion(body.proposal,data.card.id,assessment.details.information_status);
        const conclusion=await versionTransaction(db,`period:${data.period.id}`,async(tx)=>{
          await tx.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`,[body.studentId,body.competencyId,data.period.starts_on,data.period.ends_on]);
          const version=Number((await tx.query(`select coalesce(max(version),0)+1 as version from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`,[body.studentId,body.competencyId,data.period.starts_on,data.period.ends_on])).rows[0].version);
          return (await tx.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,evaluation_period_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status,teacher_confirmed_at) values($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9::jsonb,$10::jsonb,$11::jsonb,'active',now()) returning id,version`,[randomUUID(),body.studentId,body.competencyId,assessment.id,data.period.id,data.period.starts_on,data.period.ends_on,version,JSON.stringify(body.proposal),JSON.stringify(item.metadata),JSON.stringify(item.source_assessment_snapshot)])).rows[0];
        });
        await pending.delete(body.generationId);await refreshStudentContext(db,body.studentId);
        send(response,200,{...conclusion,confirmed:true},origin);return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/classroom-report") {
        const data=await context(url.searchParams.get("classroomId"),url.searchParams.get("periodId"));
        const rows=publicRows(data.model,data.cards,data.labels),planned=await plannedCompetencyIds(data.classroom,data.period);
        const statistics=buildPeriodStatistics({rows,mapEntries:data.evaluationMap.entries,competencyMeta:data.labels,studentCount:data.model.students.length,plannedCompetencyIds:planned});
        const fingerprint=classroomReportFingerprint(statistics,data.evaluationMap.version);
        const versions=(await db.query(`select * from classroom_period_reports where classroom_id=$1 and evaluation_period_id=$2 order by version desc`,[data.classroom.id,data.period.id])).rows;
        send(response,200,{statistics,source_fingerprint:fingerprint,current:versions.find((row)=>row.status==='draft')??versions.find((row)=>row.status==='active')??null,versions:versions.map((row)=>({id:row.id,version:Number(row.version),status:row.status,stale:row.source_fingerprint!==fingerprint,details:row.details,teacher_confirmed_at:row.teacher_confirmed_at}))},origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/classroom-report/generate") {
        const body=await readJson(request),data=await context(body.classroomId,body.periodId),rows=publicRows(data.model,data.cards,data.labels),planned=await plannedCompetencyIds(data.classroom,data.period);
        const statistics=buildPeriodStatistics({rows,mapEntries:data.evaluationMap.entries,competencyMeta:data.labels,studentCount:data.model.students.length,plannedCompetencyIds:planned});
        const confirmed=statistics.classroom.confirmed_assessments,total=statistics.classroom.total_assessments;
        if(!total||confirmed/total<0.5) throw new Error("Confirma al menos la mitad de las valoraciones antes de preparar el informe del aula.");
        const fingerprint=classroomReportFingerprint(statistics,data.evaluationMap.version);
        const active=(await db.query(`select * from classroom_period_reports where classroom_id=$1 and evaluation_period_id=$2 and status='active'`,[data.classroom.id,data.period.id])).rows[0];
        if(active?.source_fingerprint===fingerprint&&!body.force) throw new Error("El informe vigente ya corresponde a las fuentes actuales.");
        const competencyIds=statistics.competencies.filter((row)=>row.worked).map((row)=>row.competency_id);
        const input=buildClassroomPeriodReportInput({age:data.classroom.age,competencyIds,statistics,evaluationMap:data.evaluationMap.entries,classroomContext:{id:data.classroom.id,group_context:data.classroom.group_context}});
        const plan=resolveAIExecutionPlan({workflow:"classroom_period_report",task:"generation"});
        const result=await generate(input,{provider:createProvider(plan),executionPlan:plan});validateClassroomPeriodReport(result.output);
        const generationId=randomUUID();await pending.set(generationId,{workflow:"classroom_period_report",classroom_id:data.classroom.id,period_id:data.period.id,source_fingerprint:fingerprint,statistics,metadata:metadataForAudit(result.metadata),createdAt:Date.now()});
        send(response,200,{generation_id:generationId,proposal:result.output,statistics},origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/classroom-report/confirm") {
        const body=await readJson(request),data=await context(body.classroomId,body.periodId),item=await pending.get(body.generationId);
        if(!item||item.workflow!=="classroom_period_report"||item.classroom_id!==data.classroom.id||item.period_id!==data.period.id) throw new Error("La generación no corresponde a este período.");
        validateClassroomPeriodReport(body.proposal);
        const rows=publicRows(data.model,data.cards,data.labels),planned=await plannedCompetencyIds(data.classroom,data.period),statistics=buildPeriodStatistics({rows,mapEntries:data.evaluationMap.entries,competencyMeta:data.labels,studentCount:data.model.students.length,plannedCompetencyIds:planned});
        if(classroomReportFingerprint(statistics,data.evaluationMap.version)!==item.source_fingerprint) throw new VersionConflictError("El consolidado cambió. Genera de nuevo el informe.");
        const saved=await versionTransaction(db,`period:${data.period.id}`,async(tx)=>{await tx.query(`update classroom_period_reports set status='archived',updated_at=now() where classroom_id=$1 and evaluation_period_id=$2 and status in ('active','draft')`,[data.classroom.id,data.period.id]);const version=Number((await tx.query(`select coalesce(max(version),0)+1 as version from classroom_period_reports where classroom_id=$1 and evaluation_period_id=$2`,[data.classroom.id,data.period.id])).rows[0].version);return(await tx.query(`insert into classroom_period_reports(id,classroom_id,evaluation_period_id,version,status,details,statistics_snapshot,source_fingerprint,generation_metadata,teacher_confirmed_at,created_by) values($1,$2,$3,$4,'active',$5::jsonb,$6::jsonb,$7,$8::jsonb,now(),$9) returning id,version,status`,[randomUUID(),data.classroom.id,data.period.id,version,JSON.stringify(body.proposal),JSON.stringify(statistics),item.source_fingerprint,JSON.stringify(item.metadata),teacherId])).rows[0];});
        await pending.delete(body.generationId);send(response,200,saved,origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/close") {
        const body = await readJson(request), data = await context(body.classroomId, body.periodId);
        if(!Object.hasOwn(body,"expectedCurrentVersionId")||typeof body.expectedSourceFingerprint!=="string")
          throw new VersionConflictError("Recarga el estado del aula antes de cerrar el período.");
        if (!data.model.students.length || !data.model.scope.length) throw new Error("Incluye estudiantes y competencias trabajadas antes de cerrar.");
        const pendingRows = data.model.rows.filter((row) => row.state !== "confirmed");
        if (pendingRows.length) throw new Error(`Quedan ${pendingRows.length} evaluaciones por revisar o confirmar.`);
        const closed=await closePeriodWithManifest(db,{classroomId:data.classroom.id,period:data.period,teacherId,
          expectedCurrentVersionId:body.expectedCurrentVersionId,expectedSourceFingerprint:body.expectedSourceFingerprint,
          loadCurrent:(tx)=>loadPeriodEvaluationRows(tx,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map((card)=>card.id))})});
        send(response, 200, closed, origin); return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/siagie-export") {
        send(response,501,{...SIAGIE_EXPORT_STATUS,error:SIAGIE_EXPORT_STATUS.message},origin);return true;
      }
      if (request.method === "GET" && ["/api/period-evaluations/progress-report", "/api/period-evaluations/consolidated", "/api/period-evaluations/consolidated.csv", "/api/period-evaluations/consolidated.xlsx"].includes(url.pathname)) {
        const data = await context(url.searchParams.get("classroomId"), url.searchParams.get("periodId"));
        const closure = await closureState(data.classroom, data.period, data.model);
        const finalOutput = url.pathname.endsWith("progress-report") || url.pathname.endsWith(".csv");
        if (finalOutput && (!closure.closed || !closure.current)) throw new Error("Revisa y cierra el período antes de preparar la salida.");
        const names = new Map(data.model.students.map((student) => [student.id, [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" ")]));
        let rows = data.model.rows.map((row) => ({ student_id: row.student_id, student_name: names.get(row.student_id), competency_id: row.competency_v4_id, competency_name: data.cards.find((card) => card.id === row.competency_v4_id)?.official_name ?? row.competency_v4_id, short_label:data.labels.find((item)=>item.competency_id===row.competency_v4_id)?.short_label??row.competency_v4_id,area:data.labels.find((item)=>item.competency_id===row.competency_v4_id)?.area??"Área curricular", achievement_level: row.assessment?.achievement_level ?? null, conclusion: row.conclusion?.details?.conclusion_text ?? "", assessment_id: row.assessment?.id ?? null, conclusion_id: row.conclusion?.id ?? null, state: row.state,period_label:data.period.label }));
        const studentId = url.searchParams.get("studentId"), competencyId = url.searchParams.get("competencyId"), status = url.searchParams.get("status");
        if (studentId) { await studentForClass(data.classroom, studentId); rows = rows.filter((row) => row.student_id === studentId); }
        if (competencyId) rows = rows.filter((row) => row.competency_id === competencyId);
        if (status === "pending") rows = rows.filter((row) => row.state !== "confirmed");
        if (status === "complete") rows = rows.filter((row) => row.state === "confirmed");
        if (finalOutput) rows = rows.filter((row) => row.state === "confirmed");
        if (url.pathname.endsWith(".csv")) {
          const csv = "\uFEFF" + [["Estudiante", "Competencia", "Nivel", "Conclusión descriptiva"], ...rows.map((row) => [row.student_name, row.competency_name, row.achievement_level, row.conclusion])].map((line) => line.map(safeCsv).join(",")).join("\r\n");
          response.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="consolidado-${data.classroom.year}-${data.period.kind}-${data.period.ordinal}.csv"`, ...(origin ? { "access-control-allow-origin": origin } : {}) });
          response.end(csv); return true;
        }
        if (url.pathname.endsWith(".xlsx")) {
          const workbook=await buildGenericAssessmentWorkbook(rows);
          response.writeHead(200,{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="consolidado-ayni-${data.classroom.year}-${data.period.ordinal}.xlsx"`,"cache-control":"private, no-store",...(origin?{"access-control-allow-origin":origin}:{})});
          response.end(workbook);return true;
        }
        if (url.pathname.endsWith("progress-report")) {
          if (!studentId) throw new Error("Selecciona un estudiante para su informe.");
          send(response, 200, { student_id: studentId, student_name: names.get(studentId), classroom_id: data.classroom.id, period_id: data.period.id, period_label: data.period.label, competencies: rows }, origin);
        } else send(response, 200, { classroom_id: data.classroom.id, period_id: data.period.id, rows }, origin);
        return true;
      }
      return false;
    } catch (error) { fail(response, origin, error); return true; }
  }
  return handle;
}
