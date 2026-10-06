export const ANNUAL_JOURNEY_VERSION = 2;
const string = { type: "string", minLength: 1, maxLength: 1000 };
const list = (max = 12) => ({ type: "array", minItems: 1, maxItems: max, items: string });
const object = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
export const OPPORTUNITY_SCHEMA = object({ competency_id: string, capacity_names: list(6),
  child_action: string, conditions: string, mediation: string, observation: string, supports: string });
export const JOURNEY_ROW_PROPERTIES = { title: { ...string, maxLength: 180 }, rationale: { ...string, maxLength: 700 },
  purpose: { ...string, maxLength: 500 }, invitation: string, children_actions: list(8), materials: list(),
  supports: list(8), flexibility: string, source_fact_keys: { type: "array", maxItems: 20, items: string },
  opportunities: { type: "array", minItems: 1, maxItems: 5, items: OPPORTUNITY_SCHEMA } };
export const JOURNEY_GENERAL_PROPERTIES = { organization_criteria: list(4), transversal_approaches: list(8),
  teaching_strategies: list(8), assessment_followup: list(8), family_collaboration: list(8), inclusive_supports: list(8),
  everyday_opportunities: { type: "array", maxItems: 20, items: object({ moment: string, ...OPPORTUNITY_SCHEMA.properties }) } };
JOURNEY_GENERAL_PROPERTIES.evidence_interpretations = { type: "array", maxItems: 30, items: object({
  fact_keys: list(20), interpretation: string, meaning: { ...string, enum: ["advance", "support_needed", "ambiguous"] },
  scope: { ...string, enum: ["individual", "subgroup"] },
}) };
export const JOURNEY_GENERATION_SCHEMA = { id: "annual-journey-slots-v3", ...object({ ...JOURNEY_GENERAL_PROPERTIES,
  proposals: { type: "array", minItems: 15, maxItems: 15, items: object(JOURNEY_ROW_PROPERTIES) } }) };
export const JOURNEY_PATCH_SCHEMA = { id: "annual-journey-patch-v2", ...object({
  replacements: { type: "array", minItems: 1, maxItems: 15, items: object({ proposal_id: string,
    change_reason: string, ...JOURNEY_ROW_PROPERTIES }) },
  everyday_opportunities: JOURNEY_GENERAL_PROPERTIES.everyday_opportunities,
  evidence_interpretations: JOURNEY_GENERAL_PROPERTIES.evidence_interpretations,
}) };
export const JOURNEY_REVIEW_SCHEMA = { id: "annual-journey-review-v2", ...object({
  issues: { type: "array", maxItems: 20, items: object({ proposal_id: { type: "string" },
    reason: string }) },
}) };
export class AnnualJourneyError extends Error {
  constructor(reason, message, details = {}) { super(message); this.name = "AnnualJourneyError"; this.reason = reason; this.details = details; }
}
export const journeyFail = (reason, message, details) => { throw new AnnualJourneyError(reason, message, details); };

// The same schema is checked in code even when a provider claims structured output.
export function assertJourneySchema(value, schema, path = "output") {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value) || schema.required.some((key) => !(key in value))
      || Object.keys(value).some((key) => !(key in schema.properties))) journeyFail("incomplete", "La propuesta llegó incompleta. Puedes reintentar; tu año guardado se conserva.", { path });
    for (const [key, field] of Object.entries(schema.properties)) assertJourneySchema(value[key], field, `${path}.${key}`);
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity))
      journeyFail("incomplete", "Faltan oportunidades o detalles pedagógicos. Vuelve a intentar.", { path });
    value.forEach((item, index) => assertJourneySchema(item, schema.items, `${path}[${index}]`));
  } else if (typeof value !== "string" || value.trim().length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity))
    journeyFail("incomplete", "Revisa el contenido pedagógico incompleto.", { path });
  if (schema.enum && !schema.enum.includes(value)) journeyFail("invalid", "Una interpretación no cumple el contrato.", { path });
  return value;
}

export const journeyRowFields = Object.keys(JOURNEY_ROW_PROPERTIES);
export const journeyGeneralFields = Object.keys(JOURNEY_GENERAL_PROPERTIES);

export function validateAnnualJourney(plan, curriculum, { confirmation = false, requireCoverage = true } = {}) {
  if (plan.journey_version !== 2 || !Array.isArray(plan.proposed_experiences) || (plan.editor_version === 3 ? plan.proposed_experiences.length > 15 : plan.proposed_experiences.length !== 12))
    journeyFail("invalid_count", "Revisa las propuestas y los tramos de Mi año.");
  assertJourneySchema(Object.fromEntries(journeyGeneralFields.map((key) => [key, plan[key]])), object(JOURNEY_GENERAL_PROPERTIES));
  if (!plan.classroom_snapshot || plan.classroom_snapshot.version !== 2 || !Array.isArray(plan.classroom_snapshot.facts))
    journeyFail("invalid_snapshot", "Vuelve a revisar lo que sabemos del aula.");
  const allowed = new Map(curriculum.map((card) => [card.id, card]));
  const keys = new Set(plan.classroom_snapshot.facts.map((fact) => fact.key));
  const covered = new Set();
  const validateOpportunity = (item, proposalId) => {
    assertJourneySchema(item, OPPORTUNITY_SCHEMA);
    const card = allowed.get(item.competency_id);
    if (!card || (card.capacities && item.capacity_names.some((name) => !card.capacities.includes(name))))
      journeyFail("invalid_curriculum", "Una oportunidad no corresponde al currículo del aula.", { proposal_id: proposalId });
    covered.add(item.competency_id);
  };
  const titles = new Set();
  const proposalIds = new Set();
  for (const row of [...plan.proposed_experiences, ...(plan.available_experiences ?? [])]) {
    if (typeof row.proposal_id !== "string" || !row.proposal_id || proposalIds.has(row.proposal_id))
      journeyFail("invalid_ids", "Las propuestas necesitan identificadores únicos.");
    proposalIds.add(row.proposal_id);
    assertJourneySchema(Object.fromEntries(journeyRowFields.map((key) => [key, row[key]])), object(JOURNEY_ROW_PROPERTIES));
    const title = row.title.trim().toLocaleLowerCase("es");
    if (titles.has(title)) journeyFail("repeated_titles", "Hay propuestas repetidas.", { proposal_id: row.proposal_id });
    titles.add(title);
    if (row.source_fact_keys.some((key) => !keys.has(key))) journeyFail("invalid_trace", "Una propuesta cita información que no pertenece al aula.", { proposal_id: row.proposal_id });
    const previousCoverage=new Set(covered);
    row.opportunities.forEach((item) => validateOpportunity(item, row.proposal_id));
    if (!plan.proposed_experiences.some(r=>r.proposal_id===row.proposal_id)) { covered.clear(); previousCoverage.forEach(id=>covered.add(id)); }
    const ids = [...new Set(row.opportunities.map((item) => item.competency_id))];
    if (JSON.stringify(ids) !== JSON.stringify(row.primary_competency_ids))
      journeyFail("nominal_competency", "Cada competencia necesita una oportunidad concreta, con acción, mediación y observación.", { proposal_id: row.proposal_id });
  }
  for (const { moment, ...item } of plan.everyday_opportunities) { if (!moment?.trim()) journeyFail("incomplete", "Falta el momento cotidiano."); validateOpportunity(item, ""); }
  for (const [index, interpretation] of plan.evidence_interpretations.entries()) {
    const facts = interpretation.fact_keys.map((key) => plan.classroom_snapshot.facts.find((f) => f.key === key));
    if (facts.some((f) => !f || f.kind !== "observed" || !f.support_text)) journeyFail("invalid_interpretation", "La interpretación necesita actuaciones registradas; una familia o un vacío no demuestra desempeño.");
    const children = new Set(facts.map((f) => f.subject));
    if (children.has("unknown") || interpretation.scope === "individual" && children.size !== 1)
      journeyFail("invalid_scope", "Necesitamos revisar una interpretación de los registros. Tus observaciones se conservan.",
        { interpretation_index: index, fact_keys: interpretation.fact_keys, subjects: [...children], requested_scope: interpretation.scope });
    if (interpretation.scope === "subgroup" && children.size < 2) journeyFail("invalid_scope", "Varias observaciones del mismo niño siguen siendo individuales.");
  }
  const missing = curriculum.filter((card) => !covered.has(card.id)).map((card) => card.id);
  const lateStart=plan.experience_context?.version===1 && plan.experience_context.starts_on > plan.resolved_calendar?.initial_stage.starts_on;
  if (missing.length && !lateStart && (plan.editor_version !== 3 || confirmation || requireCoverage)) journeyFail("coverage_missing", "Faltan oportunidades reales en las propuestas o momentos cotidianos.", { missing_competency_ids: missing });
  if (!Array.isArray(plan.pending_changes) || plan.pending_changes.length > 20 || !Array.isArray(plan.change_history))
    journeyFail("invalid_changes", "Los cambios pendientes no son válidos.");
  if (confirmation && plan.pending_changes.length) journeyFail("pending_changes", "Aplica o retira los cambios pendientes antes de confirmar.");
  if (confirmation && plan.pedagogical_review?.status !== "passed") journeyFail("review_required", "El año necesita terminar su revisión pedagógica antes de confirmar.");
  const calendar = plan.resolved_calendar;
  if (!calendar?.calendar_fingerprint || calendar.projects?.length !== (plan.editor_version === 3 ? 15 : 12) || !Array.isArray(calendar.assignments))
    journeyFail("invalid_calendar", "Falta resolver íntegramente el calendario.");
  const expected = [...calendar.initial_stage.instructional_dates.map((date) => ({ date, owner: "initial_stage" }))];
  if (confirmation && calendar.projects.some(slot=>!slot.proposal_id && !(lateStart && slot.occupancy==="past_unrecorded" && slot.instructional_dates.every(date=>date<plan.experience_context.starts_on)))) journeyFail("empty_slots","Coloca una propuesta en cada tramo futuro antes de confirmar.");
  if (plan.editor_version===3 && (calendar.projects.filter(s=>s.duration_weeks===2).length!==11 || calendar.projects.filter(s=>s.duration_weeks===3).length!==4 || new Set(calendar.projects.map(s=>s.slot_id)).size!==15)) journeyFail("invalid_calendar","Los 15 tramos necesitan conservar sus duraciones e identificadores.");
  const used=new Set();
  calendar.projects.forEach((slot,index) => {
    if(slot.historical_dates?.length){
      if(!lateStart || slot.historical_dates.some(date=>date>=plan.experience_context.starts_on || date>=slot.starts_on)) journeyFail("invalid_calendar","Revisa las fechas históricas del tramo parcial.");
      expected.push(...slot.historical_dates.map(date=>({date,owner:slot.slot_id})));
    }
    const row=plan.proposed_experiences.find(r=>r.proposal_id===slot.proposal_id);
    if (!row) { if(slot.proposal_id) journeyFail("invalid_calendar","Una propuesta del tramo no está disponible."); expected.push(...slot.instructional_dates.map(date=>({date,owner:slot.slot_id})));return; }
    if(used.has(row.proposal_id))journeyFail("invalid_calendar","Una propuesta ocupa más de un tramo.");used.add(row.proposal_id);
    if(plan.editor_version===3 && (row.slot_id!==slot.slot_id || row.duration_weeks!==slot.duration_weeks || row.period!==slot.period || row.planned_instructional_days!==slot.instructional_dates.length))journeyFail("invalid_calendar","La duración y los días deben pertenecer al tramo.");
    if(plan.editor_version!==3 && plan.proposed_experiences[index]?.proposal_id!==row.proposal_id)journeyFail("invalid_calendar","El orden guardado no coincide.");
    if (slot.proposal_id !== row.proposal_id || slot.starts_on !== row.planned_start_date || slot.ends_on !== row.planned_end_date
      || JSON.stringify(slot.instructional_dates) !== JSON.stringify(row.instructional_dates)
      || !slot.instructional_dates.length || slot.instructional_dates.some((day) => day < slot.starts_on || day > slot.ends_on))
      journeyFail("invalid_calendar", "La propuesta y su calendario no coinciden.");
    expected.push(...slot.instructional_dates.map((date) => ({ date, owner: row.proposal_id })));
  });
  if (used.size!==plan.proposed_experiences.length) journeyFail("invalid_calendar","Hay propuestas sin tramo.");
  if (new Set(expected.map((entry) => entry.date)).size !== expected.length || JSON.stringify(expected) !== JSON.stringify(calendar.assignments)
    || calendar.integrity.eligible !== expected.length || calendar.integrity.assigned !== expected.length
    || calendar.integrity.gaps !== 0 || calendar.integrity.overlaps !== 0)
    journeyFail("invalid_calendar", "Hay huecos, solapamientos o asignaciones incoherentes.");
  return plan;
}

/** Optional hypotheses are never promoted to a wider scope to make validation pass.
 * Rejected wording stays in a server checkpoint for audit, outside pedagogical conclusions.
 * The semantic reviewer still checks all remaining reasons/supports against the literal sources.
 */
export function separateUnsupportedInterpretations(plan) {
  const accepted = [], insufficient = [...(plan.insufficient_interpretations ?? [])];
  for (const interpretation of plan.evidence_interpretations) {
    const facts = interpretation.fact_keys.map(key => plan.classroom_snapshot.facts.find(f => f.key === key));
    const subjects = [...new Set(facts.filter(Boolean).map(f => f.subject))];
    const validSources = facts.length > 0 && facts.every(f => f?.kind === "observed" && f.support_text && f.scope === "individual");
    const validScope = !subjects.includes("unknown") && (interpretation.scope === "individual" ? subjects.length === 1 : subjects.length >= 2);
    if (validSources && validScope) accepted.push(interpretation);
    else {
      const entry = { fact_keys: interpretation.fact_keys, subjects, attempted_scope: interpretation.scope,
        information_status: "insufficient_information", reason: validSources ? "incompatible_scope" : "unsupported_sources" };
      if (!insufficient.some(x => JSON.stringify(x) === JSON.stringify(entry))) insufficient.push(entry);
    }
  }
  return { ...plan, evidence_interpretations: accepted, insufficient_interpretations: insufficient };
}
