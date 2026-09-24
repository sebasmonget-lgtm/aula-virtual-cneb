import { createHash, randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { assessmentSourceSnapshot, buildAssessmentInput, neutralizeAssessmentText, sanitizeEvidenceForAssessment, validateAssessmentProposal } from "../src/lib/assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput, sourceAssessmentSnapshot, validateDescriptiveConclusion } from "../src/lib/descriptive-conclusion-v4-service.mjs";
import { dateOnly, defaultEvaluationPeriods, loadPeriodEvaluationRows, periodClosureFingerprint } from "../src/lib/period-evaluation-service.mjs";
import { assertSavedEvaluationDraft, savePeriodEvaluationDraft } from "../src/lib/period-evaluation-draft-service.mjs";
import { closePeriodWithManifest } from "../src/lib/period-closure-history.mjs";
import { projectPedagogicalCoverage } from "../src/lib/pedagogical-coverage.mjs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value, limit = 4000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const grade = new Set(["AD", "A", "B", "C"]);
const safeCsv = (value) => { const raw = String(value ?? ""); const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; };

export function createPeriodEvaluationRouteHandler({ db, teacherId, evidenceStorage, readJson, send, pending, metadataForAudit, refreshStudentContext, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4, createProvider = createAIProviderForPlan }) {
  const fail = (response, origin, error, status = 422) => send(response, status, { error: error.message }, origin);

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
    const cards = knowledge.competencyCards.filter((card) => card.runtime_selectable_by_age?.[String(classroom.age)] && cardIsApplicable(card, { castellanoL2Applicable: classroom.castellano_l2_applicable === true, religionApplicable: classroom.religion_applicable === true }));
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
    const { cards, knowledge } = await cardsForClass(classroom);
    const model = await loadPeriodEvaluationRows(db, { classroomId: classroom.id, period, applicableIds: new Set(cards.map((card) => card.id)) });
    return { classroom, period, cards, knowledge, model };
  }
  function publicRows(model, cards) {
    const names = new Map(cards.map((card) => [card.id, card.official_name]));
    return model.rows.map((row) => ({ student_id: row.student_id, competency_id: row.competency_v4_id, competency_name: names.get(row.competency_v4_id) ?? row.competency_v4_id, evidence_count: row.sourceRows.length, level: row.state === "confirmed" ? row.assessment?.achievement_level : null, conclusion: row.state === "confirmed" ? row.conclusion?.details?.conclusion_text ?? null : null, state: row.state, assessment_id: row.assessment?.id ?? null }));
  }
  async function closureState(classroom, period, model) {
    const row = (await db.query(`select * from period_closures where classroom_id=$1 and evaluation_period_id=$2`, [classroom.id, period.id])).rows[0];
    return row ? { closed: true, current: row.source_fingerprint === periodClosureFingerprint(model.rows), confirmed_at: row.confirmed_at } : { closed: false, current: false, confirmed_at: null };
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
        const projection=projectPedagogicalCoverage({students:data.model.students,cards:data.cards,model:data.model,
          activityCounts:new Map(counts.map((item)=>[item.competency_v4_id,Number(item.activity_count)]))});
        send(response,200,{period:data.period,classroom_id:data.classroom.id,...projection},origin);return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/overview") {
        const data = await context(url.searchParams.get("classroomId"), url.searchParams.get("periodId"));
        const rows = publicRows(data.model, data.cards);
        const completed = rows.filter((row) => row.state === "confirmed");
        const studentCount = data.model.students.filter((student) => data.model.scope.length && data.model.scope.every((id) => completed.some((row) => row.student_id === student.id && row.competency_id === id))).length;
        send(response, 200, { period: data.period, classroom: data.classroom, students: data.model.students, scope: data.model.scope.map((id) => ({ id, name: data.cards.find((card) => card.id === id)?.official_name ?? id })), available_competencies: data.cards.map((card) => ({ id: card.id, name: card.official_name })), rows, progress: { students_complete: studentCount, students_total: data.model.students.length, competencies_complete: completed.length, competencies_total: rows.length }, closure: await closureState(data.classroom, data.period, data.model) }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/scope") {
        const body = await readJson(request), classroom = await ownedClassroom(body.classroomId), period = await periodForClass(classroom, body.periodId);
        const { cards } = await cardsForClass(classroom);
        if (!cards.some((card) => card.id === body.competencyId) || typeof body.included !== "boolean") throw new Error("Competencia no aplicable al aula.");
        if (!body.included && !clean(body.reason, 500)) throw new Error("Explica por qué no se evaluó esta competencia en el período.");
        if (!body.included) {
          const model = await loadPeriodEvaluationRows(db, { classroomId: classroom.id, period, applicableIds: new Set(cards.map((card) => card.id)) });
          if (model.rows.some((row) => row.competency_v4_id === body.competencyId && (row.sourceRows.length || row.assessment))) throw new Error("Esta competencia ya tiene observaciones o valoraciones. Revísalas antes de retirarla.");
        }
        await db.query(`insert into period_competency_scope(id,classroom_id,evaluation_period_id,competency_v4_id,included,reason) values($1,$2,$3,$4,$5,$6) on conflict(classroom_id,evaluation_period_id,competency_v4_id) do update set included=excluded.included,reason=excluded.reason,updated_at=now()`, [randomUUID(), classroom.id, period.id, body.competencyId, body.included, clean(body.reason, 500)]);
        send(response, 200, { saved: true }, origin); return true;
      }
      if (request.method === "GET" && url.pathname === "/api/period-evaluations/detail") {
        const data = await selectedRow({ classroomId: url.searchParams.get("classroomId"), periodId: url.searchParams.get("periodId"), studentId: url.searchParams.get("studentId"), competencyId: url.searchParams.get("competencyId") });
        const official = await db.query(`select distinct p.id,p.official_text,p.source_ref from activity_criteria ac join performances p on p.id=ac.performance_id join activities a on a.id=ac.activity_id join learning_experiences le on le.id=a.experience_id where le.classroom_id=$1 and ac.competency_v4_id=$2 and p.age_grade_id=$3 and a.occurs_on between $4::date and $5::date`, [data.classroom.id, data.card.id, data.classroom.age_grade_id, data.period.starts_on, data.period.ends_on]);
        const semantic = data.knowledge.curriculumReference.competencies.find((item) => item.id === data.card.id)?.age_references?.[String(data.classroom.age)];
        const currentFingerprint=hash(assessmentSourceSnapshot(data.row.sourceRows));
        const draft=data.row.draft;
        send(response, 200, { classroom_id: data.classroom.id, period_id: data.period.id, student_id: data.row.student_id, competency_id: data.card.id, state: data.row.state, evidence_count: data.row.sourceRows.length, evidence_fingerprint: currentFingerprint, timeline: data.row.sourceRows.map((item) => ({ id: item.id, observed_on: dateOnly(item.observed_on), registered_at: item.observed_at, activity_id: item.activity_id, activity_title: item.activity_title, criterion_id: item.criterion_id, criterion_text: item.criterion_text, performance_id: item.performance_id, observation_text: item.observation_text, media_available: item.media_available })), reference: official.rows.length ? { kind: "official", items: official.rows } : { kind: "orientative", text: semantic?.semantic_focus ?? "Referente por edad aún no disponible." }, assessment: data.row.assessment ? { id: data.row.assessment.id, achievement_level: data.row.assessment.achievement_level, suggested_level: data.row.assessment.suggested_level, suggestion_reason: data.row.assessment.suggestion_reason, teacher_justification: data.row.assessment.teacher_justification, details: data.row.assessment.details, teacher_confirmed_at: data.row.assessment.teacher_confirmed_at } : null, draft: draft ? { id:draft.id, current:hash(draft.source_evidence_snapshot??[])===currentFingerprint, teacher_analysis:draft.draft_teacher_analysis??"", conclusion_text:draft.working_conclusion_text??"", provisional_level:draft.provisional_level??null, teacher_justification:draft.draft_teacher_justification??"", suggested_level:draft.suggested_level??null, suggestion_reason:draft.suggestion_reason??null, details:draft.details } : null, insufficiency_reason: data.row.state === "insufficient_information" ? draft?.details?.insufficiency_reason ?? null : null, conclusion: data.row.conclusion?.details?.conclusion_text ?? null }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/suggest") {
        const body = await readJson(request), data = await selectedRow(body);
        if (!data.row.sourceRows.length) throw new Error("Registra primero observaciones de esta competencia.");
        const student = await studentForClass(data.classroom, body.studentId), names = [student.first_name, student.last_name, student.preferred_name];
        const input = buildAssessmentInput({ age: data.classroom.age, competencyId: data.card.id, evidenceHistory: data.row.sourceRows.map((row) => sanitizeEvidenceForAssessment(row, names)), criteriaHistory: data.row.sourceRows.map((row) => ({ criterion_text: neutralizeAssessmentText(row.criterion_text, names), expected_evidence: neutralizeAssessmentText(row.details?.expected_evidence, names), observation_focus: row.details?.observation_focus ?? [], evidence_scope: row.details?.evidence_scope ?? null })) });
        const analysisPlan = resolveAIExecutionPlan({ workflow: "assessment", task: "generation" });
        const analysis = await generate(input, { provider: createProvider(analysisPlan), executionPlan: analysisPlan });
        validateAssessmentProposal(analysis.output, data.card.id, data.row.sourceRows.length);
        let conclusion = null, conclusionMetadata = null;
        if (analysis.output.information_status === "sufficient") {
          const prior = (await db.query(`select details from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and status='active' and period_end < $3::date order by period_end desc limit 1`, [student.id, data.card.id, data.period.starts_on])).rows[0];
          const conclusionInput = buildDescriptiveConclusionInput({ age: data.classroom.age, competencyId: data.card.id, analysisStatus: analysis.output.information_status, evidenceRows: data.row.sourceRows, knownNames: names, priorConclusion: prior?.details?.conclusion_text });
          const conclusionPlan = resolveAIExecutionPlan({ workflow: "descriptive_conclusion", task: "generation" });
          const result = await generate(conclusionInput, { provider: createProvider(conclusionPlan), executionPlan: conclusionPlan });
          validateDescriptiveConclusion(result.output, data.card.id, analysis.output.information_status);
          conclusion = result.output; conclusionMetadata = metadataForAudit(result.metadata);
        }
        const generationId = randomUUID(), evidenceFingerprint = hash(assessmentSourceSnapshot(data.row.sourceRows));
        const latest = await selectedRow(body);
        if (hash(assessmentSourceSnapshot(latest.row.sourceRows)) !== evidenceFingerprint)
          throw new Error("Las observaciones cambiaron durante la sugerencia. Revísalas otra vez.");
        const draft = await savePeriodEvaluationDraft(db, { studentId: student.id, competencyId: data.card.id, period: data.period,
          sourceRows: latest.row.sourceRows, analysis: analysis.output,
          metadata: { analysis: metadataForAudit(analysis.metadata), conclusion: conclusionMetadata },
          teacherAnalysis: analysis.output.evidence_overview, conclusionText: conclusion?.conclusion_text ?? "" });
        await pending.set(generationId, { workflow: "period_evaluation", classroom_id: data.classroom.id, period_id: data.period.id, student_id: student.id, competency_v4_id: data.card.id, evidence_fingerprint: evidenceFingerprint, analysis: analysis.output, conclusion, analysis_metadata: metadataForAudit(analysis.metadata), conclusion_metadata: conclusionMetadata, createdAt: Date.now() });
        send(response, 200, { generation_id: generationId, draft_id: draft.id, evidence_fingerprint: evidenceFingerprint, analysis: analysis.output, conclusion }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/save-draft") {
        const body=await readJson(request),data=await selectedRow(body);
        const fingerprint=hash(assessmentSourceSnapshot(data.row.sourceRows));
        if(body.evidenceFingerprint!==fingerprint) {fail(response,origin,new Error("Las observaciones cambiaron. Revísalas antes de guardar."),409);return true;}
        const saved=await savePeriodEvaluationDraft(db,{studentId:body.studentId,competencyId:body.competencyId,period:data.period,
          sourceRows:data.row.sourceRows,teacherAnalysis:body.teacherAnalysis,conclusionText:body.conclusionText,
          provisionalLevel:body.provisionalLevel||null,teacherJustification:body.teacherJustification});
        send(response,200,{draft_id:saved.id,evidence_fingerprint:saved.evidence_fingerprint,saved:true},origin);return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/confirm") {
        const body = await readJson(request), data = await selectedRow(body);
        const sourceRows = data.row.sourceRows, fingerprint = hash(assessmentSourceSnapshot(sourceRows));
        if (!sourceRows.length) throw new Error("No hay observaciones para valorar esta competencia.");
        if (body.evidenceFingerprint !== fingerprint) { fail(response, origin, new Error("Las observaciones cambiaron. Revísalas antes de confirmar."), 409); return true; }
        if (!grade.has(body.achievementLevel)) throw new Error("Selecciona el nivel que confirmas como docente.");
        const teacherAnalysis = clean(body.teacherAnalysis), conclusionText = clean(body.conclusionText), teacherJustification = clean(body.teacherJustification, 1000);
        if (!teacherAnalysis) throw new Error("Describe brevemente qué muestran las observaciones.");
        if (body.achievementLevel !== "AD" && !conclusionText) throw new Error("Escribe una conclusión para el nivel confirmado.");
        const savedDraft=assertSavedEvaluationDraft(data.row.draft,{fingerprint,teacherAnalysis,conclusionText,
          achievementLevel:body.achievementLevel,teacherJustification});
        const suggestion={analysis:savedDraft.details,analysis_metadata:savedDraft.generation_metadata?.analysis??{},
          conclusion_metadata:savedDraft.generation_metadata?.conclusion??{}};
        if ((sourceRows.length < 2 || suggestion?.analysis?.information_status === "insufficient" || (suggestion?.analysis?.suggested_level && suggestion.analysis.suggested_level !== body.achievementLevel)) && !teacherJustification) throw new Error("Explica brevemente el criterio de tu decisión docente.");
        const analysis = suggestion?.analysis ? { ...suggestion.analysis, information_status: "sufficient", evidence_overview: teacherAnalysis, insufficiency_reason: null } : { competency_id: data.card.id, information_status: "sufficient", evidence_overview: teacherAnalysis, observable_patterns: [], strengths_and_advances: [], support_needs: [], next_opportunities: [], teacher_questions: [], insufficiency_reason: null, caution: "Interpretación confirmada por la docente." };
        validateAssessmentProposal(analysis, data.card.id, Math.max(sourceRows.length, 2));
        const conclusion = conclusionText ? { competency_id: data.card.id, information_status: "sufficient", conclusion_text: conclusionText,
          progress_examples: [], support_or_conditions: [], next_steps: [], insufficiency_reason: null,
          caution: "Conclusión revisada y confirmada por la docente." } : null;
        if (conclusion) validateDescriptiveConclusion(conclusion, data.card.id, "sufficient");
        await db.exec("begin");
        let assessment;
        try {
          const latestRows = await loadPeriodEvaluationRows(db, { classroomId: data.classroom.id, period: data.period, applicableIds: new Set(data.cards.map((card) => card.id)) });
          const latest = latestRows.rows.find((row) => row.student_id === body.studentId && row.competency_v4_id === body.competencyId);
          if (!latest || hash(assessmentSourceSnapshot(latest.sourceRows)) !== fingerprint) throw new Error("Las observaciones cambiaron durante la confirmación. Vuelve a revisarlas.");
          await db.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on]);
          await db.query(`update competency_assessments set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on]);
          await db.query(`update competency_assessments set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='draft'`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on]);
          const version = Number((await db.query(`select coalesce(max(version),0)+1 as version from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on])).rows[0].version);
          assessment = (await db.query(`insert into competency_assessments(id,student_id,competency_v4_id,evaluation_period_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,teacher_confirmed_at,achievement_level,suggested_level,suggestion_reason,teacher_justification,level_confirmed_by) values($1,$2,$3,$4,$5::date,$6::date,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,'active',now(),$12,$13,$14,$15,$16) returning *`, [randomUUID(), body.studentId, body.competencyId, data.period.id, data.period.starts_on, data.period.ends_on, version, JSON.stringify(sourceRows.map((row) => row.id)), JSON.stringify(assessmentSourceSnapshot(sourceRows)), JSON.stringify(analysis), JSON.stringify(suggestion?.analysis_metadata ?? {}), body.achievementLevel, suggestion?.analysis?.suggested_level ?? null, suggestion?.analysis?.suggestion_reason ?? null, teacherJustification || null, teacherId])).rows[0];
          if (conclusion) {
            const conclusionVersion = Number((await db.query(`select coalesce(max(version),0)+1 as version from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`, [body.studentId, body.competencyId, data.period.starts_on, data.period.ends_on])).rows[0].version);
            await db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,evaluation_period_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status,teacher_confirmed_at) values($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9::jsonb,$10::jsonb,$11::jsonb,'active',now())`, [randomUUID(), body.studentId, body.competencyId, assessment.id, data.period.id, data.period.starts_on, data.period.ends_on, conclusionVersion, JSON.stringify(conclusion), JSON.stringify(suggestion?.conclusion_metadata ?? {}), JSON.stringify(sourceAssessmentSnapshot(assessment))]);
          }
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
        if (body.generationId) await pending.delete(body.generationId);
        await refreshStudentContext(db, body.studentId);
        send(response, 200, { assessment_id: assessment.id, achievement_level: assessment.achievement_level, confirmed: true }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/period-evaluations/close") {
        const body = await readJson(request), data = await context(body.classroomId, body.periodId);
        if (!data.model.students.length || !data.model.scope.length) throw new Error("Incluye estudiantes y competencias trabajadas antes de cerrar.");
        const pendingRows = data.model.rows.filter((row) => row.state !== "confirmed");
        if (pendingRows.length) throw new Error(`Quedan ${pendingRows.length} evaluaciones por revisar o confirmar.`);
        const closed=await closePeriodWithManifest(db,{classroomId:data.classroom.id,period:data.period,teacherId,
          loadCurrent:()=>loadPeriodEvaluationRows(db,{classroomId:data.classroom.id,period:data.period,applicableIds:new Set(data.cards.map((card)=>card.id))})});
        send(response, 200, closed, origin); return true;
      }
      if (request.method === "GET" && ["/api/period-evaluations/progress-report", "/api/period-evaluations/consolidated", "/api/period-evaluations/consolidated.csv"].includes(url.pathname)) {
        const data = await context(url.searchParams.get("classroomId"), url.searchParams.get("periodId"));
        const closure = await closureState(data.classroom, data.period, data.model);
        const finalOutput = url.pathname.endsWith("progress-report") || url.pathname.endsWith(".csv");
        if (finalOutput && (!closure.closed || !closure.current)) throw new Error("Revisa y cierra el período antes de preparar la salida.");
        const names = new Map(data.model.students.map((student) => [student.id, [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" ")]));
        let rows = data.model.rows.map((row) => ({ student_id: row.student_id, student_name: names.get(row.student_id), competency_id: row.competency_v4_id, competency_name: data.cards.find((card) => card.id === row.competency_v4_id)?.official_name ?? row.competency_v4_id, achievement_level: row.state === "confirmed" ? row.assessment?.achievement_level : null, conclusion: row.state === "confirmed" ? row.conclusion?.details?.conclusion_text ?? "" : "", assessment_id: row.state === "confirmed" ? row.assessment?.id : null, conclusion_id: row.state === "confirmed" ? row.conclusion?.id ?? null : null, state: row.state }));
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
