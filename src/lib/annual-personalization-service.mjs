import { createHash, randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { ageFilteredAnnualCurriculum } from "./annual-preplan-service.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { anonymousDecisionText } from "./jev-competency-suggestion.mjs";
import { interviewInterestOptions, interviewLanguageOptions } from "./family-interview-contract.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const topics = [
  ["Animales", /animales?|mascotas?|perros?|gatos?|aves?|insectos?/iu],
  ["Plantas", /plantas?|huertos?|semillas?|flores?|cultivos?/iu],
  ["Construcción", /construir|construcci[oó]n|bloques?|armar/iu],
  ["Agua", /agua|r[ií]os?|lluvia|charcos?/iu],
  ["Transporte", /transportes?|carros?|veh[ií]culos?|buses?|trenes?/iu],
  ["Cuentos", /cuentos?|historias?|libros?/iu],
  ["Música", /m[uú]sica|cantar|canciones?|bailar/iu],
  ["Movimiento", /correr|saltar|movimiento|pelotas?/iu],
  ["Dibujo", /dibujar|pintar|dibujo|colores?/iu],
];
const opportunities = [
  ["Agricultura y cultivos", /agricultur|chacra|cultivo|cosecha|huerto/iu],
  ["Comercio local", /comercio|mercado|tienda|venta|negocio/iu],
  ["Naturaleza cercana", /r[ií]o|campo|bosque|monta[nñ]a|playa|parque|naturaleza/iu],
  ["Oficios de la comunidad", /oficios?|profesiones?|artesanos?|pescador/iu],
  ["Celebraciones y costumbres", /fiesta|celebraci[oó]n|costumbre|tradici[oó]n/iu],
];
const sourceFields = ["family_context", "language_context", "interests", "social_context", "family_expectations"];
const conditionKinds = ["spaces", "outdoors", "materials", "technology", "schedule", "family_support", "restrictions", "institutional_projects", "events", "other"];
const proposalSchema = { id: "annual-personalization-v1", type: "object", additionalProperties: false,
  required: ["group_profile", "priorities"], properties: {
    group_profile: { type: "string" }, priorities: { type: "array", maxItems: 4, items: {
      type: "object", additionalProperties: false, required: ["title", "reason", "related_competency_ids", "importance"],
      properties: { title: { type: "string" }, reason: { type: "string" },
        related_competency_ids: { type: "array", items: { type: "string" } },
        importance: { enum: ["higher", "normal", "observe_more"] } },
    } },
  } };
const short = (value, limit = 500) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const topicHits = (value, list) => list.filter(([, pattern]) => pattern.test(value ?? "")).map(([label]) => label);
const unique = (items) => [...new Set(items)];
const condition = (kind, value) => ({ id: kind, kind, value: short(value, 500) });

export class AnnualPersonalizationError extends Error {
  constructor(reason, message) { super(message); this.name = "AnnualPersonalizationError"; this.reason = reason; }
}
const fail = (reason, message) => { throw new AnnualPersonalizationError(reason, message); };

export async function personalizationSources(db, teacherId, context) {
  const students = (await db.query(`select id,first_name,last_name,preferred_name from students
    where classroom_id=$1 and status='active' order by id`, [context.id])).rows;
  const names = students.flatMap((row) => [row.first_name, row.last_name, row.preferred_name,
    [row.first_name, row.last_name].filter(Boolean).join(" ")]).filter(Boolean);
  const interviews = (await db.query(`select distinct on (i.student_id) i.id,i.student_id,i.version,i.details,i.teacher_confirmed_at
    from student_family_interviews i join students s on s.id=i.student_id and s.classroom_id=i.classroom_id
    where i.classroom_id=$1 and s.status='active' and i.status='confirmed'
    order by i.student_id,i.version desc`, [context.id])).rows;
  const observations = (await db.query(`select o.id,o.student_id,o.competency_v4_id,o.observation_text,o.observed_at,
      'diagnostic_observation' as source_type from diagnostic_spontaneous_observations o
      join students s on s.id=o.student_id and s.status='active' where o.classroom_id=$1
    union all
    select o.id,o.student_id,o.competency_v4_id,o.observation_text,o.observed_at,
      'diagnostic_observation' as source_type from diagnostic_experience_observations o
      join students s on s.id=o.student_id and s.status='active'
      where o.classroom_id=$1 and o.observation_status <> 'insufficient_information'
    union all
    select so.id,de.student_id,null::text as competency_v4_id,coalesce(so.note,de.observation_text) as observation_text,
      so.observed_at,'legacy_diagnostic_observation' as source_type
      from student_observations so join diagnostic_entries de on de.id=so.diagnostic_entry_id
      join diagnostic_sessions ds on ds.id=de.session_id
      join students s on s.id=de.student_id and s.status='active'
      where ds.classroom_id=$1 and so.status in ('observed','with_support')
    order by observed_at,id`, [context.id])).rows;
  const group = (await db.query(`select id,version,details,teacher_confirmed_at from diagnostic_group_reviews
    where classroom_id=$1 and status='confirmed' order by version desc limit 1`, [context.id])).rows[0] ?? null;
  const prior = group ? (await db.query(`select id,version,details,teacher_confirmed_at from diagnostic_priority_reviews
    where classroom_id=$1 and group_review_id=$2 and status='confirmed' order by version desc limit 1`, [context.id, group.id])).rows[0] ?? null : null;
  const references = [...interviews.map((row) => ({ type: "family_interview", id: row.id, version: row.version })),
    ...observations.map((row) => ({ type: row.source_type, id: row.id })),
    ...(group ? [{ type: "diagnostic_group", id: group.id, version: group.version }] : []),
    ...(prior ? [{ type: "diagnostic_priority", id: prior.id, version: prior.version }] : [])];
  const fingerprint = hash({ references, interviewFacts: interviews.map((row) => row.details),
    observations: observations.map((row) => [row.id,row.observation_text,row.competency_v4_id]),
    group: group?.details, prior: prior?.details, context: context.group_context,
    resources: context.available_resources });
  return { students, interviews, observations, group, prior, names, references, fingerprint };
}

/** Extract only bounded planning signals; never send a full interview or student identity to a provider. */
export function projectPlanningSignals(sources, context) {
  const interestRows = new Map(), contextRows = new Map();
  function add(map, label, ref, kind) {
    const current = map.get(label) ?? { label, source_refs: [], source_kinds: [] };
    if (!current.source_refs.some((item) => item.id === ref.id)) current.source_refs.push(ref);
    if (!current.source_kinds.includes(kind)) current.source_kinds.push(kind);
    map.set(label, current);
  }
  for (const row of sources.interviews) {
    const details = row.details ?? {};
    const ref = { type: "family_interview", id: row.id };
    for (const tag of details.interest_tags ?? []) {
      const label = interviewInterestOptions.find((item) => item.id === tag)?.label;
      if (label && tag !== "other") add(interestRows, label, ref, "family_report");
    }
    const selected = sourceFields.map((field) => short(details[field], 800)).join(" ");
    for (const label of topicHits(selected, topics)) add(interestRows, label, ref, "family_report");
    for (const label of topicHits(selected, opportunities)) add(contextRows, label, ref, "family_report");
    for (const tag of details.language_tags ?? []) {
      const label = interviewLanguageOptions.find((item) => item.id === tag)?.label;
      if (label && tag !== "other") add(contextRows, `Lengua familiar: ${label}`, ref, "family_report");
    }
  }
  for (const row of sources.observations) {
    const ref = { type: row.source_type ?? "diagnostic_observation", id: row.id };
    for (const label of topicHits(row.observation_text, topics)) add(interestRows, label, ref, "teacher_observation");
    for (const label of topicHits(row.observation_text, opportunities)) add(contextRows, label, ref, "teacher_observation");
  }
  const known = [context.group_context, ...(context.available_resources ?? [])].filter(Boolean).join(" ");
  for (const label of topicHits(known, opportunities)) add(contextRows, label, { type: "classroom_context", id: context.id }, "teacher_context");
  return { interests: [...interestRows.values()], opportunities: [...contextRows.values()] };
}

function suggestedPriorities(sources, curriculum) {
  const allowed = new Set(curriculum.map((card) => card.id));
  return (sources.prior?.details?.priorities ?? []).filter((row) =>
    (row.related_competency_ids ?? []).some((id) => allowed.has(id))).slice(0, 4).map((row) => ({
    id: randomUUID(), title: short(row.title, 180), reason: short(row.reason, 500),
    related_competency_ids: row.related_competency_ids.filter((id) => allowed.has(id)).slice(0, 4),
    importance: row.importance, evidence_status: row.importance === "observe_more" ? "observe_more" : "supported",
    source_refs: [{ type: "diagnostic_priority", id: sources.prior.id }],
  }));
}

export async function proposePersonalization(sources, context, curriculum, { createProvider = createAIProviderForPlan } = {}) {
  const signals = projectPlanningSignals(sources, context);
  const observedChildren = new Set(sources.observations.map((row) => row.student_id)).size;
  const base = {
    group_profile: short([sources.group?.details?.strengths, sources.group?.details?.needs,
      sources.group?.details?.planning_priorities].filter(Boolean).map((part) => neutralizeAssessmentText(part, sources.names)).join(" "), 900)
      || "Estamos conociendo al grupo. La planificación inicial ofrecerá distintas formas de participar y seguirá recogiendo observaciones.",
    interests: signals.interests.slice(0, 12).map((item) => ({ id: randomUUID(), ...item })),
    priorities: suggestedPriorities(sources, curriculum),
    context_opportunities: signals.opportunities.slice(0, 12).map((item) => ({ id: randomUUID(), text: item.label,
      source_kind: item.source_kinds.join(", "), source_refs: item.source_refs })),
    classroom_conditions: (context.available_resources ?? []).map((value, index) => condition(`materials_${index}`, value)),
    evidence_coverage: { students: sources.students.length, interviews: sources.interviews.length,
      observed_students: observedChildren, observations: sources.observations.length },
    needs_more_observation: observedChildren < sources.students.length ? ["Seguir observando distintas formas de participación durante las primeras semanas."] : [],
    additional_notes: short(context.annual_planning_context?.additional_notes, 2000),
  };
  if (sources.observations.length < 3 || sources.prior) return base;
  const allowed = new Set(curriculum.map((card) => card.id));
  const observed = sources.observations.slice(-36).map((row) => ({
    text: anonymousDecisionText(short(row.observation_text, 260), sources.names),
    competency_id: allowed.has(row.competency_v4_id) ? row.competency_v4_id : null,
  })).filter((row) => row.text);
  if (observed.length < 3) return base;
  try {
    const plan = resolveAIExecutionPlan({ workflow: "diagnostic_group_synthesis", task: "generation" });
    const response = await createProvider(plan, { timeoutMs: 120_000 }).generate(buildProviderRequest("diagnostic_group_synthesis", {
      workflow: "annual_personalization", age: context.age,
      observed_records: observed, family_interest_topics: signals.interests.map((item) => item.label),
      family_context_topics: signals.opportunities.map((item) => item.label),
      curriculum: curriculum.map(({ id, name }) => ({ id, name })),
      task: "Propón una síntesis breve del grupo y de cero a cuatro prioridades justificadas por los registros. Las familias aportan contexto, no desempeño. Si no hay base para prioridades, devuelve []. No infieras dificultad por ausencia de registro; usa observe_more. No nombres a estudiantes ni inventes observaciones.",
    }, plan, proposalSchema, "Solo proponer desde señales reales; la docente decide."));
    const output = response.output;
    if (typeof output?.group_profile === "string" && output.group_profile.trim())
      base.group_profile = neutralizeAssessmentText(short(output.group_profile, 900), sources.names);
    if (Array.isArray(output?.priorities)) base.priorities = output.priorities.filter((row) =>
      row.title?.trim() && row.reason?.trim() && Array.isArray(row.related_competency_ids)
      && row.related_competency_ids.some((id) => allowed.has(id))).slice(0, 4).map((row) => ({
      id: randomUUID(), title: short(row.title, 180), reason: short(row.reason, 500),
      related_competency_ids: unique(row.related_competency_ids.filter((id) => allowed.has(id))).slice(0, 4),
      importance: ["higher", "normal", "observe_more"].includes(row.importance) ? row.importance : "observe_more",
      evidence_status: row.importance === "observe_more" ? "observe_more" : "supported",
      source_refs: sources.observations.filter((item) => row.related_competency_ids.includes(item.competency_v4_id))
        .slice(0, 12).map((item) => ({ type: item.source_type ?? "diagnostic_observation", id: item.id })),
    })).filter((row) => row.source_refs.length || row.importance === "observe_more");
  } catch { /* The deterministic proposal and explicit uncertainty remain usable without AI. */ }
  return base;
}

export function validatePersonalization(details, curriculum) {
  if (!details || typeof details !== "object") fail("invalid", "Revisa lo que Ayni entendió de tu aula.");
  const allowed = new Set(curriculum.map((card) => card.id));
  const profile = short(details.group_profile, 900);
  if (!profile || !Array.isArray(details.interests) || details.interests.length > 20 ||
    !Array.isArray(details.priorities) || details.priorities.length > 6 ||
    !Array.isArray(details.context_opportunities) || details.context_opportunities.length > 20 ||
    !Array.isArray(details.classroom_conditions) || details.classroom_conditions.length > 30)
    fail("invalid", "Revisa los cinco bloques antes de confirmar.");
  const items = (rows, labelField) => rows.map((item) => {
    if (!item?.id || !short(item[labelField], 500)) fail("invalid", "Revisa los elementos editados.");
    return { ...item, [labelField]: short(item[labelField], 500) };
  });
  const priorities = details.priorities.map((item) => {
    const ids = unique((item.related_competency_ids ?? []).filter((id) => allowed.has(id)));
    if (!short(item.title, 180) || !short(item.reason, 500) || !ids.length || ids.length > 4)
      fail("invalid", "Cada prioridad necesita motivo y competencia CNEB aplicable.");
    return { ...item, title: short(item.title, 180), reason: short(item.reason, 500), related_competency_ids: ids,
      evidence_status: item.importance === "observe_more" ? "observe_more" : "supported" };
  });
  const conditions = details.classroom_conditions.map((item) => {
    if (!item?.id || !conditionKinds.includes(item.kind) && !/^materials_\d+$/.test(item.kind))
      fail("invalid", "Revisa las condiciones reales del aula.");
    return { id: item.id, kind: item.kind, value: short(item.value, 500) };
  }).filter((item) => item.value);
  return { group_profile: profile, interests: items(details.interests, "label"), priorities,
    context_opportunities: items(details.context_opportunities, "text"), classroom_conditions: conditions,
    evidence_coverage: details.evidence_coverage ?? {},
    needs_more_observation: Array.isArray(details.needs_more_observation) ? details.needs_more_observation.map((x) => short(x, 300)).filter(Boolean).slice(0, 10) : [],
    additional_notes: short(details.additional_notes, 2000) };
}

export async function preparePersonalization(db, teacherId, context, { refresh = false } = {}) {
  const existing = (await db.query(`select * from annual_personalization_reviews where classroom_id=$1 and school_year_id=$2
    and status='draft'`, [context.id, context.school_year_id])).rows[0];
  if (existing) return existing;
  const confirmed = await currentPersonalization(db, teacherId, context);
  if (confirmed && !refresh) return confirmed;
  const sources = await personalizationSources(db, teacherId, context);
  const curriculum = await ageFilteredAnnualCurriculum(context);
  const fresh = confirmed?.source_fingerprint === sources.fingerprint ? null
    : await proposePersonalization(sources, context, curriculum);
  const previous = confirmed?.details;
  const newInterests = fresh?.interests.filter((item) => !previous?.interests.some((old) => old.label === item.label)) ?? [];
  const newContext = fresh?.context_opportunities.filter((item) => !previous?.context_opportunities.some((old) => old.text === item.text)) ?? [];
  const newPriorities = fresh?.priorities.filter((item) => !previous?.priorities.some((old) =>
    old.title.toLocaleLowerCase("es") === item.title.toLocaleLowerCase("es")
    || old.related_competency_ids.some((id) => item.related_competency_ids.includes(id)))) ?? [];
  const proposedGroupProfile = fresh?.evidence_coverage.observations >= 3
    && fresh.group_profile !== previous?.group_profile ? fresh.group_profile : null;
  const proposal = previous ? { ...previous,
    interests: [...previous.interests, ...newInterests],
    context_opportunities: [...previous.context_opportunities, ...newContext],
    priorities: [...previous.priorities, ...newPriorities].slice(0, 6),
    group_profile: proposedGroupProfile ?? previous.group_profile,
    evidence_coverage: fresh?.evidence_coverage ?? previous.evidence_coverage,
    needs_more_observation: fresh?.needs_more_observation ?? previous.needs_more_observation,
    suggested_changes: { new_interests: newInterests.map((item) => item.label),
      new_context: newContext.map((item) => item.text),
      new_priorities: newPriorities.map((item) => item.title),
      group_profile_changed: Boolean(proposedGroupProfile),
      new_observations: Math.max(0, (fresh?.evidence_coverage.observations ?? previous.evidence_coverage?.observations ?? 0)
        - (previous.evidence_coverage?.observations ?? 0)) },
  } : fresh;
  const version = Number((await db.query(`select coalesce(max(version),0)+1 as version from annual_personalization_reviews
    where classroom_id=$1 and school_year_id=$2`, [context.id, context.school_year_id])).rows[0].version);
  const id = randomUUID();
  const result = await db.query(`insert into annual_personalization_reviews
    (id,classroom_id,school_year_id,version,status,proposal,details,source_refs,source_fingerprint,created_by)
    values($1,$2,$3,$4,'draft',$5::jsonb,$5::jsonb,$6::jsonb,$7,$8)
    returning *`, [id,context.id,context.school_year_id,version,JSON.stringify(proposal),
      JSON.stringify(sources.references),sources.fingerprint,teacherId]);
  return result.rows[0];
}

export async function confirmPersonalization(db, teacherId, context, id, details) {
  const row = (await db.query(`select * from annual_personalization_reviews where id=$1 and classroom_id=$2
    and school_year_id=$3 and created_by=$4 and status='draft'`, [id,context.id,context.school_year_id,teacherId])).rows[0];
  if (!row) fail("not_found", "La propuesta del aula ya no está disponible.");
  const sources = await personalizationSources(db, teacherId, context);
  if (sources.fingerprint !== row.source_fingerprint) fail("stale", "La evidencia cambió. Actualiza la propuesta antes de confirmarla.");
  const validated = validatePersonalization(details, await ageFilteredAnnualCurriculum(context));
  const original = row.proposal ?? {};
  const byId = (items) => new Map((items ?? []).map((item) => [item.id, item]));
  const interests = byId(original.interests), priorities = byId(original.priorities), opportunities = byId(original.context_opportunities);
  validated.interests = validated.interests.map((item) => ({ ...item,
    source_refs: interests.get(item.id)?.label === item.label ? interests.get(item.id).source_refs ?? [] : [],
    source_kinds: interests.get(item.id)?.label === item.label ? interests.get(item.id).source_kinds ?? [] : ["teacher_entry"] }));
  validated.priorities = validated.priorities.map((item) => {
    const before = priorities.get(item.id);
    const unchanged = before && before.title === item.title && before.reason === item.reason
      && JSON.stringify(before.related_competency_ids) === JSON.stringify(item.related_competency_ids)
      && before.importance === item.importance;
    return { ...item, source_refs: unchanged ? before.source_refs ?? [] : [],
      evidence_status: unchanged ? before.evidence_status : "teacher_decision" };
  });
  validated.context_opportunities = validated.context_opportunities.map((item) => ({ ...item,
    source_refs: opportunities.get(item.id)?.text === item.text ? opportunities.get(item.id).source_refs ?? [] : [],
    source_kind: opportunities.get(item.id)?.text === item.text ? opportunities.get(item.id).source_kind ?? "teacher_context" : "teacher_entry" }));
  validated.evidence_coverage = original.evidence_coverage ?? {};
  validated.needs_more_observation = original.needs_more_observation ?? [];
  const confirmed = (await db.query(`update annual_personalization_reviews set status='confirmed',details=$1::jsonb,
    confirmed_at=now() where id=$2 and classroom_id=$3 and status='draft' returning *`,
  [JSON.stringify(validated),id,context.id])).rows[0];
  return confirmed;
}

export async function currentPersonalization(db, teacherId, context) {
  return (await db.query(`select * from annual_personalization_reviews where classroom_id=$1 and school_year_id=$2
    and created_by=$3 and status='confirmed' order by version desc limit 1`,
  [context.id,context.school_year_id,teacherId])).rows[0] ?? null;
}
