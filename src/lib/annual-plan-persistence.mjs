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
    model: metadata.model ?? null,
    reasoning_effort: metadata.reasoning_effort ?? null,
    response_id: metadata.response_id ?? null,
    usage: safeUsage(usage),
    ...(Array.isArray(metadata.stages) ? { stages: metadata.stages.filter((item) => ["master", "development"].includes(item?.stage))
      .map((item) => ({ stage: item.stage, model: item.model ?? null, reasoning_effort: item.reasoning_effort ?? null,
        response_id: item.response_id ?? null, usage: safeUsage(item.usage) })) } : {}),
    provenance,
    knowledge_base_version: provenance.knowledge_base_version ?? null,
    ...(metadata.context_snapshot ? { context_snapshot: metadata.context_snapshot } : {}),
  };
}

export function nextAnnualPlanVersion(maxVersion) {
  return Number.isInteger(maxVersion) && maxVersion > 0 ? maxVersion + 1 : 1;
}
