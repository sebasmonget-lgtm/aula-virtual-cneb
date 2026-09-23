/** A UI recommendation derived only from pedagogical records already confirmed or observed. */
export function studentCompetencyGuidance(competency) {
  if (!competency.competency_v4_id) return { state: "legacy", label: "Registro anterior", action: null };
  if (competency.teacher_confirmed_conclusion) return { state: "conclusion", label: "Conclusión confirmada", action: "family_report" };
  if (competency.teacher_confirmed_assessment) return { state: "assessment", label: "Análisis confirmado", action: "conclusion" };
  if (competency.evidence_count >= 2) return { state: "ready", label: "Evidencias para analizar", action: "assessment" };
  if (competency.evidence_count === 1) return { state: "limited", label: "Hace falta observar más", action: "evidence" };
  return { state: "empty", label: "Sin evidencias todavía", action: null };
}

export function recommendedStudentGuidance(competencies) {
  const priority = { conclusion: 0, assessment: 1, ready: 2, limited: 3, empty: 4, legacy: 5 };
  return competencies
    .map((competency) => ({ competency, ...studentCompetencyGuidance(competency) }))
    .filter((item) => item.action)
    .sort((a, b) => priority[a.state] - priority[b.state] || a.competency.competency_key.localeCompare(b.competency.competency_key))[0] ?? null;
}
