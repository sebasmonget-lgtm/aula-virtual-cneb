import { randomUUID } from "node:crypto";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

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

  const v4Names = new Map((await loadKnowledgeBaseV4()).competencyCards.map((card) => [card.id, card.official_name]));
  const competencies = (await db.query(`
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
  `, [studentId])).rows;
  const recentEvidence = (await db.query(`
    select e.id, e.observed_at, e.observation_status, e.observation_text,
           a.title as activity_title, ac.criterion_text, ac.competency_id, ac.competency_v4_id,
           case when ac.competency_v4_id is null then concat('legacy:', ac.competency_id::text) else concat('v4:', ac.competency_v4_id) end as competency_key,
           (e.media_path is not null) as media_available
      from evidences e join activities a on a.id = e.activity_id
      join activity_criteria ac on ac.id = e.criterion_id
     where e.student_id = $1 order by e.observed_at desc limit 12
  `, [studentId])).rows;
  const assessments = (await db.query(`select id,competency_v4_id,period_start,period_end,details,teacher_confirmed_at from competency_assessments where student_id=$1 and status='active' and teacher_confirmed_at is not null order by teacher_confirmed_at desc`, [studentId])).rows;
  const diagnosis = (await db.query(`
    select de.competency_id, de.teacher_interpretation, de.teacher_confirmed, de.updated_at
      from diagnostic_entries de where de.student_id = $1 order by de.updated_at desc
  `, [studentId])).rows;
  return {
    student,
    diagnosis,
    competencies: competencies.map((competency) => ({
      ...competency, competency_text: competency.competency_text ?? v4Names.get(competency.competency_v4_id) ?? competency.competency_v4_id,
      observations: {
        demonstrated: competency.demonstrated, with_support: competency.with_support,
        not_yet_demonstrated: competency.not_yet_demonstrated,
        insufficient_information: competency.insufficient_information,
      },
      recent_evidence: recentEvidence.filter((evidence) => evidence.competency_key === competency.competency_key),
      teacher_confirmed_assessment: competency.competency_v4_id ? (()=>{const assessment=assessments.find(item=>item.competency_v4_id===competency.competency_v4_id);return assessment?{id:assessment.id,period_start:assessment.period_start,period_end:assessment.period_end,information_status:assessment.details?.information_status,evidence_overview:assessment.details?.evidence_overview,strengths_and_advances:assessment.details?.strengths_and_advances??[],support_needs:assessment.details?.support_needs??[],next_opportunities:assessment.details?.next_opportunities??[],teacher_confirmed_at:assessment.teacher_confirmed_at}:null})() : null,
    })),
    recent_relevant_observations: recentEvidence.map((evidence) => ({ ...evidence, competency_text: evidence.competency_v4_id ? v4Names.get(evidence.competency_v4_id) ?? evidence.competency_v4_id : undefined })),
    confirmed_period_assessments: assessments.map((assessment)=>({id:assessment.id,competency_v4_id:assessment.competency_v4_id,period_start:assessment.period_start,period_end:assessment.period_end,information_status:assessment.details?.information_status,evidence_overview:assessment.details?.evidence_overview,strengths_and_advances:assessment.details?.strengths_and_advances??[],support_needs:assessment.details?.support_needs??[],next_opportunities:assessment.details?.next_opportunities??[],teacher_confirmed_at:assessment.teacher_confirmed_at})),
  };
}

export async function refreshStudentContextSnapshot(db, studentId) {
  const context = await buildStudentPedagogicalContext(db, studentId);
  if (!context) return null;
  const sourceUpdatedAt = resolveSourceUpdatedAt(
    context.recent_relevant_observations.map((item) => item.observed_at),
    context.diagnosis.map((item) => item.updated_at),
    context.confirmed_period_assessments.map((item) => item.teacher_confirmed_at),
  );
  await db.query(`insert into student_context_snapshots
    (id, student_id, version, structured_payload, source_updated_at)
    values ($1, $2, 1, $3::jsonb, $4::timestamptz)
    on conflict (student_id, version) do update set structured_payload = excluded.structured_payload,
      generated_at = now(), source_updated_at = excluded.source_updated_at, summary_text = null`,
    [randomUUID(), studentId, JSON.stringify(context), sourceUpdatedAt]);
  return context;
}
