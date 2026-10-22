import { guidedObservationActive } from "./guided-observation-state.mjs";
import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { safeFamilyContext } from "./diagnostic-sources-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { buildDiagnosticContext } from "./context-policy-v4.mjs";
import { isDiagnosticScaffoldSummary } from "./diagnostic-review-copy.mjs";
import { isCurrentDiagnosticStudentReview } from "./diagnostic-assessment-v4.mjs";
import { versionTransaction } from "./version-integrity.mjs";
import { listOrdinaryObservations } from './ordinary-observation-service.mjs';
import { loadConfirmedOrdinaryEvaluationRows } from './ordinary-evaluation-adapter.mjs';
import { mergeStudentOrdinaryProfile } from './student-ordinary-profile.mjs';

export function resolveSourceUpdatedAt(...timestamps) {
  const valid = timestamps.flat().filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.valueOf()));
  return valid.length ? new Date(Math.max(...valid.map((value) => value.valueOf()))).toISOString() : new Date(0).toISOString();
}

// One statement shares a consistent snapshot and avoids eleven database round trips.
async function loadContextSources(db, studentId) {
  const row = (await db.query(`select (select to_jsonb(q) from (
    select s.id, coalesce(s.preferred_name, s.first_name) as name, s.first_name, s.last_name,
           c.id as classroom_id,c.teacher_id,c.section, ag.age_years, sy.year as school_year
      from students s join classrooms c on c.id = s.classroom_id
      join age_grades ag on ag.id = c.age_grade_id join school_years sy on sy.id = c.school_year_id
     where s.id = $1
  ) q) as "student",
coalesce((select jsonb_agg(to_jsonb(q)) from (
    select coalesce(ac.competency_v4_id, ac.competency_id::text) as raw_competency_id,
      case when ac.competency_v4_id is null then concat('legacy:', ac.competency_id::text) else concat('v4:', ac.competency_v4_id) end as competency_key,
      ac.competency_id, ac.competency_v4_id, co.official_text as competency_text,
      count(e.id)::int as evidence_count,
      count(e.id) filter (where e.observation_status = 'demonstrated')::int as demonstrated,
      count(e.id) filter (where e.observation_status = 'with_support')::int as with_support,
      count(e.id) filter (where e.observation_status = 'not_yet_demonstrated')::int as not_yet_demonstrated,
      count(e.id) filter (where e.observation_status = 'insufficient_information')::int as insufficient_information,
      max(e.observed_at) as last_observed_at
    from activity_criteria ac
    left join competencies co on ac.competency_id = co.id
    left join evidences e on e.criterion_id = ac.id and e.student_id = $1
    group by ac.competency_id, ac.competency_v4_id, co.official_text
    having count(e.id) > 0
    order by max(e.observed_at) desc nulls last
  ) q),'[]'::jsonb) as "competencies",
coalesce((select jsonb_agg(to_jsonb(q)) from (
    select e.id, e.observed_at, e.observation_status, e.observation_text,
           jsonb_array_length(coalesce(to_jsonb(e)->'student_reassignment_history','[]'::jsonb)) as assignment_revision,
           a.title as activity_title, ac.criterion_text, ac.competency_id, ac.competency_v4_id,
           case when ac.competency_v4_id is null then concat('legacy:', ac.competency_id::text) else concat('v4:', ac.competency_v4_id) end as competency_key,
           (e.media_path is not null) as media_available
      from evidences e join activities a on a.id = e.activity_id
      join activity_criteria ac on ac.id = e.criterion_id
     where e.student_id = $1 order by e.observed_at desc limit 12
  ) q),'[]'::jsonb) as "recentEvidence",
coalesce((select jsonb_agg(to_jsonb(q)) from (select id,competency_v4_id,period_start,period_end,details,teacher_confirmed_at from competency_assessments where student_id=$1 and status='active' and teacher_confirmed_at is not null order by teacher_confirmed_at desc) q),'[]'::jsonb) as "assessments",
coalesce((select jsonb_agg(to_jsonb(q)) from (select id,competency_v4_id,period_start,period_end,details,teacher_confirmed_at from competency_descriptive_conclusions where student_id=$1 and status='active' and teacher_confirmed_at is not null order by teacher_confirmed_at desc) q),'[]'::jsonb) as "conclusions",
coalesce((select jsonb_agg(to_jsonb(q)) from (
    select de.competency_id, de.teacher_interpretation, de.teacher_confirmed, de.updated_at
      from diagnostic_entries de where de.student_id = $1 order by de.updated_at desc
  ) q),'[]'::jsonb) as "diagnosis",
coalesce((select jsonb_agg(to_jsonb(q)) from (
    select id, experience_id, aspect_id, competency_v4_id, observation_status,
           observation_text, observed_at
      from diagnostic_experience_observations where ${guidedObservationActive('diagnostic_experience_observations')} and student_id = $1
     order by observed_at desc, id desc limit 30
  ) q),'[]'::jsonb) as "diagnosticObservations",
coalesce((select jsonb_agg(to_jsonb(q)) from (select id, context_label, observation_text,
      support_status, observed_at, classification_status, classification_source, competency_v4_id, competency_v4_ids
    from effective_diagnostic_spontaneous_observations where student_id=$1
    order by observed_at desc,id desc limit 30) q),'[]'::jsonb) as "spontaneousObservations",
(select to_jsonb(q) from (select id,version,details,teacher_confirmed_at from student_family_interviews
    where student_id=$1 and status='confirmed' order by version desc limit 1) q) as "interview",
coalesce((select jsonb_agg(to_jsonb(q)) from (select distinct on (competency_v4_id)
      id, competency_v4_id, version, details, teacher_confirmed_at
    from diagnostic_competency_reviews where student_id = $1 and status = 'confirmed'
    order by competency_v4_id, version desc) q),'[]'::jsonb) as "confirmedDiagnosticReviews",
(select to_jsonb(q) from (select id,classroom_id,version,details,source_snapshot,teacher_confirmed_at
    from diagnostic_student_reviews where student_id=$1 and status='confirmed'
    order by version desc limit 1) q) as "confirmedStudentReview"`, [studentId])).rows[0];
  // pg returns timestamp columns as Date; preserve that contract inside JSON aggregates.
  for (const value of Object.values(row)) for (const item of Array.isArray(value) ? value : value ? [value] : []) {
    for (const key of ["observed_at", "last_observed_at", "teacher_confirmed_at", "updated_at"])
      if (item[key]) item[key] = new Date(item[key]);
  }
  return row;
}

export async function buildStudentPedagogicalContext(db, studentId) {
  const sources = await loadContextSources(db, studentId);
  if (!sources.student) return null;
  const { classroom_id: classroomId, teacher_id: teacherId, ...student } = sources.student;

  const v4Names = new Map((await loadKnowledgeBaseV4()).competencyCards.map((card) => [card.id, card.official_name]));
  const ready = teacherId && classroomId && (await db.query("select to_regclass('ordinary_observation_attributions') is not null as ready")).rows[0]?.ready;
  const ordinary = ready ? await listOrdinaryObservations(db, teacherId, studentId) : [];
  const confirmed = ready ? await loadConfirmedOrdinaryEvaluationRows(db, { classroomId, studentId,
    period: { starts_on: '1900-01-01', ends_on: '9999-12-31' } }) : [];
  const { competencies, recentEvidence } = mergeStudentOrdinaryProfile(sources.competencies, sources.recentEvidence, ordinary, confirmed, v4Names);
  const assessments = sources.assessments;
  const conclusions = sources.conclusions;
  const safeConclusion = (row) => ({ id: row.id, period_start: row.period_start, period_end: row.period_end, information_status: row.details?.information_status, conclusion_text: row.details?.conclusion_text, support_or_conditions: row.details?.support_or_conditions ?? [], next_steps: row.details?.next_steps ?? [], teacher_confirmed_at: row.teacher_confirmed_at });
  const diagnosis = sources.diagnosis;
  const diagnosticObservations = sources.diagnosticObservations;
  const spontaneousObservations = sources.spontaneousObservations;
  const interview = sources.interview ?? undefined;
  const confirmedDiagnosticReviews = sources.confirmedDiagnosticReviews
    .filter((row) => !isDiagnosticScaffoldSummary(row.details?.summary_text));
  const confirmedStudentReview = sources.confirmedStudentReview ?? undefined;
  const studentReviewCurrent = confirmedStudentReview ? await isCurrentDiagnosticStudentReview(db,
    confirmedStudentReview.classroom_id, studentId, confirmedStudentReview.source_snapshot) : false;
  return {
    student,
    source_provenance: [
      ...(interview ? [{ source_type: "family_interview", source_id: interview.id, source_version: interview.version, confirmed_at: interview.teacher_confirmed_at }] : []),
      ...diagnosticObservations.map((item) => ({ source_type: "diagnostic_observation", source_id: item.id, observed_at: item.observed_at })),
      ...spontaneousObservations.map((item) => ({ source_type: "diagnostic_spontaneous_observation", source_id: item.id, observed_at: item.observed_at })),
      ...confirmedDiagnosticReviews.map((item) => ({ source_type: "diagnostic_initial", source_id: item.id, source_version: item.version, confirmed_at: item.teacher_confirmed_at })),
      ...(confirmedStudentReview ? [{ source_type: "diagnostic_student_review", source_id: confirmedStudentReview.id,
        source_version: confirmedStudentReview.version, confirmed_at: confirmedStudentReview.teacher_confirmed_at }] : []),
      ...recentEvidence.map((item) => ({ source_type: item.source_type ?? "formative_evidence", source_id: item.id, observed_at: item.observed_at })),
      ...assessments.map((item) => ({ source_type: "formative_assessment", source_id: item.id, confirmed_at: item.teacher_confirmed_at })),
      ...conclusions.map((item) => ({ source_type: "descriptive_conclusion", source_id: item.id, confirmed_at: item.teacher_confirmed_at })),
    ],
    diagnosis,
    family_interview_context: interview ? { version: interview.version, teacher_confirmed_at: interview.teacher_confirmed_at,
      ...safeFamilyContext(interview.details) } : null,
    diagnostic_observations: [...diagnosticObservations, ...spontaneousObservations.flatMap((item) =>
      (item.classification_status === "classified" && item.competency_v4_ids?.length ? item.competency_v4_ids : [item.competency_v4_id])
        .map((competencyId) => ({
          ...item, competency_v4_id: competencyId, experience_id: "spontaneous", aspect_id: item.context_label,
          observation_status: item.support_status === "yes" ? "with_support" : "observed_without_judgment",
        })))].sort((a,b) => new Date(b.observed_at) - new Date(a.observed_at) || b.id.localeCompare(a.id)).slice(0, 30).map((item) => ({
      ...item, competency_name: v4Names.get(item.competency_v4_id) ?? item.competency_v4_id,
    })),
    confirmed_diagnostic_reviews: confirmedDiagnosticReviews.map((item) => ({
      id: item.id, competency_v4_id: item.competency_v4_id,
      competency_name: v4Names.get(item.competency_v4_id) ?? item.competency_v4_id,
      version: item.version, information_status: item.details.information_status,
      summary_text: item.details.summary_text,
      next_observation: item.details.next_observation,
      teacher_confirmed_at: item.teacher_confirmed_at,
      source: "diagnostic",
    })),
    confirmed_student_diagnostic_review: confirmedStudentReview ? {
      id: confirmedStudentReview.id, version: confirmedStudentReview.version,
      information_status: confirmedStudentReview.details.information_status,
      comment_text: confirmedStudentReview.details.comment_text,
      teacher_confirmed_at: confirmedStudentReview.teacher_confirmed_at,
      is_current: studentReviewCurrent,
    } : null,
    competencies: competencies.map((competency) => ({
      ...competency, competency_text: competency.competency_text ?? v4Names.get(competency.competency_v4_id) ?? competency.competency_v4_id,
      observations: {
        demonstrated: competency.demonstrated, with_support: competency.with_support,
        not_yet_demonstrated: competency.not_yet_demonstrated,
        insufficient_information: competency.insufficient_information,
      },
      recent_evidence: recentEvidence.filter((evidence) => evidence.competency_key === competency.competency_key || evidence.competency_ids?.includes(competency.competency_v4_id)),
      teacher_confirmed_assessment: competency.competency_v4_id ? (()=>{const assessment=assessments.find(item=>item.competency_v4_id===competency.competency_v4_id);return assessment?{id:assessment.id,period_start:assessment.period_start,period_end:assessment.period_end,information_status:assessment.details?.information_status,evidence_overview:assessment.details?.evidence_overview,strengths_and_advances:assessment.details?.strengths_and_advances??[],support_needs:assessment.details?.support_needs??[],next_opportunities:assessment.details?.next_opportunities??[],teacher_confirmed_at:assessment.teacher_confirmed_at}:null})() : null,
      teacher_confirmed_conclusion: competency.competency_v4_id ? (() => { const conclusion = conclusions.find((item) => item.competency_v4_id === competency.competency_v4_id); return conclusion ? safeConclusion(conclusion) : null; })() : null,
    })),
    recent_relevant_observations: recentEvidence.map((evidence) => ({ ...evidence, competency_text: evidence.competency_v4_id ? v4Names.get(evidence.competency_v4_id) ?? evidence.competency_v4_id : evidence.competency_text })),
    confirmed_period_assessments: assessments.map((assessment)=>({id:assessment.id,competency_v4_id:assessment.competency_v4_id,period_start:assessment.period_start,period_end:assessment.period_end,information_status:assessment.details?.information_status,evidence_overview:assessment.details?.evidence_overview,strengths_and_advances:assessment.details?.strengths_and_advances??[],support_needs:assessment.details?.support_needs??[],next_opportunities:assessment.details?.next_opportunities??[],teacher_confirmed_at:assessment.teacher_confirmed_at})),
    confirmed_period_conclusions: conclusions.map((row) => ({ competency_v4_id: row.competency_v4_id, ...safeConclusion(row) })),
  };
}

export async function refreshStudentContextSnapshot(db, studentId) {
  // Serialize readers/writers of the derived snapshot: an older refresh cannot finish last.
  return versionTransaction(db, `student-context:${studentId}`, (tx) => refreshSnapshotWithin(tx, studentId));
}

async function refreshSnapshotWithin(db, studentId) {
  const context = await buildStudentPedagogicalContext(db, studentId);
  if (!context) return null;
  const sourceUpdatedAt = resolveSourceUpdatedAt(
    context.recent_relevant_observations.flatMap((item) => [item.observed_at,item.updated_at]),
    context.diagnosis.map((item) => item.updated_at),
    context.diagnostic_observations.map((item) => item.observed_at),
    context.family_interview_context?.teacher_confirmed_at,
    context.confirmed_student_diagnostic_review?.teacher_confirmed_at,
    context.confirmed_diagnostic_reviews.map((item) => item.teacher_confirmed_at),
    context.confirmed_period_assessments.map((item) => item.teacher_confirmed_at),
    context.confirmed_period_conclusions.map((item) => item.teacher_confirmed_at),
  );
  await db.query(`insert into student_context_snapshots
    (id, student_id, version, structured_payload, source_updated_at)
    values ($1, $2, 1, $3::jsonb, $4::timestamptz)
    on conflict (student_id, version) do update set structured_payload = excluded.structured_payload,
      generated_at = now(), source_updated_at = excluded.source_updated_at, summary_text = null`,
    [randomUUID(), studentId, JSON.stringify(context), sourceUpdatedAt]);
  return context;
}

/** Explicit allowlist for a future diagnostic AI workflow; never pass the stored snapshot wholesale. */
export async function buildSafeDiagnosticStudentContext(db, teacherId, studentId) {
  const allowed = (await db.query(`select s.id,s.classroom_id from students s join classrooms c on c.id=s.classroom_id
    where s.id=$1 and s.status='active' and c.teacher_id=$2 and c.status='active'`, [studentId,teacherId])).rows[0];
  if (!allowed) return null;
  const profile = await buildStudentPedagogicalContext(db, studentId);
  const knownNames = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [allowed.classroom_id])).rows
    .flatMap((row) => [row.first_name,row.last_name,row.preferred_name]).filter(Boolean);
  const clean = (value) => neutralizeAssessmentText(value, knownNames);
  const individual = { age: profile.student.age_years,
    family_context_source: profile.family_interview_context ? "antecedente_informado_por_la_familia" : null,
    family_context: Object.fromEntries(["language_context", "language_tags", "primary_language_tag", "other_language_text",
      "interests", "interest_tags", "other_interest_text", "previous_education_status", "previous_education_type", "autonomy_context",
      "autonomy_routines", "communication_emotional_context", "communication_context", "communication_tags",
      "emotional_support_tags", "social_context", "social_play_tags", "home_activity_tags",
      "identity_autonomy_context", "literacy_context", "mathematics_context", "exploration_context",
      "community_tags", "participation_support_tags", "adaptation_context", "previous_education"]
      .filter((key) => profile.family_interview_context?.[key])
      .map((key) => [key, clean(profile.family_interview_context[key])])),
    observations: profile.diagnostic_observations.filter((item) => item.competency_v4_id && item.observation_text)
      .slice(0,12).map((item) => ({ competency_id: item.competency_v4_id,
        date: new Date(item.observed_at).toISOString().slice(0,10),
        observation_note: clean(item.observation_text) })),
    teacher_confirmed_findings: profile.confirmed_diagnostic_reviews.map((item) => ({
      competency_id: item.competency_v4_id, information_status: item.information_status,
      summary_text: clean(item.summary_text), next_observation: clean(item.next_observation),
    })),
  };
  return { ...buildDiagnosticContext(individual).student_context,
    family_context_source: individual.family_context_source,
    teacher_confirmed_student_comment: profile.confirmed_student_diagnostic_review?.is_current ? {
      information_status: profile.confirmed_student_diagnostic_review.information_status,
      comment_text: clean(profile.confirmed_student_diagnostic_review.comment_text),
    } : null };
}
