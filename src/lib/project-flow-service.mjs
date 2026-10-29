import {DOCUMENT_GENERATOR_PROJECT_RULES} from './document-generator-prompts.mjs';
import { randomUUID, createHash } from "node:crypto";
import {AYNI_TRANSVERSAL_APPROACHES,adultCenteredSituation} from './ayni-planning-policy.mjs';
import { VersionConflictError } from "./version-integrity.mjs";
import { recordAIQAResult } from "./ai-qa-trace.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadLearningExperienceSkill } from "./learning-experience-skill.mjs";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";
import {isMaterialPlaceholder} from './annual-proposal-intent.mjs';
import {projectFlexibilityGuidance} from './activity-teacher-reading.mjs';

import { routeObservationCriteria, validCriterionMoments } from "./activity-observation-plan.mjs";
import { validateOfficialPerformanceRefs, OFFICIAL_PERFORMANCE_VERSION } from "./official-performance-references.mjs";

const string = { type: "string", minLength: 1 };
const strings = { type: "array", items: string };
const text = maxLength => ({ ...string, maxLength });
const texts = maxLength => ({ type: "array", items: text(maxLength) });
const object = (properties) => ({ type: "object", additionalProperties: false,
  required: Object.keys(properties), properties });
const schema = (id, properties) => ({ id, ...object(properties) });

export const PROJECT_PREVIEW_SCHEMA = schema("project-preview-v1", {
  context_summary: string, context_points: strings, additional_context_example: string,
  purpose_options: { type: "array", minItems: 2, maxItems: 3, items: string },
});
const performanceRefsSchema = { type: "array", maxItems: 3, items: string };
const criterionSchema = object({ competency_id: string, criterion: text(400), expected_evidence: { ...texts(200), minItems: 1 }, official_performance_refs: performanceRefsSchema });
const journeySchema = object({ title: text(140), description: text(500) });
export const PROJECT_DEPENDENTS_SCHEMA = schema("project-dependents-v1", {
  guiding_questions: { type: "array", minItems: 2, maxItems: 8, items: text(250) },
  journey: { type: "array", minItems: 2, maxItems: 7, items: journeySchema },
  general_criteria: { type: "array", minItems: 1, maxItems: 6, items: criterionSchema },
});
const momentSchema = { type: "array", minItems: 1, maxItems: 3, items: { type: "string", enum: ["opening", "development", "closure"] } };
const dailyCriterionSchema = object({ competency_id: string, criterion_text: text(500), expected_evidence: text(500), observation_focus: { ...texts(240), minItems: 1 }, observation_moments: momentSchema, official_performance_refs: performanceRefsSchema });
const activitySchema = object({ date: string, title: text(180), purpose: text(500),
  competency_ids: { type: "array", minItems: 1, maxItems: 6, items: string },
  official_performance_refs: performanceRefsSchema,
  observation_moments: momentSchema, additional_criteria: { type: "array", maxItems: 5, items: dailyCriterionSchema },
  criterion_competency_id: string, pedagogical_intention: text(500), criterion_text: text(500),
  expected_evidence: text(500), acceptable_evidence_variations: texts(240), observation_focus: { ...texts(240), minItems: 1 },
  materials: texts(160), mediation_notes: text(800), continuity_from_previous: text(400),
  continuity_to_next: text(400), flexibility_notes: text(500),
  role_in_project: text(400), expected_progression: text(400),
  child_decisions: text(350), estimated_minutes: { type: "integer", minimum: 10, maximum: 180 } });
export const PROJECT_MASTER_SCHEMA = schema("project-master-v1", {
  meaningful_situation: text(1200), foundation: text(1500), closing_description: text(700), closing_rationale: text(700), resources: texts(160),
  document_planning: object({shared_challenge:text(350),planning_with_children:text(650),child_decisions:text(350),organization:text(550),mediation:text(450),age_support:text(450),closing_review:text(650),transversal_approaches:{type:'array',minItems:1,maxItems:2,items:object({name:{type:'string',enum:AYNI_TRANSVERSAL_APPROACHES},attitude:text(300),teacherAction:text(350)})}}),
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

export function validateProjectDependents(output, competencyIds, referenceOptions = {}) {
  if (!Array.isArray(output?.guiding_questions) || output.guiding_questions.length < 1 || output.guiding_questions.length > 8 ||
      output.guiding_questions.some((value) => !hasText(value, 250)) ||
      !Array.isArray(output.journey) || output.journey.length < 2 || output.journey.length > 7 ||
      output.journey.some((row) => !hasText(row.title, 140) || !hasText(row.description, 500)) ||
      !Array.isArray(output.general_criteria) || output.general_criteria.length !== competencyIds.length ||
      output.general_criteria.some((row) => !competencyIds.includes(row.competency_id) || !hasText(row.criterion, 400) ||
        !Array.isArray(row.expected_evidence) || !row.expected_evidence.length || row.expected_evidence.some((value) => !hasText(value, 200))) ||
      new Set(output.general_criteria.map((row) => row.competency_id)).size !== competencyIds.length)
    fail("invalid_dependents", "No pudimos preparar preguntas y evaluación coherentes. Inténtalo nuevamente.");
  for (const row of output.general_criteria) validateOfficialPerformanceRefs(row.official_performance_refs, row.competency_id, referenceOptions.age, referenceOptions);
  return output;
}

export function validateProjectMaster(output, decisions, dependents, availableDates, referenceOptions = {}) {
  if(output?.document_planning){
    if(adultCenteredSituation(output.meaningful_situation))fail('adult_centered_meaningful_situation','Comienza la situación significativa con los niños, su aula y lo que hicieron o preguntaron; conserva la fuente docente sin usarla como narradora inicial.');
    const planning=output.document_planning;
    if(['shared_challenge','planning_with_children','child_decisions','organization','mediation','age_support','closing_review'].some(key=>!hasText(planning[key],700))
      ||!Array.isArray(planning.transversal_approaches)||!planning.transversal_approaches.length||planning.transversal_approaches.length>2||new Set(planning.transversal_approaches.map(row=>row.name)).size!==planning.transversal_approaches.length||planning.transversal_approaches.some(row=>!AYNI_TRANSVERSAL_APPROACHES.includes(row.name)||['name','attitude','teacherAction'].some(key=>!hasText(row[key],350))))
      fail('incomplete_document_planning','Completa la planificación con los niños, los apoyos, los enfoques y la revisión del proyecto.');
    if(referenceOptions.strictInstructions){
      const paragraphs=[...['shared_challenge','planning_with_children','child_decisions','organization','mediation','age_support','closing_review'].map(key=>[key,planning[key]]),
        ...planning.transversal_approaches.flatMap((row,index)=>['attitude','teacherAction'].map(key=>[`transversal_approaches[${index}].${key}`,row[key]]))];
      const unfinished=paragraphs.find(([,value])=>!/[.!?…][»”"')]*$/u.test(value.trim()));
      if(unfinished)fail('incomplete_document_planning_text',`El apartado ${unfinished[0]} debe terminar en una frase completa. Reescribe con menos palabras antes de llegar al límite; no cortes la frase.`);
    }
    if(!/planific.*(?:niñ|nin)/iu.test(output.activities?.[0]?.title??''))fail('missing_child_planning','La primera actividad debe planificar el proyecto con los niños.');
    if(output.activities?.some(row=>!hasText(row.child_decisions,350)))fail('missing_child_decisions','Indica qué podrán decidir los niños en cada actividad.');
  }
  if (!hasText(output?.meaningful_situation, 1200))
    fail("missing_meaningful_situation", "Explica de dónde surge este proyecto, por qué tiene sentido para el aula y qué pregunta o reto podrán explorar los niños, usando solo el contexto confirmado.");
  if(Array.isArray(output?.resources)&&output.resources.some(isMaterialPlaceholder))
    fail('incomplete_materials','Define materiales concretos en español; no dejes recursos «por definir» o «por seleccionar». Conserva las decisiones docentes y no inventes disponibilidad.');
  if (!hasText(output?.foundation, 1500) || !hasText(output.closing_description, 700) ||
      !hasText(output.closing_rationale, 700) || !Array.isArray(output.resources) ||
      output.resources.some((value) => !hasText(value, 160)||isMaterialPlaceholder(value)) || !Array.isArray(output.activities) ||
      output.activities.length !== availableDates.length)
    fail("invalid_master", "El proyecto generado necesita revisión. Inténtalo nuevamente.");
  const dates = new Set(availableDates), seenDates = new Set(), selected = new Set(decisions.competency_ids);
  const titles = new Set();
  for (const row of output.activities) {
    const normalized = String(row.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!dates.has(row.date) || seenDates.has(row.date) || !hasText(row.title, 180) || titles.has(normalized) ||
        !hasText(row.purpose, 500) || !Array.isArray(row.competency_ids) || !row.competency_ids.length ||
        row.competency_ids.length > 6 || new Set(row.competency_ids).size !== row.competency_ids.length || row.competency_ids.some((id) => !selected.has(id)) ||
        !row.competency_ids.includes(row.criterion_competency_id) || !hasText(row.pedagogical_intention, 500) ||
        !hasText(row.criterion_text, 500) || !hasText(row.expected_evidence, 500) ||
        !Array.isArray(row.acceptable_evidence_variations) || row.acceptable_evidence_variations.some((value) => !hasText(value, 240)) ||
        !Array.isArray(row.observation_focus) || !row.observation_focus.length || row.observation_focus.some((value) => !hasText(value, 240)) ||
        !Array.isArray(row.materials) || row.materials.some((value) => !hasText(value, 160)||isMaterialPlaceholder(value)) ||
        !hasText(row.mediation_notes, 800) || !hasText(row.continuity_from_previous, 400) ||
        !hasText(row.continuity_to_next, 400) || !hasText(row.flexibility_notes, 500) ||
        !hasText(row.role_in_project, 400) ||
        !hasText(row.expected_progression, 400) || !Number.isInteger(row.estimated_minutes) ||
        row.estimated_minutes < 10 || row.estimated_minutes > 180)
      fail("invalid_activity_map", "Una actividad necesita revisar su calendario, competencias o materiales. Los materiales deben ser concretos, sin «por definir».");
    if (referenceOptions.strictInstructions && !/[.!?…][»”"')]*$/u.test(row.mediation_notes.trim()))
      fail("incomplete_teacher_instruction", "La mediación docente debe terminar en una frase completa. Sintetiza la indicación sin cortarla al alcanzar el límite.");
    const criteria = routeObservationCriteria(row);
    for (const criterion of criteria) {
      try { validateOfficialPerformanceRefs(criterion.official_performance_refs, criterion.competency_id, referenceOptions.age, referenceOptions); }
      catch (error) { fail("invalid_official_reference", error.message); }
    }
    if (!validCriterionMoments(row.observation_moments) ||
        (row.additional_criteria !== undefined && (!Array.isArray(row.additional_criteria) || row.additional_criteria.length > 5)) ||
        criteria.some(item => !row.competency_ids.includes(item.competency_id) || !hasText(item.criterion_text, 500) ||
          !hasText(item.expected_evidence, 500) || !validCriterionMoments(item.observation_moments) ||
          (item.observation_focus !== undefined && (!Array.isArray(item.observation_focus) || !item.observation_focus.length || item.observation_focus.some(text => !hasText(text, 240))))) ||
        new Set(criteria.map(item => item.competency_id)).size !== criteria.length ||
        (row.additional_criteria !== undefined && row.competency_ids.some(id => !criteria.some(item => item.competency_id === id))))
      fail("invalid_activity_criteria", "Cada competencia de la actividad necesita su propio criterio, evidencia y momento de observación.");
    seenDates.add(row.date); titles.add(normalized);
  }
  const covered = new Set(output.activities.flatMap(row => routeObservationCriteria(row).map(item => item.competency_id)));
  if (decisions.competency_ids.some(id => !covered.has(id)))
    fail("missing_competency_opportunity", "El recorrido debe incluir oportunidades de actividad para cada competencia elegida. Conserva el propósito y prepara la secuencia completa, sin añadir etiquetas nominales.");
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
    ...(item.official_performance_refs ? { official_performance_refs: item.official_performance_refs } : {}),
    acceptable_evidence_variations: item.acceptable_evidence_variations,
    ...(item.observation_moments ? { observation_moments: item.observation_moments } : {}),
    ...(item.additional_criteria ? { additional_criteria: item.additional_criteria } : {}),
    observation_focus: item.observation_focus, materials: item.materials,
    mediation_notes: item.mediation_notes, continuity_from_previous: item.continuity_from_previous,
    continuity_to_next: item.continuity_to_next, flexibility_notes: item.flexibility_notes,
    role_in_project: item.role_in_project, expected_progression: item.expected_progression,
    estimated_minutes: item.estimated_minutes,
    ...(item.child_decisions?{child_decisions:item.child_decisions}:{}),
    ...(output.document_planning?.age_support?{age_support:output.document_planning.age_support}:{}),
    ...(output.document_planning?.mediation?{age_mediation:output.document_planning.mediation}:{}),
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
    flow_version: "project-master-v2",
    ...(master.activity_route.some(row => row.official_performance_refs !== undefined) ? { official_performance_version: OFFICIAL_PERFORMANCE_VERSION } : {}),
    blueprint_version: "activity-blueprint-v1", document_template_version: "experience-unified-v2",
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
    flexibility_notes: projectFlexibilityGuidance,
    ...(previous?.resource_readiness ? {resource_readiness:previous.resource_readiness} : {}),
    preview, decisions, dependents, planning_feedback: previous?.planning_feedback ?? null,
    ...(previous?.rebased_from?{rebased_from:previous.rebased_from}:{}),
    project_master: { meaningful_situation: master.meaningful_situation, foundation: master.foundation, closing_description: master.closing_description,
      closing_rationale: master.closing_rationale, resources: master.resources,...(master.document_planning?{document_planning:master.document_planning}:{}) },
    activity_route: route, teacher_overrides: previous?.teacher_overrides ?? [],
  };
}

export function validateEditedActivityMap(route, decisions, dependents, dates, age = null) {
  if (!Array.isArray(route) || route.length !== dates.length)
    fail("invalid_activity_map", "Debe existir una actividad por cada día confirmado.");
  const allowedDates = new Set(dates), usedDates = new Set(), usedIds = new Set(), usedTitles = new Set();
  const allowedCompetencies = new Set(decisions.competency_ids);
  return route.map((row, index) => {
    const normalizedTitle = String(row.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id ?? "") ||
        usedIds.has(row.id) || !allowedDates.has(row.date) || usedDates.has(row.date) || usedTitles.has(normalizedTitle) ||
        !hasText(row.title, 180) || !hasText(row.specific_purpose, 500) ||
        !Array.isArray(row.competency_ids) || !row.competency_ids.length || row.competency_ids.length > 6 ||
        new Set(row.competency_ids).size !== row.competency_ids.length || row.competency_ids.some((id) => !allowedCompetencies.has(id)) ||
        !row.competency_ids.includes(row.criterion_competency_id) || !hasText(row.evaluation_criterion, 500) ||
        !hasText(row.expected_evidence, 500) || !Array.isArray(row.observation_focus) || !row.observation_focus.length ||
        !hasText(row.pedagogical_intention, 500) || !hasText(row.mediation_notes, 800) ||
        !hasText(row.continuity_from_previous, 400) || !hasText(row.continuity_to_next, 400) ||
        !hasText(row.flexibility_notes, 500) || !hasText(row.role_in_project, 400) || !hasText(row.expected_progression, 400))
      fail("invalid_activity_map", `Revisa la actividad ${index + 1} del mapa.`);
    if(row.additional_criteria!==undefined){
      const criteria=routeObservationCriteria(row);
      if(!Array.isArray(row.additional_criteria)||row.additional_criteria.length>5||!validCriterionMoments(row.observation_moments)||
        criteria.some(item=>!row.competency_ids.includes(item.competency_id)||!hasText(item.criterion_text,500)||!hasText(item.expected_evidence,500)||!validCriterionMoments(item.observation_moments))||
        new Set(criteria.map(item=>item.competency_id)).size!==row.competency_ids.length)
        fail("invalid_activity_criteria","Cada competencia del mapa necesita su propio criterio y evidencia.");
    }
    for (const criterion of routeObservationCriteria(row))
      validateOfficialPerformanceRefs(criterion.official_performance_refs, criterion.competency_id, age);
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

async function call({ workflow, task, context, outputSchema, resolvePlan, createProvider, loadSkill, providerOptions = {} }) {
  const plan = resolvePlan({ workflow, task });
  const selectedIds = context.confirmed_decisions?.competency_ids
    ?? context.confirmed_project_master?.decisions?.competency_ids
    ?? context.annual_proposal?.primary_competency_ids ?? [];
  const didacticKnowledge = await focusedKnowledgeForDirectWorkflow({ workflow: ["project_master", "annual_journey_repair"].includes(workflow) ? "project" : workflow, age: context.age,
    competencyIds: selectedIds, request: context.confirmed_decisions?.purpose ?? context.annual_proposal?.purpose
      ?? context.teacher_request ?? context.group_context ?? "",
    castellanoL2Applicable: context.castellano_l2_applicable === true,
    religionApplicable: context.religion_applicable === true });
  const feedbackInstruction = context.planning_feedback
    ? " Usa las valoraciones docentes confirmadas de planning_feedback para actualizar las oportunidades, mediación y progresión pertinentes a esta propuesta. Distingue esos resultados del diagnóstico inicial: no repitas automáticamente necesidades antiguas como si fueran actuales. Un nivel B o C no significa que todos necesiten el mismo apoyo; sin registro o sin valoración no es nivel C. Conserva fortalezas y no inventes hechos, niveles ni necesidades individuales."
    : "";
  const response = await createProvider(plan, { timeoutMs: 180_000, ...providerOptions })
    .generate(buildProviderRequest(workflow, { ...context, task: `${context.task}${feedbackInstruction} Cuando el esquema incluya official_performance_refs, selecciona entre 1 y 3 IDs pertinentes de didactic_knowledge.official_performance_catalog para CADA criterio general y diario, también los adicionales. Lee el desempeño completo y vincúlalo con la actuación realmente propuesta, la competencia y la edad; no selecciones por palabras sueltas ni obligues a demostrar todo el desempeño en un día. Si no hay desempeño publicado para esa competencia y edad, devuelve [] y usa el referente de ciclo. No inventes IDs ni copies otra edad. En mediation_notes da dos o tres indicaciones concretas, idealmente de hasta 500 caracteres; el esquema deja holgura hasta 800. Termina cada indicación con puntuación. Sintetiza antes de alcanzar el límite de cualquier campo, sin cortar palabras ni frases.`,
      didactic_knowledge: didacticKnowledge },
      plan, outputSchema, `${await loadSkill()}${context.document_generation_mode?"\n"+DOCUMENT_GENERATOR_PROJECT_RULES:""}`));
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

export async function generateProjectDependents({ context, decisions, providerDecisions = decisions, workflow = "project",
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadLearningExperienceSkill }) {
  const result = await call({ workflow, task: "dependents", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_DEPENDENTS_SCHEMA, context: { ...context, confirmed_decisions: providerDecisions,
      task: "Propón preguntas guía, recorrido flexible y un criterio general con evidencias esperadas para CADA competencia elegida. Derívalos del propósito y contexto que la docente acaba de elegir. No cambies las competencias ni inventes observaciones. No son todavía actividades diarias." } });
  validateProjectDependents(result.output, decisions.competency_ids, { age: context.age, required: true });
  return result;
}

const meaningfulSituationInstruction = "Redacta meaningful_situation en un párrafo breve: contexto o motivo de origen sustentado, por qué ofrece una oportunidad de aprendizaje y una pregunta o reto abierto comprensible para esta edad. Vincula el reto con el propósito, las competencias y el recorrido; no lo reduzcas a nombrar el tema o enumerar competencias. Usa solo las fuentes recibidas y confirmed_decisions, incluido additional_context. Distingue lo observado por la docente de lo referido por las familias; conserva el alcance individual o de subgrupo. No inventes curiosidades, frases infantiles, necesidades, huertos, visitas ni recursos. Si no hay un interés observado, presenta honestamente una invitación docente basada en una oportunidad curricular; no afirmes que el grupo ya mostró ese interés. La situación se propone: no anticipes aprendizajes logrados. No repitas este párrafo en foundation, que explica brevemente el fundamento pedagógico.";

export async function generateProjectMaster({ context, decisions, providerDecisions = decisions, dependents, availableDates,
  workflow = "project", resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadLearningExperienceSkill, backgroundExecution = false, checkpoint = {}, onCheckpoint = async () => {} }) {
  const execution = key => backgroundExecution ? { background: true, timeoutMs: 30_000,
    resumeResponseId: checkpoint.provider_responses?.[key], onResponseStarted: async id => {
      checkpoint.provider_responses ??= {}; checkpoint.provider_responses[key] = id;
      await onCheckpoint(structuredClone(checkpoint));
    } } : {};
  const masterCall=async(key,args)=>{
    if(backgroundExecution&&checkpoint.completed_calls?.[key])return structuredClone(checkpoint.completed_calls[key]);
    const result=await call({...args,providerOptions:execution(key)});
    if(backgroundExecution){checkpoint.completed_calls??={};checkpoint.completed_calls[key]=result;await onCheckpoint(structuredClone(checkpoint));}
    return result;
  };
  if (context.modern) {
    const outputSchema = { ...PROJECT_MASTER_SCHEMA, id: "project-single-master-v6",
      required: [...PROJECT_MASTER_SCHEMA.required, ...PROJECT_DEPENDENTS_SCHEMA.required],
      properties: { ...PROJECT_MASTER_SCHEMA.properties, ...PROJECT_DEPENDENTS_SCHEMA.properties } };
    const requestContext = { ...context, official_performance_version: OFFICIAL_PERFORMANCE_VERSION, confirmed_decisions: providerDecisions,
      available_instructional_dates: availableDates, instructional_dates: availableDates,
      task: `${meaningfulSituationInstruction} Una actividad puede trabajar varias competencias pertinentes, sin obligar a integrar todas cada día. La primera tiene criterion_competency_id y su criterio; cada otra competencia declarada necesita su propio additional_criteria con criterio, evidencia, foco y observation_moments. Indica opening, development o closure según dónde se podrá observar; un criterio puede reaparecer en más de un momento con la misma identidad. No añadas etiquetas sin una actuación observable. Cada actividad debe aportar una nueva pregunta, decisión o revisión respecto de la anterior, con un primer paso concreto y ayudas opcionales. Un producto puede ser una actuación, representación o solución; no exijas fabricar un objeto. No confundas interpretar emociones de personajes con regular emociones propias, elegir cómo participar con construir acuerdos, ni un dibujo con escritura propia. En artes conserva la intención expresiva y permite explorar, recordar, variar y compartir; en comunicación concreta el texto accesible, el destinatario y la autoría infantil, aceptando dictado como apoyo. No inventes conflictos ni recursos y no impongas presentaciones públicas. Crea el proyecto completo en una sola respuesta: fundamento, preguntas orientadoras, recorrido flexible, un criterio general con evidencia esperada por competencia, cierre y recursos. Redacta una fundamentación breve, de hasta 1200 caracteres, con frases completas; sintetiza antes de alcanzar el límite, nunca cortes una frase. Incluye exactamente una actividad por cada una de las ${availableDates.length} fechas recibidas. No cambies competencias, fechas ni decisiones docentes. Usa acciones concretas y palabras sencillas. Formula preguntas que un niño de esta edad pueda contestar al mirar, probar o contar algo concreto. No repitas advertencias en cada apartado: coloca cada precaución solo donde cambia una decisión. Permite compartir hallazgos sustentados y decidir cuidados seguros cuando estén autorizados. Si se comparan registros, prevé identificar de qué objeto o planta y de qué fecha es cada uno; la docente puede anotar esos datos. No exijas recordar o contar una respuesta que no fue escuchada. El criterio debe valorar la competencia elegida y la actuación realmente propuesta, no clasificar fuentes si el propósito es comunicarse oralmente. Define materiales concretos en español para cada día a partir de las decisiones y recursos del proyecto. Nunca escribas «por definir», «por seleccionar» ni nombres de campos técnicos. Usa solo recursos confirmados por la docente (incluido resource_readiness), materiales disponibles y producciones previas de la secuencia. Si propones dibujar, recortar o escribir, comprueba que el soporte y los útiles aparecen en esos recursos; no agregues papel por costumbre. Una alternativa debe permitir la misma actuación observable: imaginar una planta no sustituye observar sus cambios reales. No inventes disponibilidad, observaciones ni logros.` };
    requestContext.task += ` El recorrido debe ofrecer una oportunidad concreta para cada competencia elegida, dentro de las fechas recibidas. Si quedan pocos días, una misma actividad puede ofrecer alternativas de construcción, representación o exploración: vincula a cada alternativa su criterio específico en additional_criteria. Esto no obliga a cada niño a recorrer todas las opciones ni a demostrar todas las competencias. Nunca crees una fila por competencia en la misma fecha: conserva exactamente ${availableDates.length} actividades, una por fecha. Si una opción no permite observar una competencia, plantea una oportunidad pertinente; no añadas solo su etiqueta.`;
    const validate = output => {
      let generatedDependents;
      try { generatedDependents = validateProjectDependents(Object.fromEntries(PROJECT_DEPENDENTS_SCHEMA.required.map(key => [key, output[key]])), decisions.competency_ids, { age: context.age, required: true }); }
      catch (error) { if (error instanceof ProjectFlowError) throw error; fail("invalid_official_reference", error.message); }
      return { output: validateProjectMaster(output, decisions, generatedDependents, availableDates, { age: context.age, required: true, strictInstructions: true }), dependents: generatedDependents };
    };
    if(backgroundExecution){
      const fingerprint=createHash('sha256').update(JSON.stringify({requestContext,decisions,availableDates})).digest('hex');
      if(checkpoint.input_fingerprint&&checkpoint.input_fingerprint!==fingerprint)
        throw new VersionConflictError('El contexto del proyecto cambió. Conservamos el resultado anterior; revisa la preparación antes de crear otra secuencia.');
      checkpoint.input_fingerprint=fingerprint;await onCheckpoint(structuredClone(checkpoint));
    }
    const result = await masterCall("master", { workflow: "project_master", task: "generation", resolvePlan, createProvider, loadSkill,
      outputSchema, context: requestContext });
    try {
      const validated = { ...result, ...validate(result.output) };
      await recordAIQAResult("project_master", validated, { validators: ["per_competency_criteria", "one_blueprint_per_date", "confirmed_decisions"], downstream: ["activity", "assessment_context"] });
      return validated;
    }
    catch (error) {
      if (!(error instanceof ProjectFlowError)) throw error;
      if(error.reason==='incomplete_document_planning_text'){
        const repair=await masterCall('document_planning_repair',{workflow:'annual_journey_repair',task:'generation',resolvePlan,createProvider,loadSkill,
          outputSchema:schema('project-document-planning-repair-v1',{document_planning:PROJECT_MASTER_SCHEMA.properties.document_planning}),
          context:{...requestContext,invalid_document_planning:result.output.document_planning,validation_error:error.message,
            task:'Reescribe únicamente document_planning para corregir el apartado señalado. Conserva sus ideas y las decisiones recibidas. Usa frases breves, completas y con puntuación final en cada texto, dentro de cada límite. Para organization bastan dos frases concretas. Sintetiza antes de alcanzar el límite, sin cortar palabras ni frases. No inventes recursos, hechos ni resultados. No generes actividades, criterios, fechas ni una secuencia nueva.'}});
        if(!repair.output?.document_planning)fail('incomplete_document_planning','La reparación debe conservar la planificación del proyecto.');
        const validated={...result,...validate({...result.output,document_planning:repair.output.document_planning}),
          metadata:{...repair.metadata,repair_used:true,repair_scope:'document_planning',primary:result.metadata}};
        await recordAIQAResult('annual_journey_repair',validated,{validators:['complete_document_planning_text','unchanged_activity_sequence','confirmed_decisions'],downstream:['activity','assessment_context']});
        return validated;
      }
      const repair = await masterCall("repair", { workflow: "annual_journey_repair", task: "generation", resolvePlan, createProvider, loadSkill,
        outputSchema, context: { ...requestContext, invalid_output: result.output, validation_error: error.message,
          task: `${requestContext.task} Corrige únicamente el error indicado en validation_error. Conserva las fechas, competencias y decisiones confirmadas. No agregues días ni dividas una fecha en varias actividades.` } });
      const validated = { ...repair, ...validate(repair.output), metadata: { ...repair.metadata, repair_used: true, primary: result.metadata } };
      await recordAIQAResult("annual_journey_repair", validated, { validators: ["per_competency_criteria", "one_blueprint_per_date", "confirmed_decisions"], downstream: ["activity", "assessment_context"] });
      return validated;
    }
  }
  validateProjectDependents(dependents, decisions.competency_ids);
  const result = await call({ workflow, task: "generation", resolvePlan, createProvider, loadSkill,
    outputSchema: PROJECT_MASTER_SCHEMA, context: { ...context, confirmed_decisions: providerDecisions,
      confirmed_questions: dependents.guiding_questions, confirmed_journey: dependents.journey,
      confirmed_general_criteria: dependents.general_criteria, available_instructional_dates: availableDates,
      project_start_date: availableDates[0], project_end_date: availableDates.at(-1),
      instructional_dates: availableDates, total_activities: availableDates.length,
      task: `${meaningfulSituationInstruction} Diseña exactamente ${availableDates.length} actividades: una por cada fecha confirmada en instructional_dates, sin agregar, omitir ni cambiar fechas. El campo date de cada fila es su planned_date confirmado. Cada actividad debe ser un blueprint reutilizable con propósito, competencia principal, posibles competencias secundarias, intención pedagógica, criterio observable, evidencia esperada y variaciones aceptables, foco de observación, materiales, mediación, continuidad y flexibilidad. Usa solo las competencias confirmadas. No inventes observaciones ni niveles. La última actividad conduce al cierre. Mantén las decisiones docentes intactas y devuelve solo los campos del esquema.` } });
  return { ...result, output: validateProjectMaster(result.output, decisions, dependents, availableDates, { age: context.age, required: true, strictInstructions: true }) };
}

export async function generateProjectFormal({ context, workflow = "project", resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill = loadLearningExperienceSkill }) {
  if (context.confirmed_project_master?.experience_contract === 1 || context.modern) {
    const details = context.confirmed_project_master;
    return { output: { situation: details.project_master?.meaningful_situation || details.decisions?.context_summary || "Experiencia propuesta para el aula.",
      foundation: details.project_master?.foundation || details.rationale,
      methodology: (details.activity_route ?? []).map(row => row.pedagogical_intention).filter(Boolean).join(" ") || "Explorar, jugar y conversar con acompañamiento docente.",
      assessment_followup: [...new Set((details.activity_route ?? []).map(row => row.evaluation_criterion).filter(Boolean))].join(" ") || "Registrar lo que los niños hacen o dicen.",
      family_collaboration: "La participación de las familias se acuerda con la profesora.",
      diversity_support: "Ajustar los apoyos según las observaciones de la profesora.",
      closing: details.project_master?.closing_description || "Compartir las experiencias del proyecto." }, metadata: { execution: "code", provider_calls: 0 } };
  }
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
