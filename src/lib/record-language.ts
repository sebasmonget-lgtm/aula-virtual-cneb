export function countNoun(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function periodEvidenceLabel(count: number) {
  return count === 0 ? "Sin evidencias en este período" : countNoun(count, "evidencia de este período", "evidencias de este período");
}

export function diagnosticAntecedentLabel(count: number) {
  return countNoun(count, "antecedente diagnóstico", "antecedentes diagnósticos");
}
