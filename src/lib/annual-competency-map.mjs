import { AYNI_HEURISTICS } from "./ayni-heuristics.mjs";

/** Read-only projection of the same proposal objects used by schedule and DOCX. */
export function buildAnnualCompetencyMap(proposal, options = [], priorities = [], otherOpportunities = [], policy = AYNI_HEURISTICS) {
  const projects = proposal?.proposed_experiences ?? [];
  const names = new Map(options.map((item) => [item.id, item.name]));
  const priorityById = new Map(priorities.map((item) => [item.competency_id, item]));
  const ids = [...new Set([...options.map((item) => item.id), ...projects.flatMap((item) =>
    [...(item.primary_competency_ids ?? []), ...(item.possible_secondary_competency_ids ?? [])]),
    ...priorities.map((item) => item.competency_id)])];
  return ids.map((id) => {
    const occurrences = projects.flatMap((item, index) => {
      const primary = item.primary_competency_ids?.includes(id);
      const secondary = item.possible_secondary_competency_ids?.includes(id);
      return primary || secondary ? [{ index: index + 1, title: item.title, period: item.period,
        role: primary ? "primary" : "possible_secondary" }] : [];
    });
    const periods = [...new Set(occurrences.map((item) => item.period))];
    const other = otherOpportunities.filter((item) => item.competency_id === id && item.explicit_criterion === true);
    const priority = priorityById.get(id) ?? null;
    const warnings = [];
    const agePerformance = options.find((item) => item.id === id)?.has_age_performance !== false;
    if (agePerformance || priority) {
      if (!occurrences.length && !other.length) warnings.push("No hay una oportunidad explícita prevista.");
      else if (occurrences.length + other.length < policy.annual_low_opportunities) warnings.push("Hay una sola oportunidad prevista.");
      if (occurrences.length >= policy.annual_low_opportunities && periods.length <= policy.annual_concentrated_periods)
        warnings.push("Las oportunidades están concentradas en un período.");
      if (priority?.emphasis === "prioritize" && occurrences.length + other.length < policy.annual_low_opportunities)
        warnings.push("Es prioridad diagnóstica y podría necesitar más oportunidades.");
    }
    return { competency_id: id, competency_name: names.get(id) ?? id,
      diagnostic_priority: priority?.emphasis ?? null, diagnostic_reason: priority?.reason ?? null,
      project_count: occurrences.length, primary_count: occurrences.filter((item) => item.role === "primary").length,
      possible_secondary_count: occurrences.filter((item) => item.role === "possible_secondary").length,
      other_opportunities: other.length, periods, projects: occurrences, warnings };
  });
}
