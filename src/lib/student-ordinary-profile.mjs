/** Raw observations remain visible; only confirmed links contribute to a competency. */
export function mergeStudentOrdinaryProfile(competencies, recentEvidence, observations, confirmed, names) {
  const active = observations.filter(row => row.status !== 'voided');
  const activeIds = new Set(active.map(row => row.id));
  const links = confirmed.filter(row => activeIds.has(row.id));
  const byId = new Map();
  for (const row of links) {
    const rows = byId.get(row.id) ?? [];
    rows.push(row); byId.set(row.id, rows);
  }
  const evidence = active.map(row => {
    const attributed = byId.get(row.id) ?? [], ids = [...new Set(attributed.map(item => item.competency_v4_id))];
    return { id: row.id, source_type: 'ordinary_observation', observed_at: row.occurred_at,
      updated_at: row.revised_at ?? row.captured_at, observation_status: null,
      observation_text: row.corrected_text ?? row.raw_text,
      activity_title: attributed[0]?.activity_title ?? row.context_snapshot?.activity_title ?? (row.source_kind === 'spontaneous' ? 'Observación libre' : 'Observación guiada'),
      criterion_text: attributed.map(item => item.criterion_text).filter(Boolean).join(' · '),
      competency_id: null, competency_v4_id: ids.length === 1 ? ids[0] : null,
      competency_ids: ids, competency_key: ids.length === 1 ? `v4:${ids[0]}` : null,
      competency_text: ids.map(id => names.get(id) ?? id).join(' · '), media_available: Boolean(row.media_path) };
  });
  const merged = competencies.map(row => ({ ...row }));
  for (const id of new Set(links.map(row => row.competency_v4_id))) {
    const rows = [...new Map(links.filter(row => row.competency_v4_id === id).map(row => [row.id, row])).values()];
    let entry = merged.find(row => row.competency_v4_id === id);
    if (!entry) { entry = { competency_key: `v4:${id}`, competency_id: null, competency_v4_id: id,
      competency_text: names.get(id) ?? id, evidence_count: 0, demonstrated: 0, with_support: 0,
      not_yet_demonstrated: 0, insufficient_information: 0, last_observed_at: null }; merged.push(entry); }
    entry.evidence_count += rows.length;
    entry.last_observed_at = [entry.last_observed_at, ...rows.map(row => row.observed_at)].filter(Boolean)
      .sort((a,b) => new Date(b) - new Date(a))[0] ?? null;
  }
  return { competencies: merged, recentEvidence: [...recentEvidence, ...evidence]
    .sort((a,b) => new Date(b.observed_at) - new Date(a.observed_at) || a.id.localeCompare(b.id)) };
}
