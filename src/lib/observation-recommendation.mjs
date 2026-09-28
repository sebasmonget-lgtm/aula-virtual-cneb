/** Public recommendation states contain no provider errors or observation text. */
export function observationRecommendationState(record) {
  if (record.classification_source === "teacher")
    return record.competency_v4_ids?.length ? "teacher_confirmed" : "teacher_unclassified";
  if (record.classification_status === "pending") return "pending";
  if (record.classification_reason === "privacy_blocked") return "privacy_blocked";
  if (record.classification_reason === "missing_text") return "missing_text";
  if (record.suggested_competency_v4_ids?.length) return "suggested";
  if (record.classification_source === "jev" || record.classification_source === "openai")
    return "insufficient_information";
  return "unavailable";
}

/** Only applicable IDs may be presented or selected; optional candidates stay unselected. */
export function buildObservationRecommendation(record, competencies) {
  const byId = new Map(competencies.map((card) => [card.id, card]));
  const cards = (ids) => [...new Set(ids ?? [])].map((id) => byId.get(id)).filter(Boolean);
  const suggested = cards(record.suggested_competency_v4_ids);
  const confirmed = record.classification_source === "teacher" ? cards(record.competency_v4_ids) : [];
  const state = record.recommendation_state ?? observationRecommendationState(record);
  return { state, primary: suggested[0] ?? null, additional: suggested.slice(1), confirmed,
    initialSelection: record.classification_source === "teacher" ? confirmed.map((card) => card.id)
      : suggested.slice(0, 1).map((card) => card.id) };
}

export function observationRecommendationMessage(state) {
  const messages = {
    pending: "Ayni está preparando la recomendación…",
    suggested: "Ayni recomienda esta competencia.",
    privacy_blocked: "Ayni no puede recomendar automáticamente para esta nota. Puedes elegir una competencia.",
    missing_text: "Añade una observación escrita o dictada para recibir una recomendación.",
    insufficient_information: "Ayni necesita más detalle de lo que hizo o dijo para recomendar una competencia.",
    unavailable: "Ayni no pudo preparar la recomendación. Puedes reintentar o elegir una competencia.",
    teacher_confirmed: "Competencias confirmadas por ti.",
    teacher_unclassified: "Has dejado esta observación sin competencia.",
  };
  return messages[state] ?? messages.unavailable;
}
