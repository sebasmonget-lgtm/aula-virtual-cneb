

export function validateExperienceContext(input, curriculum, today) {
  const items = input?.contextItems ?? [];
  const history = input?.historicalProjects ?? [];
  if (!Array.isArray(items) || items.length > 20 || !Array.isArray(history) || history.length > 20)
    throw new TypeError("Puedes registrar hasta veinte elementos de contexto y veinte proyectos anteriores.");
  const allowed = new Set(curriculum.map(card => card.id));
  const contextItems = items.map((item, index) => {
    if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 500)
      throw new TypeError("Revisa los elementos de contexto: cada uno admite hasta 500 caracteres.");
    return { id: `context_${index + 1}`, text: item.text.trim(), kind: "teacher_context",
      source_turn: Number.isInteger(item.source_turn) ? item.source_turn : null, confirmed_by_teacher: true };
  });
  if (contextItems.map(item=>item.text).join("\n").length > 2000)
    throw new TypeError("Resume el contexto aprobado en menos de 2000 caracteres.");
  const historicalProjects = history.map(item => {
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 180 ||
      !Array.isArray(item.competency_ids ?? []) || (item.competency_ids ?? []).some(id=>!allowed.has(id)) ||
      (item.period != null && ![1,2,3,4].includes(item.period)))
      throw new TypeError("Cada proyecto anterior necesita un nombre. Sus competencias y período son opcionales.");
    return { declaration_id: globalThis.crypto.randomUUID(), title: item.title.trim(), competency_ids: [...new Set(item.competency_ids ?? [])],
      period: item.period ?? null, kind: "teacher_declared_history", declared_on: today };
  });
  return { version: 1, starts_on: today, context_items: contextItems, historical_projects: historicalProjects };
}

/** Keep the full calendar accounting; only the remaining dates belong to new proposals. */
export function applyPlanningHorizon(schedule, context) {
  const startsOn = context.starts_on;
  const projects = schedule.projects.map(slot => {
    const dates = slot.instructional_dates.filter(date=>date>=startsOn);
    if (!dates.length) return { ...slot, proposal_id: null, occupancy: "past_unrecorded" };
    return { ...slot, occupancy: "planned", ...(slot.starts_on < startsOn ? {
      calendar_starts_on: slot.starts_on, starts_on: dates[0],
      historical_dates: slot.instructional_dates.filter(date=>date<startsOn), instructional_dates: dates,
    } : {}) };
  });
  return { ...schedule, projects, assignments: horizonAssignments(schedule.initial_stage, projects) };
}

export function horizonAssignments(initial, slots) {
  return [...initial.instructional_dates.map(date=>({date,owner:"initial_stage"})),
    ...slots.flatMap(slot=>[...(slot.historical_dates ?? []).map(date=>({date,owner:slot.slot_id})),
      ...slot.instructional_dates.map(date=>({date,owner:slot.proposal_id ?? slot.slot_id}))])];
}

export function annualFutureGaps(plan, curriculum = plan.curriculum_reference ?? []) {
  const covered = new Set([...(plan.everyday_opportunities ?? []),
    ...(plan.proposed_experiences ?? []).flatMap(row=>row.opportunities ?? [])].map(o=>o.competency_id));
  return curriculum.filter(card=>!covered.has(card.id)).map(card=>card.id);
}
