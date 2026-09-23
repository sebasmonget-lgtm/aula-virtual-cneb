async function getJson(fetcher, url) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error("No se pudo recuperar el avance de la planificación.");
  return response.json();
}

/** @typedef {"pending" | "draft" | "confirmed"} PlanningStatus */
/** @typedef {"diagnostic" | "annual" | "experiences" | "activities"} PlanningStep */

export function diagnosticProgress(workspace) {
  if (workspace.reviewed === true) return "reviewed";
  return (workspace.observation_count ?? 0) > 0 ? "in_progress" : "pending";
}

export async function loadStartingGuidance(apiUrl, fetcher = fetch) {
  const [plans, diagnostic] = await Promise.all([
    getJson(fetcher, `${apiUrl}/api/annual-plans/current`),
    getJson(fetcher, `${apiUrl}/api/diagnostics/progress`),
  ]);
  const hasAnnual = Boolean(plans.active || plans.draft);
  const diagnosticStatus = diagnosticProgress(diagnostic);
  return {
    plans,
    diagnostic: diagnosticStatus,
    studentCount: diagnostic.student_count ?? 0,
    startingSection: !hasAnnual && diagnosticStatus !== "reviewed" ? (diagnostic.student_count ? "Evaluar" : "Niños") : "Hoy",
  };
}

/** Resolve the teacher's next planning step from saved records, never from visited screens. */
export async function loadPlanningJourney(apiUrl, fetcher = fetch) {
  const [starting, experienceData] = await Promise.all([
    loadStartingGuidance(apiUrl, fetcher),
    getJson(fetcher, `${apiUrl}/api/learning-experiences`),
  ]);
  const { plans, diagnostic, studentCount } = starting;
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
  const recommended = !plans.active && !plans.draft && diagnostic !== "reviewed" ? "diagnostic" : annual !== "confirmed" ? "annual" : experience !== "confirmed" ? "experiences" : "activities";
  return { diagnostic, studentCount, annual, experience, activity, recommended, hasConfirmedAnnual: Boolean(plan), hasConfirmedExperience: active.length > 0, hasConfirmedActivity: activities.some((item) => item.status === "active") };
}
