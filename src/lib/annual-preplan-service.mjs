import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadAnnualPreplanSkill } from "./annual-plan-skill.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { buildEditableAnnualSchedule, buildFlexibleAnnualSchedule, suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";

export const ANNUAL_PREPLAN_FORMAT = "annual_preplan_v1";
const monthNames = ["", "", "", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const rowFields = ["proposal_id", "experience_type", "title", "period", "month", "duration_weeks", "rationale", "purpose", "primary_competency_ids"];
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

export function validateAnnualPreplan(proposal, allowedIds, expectedYear, { initial = false } = {}) {
  if (proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT || Number(proposal.school_year) !== Number(expectedYear)
    || !Array.isArray(proposal.proposed_experiences) || proposal.proposed_experiences.length < 1
    || proposal.proposed_experiences.length > 20 || (initial && proposal.proposed_experiences.length !== 12))
    fail("invalid", "El preplan debe tener propuestas válidas para este año escolar.");
  const allowed = new Set(allowedIds), seen = new Set();
  let previousPeriod = 1;
  const rows = proposal.proposed_experiences.map((item, index) => {
    const period = Number(String(item?.period ?? "").match(/^Bimestre ([1-4])$/)?.[1]);
    const ids = item?.primary_competency_ids;
    if (!item || Object.keys(item).some((field) => !rowFields.includes(field)) ||
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
  return validateAnnualPreplan(proposal, allowedIds, year, { initial: true });
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
  const initialSlots = buildFlexibleAnnualSchedule(context.calendar, durations.map((duration_weeks) => ({ duration_weeks }))).projects
    .map((slot) => ({ index: slot.index, period: slot.period, month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks }));
  const bundle = { workflow: "annual_preplan", age: context.age,
    confirmed_group: context.diagnostic_group,
    confirmed_priorities: context.confirmed_priorities ?? context.diagnostic_group?.competency_priorities ?? [],
    year_context: context.annual_planning_context ?? {},
    interests: context.context_v4?.common_interests?.map((item) => item.label) ?? [],
    known_environment: context.group_context, calendar: context.calendar, initial_slots: initialSlots,
    curriculum: { age: context.age, competency_cards: curriculum },
    task: `Propón exactamente doce filas editables. Copia el bimestre, mes y duración de initial_slots para cada índice, en orden; código ya comprobó que caben en el calendario. Cuatro vinculadas pedagógicamente a Día del Niño Peruano, Día de la Educación Inicial, Fiestas Patrias y cierre de año. Distribuye competencias del CNEB según su pertinencia; procura al menos una oportunidad por competencia aplicable y dos cuando sea natural, sin forzar títulos. Usa solo los campos del esquema. No generes productos, criterios, evidencias ni actividades.`,
  };
  const provider = createProvider(plan, { timeoutMs: 180_000 });
  const response = await provider.generate(buildProviderRequest("annual_plan", bundle, plan, ANNUAL_PREPLAN_OUTPUT_SCHEMA, await loadSkill()));
  const proposal = validateGeneratedPreplan(response.output, curriculum.map((card) => card.id), context.year);
  buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences);
  return { proposal, metadata: { model: plan.model, usage: response.provider_metadata?.usage ?? null,
    response_id: response.provider_metadata?.response_id ?? null },
    source: { diagnostic_review_id: context.source_diagnostic_review_id, priority_review_id: context.source_priority_review_id } };
}

export const annualMonthLabel = (month) => monthNames[month] ?? "";
