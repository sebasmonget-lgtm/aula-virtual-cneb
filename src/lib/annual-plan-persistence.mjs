export function safeAnnualGenerationMetadata(metadata = {}) {
  const usage = metadata.usage ?? {};
  const provenance = metadata.provenance ?? {};
  return {
    workflow: metadata.workflow ?? "annual_plan",
    model: metadata.model ?? null,
    reasoning_effort: metadata.reasoning_effort ?? null,
    response_id: metadata.response_id ?? null,
    usage: {
      input_tokens: usage.input_tokens ?? null,
      cached_input_tokens: usage.cached_input_tokens ?? null,
      output_tokens: usage.output_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
    },
    provenance,
    knowledge_base_version: provenance.knowledge_base_version ?? null,
  };
}

export function nextAnnualPlanVersion(maxVersion) {
  return Number.isInteger(maxVersion) && maxVersion > 0 ? maxVersion + 1 : 1;
}
