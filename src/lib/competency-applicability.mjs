/** A cycle competency can exist without a published performance for a particular age. */
export function competencyApplicability(card, age, { castellanoL2Applicable = false, religionApplicable = false } = {}) {
  const ageReference = card?.ages?.[String(age)];
  const belongsToCycle = Boolean(card?.id && ageReference && [3, 4, 5].includes(Number(age)));
  const specialApplicable = card?.id === "CAST_L2_ORAL" ? castellanoL2Applicable
    : card?.id === "PS_RELIGION" ? religionApplicable : true;
  const hasAgePerformance = ageReference?.status === "specified";
  return {
    competency_id: card?.id ?? null,
    belongs_to_cycle: belongsToCycle,
    special_applicable: specialApplicable,
    has_age_performance: hasAgePerformance,
    age_performance_status: ageReference?.status ?? "unavailable",
    planning_available: belongsToCycle && specialApplicable,
    reference_kind: hasAgePerformance ? "age_performance" : "cycle_standard_without_age_performance",
  };
}

export function applicableCompetencyCards(cards, age, conditions) {
  return cards.filter((card) => competencyApplicability(card, age, conditions).planning_available);
}
