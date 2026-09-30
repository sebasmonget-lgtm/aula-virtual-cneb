import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadAnnualPreplanSkill } from "./annual-plan-skill.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";
import { AnnualCalendarError, buildEditableAnnualSchedule, buildFlexibleAnnualSchedule, suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";

export const ANNUAL_PREPLAN_FORMAT = "annual_preplan_v1";
const monthNames = ["", "", "", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const rowFields = ["proposal_id", "experience_type", "title", "period", "month", "duration_weeks", "rationale", "purpose", "primary_competency_ids"];
const calendarFields = ["planned_start_date", "planned_end_date", "planned_instructional_days", "period_label"];
const aiRowFields = rowFields.filter((field) => field !== "proposal_id");
const rowProperties = { experience_type: { enum: ["project", "unit"] }, title: { type: "string" },
  period: { enum: ["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"] }, month: { type: "integer" },
  duration_weeks: { enum: [2, 3] }, rationale: { type: "string" }, purpose: { type: "string" },
  primary_competency_ids: { type: "array", items: { type: "string" } } };
export const ANNUAL_PREPLAN_OUTPUT_SCHEMA = { id: "annual-preplan-v1", type: "object", additionalProperties: false,
  required: ["proposals"], properties: { proposals: { type: "array", minItems: 12, maxItems: 12,
    items: { type: "object", additionalProperties: false, required: aiRowFields, properties: rowProperties } } } };

export class AnnualPreplanError extends Error {
  constructor(reason, message) { super(message); this.name = "AnnualPreplanError"; this.reason = reason; }
}
const fail = (reason, message) => { throw new AnnualPreplanError(reason, message); };
const text = (value, limit) => typeof value === "string" && value.trim() && value.trim().length <= limit ? value.trim() : null;

export function validateAnnualPreplan(proposal, allowedIds, expectedYear, { initial = false, allowCalendarMetadata = true } = {}) {
  if (proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT || Number(proposal.school_year) !== Number(expectedYear)
    || !Array.isArray(proposal.proposed_experiences) || proposal.proposed_experiences.length < 1
    || proposal.proposed_experiences.length > 20 || (initial && proposal.proposed_experiences.length !== 12))
    fail("invalid", "El preplan debe tener propuestas válidas para este año escolar.");
  const allowed = new Set(allowedIds), seen = new Set();
  // Reloaded rows include server-derived calendar metadata. Accept only these
  // known transport fields and return editable fields only; callers recompute
  // dates/counts from the authorized calendar before persisting or confirming.
  const inputFields = allowCalendarMetadata ? [...rowFields, ...calendarFields] : rowFields;
  let previousPeriod = 1;
  const rows = proposal.proposed_experiences.map((item, index) => {
    const period = Number(String(item?.period ?? "").match(/^Bimestre ([1-4])$/)?.[1]);
    const ids = item?.primary_competency_ids;
    if (!item || Object.keys(item).some((field) => !inputFields.includes(field)) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.proposal_id ?? "") || seen.has(item.proposal_id) ||
      !["project", "unit"].includes(item.experience_type) || !text(item.title, 180) ||
      !period || period < previousPeriod || !Number.isInteger(item.month) || item.month < 3 || item.month > 12 ||
      ![2, 3].includes(item.duration_weeks) || !text(item.rationale, 700) || !text(item.purpose, 500) ||
      !Array.isArray(ids) || ids.length < 1 || ids.length > 5 || ids.some((id) => !allowed.has(id)) || new Set(ids).size !== ids.length)
      fail("invalid_row", `Revisa los datos de la propuesta ${index + 1}.`);
    seen.add(item.proposal_id); previousPeriod = period;
    return { proposal_id: item.proposal_id, experience_type: item.experience_type, title: item.title.trim(),
      period: item.period, month: item.month, duration_weeks: item.duration_weeks,
      rationale: item.rationale.trim(), purpose: item.purpose.trim(), primary_competency_ids: [...ids] };
  });
  const titles = rows.map((item) => item.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim());
  if (new Set(titles).size !== titles.length) fail("repeated_titles", "Hay títulos repetidos. Da a cada propuesta un nombre propio.");
  return { plan_format: ANNUAL_PREPLAN_FORMAT, title: "Mi año", school_year: String(expectedYear), proposed_experiences: rows };
}

export function validateGeneratedPreplan(output, allowedIds, year) {
  if (!Array.isArray(output?.proposals) || output.proposals.length !== 12 || Object.keys(output).some((key) => key !== "proposals"))
    fail("invalid_ai", "Ayni no pudo preparar las doce propuestas iniciales.");
  const proposal = { plan_format: ANNUAL_PREPLAN_FORMAT, school_year: String(year),
    proposed_experiences: output.proposals.map((row) => ({ ...row, proposal_id: randomUUID() })) };
  return validateAnnualPreplan(proposal, allowedIds, year, { initial: true, allowCalendarMetadata: false });
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
  createProvider = createAIProviderForPlan, loadSkill = loadAnnualPreplanSkill }) {
  if (!context.source_diagnostic_review_id || !context.source_priority_review_id)
    fail("diagnostic_required", "Confirma primero «Así está mi grupo» y «Prioridades del año».");
  const plan = resolvePlan({ workflow: "annual_plan", task: "generation" });
  const durations = suggestAnnualProjectDurations(context.calendar);
  const baseline = buildFlexibleAnnualSchedule(context.calendar, durations.map((duration_weeks) => ({ duration_weeks }))).projects;
  const suggested = baseline.map((slot) => ({ experience_type: "project", period: slot.period,
    month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks }));
  // These four suggestions sit near their school-calendar dates when the institution's calendar permits it.
  suggested[5].month = 7; // Fiestas Patrias: last teaching weeks before 28–29 July.
  suggested[11].month = 12; // Christmas and year-end reflection: December.
  suggested[11].duration_weeks = 2;
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
    confirmed_group: context.diagnostic_group,
    confirmed_priorities: context.confirmed_priorities ?? context.diagnostic_group?.competency_priorities ?? [],
    year_context: context.annual_planning_context ?? {},
    interests: context.context_v4?.common_interests?.map((item) => item.label) ?? [],
    known_environment: context.group_context, calendar: context.calendar, initial_slots: initialSlots,
    curriculum: { age: context.age, competency_cards: curriculum },
    didactic_knowledge: await focusedKnowledgeForDirectWorkflow({ workflow: "annual_plan", age: context.age,
      competencyIds: [...new Set((context.confirmed_priorities ?? []).flatMap((item) =>
        item.related_competency_ids ?? item.competency_ids ?? []))].filter((id) => curriculum.some((card) => card.id === id)),
      request: [context.group_context, context.annual_planning_context?.additional_notes].filter(Boolean).join(" "),
      castellanoL2Applicable: context.castellano_l2_applicable === true,
      religionApplicable: context.religion_applicable === true }),
    task: `Propón exactamente doce filas editables. Copia el bimestre, mes y duración de initial_slots para cada índice, en orden; código ya comprobó que caben en el calendario. Vincula pedagógicamente la fila 1 al Día del Niño Peruano, la 4 al Día de la Educación Inicial, la 6 a Fiestas Patrias y la 12 a Navidad/cierre de año. Sitúalas en el contexto de sus fechas previstas sin convertirlas en manualidades ni celebraciones vacías. Da a cada propuesta un título natural y concreto que ayude a imaginar qué harán los niños. Diferencia la mecánica de las doce propuestas: no repitas conversar, proponer, acordar y probar con otro tema. En especial, la fila 1 puede centrarse en elegir juegos y acordar cómo participar; la fila 4 debe centrarse en observar y transformar un espacio de juego, probando sus cambios en el lugar. Explica propósito y fundamento con frases cortas y verbos concretos. Distribuye competencias del CNEB según su pertinencia; procura al menos una oportunidad por competencia aplicable y dos cuando sea natural, sin forzar títulos. Usa solo los campos del esquema. No generes productos, criterios, evidencias ni actividades.`,
  };
  const provider = createProvider(plan, { timeoutMs: 180_000 });
  const response = await provider.generate(buildProviderRequest("annual_plan", bundle, plan, ANNUAL_PREPLAN_OUTPUT_SCHEMA, await loadSkill()));
  const alignedOutput = { ...response.output, proposals: response.output?.proposals?.map((row, index) =>
    ({ ...row, period: initialSlots[index]?.period, month: initialSlots[index]?.month,
      duration_weeks: initialSlots[index]?.duration_weeks })) };
  const proposal = validateGeneratedPreplan(alignedOutput, curriculum.map((card) => card.id), context.year);
  buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences);
  return { proposal, metadata: { provider: response.provider_metadata?.provider ?? plan.provider,
    model: response.provider_metadata?.model ?? plan.model, reasoning_effort: plan.reasoning_effort,
    routing_policy_version: plan.routing_policy_version, usage: response.provider_metadata?.usage ?? null,
    response_id: response.provider_metadata?.response_id ?? null, fallback_used: false },
    source: { diagnostic_review_id: context.source_diagnostic_review_id, priority_review_id: context.source_priority_review_id } };
}

export const annualMonthLabel = (month) => monthNames[month] ?? "";
