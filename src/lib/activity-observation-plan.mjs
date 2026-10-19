export const OBSERVATION_MOMENTS = ["opening", "development", "closure"];

export function validCriterionMoments(value) {
  return value === undefined || (Array.isArray(value) && value.length > 0 && value.length <= 3 &&
    new Set(value).size === value.length && value.every(item => OBSERVATION_MOMENTS.includes(item)));
}

export function explicitObservationMoments(text = "") {
  const labels = { inicio: "opening", desarrollo: "development", cierre: "closure" };
  const groups=[...String(text).matchAll(/(?:^|[\n.;]\s*)((?:(?:Inicio|Desarrollo|Cierre)\s*(?:(?:,|y|o|\/)\s*)?){1,3}):/gi)];
  return [...new Set(groups.flatMap(match=>[...match[1].matchAll(/Inicio|Desarrollo|Cierre/gi)].map(label=>labels[label[0].toLowerCase()])))];
}

export function criterionMoments(criterion = {}, fallback = "") {
  const own = criterion.observation_moments ?? criterion.details?.observation_moments;
  if (own && validCriterionMoments(own)) return own;
  const explicit = explicitObservationMoments(fallback);
  return explicit.length ? explicit : ["development"];
}

export function routeObservationCriteria(route = {}) {
  return [{ competency_id: route.criterion_competency_id ?? route.competency_id,
    criterion_text: route.evaluation_criterion ?? route.criterion_text, expected_evidence: route.expected_evidence,
    ...(route.official_performance_refs ? { official_performance_refs: route.official_performance_refs } : {}),
    ...(route.observation_moments ? { observation_moments: route.observation_moments } : {}),
    ...(route.observation_focus ? { observation_focus: route.observation_focus } : {}) }, ...(Array.isArray(route.additional_criteria) ? route.additional_criteria : [])];
}

export function activityObservationCriteria(details = {}) {
  return routeObservationCriteria({ ...details, criterion_competency_id: details.competency_id });
}
