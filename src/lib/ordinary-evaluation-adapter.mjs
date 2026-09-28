/** Read-only projection. Raw notes are facts, not grades or automatically judged evidence. */
export async function loadConfirmedOrdinaryEvaluationRows(db, { classroomId, period }) {
  return (await db.query(`select o.id,o.student_id,o.occurred_at as observed_at,
      (o.occurred_at at time zone 'America/Lima')::date as observed_on,
      null::text as observation_status,
      coalesce(r.corrected_text,o.raw_text) as observation_text,
      (o.media_path is not null) as media_available,
      o.activity_id,o.captured_criterion_id as criterion_id,
      coalesce(act.title,o.context_snapshot->>'activity_title',
        case when o.source_kind='spontaneous' then 'Observación espontánea' else 'Actividad guiada' end) as activity_title,
      chosen.competency_v4_id,
      case when chosen.criterion_id is not null then chosen.criterion_text else null end as criterion_text,
      jsonb_build_object('source','ordinary_observation','raw_revision',o.source_revision,
        'attribution_id',chosen.attribution_id,'attribution_version',chosen.attribution_version,
        'decision_source',chosen.decision_source) as details,
      chosen.performance_id
    from ordinary_observations o
    join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    left join activities act on act.id=o.activity_id
    left join lateral (select corrected_text from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    left join lateral (select av.* from ordinary_observation_attributions av
      where av.observation_id=o.id order by av.version desc limit 1) a on true
    left join activity_criteria captured on captured.id=o.captured_criterion_id
    join lateral (
      select ids.competency_v4_id,a.id as attribution_id,a.version as attribution_version,
        'teacher_review'::text as decision_source,
        matching.id as criterion_id,matching.criterion_text,matching.performance_id
      from unnest(a.confirmed_competency_ids) as ids(competency_v4_id)
      left join lateral (select ac.id,ac.criterion_text,ac.performance_id
        from activity_criteria ac where ac.id=any(a.confirmed_criterion_ids)
          and ac.competency_v4_id=ids.competency_v4_id order by ac.display_order,ac.id limit 1) matching on true
      where a.state='confirmed' and a.source='teacher' and a.raw_revision=o.source_revision
      union all
      select captured.competency_v4_id,null::uuid,null::integer,'teacher_capture'::text,
        captured.id,captured.criterion_text,captured.performance_id
      where captured.id is not null and captured.competency_v4_id is not null
        and o.source_revision=1 and (a.id is null or a.state not in ('confirmed','unclassified'))
    ) chosen on true
    where o.classroom_id=$1 and s.status='active' and o.status<>'voided'
      and (o.occurred_at at time zone 'America/Lima')::date between $2::date and $3::date
    order by observed_on,o.occurred_at,o.id,chosen.competency_v4_id`,
  [classroomId, period.starts_on, period.ends_on])).rows;
}
