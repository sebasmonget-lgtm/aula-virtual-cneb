import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

// Snapshot of Standard API prices on 2026-09-27. Existing events keep their calculated cost.
export const AI_USAGE_PRICING_VERSION = "2026-10-07-standard";
const OPENAI_TEXT_RATES = Object.freeze({
  "gpt-6.1-sol": { short: [2, 0.1, 10], long: [4, 0.2, 15] },
  "gpt-6-sol": { short: [2, 0.2, 10], long: [4, 0.4, 15] },
  "gpt-6-luna": { short: [0.1, 0.01, 0.5], long: [0.2, 0.02, 0.75] },
});
const JEV_INPUT_PER_MILLION = 0.042;
const TRANSCRIPTION_PER_MINUTE = 0.003;
const usageContext = new AsyncLocalStorage();
const safeName = /^[a-zA-Z0-9._/-]{1,100}$/u;
const safeTeacherId = /^[0-9a-f-]{36}$/iu;
const tokens = (value) => Number.isInteger(value) && value >= 0 ? value : null;
const money = (value) => Math.round(value * 1e10) / 1e10;

export function estimateTextCost({ model, inputTokens, cachedInputTokens = 0, outputTokens }) {
  const modelFamily = Object.keys(OPENAI_TEXT_RATES).find((name) => model === name || model?.startsWith(`${name}-`));
  const rates = OPENAI_TEXT_RATES[modelFamily];
  const input = tokens(inputTokens), cached = tokens(cachedInputTokens), output = tokens(outputTokens);
  if (!rates || input === null || cached === null || output === null || cached > input) return null;
  const [inputRate, cachedRate, outputRate] = rates[input > 272_000 ? "long" : "short"];
  return money(((input - cached) * inputRate + cached * cachedRate + output * outputRate) / 1_000_000);
}

export function estimateTranscriptionCost(durationSeconds) {
  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? money(durationSeconds * TRANSCRIPTION_PER_MINUTE / 60) : null;
}

export function estimateJevCost(inputTokens) {
  const input = tokens(inputTokens);
  return input === null ? null : money(input * JEV_INPUT_PER_MILLION / 1_000_000);
}

export function withAiUsageContext({ teacherId, db }, work) {
  if (!safeTeacherId.test(teacherId) || typeof db?.query !== "function" || typeof work !== "function")
    throw new TypeError("Contexto de consumo inválido.");
  return usageContext.run({ teacherId, db }, work);
}

/** Best-effort billing telemetry: IDs, counts and prices only; never prompts or student data. */
export async function recordAiUsage({ provider, workflow, model, inputTokens = null,
  cachedInputTokens = null, outputTokens = null, durationSeconds = null, providerCostUsd = null }) {
  const context = usageContext.getStore();
  if (!context) return false;
  if (!["openai", "openrouter"].includes(provider) || !safeName.test(workflow) || !safeName.test(model))
    return false;
  const input = tokens(inputTokens), cached = tokens(cachedInputTokens), output = tokens(outputTokens);
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null;
  let cost = Number.isFinite(providerCostUsd) && providerCostUsd >= 0 ? money(providerCostUsd) : null;
  let costSource = cost === null ? "unpriced" : "provider";
  if (cost === null && provider === "openai" && duration !== null && model === "gpt-4o-mini-transcribe") {
    cost = estimateTranscriptionCost(duration); costSource = "estimate";
  } else if (cost === null && provider === "openai") {
    cost = estimateTextCost({ model, inputTokens: input, cachedInputTokens: cached ?? 0, outputTokens: output });
    if (cost !== null) costSource = "estimate";
  } else if (cost === null && provider === "openrouter" && model.startsWith("typesafe/jev-")) {
    cost = estimateJevCost(input);
    if (cost !== null) costSource = "estimate";
  }
  try {
    await context.db.query(`insert into ai_usage_events
      (id,teacher_id,provider,workflow,model,input_tokens,cached_input_tokens,output_tokens,duration_seconds,cost_usd,cost_source,pricing_version)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [randomUUID(), context.teacherId, provider, workflow, model, input, cached, output,
      duration, cost, costSource, AI_USAGE_PRICING_VERSION]);
    return true;
  } catch {
    console.warn(JSON.stringify({ event: "ai_usage_record_failed", workflow }));
    return false;
  }
}

export async function loadTeacherAiUsage(db, teacherId, now = new Date()) {
  if (!safeTeacherId.test(teacherId)) throw new TypeError("Docente inválida.");
  const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).formatToParts(now);
  const month = `${monthParts.find((part) => part.type === "year")?.value}-${monthParts.find((part) => part.type === "month")?.value}`;
  const monthStart = `${month}-01T05:00:00.000Z`;
  const { rows } = await db.query(`select provider,workflow,model,
    count(*)::int as calls,
    count(*) filter (where cost_usd is null)::int as unpriced_calls,
    count(*) filter (where cost_source='estimate')::int as estimated_calls,
    coalesce(sum(cost_usd),0) as cost_usd,
    count(*) filter (where occurred_at >= $2::timestamptz)::int as month_calls,
    count(*) filter (where occurred_at >= $2::timestamptz and cost_usd is null)::int as month_unpriced_calls,
    count(*) filter (where occurred_at >= $2::timestamptz and cost_source='estimate')::int as month_estimated_calls,
    coalesce(sum(cost_usd) filter (where occurred_at >= $2::timestamptz),0) as month_cost_usd
    from ai_usage_events where teacher_id=$1 group by provider,workflow,model order by cost_usd desc`, [teacherId, monthStart]);
  const breakdown = rows.map((row) => ({ provider: row.provider, workflow: row.workflow, model: row.model,
    calls: Number(row.calls), unpricedCalls: Number(row.unpriced_calls), estimatedCalls: Number(row.estimated_calls), costUsd: Number(row.cost_usd),
    monthCalls: Number(row.month_calls), monthUnpricedCalls: Number(row.month_unpriced_calls), monthEstimatedCalls: Number(row.month_estimated_calls),
    monthCostUsd: Number(row.month_cost_usd) }));
  return { month, pricingVersion: AI_USAGE_PRICING_VERSION,
    total: { calls: breakdown.reduce((sum, row) => sum + row.calls, 0),
      unpricedCalls: breakdown.reduce((sum, row) => sum + row.unpricedCalls, 0),
      estimatedCalls: breakdown.reduce((sum, row) => sum + row.estimatedCalls, 0),
      costUsd: money(breakdown.reduce((sum, row) => sum + row.costUsd, 0)) },
    currentMonth: { calls: breakdown.reduce((sum, row) => sum + row.monthCalls, 0),
      unpricedCalls: breakdown.reduce((sum, row) => sum + row.monthUnpricedCalls, 0),
      estimatedCalls: breakdown.reduce((sum, row) => sum + row.monthEstimatedCalls, 0),
      costUsd: money(breakdown.reduce((sum, row) => sum + row.monthCostUsd, 0)) }, breakdown };
}
