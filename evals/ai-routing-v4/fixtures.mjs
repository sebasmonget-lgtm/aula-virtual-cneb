import { buildAnnualPlanGenerationInput } from "../../src/lib/ai-annual-plan-ui-service.mjs";
import { buildLearningExperienceGenerationInput } from "../../src/lib/ai-learning-experience-ui-service.mjs";
import { buildTeacherActivityGenerationInput } from "../../src/lib/ai-activity-ui-service.mjs";
import { buildCriterionEvidenceInput } from "../../src/lib/ai-criterion-evidence-ui-service.mjs";
import { buildAssessmentInput } from "../../src/lib/assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput } from "../../src/lib/descriptive-conclusion-v4-service.mjs";
import { buildFamilyReportInput } from "../../src/lib/family-report-v4-service.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026 } from "../../src/lib/annual-plan-calendar.mjs";
import { loadAnnualPlanSkill } from "../../src/lib/annual-plan-skill.mjs";
import { loadLearningExperienceSkill } from "../../src/lib/learning-experience-skill.mjs";
import { loadActivitySkill } from "../../src/lib/activity-skill.mjs";

const classroom = Object.freeze({
  id: "eval-classroom", age: 5, section: "A", group_context: "El grupo conversa durante el juego y muestra interés por las plantas del patio.",
  school_context: "Institución ficticia de evaluación", diagnostic_summary: "El grupo necesita más oportunidades para explicar lo que observa.",
  available_resources: ["papel", "semillas", "recipientes reutilizados"], religion_applicable: false,
  calendar: { school_year: 2026, starts_on: "2026-03-16", ends_on: "2026-12-18",
    blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() },
});

const parent = Object.freeze({ id: "eval-project", type: "project", title: "Nuestro pequeño jardín", purpose: "Observar cambios en las plantas.",
  details: { trigger_or_interest: "El grupo encontró brotes en el patio.", primary_competency_ids: ["CYT_INDAGA"],
    possible_secondary_competency_ids: ["COM_ORAL"], possible_pathways: [], proposed_situations: [], spaces_and_materials: ["patio", "semillas"],
    evidence_opportunities: ["Explicaciones sobre cambios observados"], family_or_community_links: [], adjustment_points: [], flexibility_notes: "Ajustar según las preguntas del grupo." } });

const activity = Object.freeze({ id: "eval-activity", title: "¿Qué cambió en nuestro brote?", purpose: "Comparar cambios observables.",
  details: { competency_id: "CYT_INDAGA", meaningful_situation: "El grupo observa que algunos brotes crecieron de manera diferente.",
    child_actions: "Observan, comparan, preguntan y explican.", mediation: "La docente recupera las ideas y pregunta qué cambió.",
    evidence_opportunities: "Explicaciones y registros sobre cambios observados.", closure_or_continuity: "Acordar qué volverán a observar." } });

const evidenceRows = Object.freeze([
  { observed_at: "2026-05-05T10:00:00Z", activity_title: "Observamos brotes", criterion_text: "Explica un cambio que observa.", observation_status: "with_support", observation_text: "Comparó dos brotes y explicó que uno tenía más hojas." },
  { observed_at: "2026-05-12T10:00:00Z", activity_title: "Volvemos a observar", criterion_text: "Explica un cambio que observa.", observation_status: "observed_without_judgment", observation_text: "Señaló una hoja nueva y contó cómo la encontró." },
]);

const assessment = Object.freeze({ details: { competency_id: "CYT_INDAGA", information_status: "sufficient",
  evidence_overview: "En dos situaciones observó cambios en brotes y comunicó lo encontrado.",
  observable_patterns: ["Compara cambios visibles."], strengths_and_advances: ["Explica lo que observa."],
  support_needs: ["Necesita preguntas abiertas para ampliar algunas explicaciones."], next_opportunities: ["Volver a observar en otra fecha."],
  teacher_questions: [], insufficiency_reason: null, caution: "La docente debe revisar la propuesta." } });

export async function modelEvalFixtures() {
  const annual = buildAnnualPlanGenerationInput({ classroom, request: { teacherRequest: "Considerar el patio sin convertir todo el año en un solo tema." } });
  const project = buildLearningExperienceGenerationInput({ classroom, request: { workflow: "project", project_trigger_or_interest: "El grupo encontró brotes en el patio.", competencyIds: ["CYT_INDAGA", "COM_ORAL"] } });
  const unit = buildLearningExperienceGenerationInput({ classroom, request: { workflow: "unit", learning_need_or_context: "El grupo necesita ampliar sus explicaciones sobre cambios observables.", competencyIds: ["CYT_INDAGA", "COM_ORAL"] } });
  const activityInput = buildTeacherActivityGenerationInput({ classroom, learningExperience: parent,
    request: { activityPurpose: "Comparar cambios observables en los brotes.", competencyId: "CYT_INDAGA", context: "Hoy volverán a observar los brotes." } });
  const criterion = buildCriterionEvidenceInput({ classroom, activity, parent });
  const assessmentInput = buildAssessmentInput({ age: 5, competencyId: "CYT_INDAGA", evidenceHistory: evidenceRows });
  const conclusion = buildDescriptiveConclusionInput({ age: 5, competencyId: "CYT_INDAGA", assessment, evidenceRows });
  const family = buildFamilyReportInput({ age: 5, competencyIds: ["CYT_INDAGA"], knownNames: [], conclusions: [{
    competency_v4_id: "CYT_INDAGA", details: { competency_id: "CYT_INDAGA", information_status: "sufficient",
      conclusion_text: "En las situaciones observadas comparó cambios en brotes y comunicó algunos hallazgos.",
      progress_examples: ["Explicó que un brote tenía más hojas."], support_or_conditions: ["Las preguntas abiertas ayudaron a ampliar su explicación."],
      next_steps: ["Observar cambios en otra situación."], insufficiency_reason: null, caution: "Comunicar con prudencia." } }] });
  return [
    { id: "annual-plan-5y-plant-interest", workflow: "annual_plan", input: { ...annual, annual_stage: "master" },
      skillInstructions: await loadAnnualPlanSkill(), allowedCompetencyIds: null, expectedGroundingTerms: ["patio", "grupo"] },
    { id: "project-5y-emergent-plants", workflow: "project", input: project,
      skillInstructions: await loadLearningExperienceSkill(), allowedCompetencyIds: ["CYT_INDAGA", "COM_ORAL"], expectedGroundingTerms: ["brotes"] },
    { id: "unit-5y-explain-changes", workflow: "unit", input: unit,
      skillInstructions: await loadLearningExperienceSkill(), allowedCompetencyIds: ["CYT_INDAGA", "COM_ORAL"], expectedGroundingTerms: ["cambios"] },
    { id: "activity-5y-compare-sprouts", workflow: "activity", input: activityInput,
      skillInstructions: await loadActivitySkill(), allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["brotes", "cambios"] },
    { id: "criterion-5y-inquiry", workflow: "criterion_and_evidence", input: criterion,
      allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["cambio"] },
    { id: "assessment-5y-two-observations", workflow: "assessment", input: assessmentInput,
      allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["brotes", "observ"] },
    { id: "conclusion-5y-confirmed-assessment", workflow: "descriptive_conclusion", input: conclusion,
      allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["cambio", "observ"] },
    { id: "family-report-5y-confirmed-conclusion", workflow: "family_report", input: family,
      allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["cambio", "observ"] },
  ];
}
