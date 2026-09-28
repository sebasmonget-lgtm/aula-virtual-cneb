export function teacherTodayActions({ pendingObservations = 0, nextActivity = null, periodReview = null } = {}) {
  const count = Math.max(0, Number(pendingObservations) || 0);
  const actions = [];
  if (count) actions.push({ id: "review_observations", destination: "Aula", label: `${count} ${count === 1 ? "observación" : "observaciones"} por revisar`, priority: 1 });
  if (periodReview?.ready && !periodReview.closed)
    actions.push({ id: "review_period", destination: "Aula", label: "Revisar cierre del período", priority: 2 });
  if (nextActivity) actions.push({ id: "prepare_activity", destination: "Planificar",
    label: "Preparar próxima actividad", date: nextActivity.date, title: nextActivity.title, priority: 3 });
  return actions.sort((a, b) => a.priority - b.priority);
}
