const dateLabel = (value) => {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
};

/** Read-only document view. It changes labels only; the saved proposal remains canonical. */
export function buildAnnualPlanPresentation(proposal, documentContext = {}, competencyOptions = []) {
  const names = new Map(competencyOptions.map((item) => [item.id, item.name]));
  const nameFor = (id) => names.get(id) ?? id;
  const [contextForTeacher, technicalContext] = String(proposal.general_context_summary).split("Trazabilidad interna:");
  const templatePlan = proposal.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT;
  const legacyTemplate = proposal.plan_format === ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT;
  let flexible = null;
  let calendarWarning = null;
  if (templatePlan) {
    try { flexible = buildFlexibleAnnualSchedule(documentContext.calendar, proposal.proposed_experiences); }
    catch (error) { calendarWarning = error?.message ?? "Revisa las fechas de los proyectos."; }
  }
  const schedule = flexible?.projects ?? (legacyTemplate ? buildAnnualProjectSchedule({
    school_year: Number(proposal.school_year), starts_on: documentContext.starts_on, ends_on: documentContext.ends_on,
  }) : []);
  return {
    templatePlan,
    calendarWarning,
    initialStage: flexible ? { ...flexible.initial_stage, startsOn: dateLabel(flexible.initial_stage.starts_on),
      endsOn: dateLabel(flexible.initial_stage.ends_on) } : null,
    calendarBlocks: flexible?.blocks ?? [],
    organizationCriteria: proposal.organization_criteria ?? [],
    transversalApproaches: proposal.transversal_approaches ?? [],
    header: {
      institution: documentContext.institution_name || null,
      institutionCode: documentContext.institution_code || null,
      district: documentContext.district || null,
      ugel: documentContext.ugel || null,
      teacher: documentContext.teacher_name || null,
      classroom: documentContext.classroom_section || null,
      age: documentContext.age ?? null,
      cycle: [3, 4, 5].includes(Number(documentContext.age)) ? "II" : null,
      studentCount: documentContext.student_count ?? null,
      year: proposal.school_year,
      dates: [dateLabel(flexible?.blocks.filter((block) => block.type === "instructional")[0]?.start_date ?? documentContext.starts_on),
        dateLabel(flexible?.blocks.filter((block) => block.type === "instructional").at(-1)?.end_date ?? documentContext.ends_on)].filter(Boolean),
    },
    title: proposal.title,
    context: contextForTeacher.trim(),
    technicalContext: technicalContext?.trim() || null,
    diagnostic: {
      strengths: documentContext.diagnostic_group?.strengths || null,
      needs: documentContext.diagnostic_group?.needs || null,
      interests: documentContext.group_interests ?? [],
    },
    priorities: proposal.planning_priorities,
    annualPurposes: proposal.annual_purposes ?? [],
    competencyOverview: proposal.competency_overview,
    competencyMap: [...new Set(proposal.proposed_experiences.flatMap((item) => [...item.primary_competency_ids, ...item.possible_secondary_competency_ids]))]
      .map((id) => ({ id, name: nameFor(id), opportunities: proposal.proposed_experiences
        .filter((item) => [...item.primary_competency_ids, ...item.possible_secondary_competency_ids].includes(id))
        .map((item) => `${item.period}: ${item.title}`) })),
    annualCompetencyMap: buildAnnualCompetencyMap(proposal, competencyOptions,
      documentContext.diagnostic_group?.competency_priorities ?? [], documentContext.other_opportunities ?? []),
    experiences: proposal.proposed_experiences.map((item, index) => ({
      ...item,
      number: index + 1,
      ...(schedule[index] ? { startsOn: dateLabel(schedule[index].starts_on), endsOn: dateLabel(schedule[index].ends_on),
        ...(templatePlan ? { durationWeeks: schedule[index].duration_weeks } : { durationDays: schedule[index].duration_days }) } : {}),
      typeLabel: { project: "Proyecto", unit: "Unidad", workshop: "Taller" }[item.experience_type] ?? item.experience_type,
      primaryCompetencies: item.primary_competency_ids.map(nameFor),
      secondaryCompetencies: item.possible_secondary_competency_ids.map(nameFor),
    })),
    checkpoints: proposal.review_checkpoints,
    flexibility: proposal.flexibility_notes,
    teachingStrategies: proposal.teaching_strategies ?? [],
    assessmentFollowup: proposal.assessment_followup ?? [],
    familyCollaboration: proposal.family_collaboration ?? [],
    inclusiveSupports: proposal.inclusive_supports ?? [],
  };
}
import { buildAnnualProjectSchedule } from "./annual-plan-schedule.mjs";
import { buildFlexibleAnnualSchedule } from "./annual-plan-calendar.mjs";
import { ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT, ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { buildAnnualCompetencyMap } from "./annual-competency-map.mjs";
