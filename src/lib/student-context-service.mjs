import { randomUUID } from "node:crypto";

export function resolveSourceUpdatedAt(...timestamps) {
  const valid = timestamps.flat().filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.valueOf()));
  return valid.length ? new Date(Math.max(...valid.map((value) => value.valueOf()))).toISOString() : new Date(0).toISOString();
}

export async function buildStudentPedagogicalContext(db, studentId) {
  const student = (await db.query(`
    select s.id, coalesce(s.preferred_name, s.first_name) as name, s.first_name, s.last_name,
           c.section, ag.age_years, sy.year as school_year
      from students s join classrooms c on c.id = s.classroom_id
      join age_grades ag on ag.id = c.age_grade_id join school_years sy on sy.id = c.school_year_id
     where s.id = $1
  `, [studentId])).rows[0];
  if (!student) return null;

  const competencies = (await db.query(`
    select co.id as competency_id, co.official_text as competency_text,
      count(e.id)::int as evidence_count,
      count(e.id) filter (where e.observation_status = 'demonstrated')::int as demonstrated,
      count(e.id) filter (where e.observation_status = 'with_support')::int as with_support,
      count(e.id) filter (where e.observation_status = 'not_yet_demonstrated')::int as not_yet_demonstrated,
      count(e.id) filter (where e.observation_status = 'insufficient_information')::int as insufficient_information,
      max(e.observed_at) as last_observed_at
    from competencies co
    join activity_criteria ac on ac.competency_id = co.id
    left join evidences e on e.criterion_id = ac.id and e.student_id = $1
    group by co.id, co.official_text
    having count(e.id) > 0
    order by max(e.observed_at) desc nulls last
  `, [studentId])).rows;
  const recentEvidence = (await db.query(`
    select e.id, e.observed_at, e.observation_status, e.observation_text,
           a.title as activity_title, ac.criterion_text, ac.competency_id,
           (e.media_path is not null) as media_available
      from evidences e join activities a on a.id = e.activity_id
      join activity_criteria ac on ac.id = e.criterion_id
     where e.student_id = $1 order by e.observed_at desc limit 12
  `, [studentId])).rows;
  const diagnosis = (await db.query(`
    select de.competency_id, de.teacher_interpretation, de.teacher_confirmed, de.updated_at
      from diagnostic_entries de where de.student_id = $1 order by de.updated_at desc
  `, [studentId])).rows;
  return {
    student,
    diagnosis,
    competencies: competencies.map((competency) => ({
      ...competency,
      observations: {
        demonstrated: competency.demonstrated, with_support: competency.with_support,
        not_yet_demonstrated: competency.not_yet_demonstrated,
        insufficient_information: competency.insufficient_information,
      },
      recent_evidence: recentEvidence.filter((evidence) => evidence.competency_id === competency.competency_id),
      teacher_confirmed_assessment: null,
    })),
    recent_relevant_observations: recentEvidence,
    confirmed_period_assessments: [],
  };
}

export async function refreshStudentContextSnapshot(db, studentId) {
  const context = await buildStudentPedagogicalContext(db, studentId);
  if (!context) return null;
  const sourceUpdatedAt = resolveSourceUpdatedAt(
    context.recent_relevant_observations.map((item) => item.observed_at),
    context.diagnosis.map((item) => item.updated_at),
  );
  await db.query(`insert into student_context_snapshots
    (id, student_id, version, structured_payload, source_updated_at)
    values ($1, $2, 1, $3::jsonb, $4::timestamptz)
    on conflict (student_id, version) do update set structured_payload = excluded.structured_payload,
      generated_at = now(), source_updated_at = excluded.source_updated_at, summary_text = null`,
    [randomUUID(), studentId, JSON.stringify(context), sourceUpdatedAt]);
  return context;
}
