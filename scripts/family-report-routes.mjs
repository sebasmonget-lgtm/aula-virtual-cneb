import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { buildFamilyReportInput, conclusionSourceSnapshot, sameConclusionSourceSnapshot, selectConfirmedConclusions, validateFamilyReport, validateFamilyReportPeriod } from "../src/lib/family-report-v4-service.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const sameIds = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((id, index) => id === right[index]);
const safeReport = (row) => ({ id: row.id, evaluation_period_id: row.evaluation_period_id ?? null, period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), version: row.version, selected_competency_ids: row.selected_competency_ids, details: row.details, status: row.status, teacher_confirmed_at: row.teacher_confirmed_at });
const staleMessage = "Las conclusiones confirmadas cambiaron desde que se preparó el informe. Regenera el informe antes de confirmarlo.";

export function createFamilyReportRouteHandler({ db, teacherId, annualPlanningContext, readJson, send, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4, createProvider = createAIProviderForPlan, pending, metadataForAudit }) {
  const fail = (response, origin, error, status = 422) => send(response, status, { error: error.message }, origin);
  async function reportContext(classroomId) {
    if (!classroomId) return annualPlanningContext();
    const row=(await db.query(`select c.id,c.school_year_id,c.castellano_l2_applicable,c.religion_applicable,ag.age_years as age,sy.starts_on,sy.ends_on
      from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
      where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`,[classroomId,teacherId])).rows[0];
    return row?{...row,calendar:{starts_on:row.starts_on,ends_on:row.ends_on}}:null;
  }
  async function studentInClass(context, studentId) {
    if (!context) throw new Error("Aula no disponible.");
    const student = (await db.query(`select id,first_name,last_name,preferred_name from students where id=$1 and classroom_id=$2 and status='active'`, [studentId, context.id])).rows[0];
    if (!student) throw new Error("Niño no disponible en esta aula.");
    return student;
  }
  async function formalPeriod(context,periodId,start,end) {
    if (!periodId) return null;
    const row=(await db.query(`select id,starts_on,ends_on,label from evaluation_periods where id=$1 and school_year_id=$2`,
      [periodId,context.school_year_id])).rows[0];
    if (!row) throw new Error("El período no corresponde al aula.");
    const resolved={id:row.id,starts_on:dateOnly(row.starts_on),ends_on:dateOnly(row.ends_on),label:row.label};
    if ((start && start!==resolved.starts_on)||(end && end!==resolved.ends_on)) throw new Error("Las fechas no coinciden con el período formal.");
    return resolved;
  }
  async function sources(studentId, periodStart, periodEnd, formal=false) {
    return (await db.query(`select id,student_id,competency_v4_id,period_start,period_end,version,details,status,teacher_confirmed_at,updated_at from competency_descriptive_conclusions where student_id=$1 and status='active' and teacher_confirmed_at is not null and period_start >= $2::date and period_end <= $3::date and ($4=false or (period_start=$2::date and period_end=$3::date)) order by competency_v4_id,period_start,id`, [studentId, periodStart, periodEnd,formal])).rows;
  }
  async function validatedSources(context, studentId, periodStart, periodEnd, requestedIds, periodId=null) {
    await formalPeriod(context,periodId,periodStart,periodEnd);
    validateFamilyReportPeriod(periodStart, periodEnd, context.calendar);
    if (!Array.isArray(requestedIds)) throw new Error("Selecciona las competencias confirmadas que deseas comunicar.");
    const ids = [...requestedIds].sort();
    const cards = new Map((await loadKnowledgeBase()).competencyCards.map((card) => [card.id, card]));
    for (const id of ids) {
      const card = cards.get(id);
      if (!card?.runtime_selectable_by_age?.[String(context.age)] || !cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true })) throw new Error("Competencia v4 no aplicable al aula.");
    }
    return { ids, rows: selectConfirmedConclusions(await sources(studentId, periodStart, periodEnd,Boolean(periodId)), ids, periodStart, periodEnd) };
  }
  function checkPending(item, context, studentId, start, end,periodId=null) {
    if (!item || item.workflow !== "family_report" || item.classroom_id !== context.id || item.student_id !== studentId || item.period_start !== start || item.period_end !== end || (item.period_id??null)!==(periodId??null)) throw new Error("La generación no corresponde a este informe.");
  }
  async function draft(context, id) {
    if (!context) throw new Error("Aula no disponible.");
    const row = (await db.query(`select fr.* from family_reports fr join students s on s.id=fr.student_id where fr.id=$1 and fr.status='draft' and s.classroom_id=$2 and s.status='active'`, [id, context.id])).rows[0];
    if (!row) throw new Error("Borrador no disponible.");
    validateFamilyReportPeriod(dateOnly(row.period_start), dateOnly(row.period_end), context.calendar);
    return row;
  }
  async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/family-reports") && url.pathname !== "/api/ai/family-reports/generate") return false;
    const hasBody=request.method==="PUT" || (request.method==="POST" && !url.pathname.endsWith("/confirm"));
    const body = hasBody ? await readJson(request) : null;
    const context = await reportContext(url.searchParams.get("classroomId") ?? body?.classroomId);
    try {
      if (request.method === "GET" && url.pathname === "/api/family-reports/options") {
        const student = await studentInClass(context, url.searchParams.get("studentId"));
        const period=await formalPeriod(context,url.searchParams.get("periodId"),url.searchParams.get("periodStart"),url.searchParams.get("periodEnd"));
        const periodStart = period?.starts_on ?? url.searchParams.get("periodStart") ?? dateOnly(context.calendar.starts_on), periodEnd = period?.ends_on ?? url.searchParams.get("periodEnd") ?? dateOnly(context.calendar.ends_on);
        validateFamilyReportPeriod(periodStart, periodEnd, context.calendar);
        const cards = new Map((await loadKnowledgeBase()).competencyCards.map((card) => [card.id, card]));
        const rows = await sources(student.id, periodStart, periodEnd,Boolean(period)), byCompetency = new Map();
        for (const row of rows) {
          const card = cards.get(row.competency_v4_id);
          if (!card?.runtime_selectable_by_age?.[String(context.age)] || !cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true })) continue;
          const option = byCompetency.get(card.id) ?? { competency_id: card.id, name: card.official_name, conclusions: [] };
          option.conclusions.push({ period_start: dateOnly(row.period_start), period_end: dateOnly(row.period_end), information_status: row.details.information_status, conclusion_text: row.details.conclusion_text, support_or_conditions: row.details.support_or_conditions ?? [], next_steps: row.details.next_steps ?? [] });
          byCompetency.set(card.id, option);
        }
        send(response, 200, { calendar: { starts_on: dateOnly(context.calendar.starts_on), ends_on: dateOnly(context.calendar.ends_on) }, evaluation_period_id:period?.id??null, period_start: periodStart, period_end: periodEnd, competencies: [...byCompetency.values()].sort((a, b) => a.name.localeCompare(b.name)) }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/family-reports") {
        const studentId = url.searchParams.get("studentId"), periodStart = url.searchParams.get("periodStart"), periodEnd = url.searchParams.get("periodEnd");
        await studentInClass(context, studentId);
        await formalPeriod(context,url.searchParams.get("periodId"),periodStart,periodEnd);
        validateFamilyReportPeriod(periodStart, periodEnd, context.calendar);
        const rows = (await db.query(`select * from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date order by version desc,created_at desc`, [studentId, periodStart, periodEnd])).rows;
        send(response, 200, { reports: rows.map(safeReport) }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/ai/family-reports/generate") {
        const student = await studentInClass(context, body.studentId);
        const period=await formalPeriod(context,body.periodId,body.periodStart,body.periodEnd);
        const { ids, rows } = await validatedSources(context, student.id, body.periodStart, body.periodEnd, body.competencyIds ?? [],period?.id);
        const input = buildFamilyReportInput({ age: context.age, competencyIds: ids, conclusions: rows, knownNames: [student.first_name, student.last_name, student.preferred_name], castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true });
        const plan = resolveAIExecutionPlan({ workflow: "family_report", task: "generation" });
        const result = await generate(input, { provider: createProvider(plan), executionPlan: plan });
        const generationId = randomUUID();
        await pending.set(generationId, { workflow: "family_report", classroom_id: context.id, student_id: student.id, period_id:period?.id??null, period_start: body.periodStart, period_end: body.periodEnd, selected_competency_ids: ids, source_conclusion_ids: rows.map((row) => row.id), source_conclusion_snapshot: conclusionSourceSnapshot(rows), metadata: metadataForAudit(result.metadata), createdAt: Date.now() });
        send(response, 200, { proposal: result.output, generation_id: generationId }, origin);
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/family-reports") {
        const student = await studentInClass(context, body.studentId);
        const item = await pending.get(body.generationId);
        const period=await formalPeriod(context,body.periodId,body.periodStart,body.periodEnd);
        checkPending(item, context, student.id, body.periodStart, body.periodEnd,period?.id);
        if (!sameIds(Array.isArray(body.competencyIds) ? [...body.competencyIds].sort() : [], item.selected_competency_ids)) throw new Error("La selección no corresponde a la generación.");
        const { rows } = await validatedSources(context, student.id, body.periodStart, body.periodEnd, item.selected_competency_ids,period?.id);
        if (!sameConclusionSourceSnapshot(item.source_conclusion_snapshot, conclusionSourceSnapshot(rows))) throw new Error(staleMessage);
        validateFamilyReport(body.proposal, item.selected_competency_ids, item.source_conclusion_snapshot);
        const existing = (await db.query(`select id,version from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date and status='draft'`, [student.id, body.periodStart, body.periodEnd])).rows[0];
        const version = existing?.version ?? Number((await db.query(`select coalesce(max(version),0)+1 as version from family_reports where student_id=$1 and period_start=$2::date and period_end=$3::date`, [student.id, body.periodStart, body.periodEnd])).rows[0].version);
        const id = existing?.id ?? randomUUID();
        if (existing) await db.query(`update family_reports set evaluation_period_id=$7,selected_competency_ids=$1::jsonb,source_conclusion_ids=$2::jsonb,source_conclusion_snapshot=$3::jsonb,details=$4::jsonb,generation_metadata=$5::jsonb,updated_at=now() where id=$6`, [JSON.stringify(item.selected_competency_ids), JSON.stringify(item.source_conclusion_ids), JSON.stringify(item.source_conclusion_snapshot), JSON.stringify(body.proposal), JSON.stringify(item.metadata), id,period?.id??null]);
        else await db.query(`insert into family_reports(id,student_id,period_start,period_end,version,selected_competency_ids,source_conclusion_ids,source_conclusion_snapshot,details,generation_metadata,status,evaluation_period_id) values($1,$2,$3::date,$4::date,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,'draft',$11)`, [id, student.id, body.periodStart, body.periodEnd, version, JSON.stringify(item.selected_competency_ids), JSON.stringify(item.source_conclusion_ids), JSON.stringify(item.source_conclusion_snapshot), JSON.stringify(body.proposal), JSON.stringify(item.metadata),period?.id??null]);
        await pending.delete(body.generationId);
        send(response, 200, { id, status: "draft" }, origin);
        return true;
      }
      const match = url.pathname.match(/^\/api\/family-reports\/([^/]+)(\/confirm)?$/);
      if (match && request.method === "PUT" && !match[2]) {
        const row = await draft(context, match[1]);
        await formalPeriod(context,row.evaluation_period_id,dateOnly(row.period_start),dateOnly(row.period_end));
        const item = body.generationId ? await pending.get(body.generationId) : null;
        if (body.generationId) checkPending(item, context, row.student_id, dateOnly(row.period_start), dateOnly(row.period_end),row.evaluation_period_id);
        const ids = item?.selected_competency_ids ?? row.selected_competency_ids;
        const snapshot = item?.source_conclusion_snapshot ?? row.source_conclusion_snapshot;
        validateFamilyReport(body.proposal, ids, snapshot);
        if (item) {
          const { rows } = await validatedSources(context, row.student_id, dateOnly(row.period_start), dateOnly(row.period_end), ids,row.evaluation_period_id);
          if (!sameConclusionSourceSnapshot(snapshot, conclusionSourceSnapshot(rows))) throw new Error(staleMessage);
          await db.query(`update family_reports set selected_competency_ids=$1::jsonb,source_conclusion_ids=$2::jsonb,source_conclusion_snapshot=$3::jsonb,details=$4::jsonb,generation_metadata=$5::jsonb,updated_at=now() where id=$6`, [JSON.stringify(ids), JSON.stringify(item.source_conclusion_ids), JSON.stringify(snapshot), JSON.stringify(body.proposal), JSON.stringify(item.metadata), row.id]);
          await pending.delete(body.generationId);
        } else await db.query(`update family_reports set details=$1::jsonb,updated_at=now() where id=$2`, [JSON.stringify(body.proposal), row.id]);
        send(response, 200, { id: row.id, status: "draft" }, origin);
        return true;
      }
      if (match && request.method === "POST" && match[2]) {
        const row = await draft(context, match[1]);
        validateFamilyReport(row.details, row.selected_competency_ids, row.source_conclusion_snapshot);
        const { rows } = await validatedSources(context, row.student_id, dateOnly(row.period_start), dateOnly(row.period_end), row.selected_competency_ids,row.evaluation_period_id);
        if (!sameConclusionSourceSnapshot(row.source_conclusion_snapshot, conclusionSourceSnapshot(rows))) { fail(response, origin, new Error(staleMessage), 409); return true; }
        await db.exec("begin");
        let saved;
        try {
          await db.query(`update family_reports set status='archived',updated_at=now() where student_id=$1 and period_start=$2::date and period_end=$3::date and status='active'`, [row.student_id, row.period_start, row.period_end]);
          saved = (await db.query(`update family_reports set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' returning id,status,teacher_confirmed_at`, [row.id])).rows[0];
          if (!saved) throw new Error("Borrador no disponible.");
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
        send(response, 200, saved, origin);
        return true;
      }
      return false;
    } catch (error) { fail(response, origin, error); return true; }
  }
  return handle;
}
