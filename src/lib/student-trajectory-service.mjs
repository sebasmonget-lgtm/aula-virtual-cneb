import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { dateOnly, loadPeriodEvaluationRows } from "./period-evaluation-service.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function loadStudentTrajectory(db, teacherId, studentId, { includeOrdinary = false } = {}) {
  if (!uuid.test(studentId ?? "")) return null;
  const owner = (await db.query(`select s.id,s.classroom_id,c.age_grade_id,c.castellano_l2_applicable,
      c.religion_applicable,ag.age_years as age,c.school_year_id
    from students s join classrooms c on c.id=s.classroom_id
    join age_grades ag on ag.id=c.age_grade_id
    where s.id=$1 and s.status='active' and c.status='active' and c.teacher_id=$2`, [studentId, teacherId])).rows[0];
  if (!owner) return null;
  const cards = (await loadKnowledgeBaseV4()).competencyCards.filter(card => competencyApplicability(card, owner.age, {
    castellanoL2Applicable: owner.castellano_l2_applicable === true,
    religionApplicable: owner.religion_applicable === true,
  }).planning_available);
  const names = new Map(cards.map(card => [card.id, card.official_name]));
  const diagnosticGuided = (await db.query(`select id,competency_v4_id,observed_at,observation_text,
      coalesce(experience_title_snapshot,'Experiencia diagnóstica') as situation
    from diagnostic_experience_observations where classroom_id=$1 and student_id=$2
    order by observed_at,id`, [owner.classroom_id,studentId])).rows.map(row => ({
      id: row.id, competency_ids: row.competency_v4_id ? [row.competency_v4_id] : [],
      date: dateOnly(row.observed_at), observation: row.observation_text, situation: row.situation,
      kind: "guided",
    }));
  const diagnosticSpontaneous = (await db.query(`select id,competency_v4_ids,observed_at,
      observation_text,context_label from effective_diagnostic_spontaneous_observations
    where classroom_id=$1 and student_id=$2 order by observed_at,id`,
  [owner.classroom_id,studentId])).rows.map(row => ({
    id: row.id, competency_ids: row.competency_v4_ids ?? [], date: dateOnly(row.observed_at),
    observation: row.observation_text, situation: row.context_label, kind: "spontaneous",
  }));
  const periods = (await db.query(`select id,ordinal,label,starts_on,ends_on from evaluation_periods
    where school_year_id=$1 order by ordinal`, [owner.school_year_id])).rows;
  const timeline = [];
  for (const period of periods) {
    const dated = { ...period, starts_on: dateOnly(period.starts_on), ends_on: dateOnly(period.ends_on) };
    const model = await loadPeriodEvaluationRows(db, { classroomId: owner.classroom_id, period: dated,
      applicableIds: new Set(names.keys()), includeOrdinary });
    timeline.push({ period: { id: period.id, ordinal: Number(period.ordinal), label: period.label,
      starts_on: dated.starts_on, ends_on: dated.ends_on },
    competencies: model.rows.filter(row => row.student_id === studentId).map(row => ({
      id: row.competency_v4_id, name: names.get(row.competency_v4_id) ?? row.competency_v4_id,
      state: row.state, level: row.state === "confirmed" ? row.assessment?.achievement_level ?? null : null,
      conclusion: row.state === "confirmed" ? row.conclusion?.details?.conclusion_text ?? null : null,
      next_opportunities: row.state === "confirmed" ? row.conclusion?.details?.next_steps ?? [] : [],
      sources: row.sourceRows.map(source => ({ id: source.id, date: dateOnly(source.observed_on),
        kind: source.details?.source === "ordinary_observation" ? "ordinary" : "activity",
        observation: source.observation_text, activity: source.activity_title,
        criterion: source.criterion_text, media_available: source.media_available })),
    })) });
  }
  const pending = includeOrdinary ? (await db.query(`select o.id,
      (o.occurred_at at time zone 'America/Lima')::date as observed_on,o.raw_text,
      coalesce(r.corrected_text,o.raw_text) as effective_text,
      a.state,a.raw_revision,o.source_revision
    from ordinary_observations o
    left join lateral (select corrected_text from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    left join lateral (select state,raw_revision from ordinary_observation_attributions
      where observation_id=o.id order by version desc limit 1) a on true
    where o.student_id=$1 and o.classroom_id=$2 and o.status<>'voided'
      and (a.state is null or a.state not in ('confirmed','unclassified') or a.raw_revision<>o.source_revision)
      and (o.captured_criterion_id is null or a.state is not null)
    order by o.occurred_at desc,o.id desc`, [studentId, owner.classroom_id])).rows.map(row => ({
      id: row.id, date: dateOnly(row.observed_on), observation: row.effective_text,
      state: row.state ?? "pending",
    })) : [];
  return { student_id: studentId, classroom_id: owner.classroom_id,
    diagnostic: [...diagnosticGuided,...diagnosticSpontaneous].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    timeline, pending_observations: pending };
}
