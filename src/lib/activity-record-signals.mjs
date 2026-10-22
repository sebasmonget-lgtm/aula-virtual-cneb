/** Read-only signals. A guide visit is never a classroom execution or evidence. */
export async function loadActivityRecordSignals(db, { classroomId, from = '0001-01-01', to = '9999-12-31' }) {
  const tables = (await db.query(`select to_regclass('ordinary_observations') is not null as ordinary_ready,
    to_regclass('evidences') is not null as evidence_ready`)).rows[0];
  const queries = [];
  if (tables.ordinary_ready) queries.push(db.query(`select o.activity_id,count(*)::int as observation_count,
    max((o.occurred_at at time zone 'America/Lima')::date)::text as last_observed_on
    from ordinary_observations o join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    join activities a on a.id=o.activity_id join learning_experiences e on e.id=a.experience_id and e.classroom_id=o.classroom_id
    where o.classroom_id=$1 and o.status<>'voided'
      and (o.occurred_at at time zone 'America/Lima')::date between $2::date and $3::date group by o.activity_id`, [classroomId, from, to]));
  if (tables.evidence_ready) queries.push(db.query(`select ev.activity_id,count(*)::int as observation_count,
    max(coalesce((to_jsonb(ev)->>'observed_on')::date,(ev.observed_at at time zone 'America/Lima')::date))::text as last_observed_on
    from evidences ev join students s on s.id=ev.student_id
    join activities a on a.id=ev.activity_id join learning_experiences e on e.id=a.experience_id and e.classroom_id=s.classroom_id
    where s.classroom_id=$1 and coalesce((to_jsonb(ev)->>'observed_on')::date,(ev.observed_at at time zone 'America/Lima')::date)
      between $2::date and $3::date group by ev.activity_id`, [classroomId, from, to]));
  const signals = new Map();
  for (const result of await Promise.all(queries)) for (const row of result.rows) {
    const before = signals.get(row.activity_id) ?? { observation_count: 0, last_observed_on: null };
    signals.set(row.activity_id, { observation_count: before.observation_count + Number(row.observation_count),
      last_observed_on: [before.last_observed_on, row.last_observed_on].filter(Boolean).sort().at(-1) ?? null });
  }
  return signals;
}

export function activityRecordLabel({ status = "planned", execution_status = "", schedule_status = "", observation_count = 0, occurs_on = "" }, today) {
  const execution = execution_status || status;
  if (schedule_status === 'cancelled') return 'Cancelada';
  if (status === 'draft') return 'Borrador';
  if (schedule_status === 'not_worked' || execution === 'skipped') return 'No realizada';
  if (Number(observation_count) > 0) return 'Con observaciones';
  if (execution === 'completed') return 'Realizada · registro anterior';
  if (execution === 'active') return 'Registro anterior';
  return occurs_on && occurs_on < today ? 'Sin registros' : 'Prevista';
}
