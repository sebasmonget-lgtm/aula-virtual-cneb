import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const KNOWLEDGE_BASE_V4_ROOT = fileURLToPath(
  new URL("../../knowledge/cneb-initial-3-5/v4.0.0/", import.meta.url),
);

const VERSION = "4.0.0";
const FILES = {
  policy: "06_retrieval/retrieval_policy.json",
  units: "06_retrieval/combined_knowledge_units.jsonl",
  cards: "03_semantic/competency_cards.jsonl",
  workflows: "05_workflows/workflow_knowledge_requirements.json",
  sources: "01_sources/source_registry.json",
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
  const names = ["manifest.json", ...Object.values(FILES)];
  const contents = await Promise.all(names.map((name) => readFile(path.join(rootDir, name))));
  const byName = new Map(names.map((name, index) => [name, contents[index]]));
  const json = (name) => parseJson(byName.get(name).toString("utf8"), name);
  const jsonl = (name) => parseJsonl(byName.get(name).toString("utf8"), name);

  const manifest = json("manifest.json");
  requireValid(manifest.version === VERSION, `versión de manifiesto inesperada: ${manifest.version}`);
  requireValid(JSON.stringify(manifest.scope?.ages) === "[3,4,5]", "edades de manifiesto inválidas");
  for (const name of Object.values(FILES)) {
    const actual = createHash("sha256").update(byName.get(name)).digest("hex");
    requireValid(manifest.integrity?.files?.[name] === actual, `huella SHA-256 inválida: ${name}`);
  }

  const retrievalPolicy = json(FILES.policy);
  const workflowRequirements = json(FILES.workflows);
  const sourceRegistry = json(FILES.sources);
  const knowledgeUnits = jsonl(FILES.units);
  const competencyCards = jsonl(FILES.cards);
  for (const [name, value] of Object.entries({ retrievalPolicy, workflowRequirements, sourceRegistry })) {
    requireValid(value.version === VERSION, `versión inválida en ${name}`);
  }
  requireValid(retrievalPolicy.corpus === FILES.units, "corpus de retrieval inesperado");
  requireValid(Array.isArray(retrievalPolicy.layers) && retrievalPolicy.layers.length > 0, "capas de retrieval inválidas");
  requireValid(knowledgeUnits.length === 245 && manifest.counts?.combined_retrieval_units === 245, "se esperaban 245 unidades de retrieval");
  requireValid(competencyCards.length === 14 && manifest.counts?.competencies === 14, "se esperaban 14 tarjetas de competencia");
  requireValid(Object.keys(workflowRequirements.workflows ?? {}).length === 13 && manifest.counts?.workflows === 13, "se esperaban 13 workflows");

  const sourceIds = uniqueIds(sourceRegistry.sources ?? [], "fuentes");
  const cardIds = uniqueIds(competencyCards, "tarjetas");
  uniqueIds(knowledgeUnits, "unidades");
  const layers = new Set(retrievalPolicy.layers);
  const domains = new Set(knowledgeUnits.map((unit) => unit.domain));
  for (const unit of knowledgeUnits) {
    requireValid(unit.knowledge_base_version === VERSION, `versión inválida en unidad ${unit.id}`);
    requireValid(nonemptyString(unit.kind) && nonemptyString(unit.domain) && nonemptyString(unit.content), `contenido incompleto en unidad ${unit.id}`);
    requireValid(layers.has(unit.layer), `capa inválida en unidad ${unit.id}`);
    requireValid(Array.isArray(unit.age_scope) && unit.age_scope.length > 0 && unit.age_scope.every((age) => age === 3 || age === 4 || age === 5), `edad inválida en unidad ${unit.id}`);
    requireValid(unit.competency_id == null || cardIds.has(unit.competency_id), `competencia desconocida en unidad ${unit.id}`);
    requireValid(stringList(unit.source_refs) && unit.source_refs.length > 0 && unit.source_refs.every((id) => sourceIds.has(id)), `source_refs inválidos en unidad ${unit.id}`);
    requireValid(Number.isInteger(unit.retrieval_priority), `prioridad inválida en unidad ${unit.id}`);
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
    version: VERSION,
    retrievalPolicy,
    sourceRegistry,
    knowledgeUnits,
    competencyCards,
    workflows: workflowRequirements.workflows,
    validateAge: validateKnowledgeBaseAge,
    getWorkflow(workflow) {
      return validateKnowledgeBaseWorkflow(workflow, workflowRequirements.workflows);
    },
  };
}
