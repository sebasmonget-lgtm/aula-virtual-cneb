import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const KNOWLEDGE_BASE_V4_0_ROOT = fileURLToPath(
  new URL("../../knowledge/cneb-initial-3-5/v4.0.0/", import.meta.url),
);
export const KNOWLEDGE_BASE_V4_ROOT = fileURLToPath(
  new URL("../../knowledge/cneb-initial-3-5/v4.1.0/", import.meta.url),
);
const FILES = {
  policy: "06_retrieval/retrieval_policy.json",
  units: "06_retrieval/combined_knowledge_units.jsonl",
  cards: "03_semantic/competency_cards.jsonl",
  workflows: "05_workflows/workflow_knowledge_requirements.json",
  sources: "01_sources/source_registry.json",
  sourceClaims: "01_sources/source_claims.jsonl",
  curriculumReference: "02_official_reference/curriculum_reference.json",
  specialApplicability: "02_official_reference/special_applicability.json",
  generationGuardrails: "00_contract/generation_guardrails.json",
};

const PEDAGOGY_FILES = {
  diagnostic_assessment: "04_pedagogy/diagnostic_assessment.json",
  formative_assessment: "04_pedagogy/formative_assessment.json",
  planning: "04_pedagogy/planning.json",
  projects_units_workshops: "04_pedagogy/projects_units_workshops.json",
  activity_design: "04_pedagogy/activity_design.json",
  teacher_interaction_and_mediation: "04_pedagogy/teacher_interaction_and_mediation.json",
  evidence_and_criteria: "04_pedagogy/evidence_and_criteria.json",
  spaces_materials: "04_pedagogy/spaces_materials.json",
  family_context_and_adaptation: "04_pedagogy/family_context_and_adaptation.json",
  tutoring_wellbeing: "04_pedagogy/tutoring_and_wellbeing.json",
  play_and_sectors: "04_pedagogy/play_and_sectors.json",
  orality_cycle_ii: "04_pedagogy/orality_cycle_ii.json",
};

const GENERATION_FILES = {
  activity: "05_generation/activity_generation.json",
  annual_plan: "05_generation/annual_plan_generation.json",
  project_unit: "05_generation/project_unit_generation.json",
  assessment: "05_generation/assessment_synthesis_generation.json",
  reports: "05_generation/reports_and_documents_generation.json",
  prohibitedShortcuts: "05_generation/prohibited_shortcuts.json",
};

function requireValid(condition, message) {
  if (!condition) throw new Error(`Knowledge Base v4: ${message}`);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value) {
  return Array.isArray(value) && value.every(nonemptyString);
}

function parseJson(contents, filename) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Knowledge Base v4: JSON inválido en ${filename}: ${error.message}`, { cause: error });
  }
}

function parseJsonl(contents, filename) {
  return contents.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    return [parseJson(line, `${filename}:${index + 1}`)];
  });
}

function uniqueIds(records, label) {
  const ids = new Set();
  for (const record of records) {
    requireValid(nonemptyString(record?.id), `${label}: falta un ID`);
    requireValid(!ids.has(record.id), `${label}: ID duplicado ${record.id}`);
    ids.add(record.id);
  }
  return ids;
}

export function validateKnowledgeBaseAge(age) {
  if (age !== 3 && age !== 4 && age !== 5) {
    throw new RangeError("La edad CNEB debe ser exactamente 3, 4 o 5 años.");
  }
  return age;
}

export function validateKnowledgeBaseWorkflow(workflow, workflows) {
  if (!nonemptyString(workflow) || !Object.hasOwn(workflows, workflow)) {
    throw new RangeError(`Workflow de Knowledge Base v4 desconocido: ${String(workflow)}`);
  }
  return workflows[workflow];
}

export async function loadKnowledgeBaseV4(rootDir = KNOWLEDGE_BASE_V4_ROOT) {
  const manifestBuffer = await readFile(path.join(rootDir, "manifest.json"));
  const manifest = parseJson(manifestBuffer.toString("utf8"), "manifest.json");
  const version = manifest.version;
  requireValid(version === "4.0.0" || version === "4.1.0", `versión de manifiesto inesperada: ${version}`);
  const integrityNames = Object.keys(manifest.integrity?.files ?? {});
  requireValid(integrityNames.length > 0, "manifiesto sin archivos de integridad");
  const integrityContents = await Promise.all(integrityNames.map((name) => readFile(path.join(rootDir, name))));
  for (const [index, name] of integrityNames.entries()) {
    const actual = createHash("sha256").update(integrityContents[index]).digest("hex");
    requireValid(manifest.integrity.files[name] === actual, `huella SHA-256 inválida: ${name}`);
  }

  const names = [...new Set([...Object.values(FILES), ...Object.values(PEDAGOGY_FILES), ...Object.values(GENERATION_FILES)])];
  const contents = await Promise.all(names.map((name) => readFile(path.join(rootDir, name))));
  const byName = new Map(names.map((name, index) => [name, contents[index]]));
  const json = (name) => parseJson(byName.get(name).toString("utf8"), name);
  const jsonl = (name) => parseJsonl(byName.get(name).toString("utf8"), name);

  requireValid(JSON.stringify(manifest.scope?.ages) === "[3,4,5]", "edades de manifiesto inválidas");

  const retrievalPolicy = json(FILES.policy);
  const workflowRequirements = json(FILES.workflows);
  const sourceRegistry = json(FILES.sources);
  const sourceClaimsRegistry = jsonl(FILES.sourceClaims);
  const curriculumReference = json(FILES.curriculumReference);
  const specialApplicability = json(FILES.specialApplicability);
  const generationGuardrails = json(FILES.generationGuardrails);
  const pedagogyModules = Object.fromEntries(Object.entries(PEDAGOGY_FILES).map(([domain, name]) => [domain, json(name)]));
  const generationRules = Object.fromEntries(Object.entries(GENERATION_FILES).map(([name, file]) => [name, json(file)]));
  const knowledgeUnits = jsonl(FILES.units);
  const competencyCards = jsonl(FILES.cards);
  for (const [name, value] of Object.entries({ retrievalPolicy, workflowRequirements, sourceRegistry, curriculumReference, specialApplicability })) {
    requireValid(value.version === version, `versión inválida en ${name}`);
  }
  requireValid(retrievalPolicy.corpus === FILES.units, "corpus de retrieval inesperado");
  requireValid(Array.isArray(retrievalPolicy.layers) && retrievalPolicy.layers.length > 0, "capas de retrieval inválidas");
  requireValid(knowledgeUnits.length === manifest.counts?.combined_retrieval_units, "conteo de unidades distinto del manifiesto");
  requireValid(competencyCards.length === manifest.counts?.competencies, "conteo de tarjetas distinto del manifiesto");
  requireValid(Object.keys(workflowRequirements.workflows ?? {}).length === manifest.counts?.workflows, "conteo de workflows distinto del manifiesto");
  requireValid((sourceRegistry.sources ?? []).length === manifest.counts?.sources, "conteo de fuentes distinto del manifiesto");
  requireValid(sourceClaimsRegistry.length === manifest.counts?.source_claims, "conteo de claims distinto del manifiesto");

  const sourceIds = uniqueIds(sourceRegistry.sources ?? [], "fuentes");
  uniqueIds(sourceClaimsRegistry, "claims de fuentes");
  const cardIds = uniqueIds(competencyCards, "tarjetas");
  uniqueIds(knowledgeUnits, "unidades");
  const layers = new Set(retrievalPolicy.layers);
  const domains = new Set(knowledgeUnits.map((unit) => unit.domain));
  for (const unit of knowledgeUnits) {
    requireValid(unit.knowledge_base_version === version, `versión inválida en unidad ${unit.id}`);
    requireValid(nonemptyString(unit.kind) && nonemptyString(unit.domain) && nonemptyString(unit.content), `contenido incompleto en unidad ${unit.id}`);
    requireValid(layers.has(unit.layer), `capa inválida en unidad ${unit.id}`);
    requireValid(Array.isArray(unit.age_scope) && unit.age_scope.length > 0 && unit.age_scope.every((age) => age === 3 || age === 4 || age === 5), `edad inválida en unidad ${unit.id}`);
    requireValid(unit.competency_id == null || cardIds.has(unit.competency_id), `competencia desconocida en unidad ${unit.id}`);
    requireValid(unit.applicable_competency_ids === undefined || (stringList(unit.applicable_competency_ids)
      && unit.applicable_competency_ids.every((id) => cardIds.has(id))), `competencias aplicables inválidas en unidad ${unit.id}`);
    requireValid(unit.workflow_scope === undefined || (stringList(unit.workflow_scope)
      && unit.workflow_scope.every((workflow) => Object.hasOwn(workflowRequirements.workflows, workflow))), `workflow_scope inválido en unidad ${unit.id}`);
    requireValid(unit.applicability === undefined || (Array.isArray(unit.applicability?.requires_any)
      && stringList(unit.applicability.requires_any)), `aplicabilidad inválida en unidad ${unit.id}`);
    requireValid(stringList(unit.source_refs) && unit.source_refs.length > 0 && unit.source_refs.every((id) => sourceIds.has(id)), `source_refs inválidos en unidad ${unit.id}`);
    requireValid(Number.isInteger(unit.retrieval_priority), `prioridad inválida en unidad ${unit.id}`);
  }
  for (const claim of sourceClaimsRegistry) {
    requireValid(sourceIds.has(claim.source_id), `fuente desconocida en claim ${claim.id}`);
  }
  for (const card of competencyCards) {
    requireValid(card.canonical_id === card.id && nonemptyString(card.official_name), `tarjeta incompleta: ${card.id}`);
    requireValid(stringList(card.source_refs) && card.source_refs.every((id) => sourceIds.has(id)), `source_refs inválidos en tarjeta ${card.id}`);
    requireValid(["3", "4", "5"].every((age) => card.ages?.[age] && typeof card.runtime_selectable_by_age?.[age] === "boolean"), `edades incompletas en tarjeta ${card.id}`);
  }
  for (const [id, workflow] of Object.entries(workflowRequirements.workflows)) {
    requireValid(stringList(workflow.required_user_context) && stringList(workflow.preferred_user_context), `contexto inválido en workflow ${id}`);
    requireValid(stringList(workflow.required_domains) && workflow.required_domains.length > 0 && stringList(workflow.optional_domains), `dominios inválidos en workflow ${id}`);
    requireValid([...workflow.required_domains, ...workflow.optional_domains].every((domain) => domains.has(domain)), `dominio desconocido en workflow ${id}`);
    requireValid(nonemptyString(workflow.curriculum_policy), `política curricular ausente en workflow ${id}`);
    requireValid(Number.isInteger(workflow.max_semantic_units) && workflow.max_semantic_units > 0 && Number.isInteger(workflow.max_source_claims) && workflow.max_source_claims > 0, `límites inválidos en workflow ${id}`);
    requireValid(workflow.output_guardrails === undefined || stringList(workflow.output_guardrails), `guardrails inválidos en workflow ${id}`);
  }

  return {
    version,
    manifest,
    retrievalPolicy,
    sourceRegistry,
    sourceClaimsRegistry,
    curriculumReference,
    specialApplicability,
    generationGuardrails,
    pedagogyModules,
    generationRules,
    knowledgeUnits,
    competencyCards,
    workflows: workflowRequirements.workflows,
    validateAge: validateKnowledgeBaseAge,
    getWorkflow(workflow) {
      return validateKnowledgeBaseWorkflow(workflow, workflowRequirements.workflows);
    },
  };
}
