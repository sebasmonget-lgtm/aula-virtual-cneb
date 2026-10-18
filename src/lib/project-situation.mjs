/** Read saved context only. Opening a historical project never generates a new situation. */
export function projectSituation(content = {}) {
  return [content.project_master?.meaningful_situation, content.formal_content?.situation,
    content.decisions?.context_summary, content.starting_point, content.trigger_or_interest,
    content.learning_need_or_context].find(value => typeof value === "string" && value.trim())?.trim() ?? "";
}
