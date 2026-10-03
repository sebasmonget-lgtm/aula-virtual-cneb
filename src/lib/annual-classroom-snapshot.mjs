import { annualJourneySafeText } from "./annual-journey-privacy.mjs";
import { interviewInterestOptions, interviewLanguageOptions, interviewCommunityOptions } from "./family-interview-contract.mjs";
import { createHash } from "node:crypto";

/** Literal evidence, anonymous subjects and explicit provenance. No keyword inference. */
export function buildAnnualClassroomSnapshot(sources, context, curriculum = []) {
  const subjects = new Map(sources.students.map((row, index) => [row.id, `child_${index + 1}`]));
  const safe = (value) => annualJourneySafeText(String(value ?? ""), sources.names ?? []);
  const facts = [];
  const key = (prefix, row) => `${prefix}_${createHash("sha256").update(row.id).digest("hex").slice(0, 12)}`;
  for (const row of sources.observations) facts.push({
    key: key("observation", row), kind: "observed", subject: subjects.get(row.student_id) ?? "unknown",
    scope: "individual", uncertainty: "literal_record_only", support_text: String(row.observation_text ?? ""),
    ai_support_text: safe(row.observation_text),
    origin: row.source_type === "guided_diagnostic_observation" || row.source_kind === "activity" ? "guided_experience" : "spontaneous_context",
    planned_opportunity: "unknown", realized_opportunity: "observed_context_only", participation_possible: "unknown",
    attendance: "unknown", confirmed_assessment: "unknown", interpretation: "pending_contextual_review",
    occurred_at: row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at ?? null,
    competency_id: row.competency_v4_id ?? null, competency_ids: row.competency_ids ?? (row.competency_v4_id ? [row.competency_v4_id] : []), source_refs: [{ type: row.source_type ?? "diagnostic_observation", id: row.id, ...(row.source_revision ? { revision: row.source_revision } : {}) }],
  });
  for (const row of sources.interviews) {
    const details = row.details ?? {};
    const tags = [
      ...(details.interest_tags ?? []).map((id) => interviewInterestOptions.find((x) => x.id === id)?.label),
      ...(details.community_tags ?? []).map((id) => interviewCommunityOptions.find((x) => x.id === id)?.label),
      ...(details.language_tags ?? []).map((id) => interviewLanguageOptions.find((x) => x.id === id)?.label),
    ].filter(Boolean);
    const text = ["language_context", "interests", "family_community_context", "family_community_enjoyed",
      "other_interest_text", "other_language_text", "other_community_text", "social_context", "home_activity_example",
      "communication_context", "participation_support_context", "emotional_support_context", "family_expectation",
      "autonomy_context", "communication_emotional_context", "adaptation_context", "daily_routine_context", "family_expectations", "previous_education"]
      .map((field) => details[field] ? `${field}: ${details[field]}` : "").filter(Boolean).join("\n");
    const structured = Object.fromEntries(["communication_tags", "emotional_support_tags", "social_play_tags",
      "home_activity_tags", "participation_support_tags", "home_language_uses", "primary_language_tag"]
      .filter((field) => details[field] !== undefined).map((field) => [field, details[field]]));
    facts.push({ key: key("family", row), kind: "family_report", subject: subjects.get(row.student_id) ?? "unknown",
      scope: "individual", uncertainty: "reported_not_observed", support_text: [text,
        Object.keys(structured).length ? JSON.stringify(structured) : ""].filter(Boolean).join("\n"),
      ai_support_text: safe([text, Object.keys(structured).length ? JSON.stringify(structured) : ""].filter(Boolean).join("\n")), explicit_tags: tags.filter((tag) => !["Otro", "Otra", "Otra lengua"].includes(tag)),
      occurred_at: row.teacher_confirmed_at instanceof Date ? row.teacher_confirmed_at.toISOString() : row.teacher_confirmed_at ?? null,
      competency_id: null, source_refs: [{ type: "family_interview", id: row.id, version: row.version }],
    });
  }
  if (context.group_context) facts.push({ key: "classroom_context", kind: "teacher_context", subject: "classroom",
    scope: "classroom", uncertainty: "teacher_reported", support_text: String(context.group_context), ai_support_text: safe(context.group_context),
    occurred_at: null, competency_id: null, source_refs: [{ type: "classroom_context", id: context.id }] });
  for (const field of ["strengths", "needs", "planning_priorities"]) if (sources.group?.details?.[field]) facts.push({
    key: `confirmed_group_${field}`, kind: "teacher_decision", scope: "teacher_defined", subject: "classroom",
    uncertainty: "confirmed_teacher_interpretation", support_text: String(sources.group.details[field]), ai_support_text: safe(sources.group.details[field]),
    occurred_at: sources.group.teacher_confirmed_at, competency_id: null,
    source_refs: [{ type: "diagnostic_group", id: sources.group.id, version: sources.group.version }],
  });
  for (const [index, priority] of (sources.prior?.details?.priorities ?? []).entries()) facts.push({
    key: `teacher_decision_${index + 1}`, kind: "teacher_decision", scope: "teacher_defined", subject: "classroom",
    uncertainty: "confirmed_teacher_decision_not_new_evidence", support_text: safe(`${priority.title}: ${priority.reason}`),
    occurred_at: sources.prior.teacher_confirmed_at, competency_id: null,
    source_refs: [{ type: "diagnostic_priority", id: sources.prior.id, version: sources.prior.version }],
  });
  return { version: 2, source_fingerprint: sources.fingerprint, student_count: sources.students.length, facts,
    contradictions: "Preserve literal conflicting accounts; do not resolve without teacher judgment.",
    curriculum_version: context.curriculum_version_id, languages: sources.interviews.flatMap((x) =>
      [...(x.details?.language_tags ?? []), safe(x.details?.other_language_text)].filter(Boolean)),
    resources: (context.available_resources ?? []).map(safe),
    competency_information: curriculum.map((card) => {
      const records = facts.filter((fact) => fact.kind === "observed" && (fact.competency_ids ?? [fact.competency_id]).includes(card.id));
      return { competency_id: card.id, recorded_performances: records.length,
        distinct_children: new Set(records.map((row) => row.subject).filter((x) => x !== "unknown")).size,
        information_status: records.length ? "records_available_not_a_group_judgment" : "unknown",
        planned_opportunity: "unknown", realized_opportunity: "unknown", participation_possible: "unknown",
        attendance: "unknown", confirmed_assessment: "unknown" };
    }), unknowns: ["La ausencia de registro no demuestra dificultad ni que una competencia no se trabajó.",
      "Las actuaciones individuales y los reportes familiares no describen automáticamente a todo el grupo."],
  };
}

/** Only explicit structured selections become topics. Free text remains literal evidence. */
export function explicitPlanningSignals(sources) {
  const collect = (field, options) => {
    const map = new Map();
    for (const row of sources.interviews) for (const tag of row.details?.[field] ?? []) {
      if (tag === "other") continue;
      const label = options.find((x) => x.id === tag)?.label;
      if (!label) continue;
      const item = map.get(label) ?? { label, source_refs: [], source_kinds: ["family_report"],
        subject_ids: [], scope: "individual_reports", uncertainty: "reported_not_observed", support_texts: [] };
      item.source_refs.push({ type: "family_interview", id: row.id });
      if (row.student_id && !item.subject_ids.includes(row.student_id)) item.subject_ids.push(row.student_id);
      item.support_texts.push(`Selección explícita de familia: ${label}`);
      item.distinct_children = item.subject_ids.length;
      map.set(label, item);
    }
    return [...map.values()];
  };
  return { interests: collect("interest_tags", interviewInterestOptions),
    opportunities: [...collect("community_tags", interviewCommunityOptions), ...collect("language_tags", interviewLanguageOptions)] };
}
