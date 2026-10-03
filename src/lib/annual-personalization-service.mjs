import { createHash, randomUUID } from "node:crypto";
import { ageFilteredAnnualCurriculum } from "./annual-preplan-service.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { validatePlanningPreferences } from "./annual-planning-preferences.mjs";
import { buildAnnualClassroomSnapshot, explicitPlanningSignals } from "./annual-classroom-snapshot.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const conditionKinds = ["spaces", "outdoors", "materials", "technology", "schedule", "family_support", "restrictions", "institutional_projects", "events", "other"];
const short = (value, limit = 500) => typeof value === "string" ? value.trim().slice(0, limit) : "";
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
      'diagnostic_observation' as source_type, o.classification_source from diagnostic_spontaneous_observations o
      join students s on s.id=o.student_id and s.status='active' where o.classroom_id=$1
    union all
    select o.id,o.student_id,o.competency_v4_id,o.observation_text,o.observed_at,
      'guided_diagnostic_observation' as source_type, null::text as classification_source from diagnostic_experience_observations o
      join students s on s.id=o.student_id and s.status='active'
      where o.classroom_id=$1
    union all
    select so.id,de.student_id,null::text as competency_v4_id,coalesce(so.note,de.observation_text) as observation_text,
      so.observed_at,'legacy_diagnostic_observation' as source_type, null::text as classification_source
      from student_observations so join diagnostic_entries de on de.id=so.diagnostic_entry_id
      join diagnostic_sessions ds on ds.id=de.session_id
      join students s on s.id=de.student_id and s.status='active'
      where ds.classroom_id=$1 and so.status in ('observed','with_support')
    order by observed_at,id`, [context.id])).rows;
  const ordinary = (await db.query(`select o.id,o.student_id,coalesce(r.corrected_text,o.raw_text) as observation_text,
    o.occurred_at as observed_at,o.source_revision,o.source_kind,'ordinary_observation' as source_type,
    case when a.state='confirmed' and a.source='teacher' and a.raw_revision=o.source_revision then a.confirmed_competency_ids
      when a.id is null and o.source_revision=1 and ac.competency_v4_id is not null then array[ac.competency_v4_id]
      else array[]::text[] end as competency_ids
    from ordinary_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    left join lateral(select corrected_text,action from ordinary_observation_revisions where observation_id=o.id order by revision desc limit 1)r on true
    left join lateral(select * from ordinary_observation_attributions where observation_id=o.id order by version desc limit 1)a on true
    left join activity_criteria ac on ac.id=o.captured_criterion_id
    where o.classroom_id=$1 and o.created_by=$2 and s.status='active' and o.status<>'voided'
      and coalesce(r.action,'correct')<>'void' order by o.occurred_at,o.id`,[context.id,teacherId])).rows;
  observations.push(...ordinary);
  const group = (await db.query(`select id,version,details,teacher_confirmed_at from diagnostic_group_reviews
    where classroom_id=$1 and status='confirmed' order by version desc limit 1`, [context.id])).rows[0] ?? null;
  const prior = group ? (await db.query(`select id,version,details,teacher_confirmed_at from diagnostic_priority_reviews
    where classroom_id=$1 and group_review_id=$2 and status='confirmed' order by version desc limit 1`, [context.id, group.id])).rows[0] ?? null : null;
  const references = [...interviews.map((row) => ({ type: "family_interview", id: row.id, version: row.version })),
    ...observations.map((row) => ({ type: row.source_type, id: row.id })),
    ...(group ? [{ type: "diagnostic_group", id: group.id, version: group.version }] : []),
    ...(prior ? [{ type: "diagnostic_priority", id: prior.id, version: prior.version }] : [])];
  const sourceContext = (await db.query("select c.context,sy.annual_planning_context,c.age_grade_id,c.castellano_l2_applicable,c.religion_applicable from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=$1",[context.id])).rows[0];
  const fingerprint = hash({ sourceContext, references, roster: students.map((row) => row.id), applicability: [context.age, context.castellano_l2_applicable, context.religion_applicable], interviewFacts: interviews.map((row) => row.details),
    observations: observations.map((row) => [row.id,row.observation_text,row.competency_v4_id,row.competency_ids,row.source_revision,row.observed_at]),
    group: group?.details, prior: prior?.details, context: context.group_context,
    resources: context.available_resources });
  return { students, interviews, observations, group, prior, names, references, fingerprint };
}

/** Extract only bounded planning signals; never send a full interview or student identity to a provider. */
export function projectPlanningSignals(sources) {
  return explicitPlanningSignals(sources);
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

export async function proposePersonalization(sources, context, curriculum) {
  const signals = projectPlanningSignals(sources);
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
  base.classroom_snapshot = buildAnnualClassroomSnapshot(sources, context, curriculum);
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
  return { ...(details.classroom_snapshot ? { classroom_snapshot: details.classroom_snapshot } : {}), group_profile: profile, interests: items(details.interests, "label"), priorities,
    context_opportunities: items(details.context_opportunities, "text"), classroom_conditions: conditions,
    evidence_coverage: details.evidence_coverage ?? {},
    needs_more_observation: Array.isArray(details.needs_more_observation) ? details.needs_more_observation.map((x) => short(x, 300)).filter(Boolean).slice(0, 10) : [],
    additional_notes: short(details.additional_notes, 2000),
    ...(details.planning_preferences === undefined ? {} : { planning_preferences: validatePlanningPreferences(details.planning_preferences) }) };
}

export function retainPersonalizationEdits(proposal, edited, fresh) {
  const result = { ...fresh, ...(edited.planning_preferences === undefined ? {} : { planning_preferences: edited.planning_preferences }) };
  // Coverage and source metadata always come from the refreshed server proposal.
  const fields = { group_profile: null, additional_notes: null,
    interests: ["id", "label"], priorities: ["id", "title", "reason", "related_competency_ids", "importance"],
    context_opportunities: ["id", "text"], classroom_conditions: ["id", "kind", "value"] };
  for (const [field, keys] of Object.entries(fields)) {
    const comparable = (value) => keys && Array.isArray(value)
      ? value.map((row) => keys.map((key) => row[key] ?? null)) : value;
    if (JSON.stringify(comparable(edited[field])) !== JSON.stringify(comparable(proposal[field])))
      result[field] = edited[field];
  }
  return result;
}

export const personalizationSnapshot = (row) => hash([row.id, row.status, row.source_fingerprint, row.details]);
const withSnapshot = (row, extra = {}) => ({ ...row, snapshot: personalizationSnapshot(row), ...extra });
const checkSnapshot = (row, expected) => {
  if (expected !== undefined && expected !== personalizationSnapshot(row))
    fail("conflict", "La revisión cambió en otra pestaña. Vuelve a abrir Mi año antes de guardar; tus cambios siguen en esta pantalla.");
};

export async function savePersonalizationDraft(db, teacherId, context, id, details, expectedSnapshot) {
  const row = (await db.query(`select * from annual_personalization_reviews where id=$1 and classroom_id=$2
    and school_year_id=$3 and created_by=$4 and status='draft'`, [id,context.id,context.school_year_id,teacherId])).rows[0];
  if (!row) fail("not_found", "La revisión ya no está disponible como borrador.");
  if (!expectedSnapshot) fail("conflict", "Vuelve a abrir la revisión antes de guardar.");
  checkSnapshot(row, expectedSnapshot);
  const validated = validatePersonalization(details, await ageFilteredAnnualCurriculum(context));
  // Clients cannot manufacture evidence coverage or observation recommendations.
  validated.classroom_snapshot = row.proposal.classroom_snapshot;
  validated.evidence_coverage = row.proposal.evidence_coverage;
  validated.needs_more_observation = row.proposal.needs_more_observation;
  const saved = (await db.query(`update annual_personalization_reviews set details=$1::jsonb
    where id=$2 and created_by=$3 and status='draft' and details=$4::jsonb and source_fingerprint=$5 returning *`,
    [JSON.stringify(validated),id,teacherId,JSON.stringify(row.details),row.source_fingerprint])).rows[0];
  if (!saved) fail("conflict", "La revisión cambió en otra pestaña. Conserva tus cambios y vuelve a abrir Mi año.");
  const sources = await personalizationSources(db, teacherId, context);
  return withSnapshot(saved, { sources_changed: saved.source_fingerprint !== sources.fingerprint });
}

export async function preparePersonalization(db, teacherId, context, { refresh = false, details, expectedSnapshot } = {}) {
  const existing = (await db.query(`select * from annual_personalization_reviews where classroom_id=$1 and school_year_id=$2
    and created_by=$3 and status='draft'`, [context.id, context.school_year_id, teacherId])).rows[0];
  if (existing) {
    const sources = await personalizationSources(db, teacherId, context);
    const changed = existing.source_fingerprint !== sources.fingerprint;
    // Opening a preparation (including StrictMode/another tab) is a read. Only
    // the explicit update action supplies details and can refresh an existing draft.
    if (!refresh || details === undefined) return withSnapshot(existing, { sources_changed: changed });
    if (details && !expectedSnapshot) fail("conflict", "Vuelve a abrir la revisión antes de actualizarla.");
    checkSnapshot(existing, expectedSnapshot);
    const curriculum = await ageFilteredAnnualCurriculum(context);
    const edited = validatePersonalization(details ?? existing.details, curriculum);
    const fresh = changed ? await proposePersonalization(sources, context, curriculum) : existing.proposal;
    const retained = validatePersonalization(retainPersonalizationEdits(existing.proposal, edited, fresh), curriculum);
    const updated = (await db.query(`update annual_personalization_reviews
      set proposal=$1::jsonb,details=$2::jsonb,source_refs=$3::jsonb,source_fingerprint=$4
      where id=$5 and created_by=$6 and status='draft' and source_fingerprint=$7 and details=$8::jsonb returning *`,
      [JSON.stringify(fresh), JSON.stringify(retained), JSON.stringify(sources.references), sources.fingerprint,
        existing.id, teacherId, existing.source_fingerprint, JSON.stringify(existing.details)])).rows[0];
    if (!updated) fail("conflict", "La propuesta cambió en otra ventana. Abre la revisión guardada para continuar.");
    return withSnapshot(updated, { sources_changed: false });
  }
  const confirmed = await currentPersonalization(db, teacherId, context);
  if (confirmed && !refresh) return withSnapshot(confirmed);
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
    classroom_snapshot: fresh?.classroom_snapshot ?? previous.classroom_snapshot,
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
    on conflict do nothing returning *`, [id,context.id,context.school_year_id,version,JSON.stringify(proposal),
      JSON.stringify(sources.references),sources.fingerprint,teacherId]);
  const saved = result.rows[0] ?? (await db.query(`select * from annual_personalization_reviews
    where classroom_id=$1 and school_year_id=$2 and created_by=$3 and status='draft'`,
    [context.id,context.school_year_id,teacherId])).rows[0];
  if (!saved) fail("conflict", "La preparación cambió en otra pestaña. Vuelve a abrir Mi año.");
  return withSnapshot(saved, { sources_changed: saved.source_fingerprint !== sources.fingerprint });
}

export async function confirmPersonalization(db, teacherId, context, id, details, expectedSnapshot) {
  const row = (await db.query(`select * from annual_personalization_reviews where id=$1 and classroom_id=$2
    and school_year_id=$3 and created_by=$4 and status='draft'`, [id,context.id,context.school_year_id,teacherId])).rows[0];
  if (!row) fail("not_found", "La propuesta del aula ya no está disponible.");
  checkSnapshot(row, expectedSnapshot);
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
  validated.classroom_snapshot = original.classroom_snapshot;
  validated.evidence_coverage = original.evidence_coverage ?? {};
  validated.needs_more_observation = original.needs_more_observation ?? [];
  const confirmed = (await db.query(`update annual_personalization_reviews set status='confirmed',details=$1::jsonb,
    confirmed_at=now() where id=$2 and classroom_id=$3 and status='draft' and details=$4::jsonb
    and source_fingerprint=$5 returning *`,
  [JSON.stringify(validated),id,context.id,JSON.stringify(row.details),row.source_fingerprint])).rows[0];
  if (!confirmed) fail("conflict", "La revisión cambió en otra pestaña. Vuelve a abrir Mi año.");
  return withSnapshot(confirmed);
}

export async function currentPersonalization(db, teacherId, context) {
  return (await db.query(`select * from annual_personalization_reviews where classroom_id=$1 and school_year_id=$2
    and created_by=$3 and status='confirmed' order by version desc limit 1`,
  [context.id,context.school_year_id,teacherId])).rows[0] ?? null;
}
