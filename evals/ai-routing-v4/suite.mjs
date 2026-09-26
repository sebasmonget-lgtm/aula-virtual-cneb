import { readFile } from "node:fs/promises";

export function assertModelEvalOptIn(environment = process.env) {
  if (environment.AYNI_RUN_MODEL_EVALS !== "1") throw new Error("model_eval_opt_in_required");
  if (!environment.OPENAI_API_KEY) throw new Error("openai_api_key_required");
}

export async function loadPriceTable(path = process.env.AYNI_MODEL_PRICES_PATH) {
  if (!path) return null;
  const parsed = JSON.parse(await readFile(path, "utf8"));
  return parsed && typeof parsed === "object" ? parsed : null;
}

const competencyKeys = new Set(["competency_id", "primary_competency_ids", "possible_secondary_competency_ids", "related_competency_ids"]);

function competencyIds(value, key = "") {
  if (Array.isArray(value)) return value.flatMap((item) => competencyIds(item, key));
  if (!value || typeof value !== "object") return competencyKeys.has(key) && typeof value === "string" ? [value] : [];
  return Object.entries(value).flatMap(([nestedKey, nested]) => {
    if (nestedKey === "competency_id" && typeof nested === "string") return [nested];
    if (competencyKeys.has(nestedKey) && Array.isArray(nested)) return nested.filter((item) => typeof item === "string");
    return competencyIds(nested, nestedKey);
  });
}

export function estimatedCost(usage, model, prices) {
  const price = prices?.models?.[model];
  if (!price || !usage) return null;
  const rates = [price.input_per_million, price.cached_input_per_million, price.output_per_million];
  if (rates.some((value) => value === null || value === undefined || !Number.isFinite(Number(value)))) return null;
  const cachedTokens = Number(usage.cached_input_tokens ?? 0);
  const regularInputTokens = Math.max(0, Number(usage.input_tokens ?? 0) - cachedTokens);
  const input = regularInputTokens / 1_000_000 * Number(price.input_per_million);
  const cached = cachedTokens / 1_000_000 * Number(price.cached_input_per_million);
  const output = Number(usage.output_tokens ?? 0) / 1_000_000 * Number(price.output_per_million);
  return Number((input + cached + output).toFixed(6));
}

export function evaluateAutomatedMetrics(fixture, result, latencyMs, prices) {
  const serialized = JSON.stringify(result.output).toLocaleLowerCase("es-PE");
  const ids = [...new Set(competencyIds(result.output))];
  const provenanceIds = result.provenance?.competency_ids;
  const allowedList = fixture.allowedCompetencyIds ?? (Array.isArray(provenanceIds) ? provenanceIds : null);
  const allowed = allowedList ? new Set(allowedList) : null;
  const uniqueTextRows = [result.output?.proposed_experiences, result.output?.activity_route, result.output?.sections]
    .find(Array.isArray) ?? [];
  const labels = uniqueTextRows.map((row) => row?.title ?? row?.conclusion_text ?? row?.progress_summary).filter(Boolean);
  return {
    schema_valid: result.validation?.status === "valid",
    competency_ids_within_bundle: allowed ? ids.every((id) => allowed.has(id)) : true,
    age_applicability_validated: result.validation?.status === "valid",
    grounding_terms_found: fixture.expectedGroundingTerms.filter((term) => serialized.includes(term.toLocaleLowerCase("es-PE"))),
    grounding_signal: fixture.expectedGroundingTerms.some((term) => serialized.includes(term.toLocaleLowerCase("es-PE"))),
    continuity_without_exact_repetition: labels.length < 2 || new Set(labels.map((item) => item.trim().toLocaleLowerCase("es-PE"))).size === labels.length,
    no_forbidden_identifiers: !/private_path|photo_path|audio_path|student_id|teacher_id/.test(serialized),
    tokens: result.metadata?.usage ?? null,
    latency_ms: latencyMs,
    estimated_cost_usd: estimatedCost(result.metadata?.usage, result.metadata?.model, prices),
    routing: { policy_version: result.metadata?.routing_policy_version ?? null, provider: result.metadata?.provider ?? null,
      model: result.metadata?.model ?? null, reasoning_effort: result.metadata?.reasoning_effort ?? null,
      fallback_used: result.metadata?.fallback_used === true, fallback_reason: result.metadata?.fallback_reason ?? null },
  };
}

export function buildBlindReview(results) {
  return results.map((item, index) => ({ review_id: `output-${String(index + 1).padStart(2, "0")}`,
    fixture_id: item.fixture_id, workflow: item.workflow, output: item.output,
    human_rating: { pedagogical_quality_1_to_5: null, factual_grounding_1_to_5: null,
      age_appropriateness_1_to_5: null, clarity_for_teacher_1_to_5: null,
      continuity_and_non_repetition_1_to_5: null, invented_facts: null, notes: "" } }));
}
