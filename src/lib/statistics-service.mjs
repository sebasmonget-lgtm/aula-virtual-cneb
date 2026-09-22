export function classifyCompetencyInsight({ plannedActivities, studentsWithInformation, studentsTotal, supportOrNotYet }) {
  if (plannedActivities === 0) return "low_planning_presence";
  const minimumCoverage = Math.max(2, Math.ceil(studentsTotal / 2));
  if (studentsWithInformation < minimumCoverage) return "insufficient_information";
  if (supportOrNotYet > 0) return "observed_support_need";
  return "enough_information";
}

export async function buildClassroomStatistics(db, classroomId) {
  const classroom = (await db.query(`
    select count(*)::int as students_total
      from students where classroom_id = $1 and status = 'active'
  `, [classroomId])).rows[0];
  const studentsTotal = Number(classroom?.students_total ?? 0);
  const rows = (await db.query(`
    with planned as (
      select ac.competency_id, count(distinct a.id)::int as planned_activities
        from learning_experiences le join activities a on a.experience_id = le.id
        join activity_criteria ac on ac.activity_id = a.id
       where le.classroom_id = $1 and a.occurs_on >= current_date - interval '28 days'
       group by ac.competency_id
    ), observed as (
      select ac.competency_id, count(distinct e.student_id)::int as students_with_information,
        count(e.id)::int as evidence_count,
        count(e.id) filter (where e.observation_status = 'demonstrated')::int as demonstrated,
        count(e.id) filter (where e.observation_status = 'with_support')::int as with_support,
        count(e.id) filter (where e.observation_status = 'not_yet_demonstrated')::int as not_yet_demonstrated,
        count(e.id) filter (where e.observation_status = 'insufficient_information')::int as insufficient_information,
        max(e.observed_at) as last_observed_at
      from evidences e join students s on s.id = e.student_id
      join activity_criteria ac on ac.id = e.criterion_id
     where s.classroom_id = $1 and s.status = 'active'
     group by ac.competency_id
    )
    select co.id as competency_id, co.official_text as competency_text,
      coalesce(planned.planned_activities, 0)::int as planned_activities,
      coalesce(observed.students_with_information, 0)::int as students_with_information,
      coalesce(observed.evidence_count, 0)::int as evidence_count,
      coalesce(observed.demonstrated, 0)::int as demonstrated,
      coalesce(observed.with_support, 0)::int as with_support,
      coalesce(observed.not_yet_demonstrated, 0)::int as not_yet_demonstrated,
      coalesce(observed.insufficient_information, 0)::int as insufficient_information,
      observed.last_observed_at
    from competencies co left join planned on planned.competency_id = co.id
    left join observed on observed.competency_id = co.id
    where planned.competency_id is not null or observed.competency_id is not null
    order by co.official_text
  `, [classroomId])).rows;
  const competencies = rows.map((row) => ({
    ...row,
    coverage: { students_with_information: Number(row.students_with_information), students_total: studentsTotal },
    insight: classifyCompetencyInsight({
      plannedActivities: Number(row.planned_activities), studentsWithInformation: Number(row.students_with_information),
      studentsTotal, supportOrNotYet: Number(row.with_support) + Number(row.not_yet_demonstrated),
    }),
  }));
  return {
    classroom: {
      students_active: studentsTotal,
      students_observed: Math.max(...competencies.map((item) => item.students_with_information), 0),
      coverage: `${Math.max(...competencies.map((item) => item.students_with_information), 0)}/${studentsTotal}`,
    },
    competencies,
  };
}
