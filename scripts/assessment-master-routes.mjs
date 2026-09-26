import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../src/lib/ai-provider-factory.mjs";
import { generateAIWorkflowV4 } from "../src/lib/ai-generation-v4.mjs";
import { buildAssessmentMasterInput, assessmentMasterSourceSnapshot, validateAssessmentMaster } from "../src/lib/assessment-master-service.mjs";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const safe = (row, stale = false) => row ? ({ id: row.id, classroom_id: row.classroom_id,
  evaluation_period_id: row.evaluation_period_id, version: Number(row.version), status: row.status,
  details: row.details, source_snapshot: row.source_snapshot, teacher_confirmed_at: row.teacher_confirmed_at,
  stale }) : null;

export async function loadAssessmentMasterSources(db, context, period) {
  const experiences = (await db.query(`select id,revision,details from learning_experiences
    where classroom_id=$1 and status='active' and starts_on <= $3::date and ends_on >= $2::date order by starts_on,id`,
    [context.id, period.starts_on, period.ends_on])).rows;
  const activities = (await db.query(`select a.id,a.revision,a.details,a.occurs_on,a.experience_id
    from activities a join learning_experiences e on e.id=a.experience_id
    where e.classroom_id=$1 and a.status='active' and a.occurs_on between $2::date and $3::date order by a.occurs_on,a.id`,
    [context.id, period.starts_on, period.ends_on])).rows;
  const criteria = (await db.query(`select ac.id,ac.revision,ac.competency_v4_id,ac.criterion_text,ac.details,ac.activity_id
    from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id
    where e.classroom_id=$1 and a.status='active' and ac.status='active' and a.occurs_on between $2::date and $3::date
      and ac.competency_v4_id is not null order by ac.competency_v4_id,ac.id`, [context.id, period.starts_on, period.ends_on])).rows;
  const competencyIds = [...new Set(criteria.map((row) => row.competency_v4_id))].sort();
  const source = { evaluation_period_id: period.id, starts_on: dateOnly(period.starts_on), ends_on: dateOnly(period.ends_on),
    competency_ids: competencyIds, experience_revisions: experiences.map((row) => `${row.id}:${row.revision}`),
    activity_revisions: activities.map((row) => `${row.id}:${row.revision}`),
    criterion_revisions: criteria.map((row) => `${row.id}:${row.revision}`),
    classroom_context_fingerprint: context.context_v4?.fingerprint ?? context.context_v4?.source_fingerprint ?? null };
  return { snapshot: assessmentMasterSourceSnapshot(source), competencyIds,
    sources: { period: { id: period.id, label: period.label, starts_on: source.starts_on, ends_on: source.ends_on },
      confirmed_project_masters: experiences.map((row) => ({ id: row.id, flow_version: row.details?.flow_version ?? null,
        decisions: row.details?.decisions ?? null, activity_blueprints: row.details?.project_master?.activity_blueprints ?? row.details?.activity_route ?? [] })),
      activities: activities.map((row) => ({ id: row.id, occurs_on: dateOnly(row.occurs_on), experience_id: row.experience_id,
        route_item_id: row.details?.route_item_id ?? null, purpose: row.details?.purpose ?? null })),
      criteria: criteria.map((row) => ({ id: row.id, activity_id: row.activity_id, competency_id: row.competency_v4_id,
        criterion_text: row.criterion_text, expected_evidence: row.details?.expected_evidence ?? null,
        observation_focus: row.details?.observation_focus ?? [] })) } };
}

export function createAssessmentMasterRouteHandler({ db, teacherId, annualPlanningContext, readJson, send,
  pending, metadataForAudit, loadKnowledgeBase = loadKnowledgeBaseV4, generate = generateAIWorkflowV4,
  createProvider = createAIProviderForPlan }) {
  const fail = (response, origin, error, status = 422) => send(response, httpStatusForError(error, status), { error: publicErrorMessage(error) }, origin);
  async function scope(periodId) {
    const context = await annualPlanningContext();
    if (!context) throw new Error("Aula no disponible.");
    const period = (await db.query(`select p.id,p.label,p.starts_on,p.ends_on from evaluation_periods p
      where p.id=$1 and p.school_year_id=$2`, [periodId, context.school_year_id])).rows[0];
    if (!period) throw new Error("El período no corresponde a esta aula.");
    return { context, period };
  }
  async function current(context, periodId, status = null) {
    const clause = status ? "and status=$3" : "";
    return (await db.query(`select * from assessment_masters where classroom_id=$1 and evaluation_period_id=$2 ${clause}
      order by version desc limit 1`, status ? [context.id, periodId, status] : [context.id, periodId])).rows[0] ?? null;
  }
  async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/assessment-masters") && url.pathname !== "/api/ai/assessment-masters/generate") return false;
    try {
      if (request.method === "GET" && url.pathname === "/api/assessment-masters") {
        const { context, period } = await scope(url.searchParams.get("periodId"));
        const sources = await loadAssessmentMasterSources(db, context, period);
        const rows = (await db.query(`select * from assessment_masters where classroom_id=$1 and evaluation_period_id=$2 order by version desc`, [context.id, period.id])).rows;
        const selected = rows.find((row) => row.status === "draft") ?? rows.find((row) => row.status === "active") ?? rows[0];
        send(response, 200, { current: safe(selected,
          Boolean(selected && selected.source_snapshot?.fingerprint !== sources.snapshot.fingerprint)), versions: rows.map((row) => safe(row, row.source_snapshot?.fingerprint !== sources.snapshot.fingerprint)),
          competency_ids: sources.competencyIds }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/ai/assessment-masters/generate") {
        const body = await readJson(request), { context, period } = await scope(body.periodId);
        const source = await loadAssessmentMasterSources(db, context, period);
        if (!source.competencyIds.length) throw new Error("Aún no hay competencias trabajadas con criterios confirmados en este período.");
        const active = await current(context, period.id, "active");
        if (active && active.source_snapshot?.fingerprint === source.snapshot.fingerprint)
          throw new Error("El marco vigente ya corresponde a las fuentes actuales. Puedes editarlo sin volver a generarlo.");
        const kb = await loadKnowledgeBase(), cards = new Map(kb.competencyCards.map((card) => [card.id, card]));
        for (const id of source.competencyIds) { const card = cards.get(id); if (!card?.runtime_selectable_by_age?.[String(context.age)] || !cardIsApplicable(card, { castellanoL2Applicable: context.castellano_l2_applicable === true, religionApplicable: context.religion_applicable === true })) throw new Error("Una competencia trabajada no es aplicable a la edad del aula."); }
        const input = buildAssessmentMasterInput({ age: context.age, competencyIds: source.competencyIds,
          classroomContext: { id: context.id, group_context: context.context_v4?.classroom_context ?? context.group_context,
            diagnostic_summary: context.diagnostic_summary, religion_applicable: context.religion_applicable === true },
          calendar: context.calendar, sources: source.sources });
        const plan = resolveAIExecutionPlan({ workflow: "assessment_master", task: "generation" });
        const result = await generate(input, { provider: createProvider(plan), executionPlan: plan, knowledgeBase: kb });
        const generationId = randomUUID();
        await pending.set(generationId, { workflow: "assessment_master", classroom_id: context.id,
          evaluation_period_id: period.id, competency_ids: source.competencyIds, source_snapshot: source.snapshot,
          metadata: metadataForAudit(result.metadata), createdAt: Date.now() });
        send(response, 200, { proposal: result.output, generation_id: generationId, source_snapshot: source.snapshot }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/assessment-masters") {
        const body = await readJson(request), { context, period } = await scope(body.periodId), item = await pending.get(body.generationId);
        if (!item || item.workflow !== "assessment_master" || item.classroom_id !== context.id || item.evaluation_period_id !== period.id) throw new Error("La generación no corresponde a este período.");
        validateAssessmentMaster(body.proposal, item.competency_ids);
        const latestSources = await loadAssessmentMasterSources(db, context, period);
        if (latestSources.snapshot.fingerprint !== item.source_snapshot.fingerprint) throw new Error("La planificación cambió. Vuelve a preparar el marco.");
        const draft = await current(context, period.id, "draft");
        const version = draft?.version ?? Number((await db.query(`select coalesce(max(version),0)+1 as version from assessment_masters where classroom_id=$1 and evaluation_period_id=$2`, [context.id, period.id])).rows[0].version);
        const id = draft?.id ?? randomUUID();
        if (draft) await db.query(`update assessment_masters set details=$1::jsonb,source_snapshot=$2::jsonb,generation_metadata=$3::jsonb,updated_at=now() where id=$4`, [JSON.stringify(body.proposal), JSON.stringify(item.source_snapshot), JSON.stringify(item.metadata), id]);
        else await db.query(`insert into assessment_masters(id,classroom_id,evaluation_period_id,version,status,details,source_snapshot,generation_metadata,created_by) values($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7::jsonb,$8)`, [id, context.id, period.id, version, JSON.stringify(body.proposal), JSON.stringify(item.source_snapshot), JSON.stringify(item.metadata), teacherId]);
        await pending.delete(body.generationId); send(response, 200, { id, status: "draft", version }, origin); return true;
      }
      const copyMatch = url.pathname.match(/^\/api\/assessment-masters\/([^/]+)\/copy$/);
      if (copyMatch && request.method === "POST") {
        const source = (await db.query(`select am.* from assessment_masters am join classrooms c on c.id=am.classroom_id where am.id=$1 and am.status='active' and c.teacher_id=$2`, [copyMatch[1], teacherId])).rows[0];
        if (!source) throw new Error("Marco vigente no disponible.");
        if (await current({ id: source.classroom_id }, source.evaluation_period_id, "draft")) throw new Error("Ya existe una versión en borrador.");
        const id=randomUUID(), version=Number(source.version)+1;
        await db.query(`insert into assessment_masters(id,classroom_id,evaluation_period_id,version,status,details,source_snapshot,generation_metadata,created_by) values($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7::jsonb,$8)`, [id,source.classroom_id,source.evaluation_period_id,version,JSON.stringify(source.details),JSON.stringify(source.source_snapshot),JSON.stringify(source.generation_metadata??{}),teacherId]);
        send(response,200,{id,status:"draft",version,details:source.details},origin);return true;
      }
      const match = url.pathname.match(/^\/api\/assessment-masters\/([^/]+)(\/confirm)?$/);
      if (match && request.method === "PUT" && !match[2]) {
        const body = await readJson(request), row = (await db.query(`select am.* from assessment_masters am join classrooms c on c.id=am.classroom_id where am.id=$1 and am.status='draft' and c.teacher_id=$2`, [match[1], teacherId])).rows[0];
        if (!row) throw new Error("Borrador no disponible.");
        validateAssessmentMaster(body.proposal, row.source_snapshot.competency_ids);
        await db.query(`update assessment_masters set details=$1::jsonb,updated_at=now() where id=$2`, [JSON.stringify(body.proposal), row.id]);
        send(response, 200, { id: row.id, status: "draft" }, origin); return true;
      }
      if (match && request.method === "POST" && match[2]) {
        const row = (await db.query(`select am.*,p.starts_on,p.ends_on,p.label from assessment_masters am join classrooms c on c.id=am.classroom_id join evaluation_periods p on p.id=am.evaluation_period_id where am.id=$1 and am.status='draft' and c.teacher_id=$2`, [match[1], teacherId])).rows[0];
        if (!row) throw new Error("Borrador no disponible.");
        const context = await annualPlanningContext(), sources = await loadAssessmentMasterSources(db, context,
          { id: row.evaluation_period_id, starts_on: row.starts_on, ends_on: row.ends_on, label: row.label });
        validateAssessmentMaster(row.details, sources.competencyIds);
        if (sources.snapshot.fingerprint !== row.source_snapshot?.fingerprint) { fail(response, origin, new Error("La planificación o los criterios cambiaron. Actualiza el marco antes de confirmarlo."), 409); return true; }
        const saved = await db.transaction(async (tx) => {
          await tx.query(`update assessment_masters set status='archived',updated_at=now() where classroom_id=$1 and evaluation_period_id=$2 and status='active'`, [row.classroom_id, row.evaluation_period_id]);
          const confirmed = (await tx.query(`update assessment_masters set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 and status='draft' returning id,status,version,teacher_confirmed_at`, [row.id])).rows[0];
          if (!confirmed) throw new Error("Borrador no disponible.");
          return confirmed;
        });
        send(response, 200, saved, origin); return true;
      }
      return false;
    } catch (error) { fail(response, origin, error); return true; }
  }
  return handle;
}
