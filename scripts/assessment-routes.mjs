import { assertPeriodDatesOpen } from "../src/lib/period-edit-guard.mjs";
import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { loadAssessmentEvidence, assessmentSourceSnapshot, assessmentStudentNames, sameEvidenceSourceSnapshot, sanitizeEvidenceForAssessment, neutralizeAssessmentText, buildAssessmentInput, validateAssessmentPeriod, validateAssessmentProposal } from "../src/lib/assessment-v4-service.mjs";
import { httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";
import { assessmentMasterEntry } from "../src/lib/assessment-master-service.mjs";
import { loadAssessmentMasterSources } from "./assessment-master-routes.mjs";
import { loadConfirmedFamilyContext, projectFamilyAssessmentContext } from "../src/lib/family-interview-projection.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const safeAssessment = (row) => ({ id: row.id, competency_v4_id: row.competency_v4_id, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), version: row.version, details: row.details, status: row.status, teacher_confirmed_at: row.teacher_confirmed_at, evidence_count: Array.isArray(row.source_evidence_ids) ? row.source_evidence_ids.length : Number(row.evidence_count ?? 0) });

export function createAssessmentRouteHandler({ db, annualPlanningContext, readJson, send, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4, createProvider = createAIProviderForPlan, pending, metadataForAudit, refreshStudentContext }) {
  async function scope(context, studentId, competencyId) {
    if (!context) throw new Error("Aula no disponible.");
    const student = (await db.query(`select id,first_name,last_name,preferred_name from students where id=$1 and classroom_id=$2 and status='active'`, [studentId, context.id])).rows[0];
    if (!student) throw new Error("Niño no disponible en esta aula.");
    if (competencyId) {
      const card = (await loadKnowledgeBase()).competencyCards.find((item) => item.id === competencyId);
      if (!card?.runtime_selectable_by_age?.[String(context.age)] || !cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true })) throw new Error("Competencia v4 no aplicable al aula.");
      return { student, card };
    }
    return { student };
  }
  const fail = (response, origin, error, status = 422) => send(response, httpStatusForError(error, status), { error: publicErrorMessage(error) }, origin);
  async function activeMaster(context, periodStart, periodEnd, competencyId) {
    const row = (await db.query(`select am.*,p.starts_on,p.ends_on,p.label from assessment_masters am
      join evaluation_periods p on p.id=am.evaluation_period_id
      where am.classroom_id=$1 and am.status='active' and p.starts_on=$2::date and p.ends_on=$3::date`,
      [context.id, periodStart, periodEnd])).rows[0];
    if (!row) return null;
    const sources = await loadAssessmentMasterSources(db, context, row);
    if (sources.snapshot.fingerprint !== row.source_snapshot?.fingerprint) throw new Error("El marco de evaluación requiere revisión porque cambió la planificación o un criterio.");
    const entry = assessmentMasterEntry(row, competencyId);
    if (!entry) throw new Error("La competencia no está incluida en el marco confirmado del período.");
    return { row, entry };
  }
  async function currentDraft(context, id) {
    const row = (await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id where ca.id=$1 and ca.status='draft' and s.classroom_id=$2`, [id, context.id])).rows[0];
    if (!row) throw new Error("Borrador no disponible.");
    await scope(context, row.student_id, row.competency_v4_id);
    validateAssessmentPeriod(dateOnly(row.period_start), dateOnly(row.period_end), context.calendar);
    return row;
  }
  function checkPending(item, context, studentId, competencyId, periodStart, periodEnd) {
    if (!item || item.workflow !== "assessment" || item.classroom_id !== context.id || item.student_id !== studentId || item.competency_v4_id !== competencyId || item.period_start !== periodStart || item.period_end !== periodEnd) throw new Error("La generación no corresponde al análisis.");
  }
  async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/assessments") && url.pathname !== "/api/ai/assessments/generate") return false;
    const context = await annualPlanningContext();
    try {
      if (request.method === "GET" && url.pathname === "/api/assessments/options") {
        const { student } = await scope(context, url.searchParams.get("studentId"));
        const cards = new Map((await loadKnowledgeBase()).competencyCards.map((card) => [card.id, card]));
        const result = await db.query(`select ac.competency_v4_id,count(e.id)::int as evidence_count,min(e.observed_at) as first_observed_at,max(e.observed_at) as last_observed_at from evidences e join activity_criteria ac on ac.id=e.criterion_id where e.student_id=$1 and ac.competency_v4_id is not null group by ac.competency_v4_id`, [student.id]);
        const competencies = result.rows.filter((row) => { const card = cards.get(row.competency_v4_id); return card?.runtime_selectable_by_age?.[String(context.age)] && cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true }); }).map((row) => ({ ...row, name: cards.get(row.competency_v4_id).official_name }));
        send(response, 200, { competencies, calendar: context.calendar }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/assessments/context") {
        const studentId = url.searchParams.get("studentId"), competencyId = url.searchParams.get("competencyId"), periodStart = url.searchParams.get("periodStart"), periodEnd = url.searchParams.get("periodEnd");
        const { student } = await scope(context, studentId, competencyId);
        validateAssessmentPeriod(periodStart, periodEnd, context.calendar);
        const rows = await loadAssessmentEvidence(db, { studentId, competencyId, periodStart, periodEnd });
        const names = [student.first_name, student.last_name, student.preferred_name];
        const latest = (await db.query(`select id,period_start,period_end,version,details,status,teacher_confirmed_at,competency_v4_id,source_evidence_ids from competency_assessments where student_id=$1 and competency_v4_id=$2 and status='active' order by teacher_confirmed_at desc limit 1`, [studentId, competencyId])).rows[0];
        send(response, 200, { evidence_count: rows.length, timeline: rows.map((row) => sanitizeEvidenceForAssessment(row, names)), latest_confirmed: latest ? safeAssessment(latest) : null }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/assessments") {
        const studentId = url.searchParams.get("studentId"), competencyId = url.searchParams.get("competencyId");
        await scope(context, studentId, competencyId);
        const rows = (await db.query(`select ca.* from competency_assessments ca where ca.student_id=$1 and ca.competency_v4_id=$2 order by ca.version desc,ca.created_at desc`, [studentId, competencyId])).rows;
        send(response, 200, { assessments: rows.map(safeAssessment) }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/ai/assessments/generate") {
        const body = await readJson(request);
        const { student, card } = await scope(context, body.studentId, body.competencyId);
        validateAssessmentPeriod(body.periodStart, body.periodEnd, context.calendar);
        await assertPeriodDatesOpen(db,context.id,body.periodStart,body.periodEnd);
        const rows = await loadAssessmentEvidence(db, { studentId: student.id, competencyId: card.id, periodStart: body.periodStart, periodEnd: body.periodEnd });
        if (!rows.length) throw new Error("No hay evidencias registradas para analizar esta competencia.");
        const master = await activeMaster(context, body.periodStart, body.periodEnd, card.id);
        const names = assessmentStudentNames((await db.query(
          `select first_name,last_name,preferred_name from students where classroom_id=$1`, [context.id])).rows);
        const interview = await loadConfirmedFamilyContext(db, context.id, student.id);
        const familyContext = interview ? projectFamilyAssessmentContext(interview.details,
          (text) => neutralizeAssessmentText(text, names)) : null;
        const input = buildAssessmentInput({ age: context.age, competencyId: card.id, assessmentMaster: master?.entry,
          familyContext, evidenceHistory: rows.map((row) => sanitizeEvidenceForAssessment(row, names)),
          criteriaHistory: rows.map((row) => ({ criterion_text: neutralizeAssessmentText(row.criterion_text, names),
            expected_evidence: neutralizeAssessmentText(row.details?.expected_evidence, names),
            observation_focus: (row.details?.observation_focus ?? []).map((text) => neutralizeAssessmentText(text, names)),
            evidence_scope: row.details?.evidence_scope ?? null })) });
        const plan = resolveAIExecutionPlan({ workflow: "assessment", task: "generation" });
        const result = await generate(input, { providerFactory: (executionPlan) => createProvider(executionPlan), executionPlan: body.deepReview === true ? resolveAIExecutionPlan({ workflow: "assessment_deep_review", task: "generation" }) : plan });
        const generationId = randomUUID();
        await pending.set(generationId, { workflow: "assessment", classroom_id: context.id, student_id: student.id, competency_v4_id: card.id, period_start: body.periodStart, period_end: body.periodEnd, assessment_master_id: master?.row.id ?? null, assessment_master_snapshot: master?.row.source_snapshot ?? null, source_evidence_ids: rows.map((row) => row.id), source_evidence_snapshot: assessmentSourceSnapshot(rows), metadata: metadataForAudit(result.metadata), createdAt: Date.now() });
        send(response, 200, { proposal: result.output, generation_id: generationId, evidence_count: rows.length }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/assessments") {
        const body = await readJson(request);
        const { student } = await scope(context, body.studentId, body.competencyId);
        validateAssessmentPeriod(body.periodStart, body.periodEnd, context.calendar);
        await assertPeriodDatesOpen(db,context.id,body.periodStart,body.periodEnd);
        const item = await pending.get(body.generationId);
        checkPending(item, context, student.id, body.competencyId, body.periodStart, body.periodEnd);
        validateAssessmentProposal(body.proposal, body.competencyId, item.source_evidence_ids.length);
        const rows = await loadAssessmentEvidence(db, { studentId: student.id, competencyId: body.competencyId, periodStart: body.periodStart, periodEnd: body.periodEnd });
        if (!sameEvidenceSourceSnapshot(item.source_evidence_snapshot, assessmentSourceSnapshot(rows))) throw new Error("Las evidencias cambiaron. Regenera el análisis.");
        if(item.assessment_master_id){const master = await activeMaster(context, body.periodStart, body.periodEnd, body.competencyId);
          if (!master||master.row.id !== item.assessment_master_id || master.row.source_snapshot?.fingerprint !== item.assessment_master_snapshot?.fingerprint) throw new Error("El marco de evaluación cambió. Regenera el análisis.");}
        const existing = (await db.query(`select id,version from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='draft'`, [student.id, body.competencyId, body.periodStart, body.periodEnd])).rows[0];
        const version = existing?.version ?? Number((await db.query(`select coalesce(max(version),0)+1 as version from competency_assessments where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`, [student.id, body.competencyId, body.periodStart, body.periodEnd])).rows[0].version);
        const id = existing?.id ?? randomUUID();
        if (existing) await db.query(`update competency_assessments set assessment_master_id=$1,assessment_master_snapshot=$2::jsonb,details=$3::jsonb,generation_metadata=$4::jsonb,source_evidence_ids=$5::jsonb,source_evidence_snapshot=$6::jsonb,updated_at=now() where id=$7`, [item.assessment_master_id, JSON.stringify(item.assessment_master_snapshot), JSON.stringify(body.proposal), JSON.stringify(item.metadata), JSON.stringify(item.source_evidence_ids), JSON.stringify(item.source_evidence_snapshot), id]);
        else await db.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,assessment_master_id,assessment_master_snapshot) values($1,$2,$3,$4::date,$5::date,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,'draft',$11,$12::jsonb)`, [id, student.id, body.competencyId, body.periodStart, body.periodEnd, version, JSON.stringify(item.source_evidence_ids), JSON.stringify(item.source_evidence_snapshot), JSON.stringify(body.proposal), JSON.stringify(item.metadata), item.assessment_master_id, JSON.stringify(item.assessment_master_snapshot)]);
        await pending.delete(body.generationId);
        send(response, 200, { id, status: "draft" }, origin);
        return true;
      }
      const match = url.pathname.match(/^\/api\/assessments\/([^/]+)(\/confirm)?$/);
      if (match && request.method === "PUT" && !match[2]) {
        const body = await readJson(request), current = await currentDraft(context, match[1]);
        await assertPeriodDatesOpen(db,context.id,current.period_start,current.period_end);
        const item = body.generationId ? await pending.get(body.generationId) : null;
        if (body.generationId) checkPending(item, context, current.student_id, current.competency_v4_id, dateOnly(current.period_start), dateOnly(current.period_end));
        validateAssessmentProposal(body.proposal, current.competency_v4_id, item?.source_evidence_ids.length ?? current.source_evidence_ids.length);
        if (item) {
          await db.query(`update competency_assessments set details=$1::jsonb,generation_metadata=$2::jsonb,source_evidence_ids=$3::jsonb,source_evidence_snapshot=$4::jsonb,updated_at=now() where id=$5`, [JSON.stringify(body.proposal), JSON.stringify(item.metadata), JSON.stringify(item.source_evidence_ids), JSON.stringify(item.source_evidence_snapshot), current.id]);
          await pending.delete(body.generationId);
        } else await db.query(`update competency_assessments set details=$1::jsonb,updated_at=now() where id=$2`, [JSON.stringify(body.proposal), current.id]);
        send(response, 200, { id: current.id, status: "draft" }, origin);
        return true;
      }
      if (match && request.method === "POST" && match[2]) {
        const current = await currentDraft(context, match[1]);
        validateAssessmentProposal(current.details, current.competency_v4_id, current.source_evidence_ids.length);
        const rows = await loadAssessmentEvidence(db, { studentId: current.student_id, competencyId: current.competency_v4_id, periodStart: dateOnly(current.period_start), periodEnd: dateOnly(current.period_end) });
        if (!sameEvidenceSourceSnapshot(current.source_evidence_snapshot, assessmentSourceSnapshot(rows))) { fail(response, origin, new Error("Hay evidencia nueva o modificada desde que se preparó este análisis. Regenera la síntesis antes de confirmarla."), 409); return true; }
        if (current.assessment_master_id) { const master = await activeMaster(context, dateOnly(current.period_start), dateOnly(current.period_end), current.competency_v4_id);
          if (master.row.id !== current.assessment_master_id || master.row.source_snapshot?.fingerprint !== current.assessment_master_snapshot?.fingerprint) { fail(response, origin, new Error("El marco de evaluación cambió. Regenera la síntesis antes de confirmarla."), 409); return true; } }
        await db.exec("begin");
        let saved;
        try {
          await assertPeriodDatesOpen(db,context.id,current.period_start,current.period_end,{lock:true});
          await db.query(`update competency_assessments set status='archived',updated_at=now() where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date and status='active'`, [current.student_id, current.competency_v4_id, current.period_start, current.period_end]);
          saved = (await db.query(`update competency_assessments set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' returning id,status,teacher_confirmed_at`, [current.id])).rows[0];
          if (!saved) throw new Error("Borrador no disponible.");
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
        await refreshStudentContext(db, current.student_id);
        send(response, 200, saved, origin);
        return true;
      }
      return false;
    } catch (error) { fail(response, origin, error); return true; }
  }
  return handle;
}
