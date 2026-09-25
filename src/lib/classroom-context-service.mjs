import { createHash } from "node:crypto";
import { interviewLanguageOptions, interviewInterestOptions } from "./family-interview-contract.mjs";
import { normalizeFamilyInterviewDetails } from "./diagnostic-sources-v4.mjs";
import { diagnosticPlanningSummary, loadDiagnosticAssessmentWorkspace } from "./diagnostic-assessment-v4.mjs";

export class ClassroomContextError extends Error {
  constructor(message) { super(message); this.name = "ClassroomContextError"; this.reason = "classroom_not_owned"; }
}

const countTags = (rows, field, options) => options.map(({ id, label }) => ({ key: id, label,
  count: rows.filter((row) => (row.details[field] ?? []).includes(id)).length }))
  .filter((item) => item.count > 0);
const countChoice = (rows, field, options) => options.map(({ id, label }) => ({ key: id, label,
  count: rows.filter((row) => row.details[field] === id).length })).filter((item) => item.count > 0);
const visiblePattern = (count, total) => total >= 5 && count >= 3 && (count === total || total - count >= 2);
const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Current projection, derived after ownership filtering; no copied source table. */
export async function getCurrentClassroomContext(db, teacherId, classroomId = null) {
  const classroom = (await db.query(`select c.id,c.section,ag.age_years
    from classrooms c join age_grades ag on ag.id=c.age_grade_id
    where c.teacher_id=$1 and c.status='active' and ($2::uuid is null or c.id=$2::uuid)
    limit 1`, [teacherId, classroomId])).rows[0];
  if (!classroom) throw new ClassroomContextError("El aula no pertenece a la docente o no está activa.");
  const roster = (await db.query(`select id,first_name,last_name,preferred_name,status
    from students where classroom_id=$1 order by id`, [classroom.id])).rows;
  const students = roster.filter((student) => student.status === "active");
  const interviews = (await db.query(`select distinct on (i.student_id) i.id,i.student_id,i.version,i.details,i.teacher_confirmed_at
    from student_family_interviews i join students s on s.id=i.student_id and s.classroom_id=i.classroom_id
    where i.classroom_id=$1 and s.status='active' and i.status='confirmed'
    order by i.student_id,i.version desc`, [classroom.id])).rows
    .map((row) => ({ ...row, details: normalizeFamilyInterviewDetails(row.details) }));
  const group = (await db.query(`select id,version,details,teacher_confirmed_at
    from diagnostic_group_reviews where classroom_id=$1 and status='confirmed'
    order by version desc limit 1`, [classroom.id])).rows[0] ?? null;
  const diagnosticWorkspace = await loadDiagnosticAssessmentWorkspace(db, teacherId);
  const currentGroup = diagnosticWorkspace.group_reviews.find((item) => item.status === "confirmed");
  const groupIsCurrent = Boolean(group && currentGroup?.id === group.id && currentGroup.is_current);
  const observedStudents = new Set(diagnosticWorkspace.observations.map((row) => row.student_id));
  const names = roster.flatMap((student) => [student.first_name, student.last_name, student.preferred_name,
    [student.first_name, student.last_name].filter(Boolean).join(" ")]).filter(Boolean);
  const previous = { yes: 0, no: 0, unknown: 0 };
  for (const row of interviews) if (row.details.previous_education_status in previous) previous[row.details.previous_education_status]++;
  const sourceRefs = interviews.map((row) => ({ source_type: "family_interview", source_id: row.id,
    source_version: row.version, confirmed_at: row.teacher_confirmed_at }))
    .concat(group ? [{ source_type: "diagnostic_group_confirmed", source_id: group.id,
      source_version: group.version, confirmed_at: group.teacher_confirmed_at }] : []);
  const sourceFingerprint = fingerprint(sourceRefs.map((row) => [row.source_type,row.source_id,row.source_version,row.confirmed_at]));
  return {
    version: "classroom-context-v1", classroom_id: classroom.id, age_group: classroom.age_years,
    students_total: students.length, confirmed_interviews: interviews.length,
    languages: countTags(interviews, "language_tags", interviewLanguageOptions),
    primary_languages: countChoice(interviews, "primary_language_tag", interviewLanguageOptions),
    common_interests: countTags(interviews, "interest_tags", interviewInterestOptions),
    previous_education: previous,
    confirmed_diagnostic_summary: group ? diagnosticPlanningSummary(group.details, names) : null,
    diagnostic_review_current: groupIsCurrent,
    diagnostic_coverage: { students_with_observations: observedStudents.size },
    observation_gaps: diagnosticWorkspace.derived_group_information.observation_gaps,
    provenance: { source_refs: sourceRefs, source_fingerprint: sourceFingerprint,
      derived_at: new Date().toISOString() },
  };
}

/** Suppress small-cell patterns and all source/student identifiers before UI or AI. */
export function publicClassroomContext(current) {
  const visible = (items) => items.filter((item) => visiblePattern(item.count, current.students_total));
  const previous = Object.fromEntries(Object.entries(current.previous_education)
    .filter(([, count]) => visiblePattern(count, current.students_total)));
  return { version: current.version, age_group: current.age_group,
    students_total: current.students_total, confirmed_interviews: current.confirmed_interviews,
    languages: visible(current.languages), common_interests: visible(current.common_interests),
    primary_languages: visible(current.primary_languages),
    previous_education: previous,
    confirmed_diagnostic_summary: current.confirmed_diagnostic_summary,
    diagnostic_coverage: current.diagnostic_coverage,
    diagnostic_review_current: current.diagnostic_review_current,
    observation_gaps: current.observation_gaps.filter((item) => visiblePattern(item.children_without_observations, current.students_total)),
    source_fingerprint: current.provenance.source_fingerprint };
}
