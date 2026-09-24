/** Auditable source → projection → consumer policy. Raw family text never goes to a provider by default. */
export const CONTEXT_POLICY_V4 = Object.freeze([
  { source: "family_interview", projection: "student_profile", consumers: ["profile"], ai_allowed: false, purpose: "Acompañamiento individual" },
  { source: "family_interview", projection: "diagnostic_family_subset", consumers: ["diagnostic"], ai_allowed: true, purpose: "Interpretar observaciones con contexto, sin tratarlo como evidencia" },
  { source: "family_interview", projection: "classroom_tag_aggregate", consumers: ["annual_plan", "project", "unit", "activity"], ai_allowed: true, purpose: "Contextualizar propuestas grupales con etiquetas confirmadas" },
  { source: "diagnostic_observation", projection: "student_diagnostic_observations", consumers: ["diagnostic", "profile"], ai_allowed: true, purpose: "Revisión diagnóstica individual" },
  { source: "diagnostic_group_confirmed", projection: "classroom_diagnostic_summary", consumers: ["annual_plan", "project", "unit", "activity"], ai_allowed: true, purpose: "Prioridades pedagógicas confirmadas" },
  { source: "formative_evidence", projection: "student_evidence_subset", consumers: ["assessment"], ai_allowed: true, purpose: "Evaluación formativa" },
  { source: "assessment_confirmed", projection: "student_assessment_subset", consumers: ["descriptive_conclusion"], ai_allowed: true, purpose: "Conclusión descriptiva" },
  { source: "conclusion_confirmed", projection: "student_conclusion_subset", consumers: ["family_report"], ai_allowed: true, purpose: "Comunicación a la familia" },
]);

const formatPatterns = (items) => items.map((item) => `${item.label.toLowerCase()} (${item.count})`).join(", ");
function planningProjection(context, { includePrevious = false, maxInterests = 4, includeCoverage = false } = {}) {
  if (!context) return null;
  const interests = context.common_interests.slice(0, maxInterests);
  const fragments = [];
  if (context.languages.length) fragments.push(`Lenguas informadas por familias: ${formatPatterns(context.languages)}.`);
  if (context.primary_languages?.length) fragments.push(`Lenguas principales informadas: ${formatPatterns(context.primary_languages)}.`);
  if (interests.length) fragments.push(`Intereses grupales etiquetados: ${formatPatterns(interests)}.`);
  if (includePrevious && Object.keys(context.previous_education).length) {
    fragments.push(`Experiencia educativa previa informada: ${Object.entries(context.previous_education).map(([key,count]) => `${key === "yes" ? "sí" : key === "no" ? "no" : "sin precisar"} (${count})`).join(", ")}.`);
  }
  if (includeCoverage) fragments.push(`Niños con observación diagnóstica registrada: ${context.diagnostic_coverage.students_with_observations}.`);
  if (includeCoverage && context.observation_gaps?.length) fragments.push(`Competencias en las que conviene recoger más observaciones, sin atribuir dificultad por ausencia de registros: ${context.observation_gaps.map((item) => item.competency_name).join(", ")}.`);
  return { group_context: fragments.join(" "), interests: interests.map((item) => item.label),
    language_context: context.languages.length || context.primary_languages?.length ? {
      group_languages: context.languages.map(({ key, count }) => ({ key, count })),
      primary_group_languages: (context.primary_languages ?? []).map(({ key, count }) => ({ key, count })),
    } : null,
    diagnostic_summary: context.confirmed_diagnostic_summary ?? null,
    snapshot: { version: context.version, source_fingerprint: context.source_fingerprint,
      age_group: context.age_group, languages: context.languages, primary_languages: context.primary_languages ?? [],
      common_interests: interests,
      previous_education: includePrevious ? context.previous_education : {},
      confirmed_diagnostic_summary: context.confirmed_diagnostic_summary ?? null,
      diagnostic_coverage: includeCoverage ? context.diagnostic_coverage : null,
      observation_gaps: includeCoverage ? context.observation_gaps ?? [] : [] },
  };
}

export const buildAnnualPlanContext = (context) => planningProjection(context, { includePrevious: true, includeCoverage: true });
export const buildProjectContext = (context) => planningProjection(context, { includePrevious: true });
export const buildUnitContext = (context) => planningProjection(context, { includePrevious: true });
export const buildActivityContext = (context) => planningProjection(context, { maxInterests: 3 });

export function buildDiagnosticContext(student) {
  if (!student) return null;
  return { student_context: { id: "current_student", age: student.age,
    family_context: Object.fromEntries(["language_context", "language_tags", "primary_language_tag", "other_language_text",
      "interests", "interest_tags", "other_interest_text", "autonomy_context",
      "adaptation_context", "communication_emotional_context", "social_context", "previous_education",
      "previous_education_status", "previous_education_type"]
      .filter((key) => student.family_context?.[key]).map((key) => [key, student.family_context[key]])),
    observations: student.observations ?? [], teacher_confirmed_findings: student.teacher_confirmed_findings ?? [] },
    provenance: student.provenance ?? [],
  };
}
