export const competencyInsightPolicy = Object.freeze({ minimumCoverageRatio: 0.5, minimumStudentsNeedingSupport: 3, minimumSupportRatio: 0.25 });

export function classifyCompetencyInsight({ plannedActivities, studentsWithSufficientInformation, studentsTotal, studentsNeedingSupport, policy = competencyInsightPolicy }) {
  if (plannedActivities === 0) return "low_planning_presence";
  if (studentsWithSufficientInformation < Math.max(1, Math.ceil(studentsTotal * policy.minimumCoverageRatio))) return "insufficient_information";
  const supportRatio = studentsWithSufficientInformation === 0 ? 0 : studentsNeedingSupport / studentsWithSufficientInformation;
  return studentsNeedingSupport >= policy.minimumStudentsNeedingSupport && supportRatio >= policy.minimumSupportRatio ? "observed_support_need" : "enough_information";
}

export function summarizeStudentStatuses(statuses) {
  const recent = new Map();
  for (const item of statuses) {
    const previous = recent.get(item.studentId);
    if (!previous || new Date(item.observedAt) > new Date(previous.observedAt)) recent.set(item.studentId, item);
  }
  const values = [...recent.values()];
  return {
    students_observed: new Set(statuses.map((item) => item.studentId)).size,
    students_with_sufficient_information: values.filter((item) => ["demonstrated", "with_support", "not_yet_demonstrated"].includes(item.status)).length,
    students_insufficient_information: values.filter((item) => item.status === "insufficient_information").length,
    students_demonstrated: values.filter((item) => item.status === "demonstrated").length,
    students_with_support: values.filter((item) => item.status === "with_support").length,
    students_not_yet: values.filter((item) => item.status === "not_yet_demonstrated").length,
  };
}

export async function buildClassroomStatistics(db, classroomId) {
  const classroom = (await db.query(`select c.age_grade_id, count(s.id)::int as students_total from classrooms c left join students s on s.classroom_id = c.id and s.status = 'active' where c.id = $1 group by c.age_grade_id`, [classroomId])).rows[0];
  const studentsTotal = Number(classroom?.students_total ?? 0);
  const rows = (await db.query(`
    with applicable as (select distinct co.id as competency_id, co.official_text as competency_text from performances p join competencies co on co.id = p.competency_id where p.age_grade_id = $2),
    planned as (select ac.competency_id, count(distinct a.id)::int as activities_last_28_days from learning_experiences le join activities a on a.experience_id = le.id join activity_criteria ac on ac.activity_id = a.id where le.classroom_id = $1 and a.occurs_on >= current_date - interval '28 days' group by ac.competency_id),
    all_evidence as (select ac.competency_id, e.student_id, e.id, e.observed_at, e.observation_status from evidences e join students s on s.id = e.student_id and s.status = 'active' join activity_criteria ac on ac.id = e.criterion_id where s.classroom_id = $1),
    latest_marked as (select distinct on (competency_id, student_id) competency_id, student_id, observation_status from all_evidence where observation_status is not null order by competency_id, student_id, observed_at desc, id desc),
    observed as (select competency_id, count(distinct student_id)::int as students_observed, count(*)::int as evidence_count, max(observed_at) as last_observed_at from all_evidence group by competency_id),
    marked as (select competency_id, count(*) filter (where observation_status in ('demonstrated','with_support','not_yet_demonstrated'))::int as students_with_sufficient_information, count(*) filter (where observation_status = 'insufficient_information')::int as students_insufficient_information, count(*) filter (where observation_status = 'demonstrated')::int as students_demonstrated, count(*) filter (where observation_status = 'with_support')::int as students_with_support, count(*) filter (where observation_status = 'not_yet_demonstrated')::int as students_not_yet from latest_marked group by competency_id)
    select applicable.competency_id, applicable.competency_text, coalesce(planned.activities_last_28_days, 0)::int as activities_last_28_days, coalesce(observed.students_observed, 0)::int as students_observed, coalesce(marked.students_with_sufficient_information, 0)::int as students_with_sufficient_information, coalesce(marked.students_insufficient_information, 0)::int as students_insufficient_information, coalesce(marked.students_demonstrated, 0)::int as students_demonstrated, coalesce(marked.students_with_support, 0)::int as students_with_support, coalesce(marked.students_not_yet, 0)::int as students_not_yet, coalesce(observed.evidence_count, 0)::int as evidence_count, observed.last_observed_at from applicable left join planned on planned.competency_id = applicable.competency_id left join observed on observed.competency_id = applicable.competency_id left join marked on marked.competency_id = applicable.competency_id order by applicable.competency_text
  `, [classroomId, classroom.age_grade_id])).rows;
  const classroomObserved = Number((await db.query(`select count(distinct e.student_id)::int as students_observed from evidences e join students s on s.id = e.student_id where s.classroom_id = $1 and s.status = 'active'`, [classroomId])).rows[0]?.students_observed ?? 0);
  const competencies = rows.map((row) => {
    const planning = { activities_last_28_days: Number(row.activities_last_28_days) };
    const coverage = { total_students: studentsTotal, students_observed: Number(row.students_observed), students_with_sufficient_information: Number(row.students_with_sufficient_information), students_insufficient_information: Number(row.students_insufficient_information) };
    const students = { demonstrated: Number(row.students_demonstrated), with_support: Number(row.students_with_support), not_yet_demonstrated: Number(row.students_not_yet) };
    return { competency_id: row.competency_id, competency_text: row.competency_text, planning, coverage, students, evidence_count: Number(row.evidence_count), last_observed_at: row.last_observed_at, insight: classifyCompetencyInsight({ plannedActivities: planning.activities_last_28_days, studentsWithSufficientInformation: coverage.students_with_sufficient_information, studentsTotal, studentsNeedingSupport: students.with_support + students.not_yet_demonstrated }) };
  });
  return {
    classroom: {
      students_active: studentsTotal,
      students_observed: classroomObserved,
      coverage: `${classroomObserved}/${studentsTotal}`,
    },
    competencies,
  };
}
