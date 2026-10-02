import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadAnnualPreplanSkill, loadPersonalizedPreplanSkill } from "./annual-plan-skill.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";
import { AnnualCalendarError, buildEditableAnnualSchedule, buildFlexibleAnnualSchedule, suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";
import { validatePlanningPreferences, validateTeacherIdeaFeedback } from "./annual-planning-preferences.mjs";
import { anonymousDecisionText } from "./jev-competency-suggestion.mjs";

export const ANNUAL_PREPLAN_FORMAT = "annual_preplan_v1";
const monthNames = ["", "", "", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const rowFields = ["proposal_id", "experience_type", "title", "period", "month", "duration_weeks", "rationale", "purpose", "primary_competency_ids"];
const traceFields = ["source_interest_ids", "source_priority_ids", "source_context_ids", "source_condition_ids"];
const calendarFields = ["planned_start_date", "planned_end_date", "planned_instructional_days", "period_label"];
const aiRowFields = rowFields.filter((field) => field !== "proposal_id");
const rowProperties = { experience_type: { enum: ["project", "unit"] }, title: { type: "string" },
  period: { enum: ["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"] }, month: { type: "integer" },
  duration_weeks: { enum: [2, 3] }, rationale: { type: "string" }, purpose: { type: "string" },
  primary_competency_ids: { type: "array", items: { type: "string" } } };
export const ANNUAL_PREPLAN_OUTPUT_SCHEMA = { id: "annual-preplan-v1", type: "object", additionalProperties: false,
  required: ["proposals"], properties: { proposals: { type: "array", minItems: 12, maxItems: 12,
    items: { type: "object", additionalProperties: false, required: aiRowFields, properties: rowProperties } } } };
const keyFields = ["source_interest_keys", "source_priority_keys", "source_context_keys", "source_condition_keys"];
export const PERSONALIZED_PREPLAN_OUTPUT_SCHEMA = { id: "annual-preplan-personalized-v1", type: "object", additionalProperties: false,
  required: ["proposals"], properties: { proposals: { type: "array", minItems: 12, maxItems: 12,
    items: { type: "object", additionalProperties: false, required: [...aiRowFields, ...keyFields],
      properties: { ...rowProperties, ...Object.fromEntries(keyFields.map((field) => [field,
        { type: "array", items: { type: "string" } }])) } } } } };

export class AnnualPreplanError extends Error {
  constructor(reason, message) { super(message); this.name = "AnnualPreplanError"; this.reason = reason; }
}
export const TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA = structuredClone(PERSONALIZED_PREPLAN_OUTPUT_SCHEMA);
TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA.id = "annual-preplan-teacher-ideas-v1";
TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA.required.push("idea_feedback");
TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA.properties.idea_feedback = { type: "array", maxItems: 10, items: {
  type: "object", additionalProperties: false, required: ["idea_key", "explanation"],
  properties: { idea_key: { type: "string" }, explanation: { type: "string" } } } };
const ideaRowSchema = TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA.properties.proposals.items;
ideaRowSchema.required.push("source_teacher_idea_keys", "planning_origin");
ideaRowSchema.properties.source_teacher_idea_keys = { type: "array", items: { type: "string" } };
ideaRowSchema.properties.planning_origin = { enum: ["diagnosis", "teacher_idea", "calendar"] };
const fail = (reason, message) => { throw new AnnualPreplanError(reason, message); };
const text = (value, limit) => typeof value === "string" && value.trim() && value.trim().length <= limit ? value.trim() : null;

export function validateAnnualPreplan(proposal, allowedIds, expectedYear, { initial = false, allowCalendarMetadata = true } = {}) {
  if (proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT || Number(proposal.school_year) !== Number(expectedYear)
    || !Array.isArray(proposal.proposed_experiences) || proposal.proposed_experiences.length < 1
    || proposal.proposed_experiences.length > 20 || (initial && proposal.proposed_experiences.length !== 12)
    || (proposal.available_experiences !== undefined && (!Array.isArray(proposal.available_experiences)
      || proposal.available_experiences.length > 20)))
    fail("invalid", "El preplan debe tener propuestas válidas para este año escolar.");
  const allowed = new Set(allowedIds), seen = new Set();
  const preferences = validatePlanningPreferences(proposal.planning_preferences);
  const feedback = validateTeacherIdeaFeedback(proposal.teacher_idea_feedback, preferences);
  const ideaIds = new Set(preferences?.teacher_ideas.map((idea) => idea.id) ?? []);
  // Reloaded rows include server-derived calendar metadata. Accept only these
  // known transport fields and return editable fields only; callers recompute
  // dates/counts from the authorized calendar before persisting or confirming.
  const inputFields = [...rowFields, ...(allowCalendarMetadata ? calendarFields : []), ...traceFields,
    "source_teacher_decision", "source_group_profile", "source_teacher_idea_ids", "planning_origin"];
  let previousPeriod = 1;
  const validateRow = (item, index, available = false) => {
    const period = Number(String(item?.period ?? "").match(/^Bimestre ([1-4])$/)?.[1]);
    const ids = item?.primary_competency_ids;
    if (!item || Object.keys(item).some((field) => !inputFields.includes(field)) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.proposal_id ?? "") || seen.has(item.proposal_id) ||
      !["project", "unit"].includes(item.experience_type) || !text(item.title, 180) ||
      !period || (!available && period < previousPeriod) || !Number.isInteger(item.month) || item.month < 3 || item.month > 12 ||
      ![2, 3].includes(item.duration_weeks) || !text(item.rationale, 700) || !text(item.purpose, 500) ||
      !Array.isArray(ids) || ids.length < 1 || ids.length > 5 || ids.some((id) => !allowed.has(id)) || new Set(ids).size !== ids.length)
      fail("invalid_row", `Revisa los datos de la propuesta ${index + 1}.`);
    seen.add(item.proposal_id); if (!available) previousPeriod = period;
    if (item.source_teacher_idea_ids !== undefined && (!Array.isArray(item.source_teacher_idea_ids)
      || item.source_teacher_idea_ids.some((id) => !ideaIds.has(id)))) fail("invalid_trace", "La propuesta cita una idea docente que no pertenece a esta preparación.");
    if (item.planning_origin !== undefined && (!["diagnosis", "teacher_idea", "calendar", "teacher_decision"].includes(item.planning_origin)
      || item.planning_origin === "teacher_idea" && !item.source_teacher_idea_ids?.length
      || item.planning_origin === "teacher_decision" && item.source_teacher_decision !== true))
      fail("invalid_trace", "Revisa la procedencia de la propuesta.");
    return { proposal_id: item.proposal_id, experience_type: item.experience_type, title: item.title.trim(),
      period: item.period, month: item.month, duration_weeks: item.duration_weeks,
      rationale: item.rationale.trim(), purpose: item.purpose.trim(), primary_competency_ids: [...ids],
      ...(item.source_teacher_decision === true ? { source_teacher_decision: true } : {}),
      ...(item.source_group_profile === true ? { source_group_profile: true } : {}),
      ...(item.planning_origin === undefined ? {} : { planning_origin: item.planning_origin }),
      ...(item.source_teacher_idea_ids === undefined ? {} : { source_teacher_idea_ids: [...new Set(item.source_teacher_idea_ids)] }),
      ...Object.fromEntries(traceFields.filter((field) => item[field] !== undefined).map((field) => {
        if (!Array.isArray(item[field]) || item[field].length > 12 || item[field].some((id) => typeof id !== "string"))
          fail("invalid_row", `Revisa las fuentes de la propuesta ${index + 1}.`);
        return [field, [...new Set(item[field])]];
      })) };
  };
  const rows = proposal.proposed_experiences.map((item, index) => validateRow(item, index));
  const available = (proposal.available_experiences ?? []).map((item, index) => validateRow(item, index, true));
  const titles = [...rows, ...available].map((item) => item.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim());
  if (new Set(titles).size !== titles.length) fail("repeated_titles", "Hay títulos repetidos. Da a cada propuesta un nombre propio.");
  return { plan_format: ANNUAL_PREPLAN_FORMAT, title: "Mi año", school_year: String(expectedYear), proposed_experiences: rows,
    ...(preferences === undefined ? {} : { planning_preferences: preferences }),
    ...(feedback === undefined ? {} : { teacher_idea_feedback: feedback }),
    ...(proposal.available_experiences !== undefined ? { available_experiences: available } : {}) };
}

export function validateGeneratedPreplan(output, allowedIds, year, preparation = {}) {
  if (!Array.isArray(output?.proposals) || output.proposals.length !== 12 || Object.keys(output).some((key) => key !== "proposals"))
    fail("invalid_ai", "Ayni no pudo preparar las doce propuestas iniciales.");
  const proposal = { plan_format: ANNUAL_PREPLAN_FORMAT, school_year: String(year),
    ...preparation,
    proposed_experiences: output.proposals.map((row) => ({ ...row, proposal_id: randomUUID() })) };
  return validateAnnualPreplan(proposal, allowedIds, year, { initial: true, allowCalendarMetadata: false });
}

export function validatePreplanTrace(proposal, personalization) {
  if (!personalization) return proposal;
  if (JSON.stringify(validatePlanningPreferences(proposal.planning_preferences)) !== JSON.stringify(validatePlanningPreferences(personalization.planning_preferences)))
    fail("invalid_trace", "Las ideas deben corresponder a la preparación confirmada de esta versión.");
  const groups = [personalization.interests, personalization.priorities,
    personalization.context_opportunities, personalization.classroom_conditions];
  const permitted = groups.map((items) => new Set(items.map((item) => item.id)));
  const ideaIds = new Set(personalization.planning_preferences?.teacher_ideas.map((idea) => idea.id) ?? []);
  for (const row of [...proposal.proposed_experiences, ...(proposal.available_experiences ?? [])]) {
    let cited = 0;
    for (const [index, field] of traceFields.entries()) {
      const values = row[field];
      if (!Array.isArray(values) || values.some((id) => !permitted[index].has(id)))
        fail("invalid_trace", "Una propuesta cita una decisión que no fue confirmada por la docente.");
      cited += values.length;
    }
    if (row.source_teacher_idea_ids?.some((id) => !ideaIds.has(id))) fail("invalid_trace", "La propuesta cita una idea docente no confirmada.");
    if (!cited && !row.source_teacher_idea_ids?.length && row.planning_origin !== "calendar" && !row.source_group_profile && !row.source_teacher_decision && groups.some((items) => items.length))
      fail("invalid_trace", "Cada propuesta necesita al menos una decisión confirmada como origen.");
  }
  return proposal;
}

export async function ageFilteredAnnualCurriculum(context) {
  const kb = await loadKnowledgeBaseV4();
  const age = String(context.age);
  return kb.competencyCards.filter((card) => competencyApplicability(card, age, {
    castellanoL2Applicable: context.castellano_l2_applicable === true,
    religionApplicable: context.religion_applicable === true,
  }).planning_available).map((card) => ({ id: card.id, name: card.official_name, area: card.area_name,
    capacities: card.capacities.map((cap) => cap.official_name), cycle_standard: card.cycle_ii_standard_ai,
    age_reference: card.ages[age], age_reference_kind: competencyApplicability(card, age).reference_kind }));
}

export async function generateAnnualPreplan({ context, curriculum, resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill }) {
  const personalization = context.personalization?.details;
  const preferences = validatePlanningPreferences(personalization?.planning_preferences);
  const ideas = preferences?.teacher_ideas ?? [];
  if (!personalization && (!context.source_diagnostic_review_id || !context.source_priority_review_id))
    fail("diagnostic_required", "Confirma primero «Así está mi grupo» y «Prioridades del año».");
  const plan = resolvePlan({ workflow: "annual_plan", task: "generation" });
  const durations = suggestAnnualProjectDurations(context.calendar);
  const baseline = buildFlexibleAnnualSchedule(context.calendar, durations.map((duration_weeks) => ({ duration_weeks }))).projects;
  const suggested = baseline.map((slot) => ({ experience_type: "project", period: slot.period,
    month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks }));
  // New contracts keep calendar dates without forcing a theme. Historical generation keeps its prior schedule.
  if (!personalization) {
    suggested[5].month = 7;
    suggested[11].month = 12;
    suggested[11].duration_weeks = 2;
  }
  let scheduled = baseline;
  try { scheduled = buildEditableAnnualSchedule(context.calendar, suggested).projects; }
  catch (error) {
    if (!(error instanceof AnnualCalendarError) || error.reason !== "project_does_not_fit") throw error;
    // An institutional calendar may require the safe, already validated baseline.
  }
  const initialSlots = scheduled.map((slot) => ({ index: slot.index, period: slot.period,
    month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks,
    starts_on: slot.starts_on, ends_on: slot.ends_on }));
  const bundle = { workflow: "annual_preplan", age: context.age,
    ...(ideas.length ? { planning_preferences: { teacher_ideas: ideas.map((idea, index) => ({ key: `h${index + 1}`,
      title: anonymousDecisionText(idea.title, context.student_names ?? []), explanation: anonymousDecisionText(idea.explanation, context.student_names ?? []), requested_month: idea.requested_month })) } } : {}),
    confirmed_group: personalization ? { profile: personalization.group_profile } : context.diagnostic_group,
    confirmed_priorities: personalization?.priorities ?? context.confirmed_priorities ?? context.diagnostic_group?.competency_priorities ?? [],
    year_context: personalization ? { additional_notes: personalization.additional_notes,
      conditions: personalization.classroom_conditions.map((item) => ({ kind: item.kind, value: item.value })) } : context.annual_planning_context ?? {},
    interests: personalization?.interests?.map((item) => item.label) ?? context.context_v4?.common_interests?.map((item) => item.label) ?? [],
    personalization: personalization ? {
      interests: personalization.interests.map((item, index) => ({ key: `i${index + 1}`, label: item.label })),
      priorities: personalization.priorities.map((item, index) => ({ key: `p${index + 1}`, title: item.title,
        reason: item.reason, related_competency_ids: item.related_competency_ids,
        evidence_status: item.evidence_status })),
      context: personalization.context_opportunities.map((item, index) => ({ key: `c${index + 1}`, text: item.text })),
      conditions: personalization.classroom_conditions.map((item, index) => ({ key: `r${index + 1}`, kind: item.kind, value: item.value })),
      needs_more_observation: personalization.needs_more_observation,
      evidence_coverage: personalization.evidence_coverage,
    } : undefined,
    known_environment: context.group_context,
    calendar: personalization ? { school_year: context.calendar.school_year,
      starts_on: context.calendar.starts_on, ends_on: context.calendar.ends_on,
      blocks: context.calendar.blocks, initial_stage: context.calendar.initial_stage } : context.calendar,
    initial_slots: initialSlots,
    curriculum: { age: context.age, competency_cards: curriculum },
    didactic_knowledge: await focusedKnowledgeForDirectWorkflow({ workflow: "annual_plan", age: context.age,
      competencyIds: [...new Set((context.confirmed_priorities ?? []).flatMap((item) =>
        item.related_competency_ids ?? item.competency_ids ?? []))].filter((id) => curriculum.some((card) => card.id === id)),
      request: [context.group_context, context.annual_planning_context?.additional_notes].filter(Boolean).join(" "),
      castellanoL2Applicable: context.castellano_l2_applicable === true,
      religionApplicable: context.religion_applicable === true }),
    task: personalization
      ? `Propón exactamente doce filas editables y distintas para este grupo. Copia bimestre, mes y duración de initial_slots. Usa los intereses, prioridades y oportunidades confirmadas para variar materialmente temas, razones y competencias; no infieras dificultad desde datos ausentes. Los hitos del calendario se respetan como fechas pero no fuerzan temas. En cada fila devuelve keys que realmente influyeron; al menos una key válida si existe información confirmada. El servidor construirá el motivo visible desde esas keys. No generes actividades ni evidencias.`
      : `Propón exactamente doce filas editables. Copia el bimestre, mes y duración de initial_slots para cada índice, en orden; código ya comprobó que caben en el calendario. Vincula pedagógicamente la fila 1 al Día del Niño Peruano, la 4 al Día de la Educación Inicial, la 6 a Fiestas Patrias y la 12 a Navidad/cierre de año. Sitúalas en el contexto de sus fechas previstas sin convertirlas en manualidades ni celebraciones vacías. Da a cada propuesta un título natural y concreto que ayude a imaginar qué harán los niños. Diferencia la mecánica de las doce propuestas: no repitas conversar, proponer, acordar y probar con otro tema. En especial, la fila 1 puede centrarse en elegir juegos y acordar cómo participar; la fila 4 debe centrarse en observar y transformar un espacio de juego, probando sus cambios en el lugar. Explica propósito y fundamento con frases cortas y verbos concretos. Distribuye competencias del CNEB según su pertinencia; procura al menos una oportunidad por competencia aplicable y dos cuando sea natural, sin forzar títulos. Usa solo los campos del esquema. No generes productos, criterios, evidencias ni actividades.`,
  };
  if (ideas.length) bundle.task += " Las planning_preferences son intenciones opcionales de la docente, nunca evidencia de niños ni prioridades diagnósticas. Combina ideas pertinentes con el aula y CNEB; no es obligatorio incorporar todas. Intenta situarlas en un initial_slot del mes solicitado. Si no hay un slot en ese mes, considera otra ubicación y explica la alternativa. No cambies las fechas, bimestres o duración de los slots. En cada fila cita solo source_teacher_idea_keys que realmente influyen e indica planning_origin como diagnosis, teacher_idea o calendar. Devuelve exactamente una idea_feedback por cada key de idea, explicando si se incorporó, si hay un conflicto de calendario o pertinencia, qué alternativa propones o por qué no se incorporó. Nunca inventes que los niños pidieron una idea docente.";
  const provider = createProvider(plan, { timeoutMs: 180_000 });
  const response = await provider.generate(buildProviderRequest("annual_plan", bundle, plan,
    ideas.length ? TEACHER_IDEAS_PREPLAN_OUTPUT_SCHEMA : personalization ? PERSONALIZED_PREPLAN_OUTPUT_SCHEMA : ANNUAL_PREPLAN_OUTPUT_SCHEMA,
    await (loadSkill ?? (personalization ? loadPersonalizedPreplanSkill : loadAnnualPreplanSkill))()));
  const feedback = ideas.length ? validateTeacherIdeaFeedback(response.output?.idea_feedback?.map((item) => {
    const idea = ideas[Number(String(item.idea_key).slice(1)) - 1];
    if (!/^h[1-9][0-9]*$/.test(item.idea_key) || !idea) fail("invalid_ai", "Una explicación cita una idea docente inexistente.");
    return { idea_id: idea.id, explanation: item.explanation };
  }), preferences) : undefined;
  const alignedOutput = { ...response.output, proposals: response.output?.proposals?.map((row, index) =>
    ({ ...row, period: initialSlots[index]?.period, month: initialSlots[index]?.month,
      duration_weeks: initialSlots[index]?.duration_weeks })) };
  if (ideas.length) delete alignedOutput.idea_feedback;
  if (personalization) alignedOutput.proposals = alignedOutput.proposals?.map((row) => {
    const groups = [personalization.interests, personalization.priorities,
      personalization.context_opportunities, personalization.classroom_conditions];
    const prefixes = ["i", "p", "c", "r"];
    const fields = ["source_interest_ids", "source_priority_ids", "source_context_ids", "source_condition_ids"];
    const traces = Object.fromEntries(fields.map((field, groupIndex) => {
      const keys = row[keyFields[groupIndex]];
      if (!Array.isArray(keys) || keys.some((key) => !new RegExp(`^${prefixes[groupIndex]}[1-9][0-9]*$`).test(key)
        || !groups[groupIndex][Number(key.slice(1)) - 1])) fail("invalid_ai", "Una propuesta citó una decisión no confirmada.");
      return [field, [...new Set(keys.map((key) => groups[groupIndex][Number(key.slice(1)) - 1].id))]];
    }));
    const ideaKeys = ideas.length ? row.source_teacher_idea_keys : [];
    if (!Array.isArray(ideaKeys) || ideaKeys.some((key) => !/^h[1-9][0-9]*$/.test(key) || !ideas[Number(key.slice(1)) - 1]))
      fail("invalid_ai", "Una propuesta cita una idea docente inexistente.");
    const citedIdeas = [...new Set(ideaKeys.map((key) => ideas[Number(key.slice(1)) - 1]))];
    const cited = [
      ...(traces.source_interest_ids.map((id) => personalization.interests.find((item) => item.id === id)?.label)),
      ...(traces.source_priority_ids.map((id) => personalization.priorities.find((item) => item.id === id)?.title)),
      ...(traces.source_context_ids.map((id) => personalization.context_opportunities.find((item) => item.id === id)?.text)),
      ...(traces.source_condition_ids.map((id) => personalization.classroom_conditions.find((item) => item.id === id)?.value)),
    ].filter(Boolean);
    if (ideas.length && !["diagnosis", "teacher_idea", "calendar"].includes(row.planning_origin)) fail("invalid_ai", "Falta la procedencia de una propuesta.");
    if (!cited.length && !citedIdeas.length && !(ideas.length && row.planning_origin === "calendar") && groups.some((items) => items.length)) fail("invalid_ai", "Cada propuesta necesita una razón basada en decisiones confirmadas.");
    return { experience_type: row.experience_type, title: row.title, period: row.period, month: row.month,
      duration_weeks: row.duration_weeks, purpose: row.purpose, primary_competency_ids: row.primary_competency_ids,
      rationale: [cited.length ? `Responde a ${cited.slice(0, 3).join(", ")}.` : "",
        citedIdeas.length ? `Retoma la idea docente: ${citedIdeas.map((idea) => idea.title).join(", ")}.` : "",
        ideas.length && row.planning_origin === "calendar" ? `Ubicación prevista según el calendario: ${row.period}.` : ""].filter(Boolean).join(" ").slice(0, 700) || "Propuesta inicial para seguir conociendo al grupo.",
      ...(cited.length || citedIdeas.length ? {} : { source_group_profile: true }), ...traces,
      ...(ideas.length ? { source_teacher_idea_ids: citedIdeas.map((idea) => idea.id), planning_origin: row.planning_origin } : {}) };
  });
  const proposal = validatePreplanTrace(validateGeneratedPreplan(alignedOutput, curriculum.map((card) => card.id), context.year,
    { ...(preferences === undefined ? {} : { planning_preferences: preferences }), ...(feedback === undefined ? {} : { teacher_idea_feedback: feedback }) }), personalization);
  buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences);
  return { proposal, metadata: { provider: response.provider_metadata?.provider ?? plan.provider,
    model: response.provider_metadata?.model ?? plan.model, reasoning_effort: plan.reasoning_effort,
    routing_policy_version: plan.routing_policy_version, usage: response.provider_metadata?.usage ?? null,
    response_id: response.provider_metadata?.response_id ?? null, fallback_used: false },
    source: { diagnostic_review_id: context.source_diagnostic_review_id, priority_review_id: context.source_priority_review_id,
      personalization_review_id: context.personalization?.id ?? null } };
}

export const annualMonthLabel = (month) => monthNames[month] ?? "";
