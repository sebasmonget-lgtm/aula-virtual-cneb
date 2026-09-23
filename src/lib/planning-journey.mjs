async function getJson(fetcher, url) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error("No se pudo recuperar el avance de la planificación.");
  return response.json();
}

/** @typedef {"pending" | "draft" | "confirmed"} PlanningStatus */
/** @typedef {"annual" | "experiences" | "activities"} PlanningStep */

/** Resolve the teacher's next planning step from saved records, never from visited screens. */
export async function loadPlanningJourney(apiUrl, fetcher = fetch) {
  const [plans, experienceData] = await Promise.all([
    getJson(fetcher, `${apiUrl}/api/annual-plans/current`),
    getJson(fetcher, `${apiUrl}/api/learning-experiences`),
  ]);
  const plan = plans.active ?? null;
  const annual = plans.draft ? "draft" : plan ? "confirmed" : "pending";
  const experiences = (experienceData.experiences ?? []).filter((item) =>
    (item.type === "project" || item.type === "unit") &&
    item.details && typeof item.details.starting_point === "string" &&
    (item.annual_plan_id === plan?.id || item.origin === "emergent"),
  );
  const experience = experiences.some((item) => item.status === "draft") ? "draft" :
    experiences.some((item) => item.status === "active") ? "confirmed" : "pending";
  const active = experiences.filter((item) => item.status === "active");
  const activityGroups = await Promise.all(active.map((item) =>
    getJson(fetcher, `${apiUrl}/api/activities?experienceId=${encodeURIComponent(item.id)}`),
  ));
  const activities = activityGroups.flatMap((group) => group.activities ?? []);
  const activity = activities.some((item) => item.status === "draft") ? "draft" :
    activities.some((item) => item.status === "active") ? "confirmed" : "pending";
  /** @type {PlanningStep} */
  const recommended = annual !== "confirmed" ? "annual" : experience !== "confirmed" ? "experiences" : "activities";
  return { annual, experience, activity, recommended, hasConfirmedAnnual: Boolean(plan), hasConfirmedExperience: active.length > 0, hasConfirmedActivity: activities.some((item) => item.status === "active") };
}
