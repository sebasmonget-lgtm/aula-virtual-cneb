import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { assessmentSourceSnapshot, loadAssessmentEvidence, sameEvidenceSourceSnapshot, sanitizeEvidenceForAssessment } from "../src/lib/assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput, sameAssessmentSnapshot, sourceAssessmentSnapshot, validateDescriptiveConclusion } from "../src/lib/descriptive-conclusion-v4-service.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const safeConclusion = (row) => ({ id: row.id, competency_v4_id: row.competency_v4_id, assessment_id: row.assessment_id, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), version: row.version, details: row.details, status: row.status, teacher_confirmed_at: row.teacher_confirmed_at });
const safeAssessment = (row) => ({ id: row.id, competency_v4_id: row.competency_v4_id, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), version: row.version, information_status: row.details.information_status, evidence_overview: row.details.evidence_overview, strengths_and_advances: row.details.strengths_and_advances, support_needs: row.details.support_needs, next_opportunities: row.details.next_opportunities, teacher_confirmed_at: row.teacher_confirmed_at });
const staleMessage = "El análisis de evidencias cambió desde que se preparó esta conclusión. Regenera la conclusión antes de confirmarla.";

export function createDescriptiveConclusionRouteHandler({ db, annualPlanningContext, readJson, send, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4, createProvider = createAIProviderForPlan, pending, metadataForAudit, refreshStudentContext }) {
  const fail = (response, origin, error, status = 422) => send(response, status, { error: error.message }, origin);
  async function studentInClass(context, studentId) {
    if (!context) throw new Error("Aula no disponible.");
    const student = (await db.query(`select id,first_name,last_name,preferred_name from students where id=$1 and classroom_id=$2 and status='active'`, [studentId, context.id])).rows[0];
    if (!student) throw new Error("Niño no disponible en esta aula.");
    return student;
  }
  async function activeAssessment(context, assessmentId, expectedStudentId = null) {
    if (!context) throw new Error("Aula no disponible.");
    const assessment = (await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id where ca.id=$1 and s.classroom_id=$2`, [assessmentId, context.id])).rows[0];
    if (!assessment || assessment.student_id !== (expectedStudentId ?? assessment.student_id) || assessment.status !== "active" || !assessment.teacher_confirmed_at) throw new Error("Confirma primero el análisis de evidencias de esta competencia.");
    const student = await studentInClass(context, assessment.student_id);
    const card = (await loadKnowledgeBase()).competencyCards.find((item) => item.id === assessment.competency_v4_id);
    if (!card?.runtime_selectable_by_age?.[String(context.age)] || !cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true })) throw new Error("Competencia v4 no aplicable al aula.");
    return { assessment, student, card };
  }
  async function sourceEvidence(assessment) {
    const rows = await loadAssessmentEvidence(db, { studentId: assessment.student_id, competencyId: assessment.competency_v4_id, periodStart: dateOnly(assessment.period_start), periodEnd: dateOnly(assessment.period_end) });
    if (!sameEvidenceSourceSnapshot(assessment.source_evidence_snapshot, assessmentSourceSnapshot(rows))) throw new Error("Las evidencias del análisis confirmado cambiaron. Actualiza primero el análisis.");
    const selected = new Set(assessment.source_evidence_ids);
    const source = rows.filter((row) => selected.has(row.id));
    if (!source.length || source.length !== selected.size) throw new Error("Faltan evidencias que sustentaron el análisis.");
    return source;
  }
  function checkPending(item, context, assessment) {
    if (!item || item.workflow !== "descriptive_conclusion" || item.classroom_id !== context.id || item.student_id !== assessment.student_id || item.competency_v4_id !== assessment.competency_v4_id || item.assessment_id !== assessment.id || item.period_start !== dateOnly(assessment.period_start) || item.period_end !== dateOnly(assessment.period_end)) throw new Error("La generación no corresponde a esta conclusión.");
  }
  async function draft(context, id) {
    if (!context) throw new Error("Aula no disponible.");
    const row = (await db.query(`select dc.* from competency_descriptive_conclusions dc join students s on s.id=dc.student_id where dc.id=$1 and dc.status='draft' and s.classroom_id=$2`, [id, context.id])).rows[0];
    if (!row) throw new Error("Borrador no disponible.");
    const active = (await db.query(`select id from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active' and teacher_confirmed_at is not null order by teacher_confirmed_at desc limit 1`, [row.student_id, row.competency_v4_id, row.period_start, row.period_end])).rows[0];
    if (!active) throw new Error("Confirma primero el análisis de evidencias de esta competencia.");
    const { assessment } = await activeAssessment(context, active.id, row.student_id);
    return { row, assessment };
  }
  async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/descriptive-conclusions") && url.pathname !== "/api/ai/descriptive-conclusions/generate") return false;
    const context = await annualPlanningContext();
    try {
      if (request.method === "GET" && url.pathname === "/api/descriptive-conclusions/options") {
        const student = await studentInClass(context, url.searchParams.get("studentId"));
        const cards = new Map((await loadKnowledgeBase()).competencyCards.map((card) => [card.id, card]));
        const rows = (await db.query(`select ca.* from competency_assessments ca where ca.student_id=$1 and ca.status='active' and ca.teacher_confirmed_at is not null order by ca.teacher_confirmed_at desc`, [student.id])).rows;
        const assessments = rows.filter((row) => { const card = cards.get(row.competency_v4_id); return card?.runtime_selectable_by_age?.[String(context.age)] && cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true }); }).map((row) => ({ ...safeAssessment(row), competency_name: cards.get(row.competency_v4_id).official_name }));
        send(response, 200, { assessments }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/descriptive-conclusions/context") {
        const { assessment, student } = await activeAssessment(context, url.searchParams.get("assessmentId"));
        const rows = await sourceEvidence(assessment), names = [student.first_name, student.last_name, student.preferred_name];
        send(response, 200, { assessment: safeAssessment(assessment), evidence_count: rows.length, evidence: rows.map((row) => sanitizeEvidenceForAssessment(row, names)) }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/descriptive-conclusions") {
        const studentId = url.searchParams.get("studentId"), assessmentId = url.searchParams.get("assessmentId");
        if (!studentId) throw new Error("Selecciona un niño.");
        const { assessment } = await activeAssessment(context, assessmentId, studentId);
        const rows = (await db.query(`select * from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date order by version desc,created_at desc`, [studentId, assessment.competency_v4_id, assessment.period_start, assessment.period_end])).rows;
        send(response, 200, { conclusions: rows.filter((row) => row.status === "draft" || row.assessment_id === assessment.id).map(safeConclusion) }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/ai/descriptive-conclusions/generate") {
        const body = await readJson(request);
        if (!body.studentId) throw new Error("Selecciona un niño.");
        const { assessment, student } = await activeAssessment(context, body.assessmentId, body.studentId);
        const rows = await sourceEvidence(assessment);
        const prior = (await db.query(`select details from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and status='active' and teacher_confirmed_at is not null and period_end < $3::date order by period_end desc,teacher_confirmed_at desc limit 1`, [student.id, assessment.competency_v4_id, assessment.period_start])).rows[0];
        const names = [student.first_name, student.last_name, student.preferred_name];
        const input = buildDescriptiveConclusionInput({ age: context.age, competencyId: assessment.competency_v4_id, assessment, evidenceRows: rows, knownNames: names, priorConclusion: prior?.details?.conclusion_text, teacherNotes: typeof body.teacherNotes === "string" ? body.teacherNotes.slice(0, 2000) : "" });
        const plan = resolveAIExecutionPlan({ workflow: "descriptive_conclusion", task: "generation" });
        const result = await generate(input, { provider: createProvider(plan), executionPlan: plan });
        const generationId = randomUUID();
        pending.set(generationId, { workflow: "descriptive_conclusion", classroom_id: context.id, student_id: student.id, competency_v4_id: assessment.competency_v4_id, assessment_id: assessment.id, period_start: dateOnly(assessment.period_start), period_end: dateOnly(assessment.period_end), source_assessment_snapshot: sourceAssessmentSnapshot(assessment), metadata: metadataForAudit(result.metadata), createdAt: Date.now() });
        send(response, 200, { proposal: result.output, generation_id: generationId }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/descriptive-conclusions") {
        const body = await readJson(request);
        if (!body.studentId) throw new Error("Selecciona un niño.");
        const { assessment } = await activeAssessment(context, body.assessmentId, body.studentId);
        await sourceEvidence(assessment);
        const item = pending.get(body.generationId);
        checkPending(item, context, assessment);
        if (!sameAssessmentSnapshot(item.source_assessment_snapshot, sourceAssessmentSnapshot(assessment))) throw new Error(staleMessage);
        validateDescriptiveConclusion(body.proposal, assessment.competency_v4_id, assessment.details.information_status);
        const existing = (await db.query(`select id,version from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='draft'`, [assessment.student_id, assessment.competency_v4_id, assessment.period_start, assessment.period_end])).rows[0];
        const version = existing?.version ?? Number((await db.query(`select coalesce(max(version),0)+1 as version from competency_descriptive_conclusions where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`, [assessment.student_id, assessment.competency_v4_id, assessment.period_start, assessment.period_end])).rows[0].version);
        const id = existing?.id ?? randomUUID();
        if (existing) await db.query(`update competency_descriptive_conclusions set assessment_id=$1,details=$2::jsonb,generation_metadata=$3::jsonb,source_assessment_snapshot=$4::jsonb,updated_at=now() where id=$5`, [assessment.id, JSON.stringify(body.proposal), JSON.stringify(item.metadata), JSON.stringify(item.source_assessment_snapshot), id]);
        else await db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status) values($1,$2,$3,$4,$5::date,$6::date,$7,$8::jsonb,$9::jsonb,$10::jsonb,'draft')`, [id, assessment.student_id, assessment.competency_v4_id, assessment.id, assessment.period_start, assessment.period_end, version, JSON.stringify(body.proposal), JSON.stringify(item.metadata), JSON.stringify(item.source_assessment_snapshot)]);
        pending.delete(body.generationId);
        send(response, 200, { id, status: "draft" }, origin);
        return true;
      }
      const match = url.pathname.match(/^\/api\/descriptive-conclusions\/([^/]+)(\/confirm)?$/);
      if (match && request.method === "PUT" && !match[2]) {
        const body = await readJson(request), { row, assessment } = await draft(context, match[1]);
        const item = body.generationId ? pending.get(body.generationId) : null;
        if (body.generationId) checkPending(item, context, assessment);
        if (!item && row.assessment_id !== assessment.id) throw new Error(staleMessage);
        validateDescriptiveConclusion(body.proposal, row.competency_v4_id, assessment.details.information_status);
        if (item) {
          if (!sameAssessmentSnapshot(item.source_assessment_snapshot, sourceAssessmentSnapshot(assessment))) throw new Error(staleMessage);
          await db.query(`update competency_descriptive_conclusions set assessment_id=$1,details=$2::jsonb,generation_metadata=$3::jsonb,source_assessment_snapshot=$4::jsonb,updated_at=now() where id=$5`, [assessment.id, JSON.stringify(body.proposal), JSON.stringify(item.metadata), JSON.stringify(item.source_assessment_snapshot), row.id]);
          pending.delete(body.generationId);
        } else await db.query(`update competency_descriptive_conclusions set details=$1::jsonb,updated_at=now() where id=$2`, [JSON.stringify(body.proposal), row.id]);
        send(response, 200, { id: row.id, status: "draft" }, origin);
        return true;
      }
      if (match && request.method === "POST" && match[2]) {
        const { row, assessment } = await draft(context, match[1]);
        validateDescriptiveConclusion(row.details, row.competency_v4_id, assessment.details.information_status);
        if (row.assessment_id !== assessment.id || !sameAssessmentSnapshot(row.source_assessment_snapshot, sourceAssessmentSnapshot(assessment))) { fail(response, origin, new Error(staleMessage), 409); return true; }
        await sourceEvidence(assessment);
        await db.exec("begin");
        let saved;
        try {
          await db.query(`update competency_descriptive_conclusions set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [row.student_id, row.competency_v4_id, row.period_start, row.period_end]);
          saved = (await db.query(`update competency_descriptive_conclusions set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' returning id,status,teacher_confirmed_at`, [row.id])).rows[0];
          if (!saved) throw new Error("Borrador no disponible.");
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
        await refreshStudentContext(db, row.student_id);
        send(response, 200, saved, origin);
        return true;
      }
      return false;
    } catch (error) { fail(response, origin, error); return true; }
  }
  return handle;
}
