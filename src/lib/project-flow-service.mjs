import { randomUUID } from "node:crypto";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadLearningExperienceSkill } from "./learning-experience-skill.mjs";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";

const string = { type: "string", minLength: 1 };
const strings = { type: "array", items: string };
const object = (properties) => ({ type: "object", additionalProperties: false,
  required: Object.keys(properties), properties });
const schema = (id, properties) => ({ id, ...object(properties) });

export const PROJECT_PREVIEW_SCHEMA = schema("project-preview-v1", {
  context_summary: string, context_points: strings, additional_context_example: string,
  purpose_options: { type: "array", minItems: 2, maxItems: 3, items: string },
});
const criterionSchema = object({ competency_id: string, criterion: string, expected_evidence: strings });
const journeySchema = object({ title: string, description: string });
export const PROJECT_DEPENDENTS_SCHEMA = schema("project-dependents-v1", {
  guiding_questions: { type: "array", minItems: 2, maxItems: 8, items: string },
  journey: { type: "array", minItems: 2, maxItems: 7, items: journeySchema },
  general_criteria: { type: "array", minItems: 1, maxItems: 6, items: criterionSchema },
});
const activitySchema = object({ date: string, title: string, purpose: string,
  competency_ids: { type: "array", minItems: 1, maxItems: 2, items: string },
  criterion_competency_id: string, pedagogical_intention: string, criterion_text: string,
  expected_evidence: string, acceptable_evidence_variations: strings, observation_focus: strings,
  materials: strings, mediation_notes: string, continuity_from_previous: string,
  continuity_to_next: string, flexibility_notes: string,
  role_in_project: string, expected_progression: string,
  estimated_minutes: { type: "integer" } });
export const PROJECT_MASTER_SCHEMA = schema("project-master-v1", {
  foundation: string, closing_description: string, closing_rationale: string, resources: strings,
  activities: { type: "array", minItems: 1, maxItems: 15, items: activitySchema },
});
export const PROJECT_FORMAL_SCHEMA = schema("project-formal-v1", {
  situation: string, foundation: string, methodology: string, assessment_followup: string,
  family_collaboration: string, diversity_support: string, closing: string,
});
export const EMERGENT_PROPOSAL_SCHEMA = schema("emergent-annual-proposal-v1", {
  title: string, rationale: string, purpose: string,
  primary_competency_ids: { type: "array", minItems: 1, maxItems: 5, items: string },
});

export class ProjectFlowError extends Error {
  constructor(reason, message) { super(message); this.name = "ProjectFlowError"; this.reason = reason; }
}
const fail = (reason, message) => { throw new ProjectFlowError(reason, message); };
const hasText = (value, max = 1200) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

export function instructionalDates(calendar, startsOn, endsOn) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn ?? "") || startsOn > endsOn)
    fail("invalid_dates", "Revisa las fechas de esta propuesta.");
  const dates = [];
  for (let day = new Date(`${startsOn}T00:00:00Z`); day <= new Date(`${endsOn}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    if (!(calendar?.blocks ?? []).some((block) => block.type === "instructional" && block.start_date <= iso && iso <= block.end_date)) continue;
    if ([...(calendar?.blocks ?? []).filter((block) => block.type !== "instructional"), ...(calendar?.exceptions ?? [])]
      .some((entry) => entry.is_instructional !== true && (entry.start_date ?? entry.exception_date) <= iso && iso <= (entry.end_date ?? entry.exception_date))) continue;
    dates.push(iso);
  }
  if (!dates.length) fail("no_instructional_dates", "Esta propuesta no tiene días lectivos disponibles.");
  return dates;
}

export function validateProjectDecisions(input, allowedIds) {
  const selected = input?.competency_ids;
  if (!hasText(input?.context_summary, 2500) || !hasText(input?.purpose, 700) ||
      !Array.isArray(selected) || !selected.length || selected.length > 6 ||
      selected.some((id) => !allowedIds.includes(id)) || new Set(selected).size !== selected.length)
    fail("invalid_decisions", "Revisa el contexto, propósito y competencias del proyecto.");
  return { context_summary: input.context_summary.trim(), purpose: input.purpose.trim(),
    competency_ids: [...selected], additional_context: String(input.additional_context ?? "").trim().slice(0, 1000) };
}

export function validateProjectDependents(output, competencyIds) {
  if (!Array.isArray(output?.guiding_questions) || output.guiding_questions.length < 2 || output.guiding_questions.length > 8 ||
      output.guiding_questions.some((value) => !hasText(value, 250)) ||
      !Array.isArray(output.journey) || output.journey.length < 2 || output.journey.length > 7 ||
      output.journey.some((row) => !hasText(row.title, 140) || !hasText(row.description, 500)) ||
      !Array.isArray(output.general_criteria) || output.general_criteria.length !== competencyIds.length ||
      output.general_criteria.some((row) => !competencyIds.includes(row.competency_id) || !hasText(row.criterion, 400) ||
        !Array.isArray(row.expected_evidence) || !row.expected_evidence.length || row.expected_evidence.some((value) => !hasText(value, 200))) ||
      new Set(output.general_criteria.map((row) => row.competency_id)).size !== competencyIds.length)
    fail("invalid_dependents", "No pudimos preparar preguntas y evaluación coherentes. Inténtalo nuevamente.");
  return output;
}

export function validateProjectMaster(output, decisions, dependents, availableDates) {
  if (!hasText(output?.foundation, 1500) || !hasText(output.closing_description, 700) ||
      !hasText(output.closing_rationale, 700) || !Array.isArray(output.resources) ||
      output.resources.some((value) => !hasText(value, 160)) || !Array.isArray(output.activities) ||
      output.activities.length !== availableDates.length)
    fail("invalid_master", "El proyecto generado necesita revisión. Inténtalo nuevamente.");
  const dates = new Set(availableDates), seenDates = new Set(), selected = new Set(decisions.competency_ids);
  const titles = new Set();
  for (const row of output.activities) {
    const normalized = String(row.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!dates.has(row.date) || seenDates.has(row.date) || !hasText(row.title, 180) || titles.has(normalized) ||
        !hasText(row.purpose, 500) || !Array.isArray(row.competency_ids) || !row.competency_ids.length ||
        row.competency_ids.length > 2 || row.competency_ids.some((id) => !selected.has(id)) ||
        !row.competency_ids.includes(row.criterion_competency_id) || !hasText(row.pedagogical_intention, 500) ||
        !hasText(row.criterion_text, 500) || !hasText(row.expected_evidence, 500) ||
        !Array.isArray(row.acceptable_evidence_variations) || row.acceptable_evidence_variations.some((value) => !hasText(value, 240)) ||
        !Array.isArray(row.observation_focus) || !row.observation_focus.length || row.observation_focus.some((value) => !hasText(value, 240)) ||
        !Array.isArray(row.materials) || row.materials.some((value) => !hasText(value, 160)) ||
        !hasText(row.mediation_notes, 500) || !hasText(row.continuity_from_previous, 400) ||
        !hasText(row.continuity_to_next, 400) || !hasText(row.flexibility_notes, 500) ||
        !hasText(row.role_in_project, 400) ||
        !hasText(row.expected_progression, 400) || !Number.isInteger(row.estimated_minutes) ||
        row.estimated_minutes < 10 || row.estimated_minutes > 180)
      fail("invalid_activity_map", "Una actividad propuesta no coincide con el calendario o las competencias.");
    seenDates.add(row.date); titles.add(normalized);
  }
  const ordered = [...output.activities].sort((a, b) => a.date.localeCompare(b.date));
  return { ...output, activity_route: ordered.map((item, index) => ({
    id: randomUUID(), number: index + 1, position: index + 1, date: item.date, planned_date: item.date, title: item.title,
    specific_purpose: item.purpose, competency_id: item.criterion_competency_id,
    competency_ids: item.competency_ids, criterion_competency_id: item.criterion_competency_id,
    primary_competency_id: item.criterion_competency_id,
    possible_secondary_competency_ids: item.competency_ids.filter((id) => id !== item.criterion_competency_id),
    pedagogical_intention: item.pedagogical_intention,
    evaluation_criterion: item.criterion_text, criterion_text: item.criterion_text,
    expected_evidence: item.expected_evidence,
    acceptable_evidence_variations: item.acceptable_evidence_variations,
    observation_focus: item.observation_focus, materials: item.materials,
    mediation_notes: item.mediation_notes, continuity_from_previous: item.continuity_from_previous,
    continuity_to_next: item.continuity_to_next, flexibility_notes: item.flexibility_notes,
    role_in_project: item.role_in_project, expected_progression: item.expected_progression,
    estimated_minutes: item.estimated_minutes,
  })) };
}

/** Keep the confirmed pedagogical decisions and the editable activity map in one canonical snapshot. */
export function projectDetails({ source, preview, decisions, dependents, master, previous = null }) {
  const primary = decisions.competency_ids.filter((id) => source.primary_competency_ids?.includes(id));
  const secondary = decisions.competency_ids.filter((id) => !primary.includes(id));
  const route = master.activity_route.map((item, index) => ({ ...item, competency_id: item.criterion_competency_id ?? item.competency_id, id: item.id || randomUUID(), number: index + 1,
    position: index + 1, primary_competency_id: item.primary_competency_id ?? item.criterion_competency_id,
    possible_secondary_competency_ids: item.possible_secondary_competency_ids ??
      item.competency_ids.filter((id) => id !== item.criterion_competency_id) }));
  return {
    flow_version: "project-master-v2", blueprint_version: "activity-blueprint-v1", document_template_version: "experience-unified-v2",
    title: source.title, purpose: decisions.purpose, starting_point: decisions.context_summary,
    ...(source.experience_type === "unit" ? { learning_need_or_context: decisions.context_summary,
      proposed_situations: dependents.journey.map((item) => ({ title: item.title, pedagogical_intention: item.description, possible_child_actions: item.description })) }
      : { trigger_or_interest: decisions.context_summary,
        possible_pathways: dependents.journey.map((item) => ({ title: item.title, pedagogical_intention: item.description, possible_child_actions: item.description })) }),
    primary_competency_ids: primary.length ? primary : [decisions.competency_ids[0]],
    possible_secondary_competency_ids: primary.length ? secondary : decisions.competency_ids.slice(1),
    spaces_and_materials: master.resources,
    evidence_opportunities: dependents.general_criteria.flatMap((item) => item.expected_evidence),
    family_or_community_links: [], adjustment_points: [],
    flexibility_notes: "El recorrido puede ajustarse según lo observado durante el proyecto.",
    preview, decisions, dependents, planning_feedback: previous?.planning_feedback ?? null,
    project_master: { foundation: master.foundation, closing_description: master.closing_description,
      closing_rationale: master.closing_rationale, resources: master.resources, activity_blueprints: route },
    activity_route: route, teacher_overrides: previous?.teacher_overrides ?? [],
  };
}

export function validateEditedActivityMap(route, decisions, dependents, dates) {
  if (!Array.isArray(route) || route.length !== dates.length)
    fail("invalid_activity_map", "Debe existir una actividad por cada día confirmado.");
  const allowedDates = new Set(dates), usedDates = new Set(), usedIds = new Set(), usedTitles = new Set();
  const allowedCompetencies = new Set(decisions.competency_ids);
  return route.map((row, index) => {
    const normalizedTitle = String(row.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id ?? "") ||
        usedIds.has(row.id) || !allowedDates.has(row.date) || usedDates.has(row.date) || usedTitles.has(normalizedTitle) ||
        !hasText(row.title, 180) || !hasText(row.specific_purpose, 500) ||
        !Array.isArray(row.competency_ids) || !row.competency_ids.length || row.competency_ids.length > 2 ||
        row.competency_ids.some((id) => !allowedCompetencies.has(id)) ||
        !row.competency_ids.includes(row.criterion_competency_id) || !hasText(row.evaluation_criterion, 500) ||
        !hasText(row.expected_evidence, 500) || !Array.isArray(row.observation_focus) || !row.observation_focus.length ||
        !hasText(row.pedagogical_intention, 500) || !hasText(row.mediation_notes, 500) ||
        !hasText(row.continuity_from_previous, 400) || !hasText(row.continuity_to_next, 400) ||
        !hasText(row.flexibility_notes, 500) || !hasText(row.role_in_project, 400) || !hasText(row.expected_progression, 400))
      fail("invalid_activity_map", `Revisa la actividad ${index + 1} del mapa.`);
    usedIds.add(row.id); usedDates.add(row.date); usedTitles.add(normalizedTitle);
    return { ...row, date: row.date, planned_date: row.date, number: index + 1, position: index + 1, competency_id: row.criterion_competency_id,
      primary_competency_id: row.criterion_competency_id,
      possible_secondary_competency_ids: row.competency_ids.filter((id) => id !== row.criterion_competency_id),
      criterion_text: row.evaluation_criterion };
  });
}

/** Reapply explicit teacher edits only when the regenerated row still fits its date and competency. */
export function preserveTeacherMapEdits(generatedRoute, previousMap, overrides, decisions) {
  if (!Array.isArray(previousMap) || !Array.isArray(overrides)) return generatedRoute;
  const priorByDate = new Map(previousMap.map((item) => [item.date, item]));
  const selected = new Set(decisions.competency_ids);
  const removedDates = new Set(overrides.filter((entry) => entry.field === "removed").map((entry) => entry.date));
  const retained = generatedRoute.filter((fresh) => !removedDates.has(fresh.date)).map((fresh) => {
    const old = priorByDate.get(fresh.date);
    if (!old) return fresh;
    const edited = new Set(overrides.filter((entry) => entry.route_item_id === old.id).map((entry) => entry.field));
    const merged = { ...fresh };
    for (const field of ["title", "specific_purpose", "role_in_project", "expected_progression"])
      if ((edited.has(field) || edited.has("date")) && hasText(old[field], 500)) merged[field] = old[field];
    if (edited.has("competency_ids") && old.competency_ids?.every((id) => selected.has(id)) &&
        old.competency_ids.includes(old.criterion_competency_id)) {
      merged.competency_ids = old.competency_ids; merged.competency_id = old.criterion_competency_id;
      merged.criterion_competency_id = old.criterion_competency_id;
    }
    return { ...merged, id: old.id };
  });
  for (const old of previousMap) {
    if (!overrides.some((entry) => entry.field === "added" && entry.route_item_id === old.id) ||
        retained.some((item) => item.date === old.date) || retained.length >= 15 ||
        !old.competency_ids?.every((id) => selected.has(id))) continue;
    retained.push(old);
  }
  return retained.sort((a, b) => a.date.localeCompare(b.date)).map((item, index) => ({ ...item, number: index + 1 }));
}

async function call({ workflow, task, context, outputSchema, resolvePlan, createProvider, loadSkill }) {
  const plan = resolvePlan({ workflow, task });
  const selectedIds = context.confirmed_decisions?.competency_ids
    ?? context.confirmed_project_master?.decisions?.competency_ids
    ?? context.annual_proposal?.primary_competency_ids ?? [];
  const didacticKnowledge = await focusedKnowledgeForDirectWorkflow({ workflow, age: context.age,
    competencyIds: selectedIds, request: context.confirmed_decisions?.purpose ?? context.annual_proposal?.purpose
      ?? context.teacher_request ?? context.group_context ?? "",
    castellanoL2Applicable: context.castellano_l2_applicable === true,
    religionApplicable: context.religion_applicable === true });
  const feedbackInstruction = context.planning_feedback
    ? " Usa las valoraciones docentes confirmadas de planning_feedback para actualizar las oportunidades, mediación y progresión pertinentes a esta propuesta. Distingue esos resultados del diagnóstico inicial: no repitas automáticamente necesidades antiguas como si fueran actuales. Un nivel B o C no significa que todos necesiten el mismo apoyo; sin registro o sin valoración no es nivel C. Conserva fortalezas y no inventes hechos, niveles ni necesidades individuales."
    : "";
  const response = await createProvider(plan, { timeoutMs: 180_000 })
    .generate(buildProviderRequest(workflow, { ...context, task: `${context.task}${feedbackInstruction}`,
      didactic_knowledge: didacticKnowledge },
      plan, outputSchema, await loadSkill()));
  return { output: response.output, metadata: { provider: response.provider_metadata?.provider ?? plan.provider,
    model: response.provider_metadata?.model ?? plan.model, reasoning_effort: plan.reasoning_effort,
    routing_policy_version: plan.routing_policy_version, usage: response.provider_metadata?.usage ?? null,
    response_id: response.provider_metadata?.response_id ?? null, fallback_used: false } };
}

export async function generateProjectPreview({ context, workflow = "project", resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill = loadLearningExperienceSkill }) {
  const result = await call({ workflow, task: "preview", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_PREVIEW_SCHEMA, context: { ...context,
      task: "Resume solo hechos confirmados pertinentes a esta propuesta. Ofrece 2 o 3 propósitos distintos y viables. El ejemplo de contexto adicional debe ser específico del tema, sin afirmar que haya ocurrido. No diseñes todavía preguntas, recorrido ni evaluación." } });
  if (!hasText(result.output?.context_summary, 2500) || !Array.isArray(result.output.context_points) ||
      !hasText(result.output.additional_context_example, 500) || !Array.isArray(result.output.purpose_options) ||
      result.output.purpose_options.length < 2 || result.output.purpose_options.length > 3 ||
      result.output.purpose_options.some((value) => !hasText(value, 500)))
    fail("invalid_preview", "No pudimos preparar las opciones del proyecto.");
  return result;
}

export async function generateProjectDependents({ context, decisions, workflow = "project",
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadLearningExperienceSkill }) {
  const result = await call({ workflow, task: "dependents", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_DEPENDENTS_SCHEMA, context: { ...context, confirmed_decisions: decisions,
      task: "Propón preguntas guía, recorrido flexible y un criterio general con evidencias esperadas para CADA competencia elegida. Derívalos del propósito y contexto que la docente acaba de elegir. No cambies las competencias ni inventes observaciones. No son todavía actividades diarias." } });
  validateProjectDependents(result.output, decisions.competency_ids);
  return result;
}

export async function generateProjectMaster({ context, decisions, dependents, availableDates,
  workflow = "project", resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadLearningExperienceSkill }) {
  validateProjectDependents(dependents, decisions.competency_ids);
  const result = await call({ workflow, task: "generation", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_MASTER_SCHEMA, context: { ...context, confirmed_decisions: decisions,
      confirmed_questions: dependents.guiding_questions, confirmed_journey: dependents.journey,
      confirmed_general_criteria: dependents.general_criteria, available_instructional_dates: availableDates,
      project_start_date: availableDates[0], project_end_date: availableDates.at(-1),
      instructional_dates: availableDates, total_activities: availableDates.length,
      task: `Diseña exactamente ${availableDates.length} actividades: una por cada fecha confirmada en instructional_dates, sin agregar, omitir ni cambiar fechas. El campo date de cada fila es su planned_date confirmado. Cada actividad debe ser un blueprint reutilizable con propósito, competencia principal, posibles competencias secundarias, intención pedagógica, criterio observable, evidencia esperada y variaciones aceptables, foco de observación, materiales, mediación, continuidad y flexibilidad. Usa solo las competencias confirmadas. No inventes observaciones ni niveles. La última actividad conduce al cierre. Mantén las decisiones docentes intactas y devuelve solo los campos del esquema.` } });
  return { ...result, output: validateProjectMaster(result.output, decisions, dependents, availableDates) };
}

export async function generateProjectFormal({ context, workflow = "project", resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill = loadLearningExperienceSkill }) {
  const result = await call({ workflow, task: "document_development", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_FORMAL_SCHEMA, context: { ...context,
      task: "Redacta las secciones formales según el Plan Maestro CONFIRMADO. No agregues actividades, competencias, hechos realizados ni decisiones nuevas. El Word lo llenará código desde estos textos y la ruta confirmada." } });
  if (Object.values(result.output ?? {}).some((value) => !hasText(value, 2500)) ||
      Object.keys(result.output ?? {}).length !== Object.keys(PROJECT_FORMAL_SCHEMA.properties).length)
    fail("invalid_formal", "No pudimos preparar el documento formal del proyecto.");
  return result;
}

export async function suggestEmergentProposal({ context, allowedIds, resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill = loadLearningExperienceSkill }) {
  const result = await call({ workflow: "project", task: "preview", resolvePlan, createProvider, loadSkill,
    outputSchema: EMERGENT_PROPOSAL_SCHEMA, context: { ...context,
      task: "Una docente describió un interés o problema nuevo del grupo. Propón SOLO una fila breve para revisar en Mi año: título, razón anclada en el hecho descrito, propósito y 1 a 3 competencias pertinentes de los IDs curriculares permitidos. No inventes observaciones, no cambies el plan anual y no desarrolles aún actividades." } });
  const row = result.output;
  if (!hasText(row?.title, 180) || !hasText(row?.rationale, 700) || !hasText(row?.purpose, 500) ||
      !Array.isArray(row?.primary_competency_ids) || !row.primary_competency_ids.length ||
      row.primary_competency_ids.length > 5 || row.primary_competency_ids.some((id) => !allowedIds.includes(id)))
    fail("invalid_emergent_proposal", "No pudimos proponer un proyecto a partir de esa situación.");
  return result;
}
