import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { ANNUAL_PREPLAN_FORMAT, AnnualPreplanError, ageFilteredAnnualCurriculum, validateAnnualPreplan } from "./annual-preplan-service.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadAnnualPreplanSkill } from "./annual-plan-skill.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const templateUrl = new URL("../../assets/templates/planificacion-anual-inicial-unificada-v1.docx", import.meta.url);
const formalText = { type: "string", pattern: "^[\\s\\S]{1,1000}$" };
const formalList = (maxItems) => ({ type: "array", maxItems, items: formalText });
const detailsSchema = { type: "object", additionalProperties: false,
  required: ["index", "context_or_trigger", "final_product", "materials", "what_to_observe"], properties: {
    index: { type: "integer", minimum: 1, maximum: 20 }, context_or_trigger: formalText, final_product: formalText,
    materials: formalList(12), what_to_observe: formalList(8),
  } };
export const ANNUAL_FORMAL_SCHEMA = { id: "annual-formal-v1", type: "object", additionalProperties: false,
  required: ["organization_criteria", "transversal_approaches", "teaching_strategies", "assessment_followup", "family_collaboration", "inclusive_supports", "project_details"],
  properties: { organization_criteria: { ...formalList(4), minItems: 4 },
    transversal_approaches: formalList(8),
    teaching_strategies: formalList(8),
    assessment_followup: formalList(8),
    family_collaboration: formalList(8),
    inclusive_supports: formalList(8),
    project_details: { type: "array", minItems: 1, maxItems: 20, items: detailsSchema },
} };

export function annualFormalSchema(count) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Cantidad de propuestas inválida.");
  return { ...ANNUAL_FORMAL_SCHEMA, properties: { ...ANNUAL_FORMAL_SCHEMA.properties,
    project_details: { ...ANNUAL_FORMAL_SCHEMA.properties.project_details, minItems: count, maxItems: count } } };
}

function validText(value) { return typeof value === "string" && value.trim().length > 0 && value.length <= 1000; }
function validList(value, max) { return Array.isArray(value) && value.length <= max && value.every(validText); }
export function validateAnnualFormal(output, count) {
  if (!output || Object.keys(output).some((key) => !ANNUAL_FORMAL_SCHEMA.required.includes(key)) ||
    !validList(output.organization_criteria, 4) || output.organization_criteria.length !== 4 ||
    !["transversal_approaches", "teaching_strategies", "assessment_followup", "family_collaboration", "inclusive_supports"]
      .every((key) => validList(output[key], 8)) || !Array.isArray(output.project_details) || output.project_details.length !== count)
    throw new Error("El desarrollo formal llegó incompleto. Puedes volver a intentarlo sin perder el plan confirmado.");
  for (const [index, item] of output.project_details.entries()) if (item?.index !== index + 1 ||
    Object.keys(item).some((key) => !detailsSchema.required.includes(key)) ||
    !validText(item.context_or_trigger) || !validText(item.final_product) ||
    !validList(item.materials, 12) || !validList(item.what_to_observe, 8))
    throw new Error(`El desarrollo de la propuesta ${index + 1} llegó incompleto.`);
  return output;
}

async function templateStructure() {
  const archive = await JSZip.loadAsync(await readFile(templateUrl));
  const xml = await archive.file("word/document.xml").async("string");
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");
  return { template: "planificacion-anual-inicial-unificada-v1.docx",
    sections: ["Datos generales", "Diagnóstico del grupo", "Prioridades del año", "Organización anual", "Cronograma general", "Desarrollo mensual", "Evaluación y seguimiento"],
    placeholders: [...new Set([...text.matchAll(/\{\{([A-Z_0-9]+)\}\}/g)].map((match) => match[1]))] };
}

/** Formal text is derived from the confirmed preplan. Its canonical rows are never rewritten. */
export function projectFormalAnnualContent(preplan, formal, group, priorities) {
  const rows = preplan.proposed_experiences;
  const namedPriorities = (priorities?.priorities ?? []).map((item) => item.title);
  return { plan_format: "twelve_projects_flexible_weeks", title: "Planificación anual de Educación Inicial",
    school_year: preplan.school_year,
    general_context_summary: [group?.strengths, group?.needs].filter(Boolean).join(" "),
    planning_priorities: namedPriorities.length ? namedPriorities : [group?.planning_priorities || "Observar y ajustar según el grupo"],
    competency_overview: [...new Set(rows.flatMap((item) => item.primary_competency_ids))],
    annual_purposes: rows.map((item) => item.purpose),
    organization_criteria: formal.organization_criteria,
    transversal_approaches: formal.transversal_approaches,
    teaching_strategies: formal.teaching_strategies,
    assessment_followup: formal.assessment_followup,
    family_collaboration: formal.family_collaboration,
    inclusive_supports: formal.inclusive_supports,
    review_checkpoints: ["Al terminar cada bimestre, revisar registros y ajustar las propuestas siguientes."],
    flexibility_notes: "Las propuestas pueden modificarse durante el año mediante una nueva versión confirmada.",
    proposed_experiences: rows.map((item, index) => ({ ...item,
      possible_secondary_competency_ids: [],
      context_or_trigger: formal.project_details[index].context_or_trigger,
      expected_evidence_categories: formal.project_details[index].what_to_observe,
      flexibility_notes: "Revisar intereses y observaciones del grupo antes de desarrollarla.",
      final_product: formal.project_details[index].final_product,
      materials: formal.project_details[index].materials,
    })),
  };
}

export async function developConfirmedAnnualPlan(db, teacherId, planId, context, {
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, loadSkill = loadAnnualPreplanSkill,
} = {}) {
  const plan = (await db.query(`select ap.id,ap.proposal,ap.document_context,ap.revision,ap.source_diagnostic_review_id,ap.source_priority_review_id,ap.source_personalization_review_id
    from annual_plans ap join school_years sy on sy.id=ap.school_year_id
    where ap.id=$1 and ap.classroom_id=$2 and ap.school_year_id=$3 and sy.owner_id=$4 and ap.status in ('active','archived')`,
  [planId, context.id, context.school_year_id, teacherId])).rows[0];
  if (!plan || plan.proposal?.plan_format !== ANNUAL_PREPLAN_FORMAT)
    throw new AnnualPreplanError("not_found", "El plan confirmado no está disponible para esta aula.");
  const existing = (await db.query(`select content from annual_plan_formal_content where annual_plan_id=$1`, [planId])).rows[0];
  if (existing) return { content: existing.content, already_ready: true };
  const curriculum = await ageFilteredAnnualCurriculum(context);
  const preplan = validateAnnualPreplan(plan.proposal, curriculum.map((card) => card.id), context.year);
  const [group, priorities] = await Promise.all([
    db.query(`select details from diagnostic_group_reviews where id=$1 and classroom_id=$2 and status='confirmed'`,
      [plan.source_diagnostic_review_id, context.id]),
    db.query(`select details from diagnostic_priority_reviews where id=$1 and classroom_id=$2 and status='confirmed'`,
      [plan.source_priority_review_id, context.id]),
  ]);
  const personalization = plan.source_personalization_review_id ? (await db.query(`select details from annual_personalization_reviews
    where id=$1 and classroom_id=$2 and status='confirmed'`, [plan.source_personalization_review_id, context.id])).rows[0] : null;
  if (!personalization && (!group.rows[0] || !priorities.rows[0]))
    throw new Error("Falta la decisión confirmada que dio origen a este plan.");
  const studentNames = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [context.id])).rows
    .flatMap((item) => [item.first_name, item.last_name, item.preferred_name,
      [item.first_name, item.last_name].filter(Boolean).join(" ")]).filter(Boolean);
  const safeGroup = personalization ? { strengths: personalization.details.group_profile, needs: "", planning_priorities: "" }
    : Object.fromEntries(["strengths", "needs", "planning_priorities"].map((field) =>
    [field, neutralizeAssessmentText(group.rows[0].details?.[field] ?? "", studentNames)]));
  const safePriorities = { priorities: (personalization?.details.priorities ?? priorities.rows[0]?.details?.priorities ?? []).map((item) => ({ ...item,
    title: neutralizeAssessmentText(item.title, studentNames),
    reason: neutralizeAssessmentText(item.reason, studentNames) })) };
  const routing = resolvePlan({ workflow: "annual_plan", task: "document_development" });
  const bundle = { workflow: "annual_formal_development", age: context.age,
    confirmed_preplan: preplan, confirmed_group: safeGroup, confirmed_priorities: safePriorities,
    confirmed_interests: personalization?.details.interests?.map((item) => item.label) ?? [],
    confirmed_context: personalization?.details.context_opportunities?.map((item) => item.text) ?? [],
    confirmed_conditions: personalization?.details.classroom_conditions?.map((item) => ({ kind: item.kind, value: item.value })) ?? [],
    institution: { name: context.institution_name, teacher: context.teacher_name, age: context.age, section: context.section, year: context.year },
    calendar: plan.document_context?.calendar ?? context.calendar, curriculum: { age: context.age, competency_cards: curriculum },
    template_structure: await templateStructure(),
    task: `Desarrolla la redacción formal sin modificar ninguna decisión confirmada. Devuelve exactamente cuatro criterios de organización y ${preplan.proposed_experiences.length} detalles, uno por propuesta en el mismo orden con índices consecutivos desde 1. Las listas generales tienen como máximo ocho elementos; materiales como máximo doce y qué observar como máximo ocho por propuesta. Cada texto tiene entre 1 y 1000 caracteres. No inventes observaciones realizadas, criterios de evaluación, niveles, estudiantes ni evidencias reales. La lista qué observar contiene solo oportunidades futuras. Productos posibles variados y pertinentes, no manualidades repetidas. Lenguaje sencillo para docentes.`,
  };
  const response = await createProvider(routing, { timeoutMs: 180_000 }).generate(buildProviderRequest("annual_plan", bundle,
    routing, annualFormalSchema(preplan.proposed_experiences.length), await loadSkill()));
  const formal = validateAnnualFormal(response.output, preplan.proposed_experiences.length);
  const content = projectFormalAnnualContent(preplan, formal, safeGroup, safePriorities);
  await db.query(`insert into annual_plan_formal_content(annual_plan_id,content,ai_metadata,source_revision)
    values($1,$2::jsonb,$3::jsonb,$4) on conflict(annual_plan_id) do nothing`,
  [planId, JSON.stringify(content), JSON.stringify({ provider: response.provider_metadata?.provider ?? routing.provider,
    model: response.provider_metadata?.model ?? routing.model, reasoning_effort: routing.reasoning_effort,
    routing_policy_version: routing.routing_policy_version, response_id: response.provider_metadata?.response_id ?? null,
    usage: response.provider_metadata?.usage ?? null, fallback_used: false }), plan.revision]);
  return { content, already_ready: false };
}
