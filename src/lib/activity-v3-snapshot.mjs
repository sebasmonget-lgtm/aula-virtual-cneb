import { activityObservationCriteria } from "./activity-observation-plan.mjs";
import { ACTIVITY_CONTRACT_V3, activityV3, projectMasterV3, validateActivityV3 } from "./planning-contract-v3.mjs";
import { annualCalendarDay } from "./annual-plan-schedule.mjs";
import { newAyniFeatureEnabled } from "./new-ayni-feature-flag.mjs";

export const inheritedActivityEnabled = () => newAyniFeatureEnabled(process.env.AYNI_ACTIVITY_INHERITED);

export function activityPreparationV3(details, materials) {
  return { materials, ...(details.activity_contract?.contract_version === ACTIVITY_CONTRACT_V3 ? {
    steps: [details.meaningful_situation, details.child_actions, details.closure_or_continuity] } : {}) };
}

/** Source references only. Pedagogical texts stay in the existing, single editable details. */
export function stampActivityV3(activity, details, project) {
  if (activity.status !== "draft") throw new Error("No se modifica una actividad confirmada.");
  const master = projectMasterV3(project);
  if (!master || master.compatibility_adapter || !["active", "archived"].includes(project.status))
    throw new Error("La actividad V3 requiere la versión exacta de un proyecto V3 confirmado.");
  const blueprint = master.activity_map.find(row => row.blueprint_id === details.route_item_id);
  if (!blueprint) throw new Error("El blueprint no pertenece a esta versión de proyecto.");
  const choices = activityObservationCriteria(details);
  const planned = activityObservationCriteria(project.details?.activity_route?.find(row => row.id === details.route_item_id) ?? {});
  const seen = new Set(), refs = [], overrides = [...(details.teacher_overrides ?? [])];
  for (const choice of choices) {
    const sourceChoice = planned.find(row => row.competency_id === choice.competency_id);
    if (sourceChoice?.official_performance_refs !== undefined &&
        JSON.stringify(choice.official_performance_refs) !== JSON.stringify(sourceChoice.official_performance_refs))
      throw new Error("La actividad conserva los desempeños del criterio confirmado en el Plan Maestro.");
    if (!master.competency_ids.includes(choice.competency_id) || seen.has(choice.competency_id) ||
      !String(choice.criterion_text ?? "").trim() || !String(choice.expected_evidence ?? "").trim())
      throw new Error("Cada competencia elegida necesita su propio criterio y evidencia esperada.");
    seen.add(choice.competency_id);
    const source = master.criteria.find(item => item.competency_id === choice.competency_id);
    if (!source) throw new Error("La competencia no tiene referente en este proyecto.");
    refs.push(source.criterion_id);
    if (!blueprint.criterion_refs.includes(source.criterion_id) && !overrides.some(item =>
      item.field === "criteria" && item.to?.criterion_ref === source.criterion_id))
      overrides.push({ field: "criteria", from: blueprint.criterion_refs, to: {
        criterion_ref: source.criterion_id, competency_id: choice.competency_id }, source: "teacher_review" });
  }
  const saved = { ...details, teacher_overrides: overrides,
    activity_contract: { contract_version: ACTIVITY_CONTRACT_V3, project_id: project.id,
      project_version: Number(project.version ?? 1), project_fingerprint: master.source_fingerprint,
      kb_version: master.kb_version, criterion_refs: refs } };
  validateActivityV3(activityV3({ ...activity, occurs_on: annualCalendarDay(activity.occurs_on), details: saved }, project), master);
  return saved;
}

export function activityCriteriaV3(details) {
  if (details.activity_contract?.contract_version !== ACTIVITY_CONTRACT_V3) return null;
  return activityObservationCriteria(details).map((choice, index) => ({
    ...choice, source_criterion_id: details.activity_contract.criterion_refs[index],
    observation_focus: choice.observation_focus ?? [choice.criterion_text], evidence_scope: "individual",
    teacher_caution: "Registrar actuaciones observadas, sin inferir un nivel." }));
}
