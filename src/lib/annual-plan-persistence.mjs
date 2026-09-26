export function safeAnnualGenerationMetadata(metadata = {}) {
  const usage = metadata.usage ?? {};
  const provenance = metadata.provenance ?? {};
  const safeUsage = (value = {}) => ({
    input_tokens: value?.input_tokens ?? null,
    cached_input_tokens: value?.cached_input_tokens ?? null,
    output_tokens: value?.output_tokens ?? null,
    total_tokens: value?.total_tokens ?? null,
  });
  return {
    workflow: metadata.workflow ?? "annual_plan",
    provider: metadata.provider ?? null,
    model: metadata.model ?? null,
    reasoning_effort: metadata.reasoning_effort ?? null,
    routing_policy_version: metadata.routing_policy_version ?? null,
    response_id: metadata.response_id ?? null,
    usage: safeUsage(usage),
    fallback_used: metadata.fallback_used === true,
    primary_model: metadata.primary_model ?? null,
    fallback_model: metadata.fallback_model ?? null,
    fallback_reason: metadata.fallback_reason ?? null,
    ...(Array.isArray(metadata.attempts) ? { attempts: metadata.attempts.slice(0, 2).map((item) => ({
      role: item?.role ?? null, provider: item?.provider ?? null, model: item?.model ?? null,
      reasoning_effort: item?.reasoning_effort ?? null, response_id: item?.response_id ?? null,
      usage: safeUsage(item?.usage), outcome: item?.outcome ?? null,
    })) } : {}),
    ...(Array.isArray(metadata.stages) ? { stages: metadata.stages.filter((item) => ["master", "development"].includes(item?.stage))
      .map((item) => ({ stage: item.stage, provider: item.provider ?? null, model: item.model ?? null,
        reasoning_effort: item.reasoning_effort ?? null, routing_policy_version: item.routing_policy_version ?? null,
        response_id: item.response_id ?? null, usage: safeUsage(item.usage) })) } : {}),
    provenance,
    knowledge_base_version: provenance.knowledge_base_version ?? null,
    ...(metadata.context_snapshot ? { context_snapshot: metadata.context_snapshot } : {}),
  };
}

export function nextAnnualPlanVersion(maxVersion) {
  return Number.isInteger(maxVersion) && maxVersion > 0 ? maxVersion + 1 : 1;
}
