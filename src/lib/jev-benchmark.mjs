/** Evaluates proposals without invoking a model or treating a fallback as success. */
export function summarizeSelectionBenchmark(fixtures, results) {
  const byId = new Map(results.map((result) => [result.id, result]));
  const summary = { total: fixtures.length, top1: 0, top2: 0, top3: 0, manual: 0, invalid: 0, missing: 0 };
  for (const fixture of fixtures) {
    const result = byId.get(fixture.id);
    if (!result) { summary.missing += 1; continue; }
    if (result.status === "manual_selection_required") { summary.manual += 1; continue; }
    const expected = fixture.expected_competency_id ?? fixture.acceptable_competency_ids?.[0];
    const ranking = result.ranked_competency_ids ?? [];
    if (!expected || !ranking.length) { summary.invalid += 1; continue; }
    if (ranking.slice(0, 1).includes(expected)) summary.top1 += 1;
    if (ranking.slice(0, 2).includes(expected)) summary.top2 += 1;
    if (ranking.slice(0, 3).includes(expected)) summary.top3 += 1;
  }
  return summary;
}
