import { createHash, randomUUID } from "node:crypto";
import { applicableDiagnosticCompetencies } from "./diagnostic-sources-v4.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadDiagnosticEvaluationSkill } from "./diagnostic-evaluation-skill.mjs";
import { completeDiagnosticReviewForTeacher } from "./diagnostic-review-service.mjs";

const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const schema = { id: "diagnostic-priorities-v1", type: "object", additionalProperties: false,
  required: ["priorities"], properties: { priorities: { type: "array", items: { type: "object", additionalProperties: false,
    required: ["title", "reason", "related_competency_ids", "importance"], properties: {
      title: { type: "string" }, reason: { type: "string" }, related_competency_ids: { type: "array", items: { type: "string" } },
      importance: { enum: ["higher", "normal", "observe_more"] },
    } } } } };

export class DiagnosticPriorityError extends Error {
  constructor(reason, message) { super(message); this.name = "DiagnosticPriorityError"; this.reason = reason; }
}
const fail = (reason, message) => { throw new DiagnosticPriorityError(reason, message); };

async function scope(db, teacherId) {
  const classroom = (await db.query(`select c.id,ag.age_years,c.castellano_l2_applicable,c.religion_applicable
    from classrooms c join age_grades ag on ag.id=c.age_grade_id
    where c.teacher_id=$1 and c.status='active' limit 1`, [teacherId])).rows[0];
  if (!classroom) fail("not_found", "Aula no disponible.");
  const group = (await db.query(`select id,version,details,teacher_confirmed_at from diagnostic_group_reviews
    where classroom_id=$1 and status='confirmed' order by version desc limit 1`, [classroom.id])).rows[0];
  if (!group) fail("group_required", "Confirma primero «Así está mi grupo».");
  return { classroom, group, source: { id: group.id, fingerprint: fingerprint([group.version, group.details, group.teacher_confirmed_at]) } };
}

function validate(details, allowedIds) {
  const rows = details?.priorities;
  if (!Array.isArray(rows) || rows.length > 6) fail("invalid", "Revisa las prioridades del año.");
  const allowed = new Set(allowedIds);
  return { priorities: rows.map((item) => {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const reason = typeof item?.reason === "string" ? item.reason.trim() : "";
    const ids = item?.related_competency_ids;
    if (!title || title.length > 180 || !reason || reason.length > 500 ||
      !Array.isArray(ids) || !ids.length || ids.length > 4 || ids.some((id) => !allowed.has(id)) ||
      new Set(ids).size !== ids.length || !["higher", "normal", "observe_more"].includes(item.importance)) {
      fail("invalid", "Cada prioridad necesita un motivo y competencias válidas para esta edad.");
    }
    return { title, reason, related_competency_ids: ids, importance: item.importance };
  }) };
}

export async function listDiagnosticPriorities(db, teacherId) {
  const { classroom } = await scope(db, teacherId);
  return (await db.query(`select id,group_review_id,version,status,details,ai_snapshot,teacher_confirmed_at
    from diagnostic_priority_reviews where classroom_id=$1 order by created_at desc`, [classroom.id])).rows;
}

export async function prepareDiagnosticPriorities(db, teacherId) {
  const { classroom, group, source } = await scope(db, teacherId);
  const existing = (await db.query(`select id,group_review_id,version,status,details from diagnostic_priority_reviews
    where group_review_id=$1 and status='draft'`, [group.id])).rows[0];
  if (existing) return existing;
  const version = Number((await db.query(`select coalesce(max(version),0)::int+1 as next from diagnostic_priority_reviews
    where group_review_id=$1`, [group.id])).rows[0].next);
  const latest = (await db.query(`select details from diagnostic_priority_reviews where group_review_id=$1
    and status='confirmed' order by version desc limit 1`, [group.id])).rows[0];
  const row = { id: randomUUID(), group_review_id: group.id, version, status: "draft",
    details: latest?.details ?? { priorities: [] } };
  await db.query(`insert into diagnostic_priority_reviews
    (id,classroom_id,group_review_id,version,status,details,source_snapshot,created_by)
    values($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7)`,
  [row.id, classroom.id, group.id, version, JSON.stringify(row.details), JSON.stringify(source), teacherId]);
  return row;
}

export async function suggestDiagnosticPriorities(db, teacherId, draftId, {
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadDiagnosticEvaluationSkill,
} = {}) {
  const { classroom, group, source } = await scope(db, teacherId);
  const draft = (await db.query(`select id,source_snapshot from diagnostic_priority_reviews
    where id=$1 and classroom_id=$2 and group_review_id=$3 and status='draft'`, [draftId, classroom.id, group.id])).rows[0];
  if (!draft) fail("not_found", "Abre primero las prioridades de este grupo.");
  if (draft.source_snapshot?.fingerprint !== source.fingerprint) fail("stale", "La visión del grupo cambió. Vuelve a preparar las prioridades.");
  const cards = await applicableDiagnosticCompetencies(classroom);
  const plan = resolvePlan({ workflow: "diagnostic", task: "generation" });
  const provider = createProvider(plan, { timeoutMs: 120_000 });
  const request = buildProviderRequest("diagnostic", {
    workflow: "diagnostic", stage: "annual_priorities", context: { age: classroom.age_years,
      confirmed_group: { strengths: group.details.strengths, needs: group.details.needs,
        planning_notes: group.details.planning_priorities } },
    curriculum: { competency_cards: cards },
    constraints: { must: ["Todas las competencias aplicables siguen presentes durante el año.",
      "Propón solo prioridades respaldadas por la visión grupal confirmada.",
      "Si faltan observaciones, usa observe_more; ausencia de registros no significa dificultad."],
    must_not: ["Inventar observaciones, desempeños oficiales, niveles o necesidades de cada niño."] },
  }, plan, schema, await loadSkill());
  const response = await provider.generate(request);
  const details = validate(response.output, cards.map((card) => card.id));
  const current = await scope(db, teacherId);
  if (current.source.fingerprint !== source.fingerprint) fail("stale", "La visión del grupo cambió durante el análisis.");
  await db.query(`update diagnostic_priority_reviews set ai_snapshot=$1::jsonb,updated_at=now()
    where id=$2 and classroom_id=$3 and status='draft'`, [JSON.stringify({ output: details, model: plan.model,
      usage: response.provider_metadata?.usage ?? null, source }), draftId, classroom.id]);
  return { details };
}

export async function saveDiagnosticPriorities(db, teacherId, id, details) {
  const { classroom, group } = await scope(db, teacherId);
  const cards = await applicableDiagnosticCompetencies(classroom);
  const safe = validate(details, cards.map((card) => card.id));
  const result = (await db.query(`update diagnostic_priority_reviews set details=$1::jsonb,updated_at=now()
    where id=$2 and classroom_id=$3 and group_review_id=$4 and status='draft'
    returning id,group_review_id,version,status,details`, [JSON.stringify(safe), id, classroom.id, group.id])).rows[0];
  if (!result) fail("not_found", "Estas prioridades ya están confirmadas o no pertenecen a tu aula.");
  return result;
}

export async function confirmDiagnosticPriorities(db, teacherId, id) {
  const { classroom, group, source } = await scope(db, teacherId);
  const row = (await db.query(`select * from diagnostic_priority_reviews where id=$1 and classroom_id=$2
    and group_review_id=$3 and status='draft'`, [id, classroom.id, group.id])).rows[0];
  if (!row) fail("not_found", "Estas prioridades no están disponibles.");
  if (row.source_snapshot?.fingerprint !== source.fingerprint) fail("stale", "La visión del grupo cambió.");
  const cards = await applicableDiagnosticCompetencies(classroom);
  validate(row.details, cards.map((card) => card.id));
  const confirmed = (await db.query(`update diagnostic_priority_reviews set status='confirmed',teacher_confirmed_at=now(),updated_at=now()
    where id=$1 and status='draft' returning id,group_review_id,version,status,details,teacher_confirmed_at`, [id])).rows[0];
  await completeDiagnosticReviewForTeacher(db, teacherId);
  return confirmed;
}
