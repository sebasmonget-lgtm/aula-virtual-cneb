/** One authorized read projection for current activity notes, including legacy records. */
export async function loadActivityObservations(db, { teacherId, classroomId, activityId }) {
  const attributionAvailable=(await db.query("select to_regclass('ordinary_observation_attributions') is not null as available")).rows[0]?.available===true;
  const attributionJoin=attributionAvailable?`left join lateral (select a.* from ordinary_observation_attributions a
      where a.observation_id=o.id order by a.version desc limit 1) attribution on true`:'';
  const confirmedIds=attributionAvailable?`case when attribution.state='confirmed' and attribution.source='teacher'
      and attribution.raw_revision=o.source_revision then attribution.confirmed_competency_ids else '{}'::text[] end`:"'{}'::text[]";
  return (await db.query(`select o.id,o.student_id,
      concat_ws(' ',coalesce(s.preferred_name,s.first_name),s.last_name) as student_name,
      o.captured_criterion_id as criterion_id,
      coalesce(o.context_snapshot->>'captured_criterion_text',ac.criterion_text) as criterion_text,
      coalesce(o.context_snapshot->>'captured_competency_id',ac.competency_v4_id) as competency_v4_id,
      ${confirmedIds} as confirmed_competency_ids,
      coalesce(r.corrected_text,o.raw_text) as observation_text,null::text as observation_status,
      'observation'::text as type,o.occurred_at as observed_at,o.media_path is not null as has_attachment,
      'ordinary_observation'::text as source,o.source_revision
    from ordinary_observations o join classrooms c on c.id=o.classroom_id
    join students s on s.id=o.student_id and s.classroom_id=c.id
    join activities a on a.id=o.activity_id join learning_experiences e on e.id=a.experience_id and e.classroom_id=c.id
    left join activity_criteria ac on ac.id=o.captured_criterion_id and ac.activity_id=a.id
    left join lateral (select corrected_text from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    ${attributionJoin}
    where o.activity_id=$1 and c.id=$3 and c.teacher_id=$2 and o.created_by=$2 and o.status<>'voided'
    union all
    select ev.id,ev.student_id,concat_ws(' ',coalesce(s.preferred_name,s.first_name),s.last_name),
      ev.criterion_id,ac.criterion_text,ac.competency_v4_id,'{}'::text[],ev.observation_text,ev.observation_status,
      ev.type::text,ev.observed_at,ev.media_path is not null,'legacy_evidence',1
    from evidences ev join students s on s.id=ev.student_id and s.classroom_id=$3
    join classrooms c on c.id=s.classroom_id and c.teacher_id=$2
    join activities a on a.id=ev.activity_id join learning_experiences e on e.id=a.experience_id and e.classroom_id=c.id
    join activity_criteria ac on ac.id=ev.criterion_id and ac.activity_id=a.id
    where ev.activity_id=$1 and ev.created_by=$2
    order by observed_at,id`, [activityId, teacherId, classroomId])).rows;
}
