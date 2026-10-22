export function currentAnnualObservationCount(snapshot) {
  return new Set((snapshot?.facts ?? []).filter(fact => fact.kind === 'observed' && fact.uncertainty !== 'historical_source_preserved_for_trace').map(fact => fact.key)).size;
}

/** Retire only an obsolete global absence statement, without inferring progress or editing child records. */
export function annualFollowupForSnapshot(lines, snapshot) {
  const count = currentAnnualObservationCount(snapshot);
  if (!count) return lines;
  return (lines ?? []).map(line => line.replace(/^(?:A[uú]n|Todav[ií]a)\s+no hay\s+(?:actuaciones observadas|observaciones(?: registradas)?)(?:[.!]\s*|$)/i,
    `Esta versión incorpora ${count} ${count === 1 ? 'registro de observación' : 'registros de observación'}. `));
}
