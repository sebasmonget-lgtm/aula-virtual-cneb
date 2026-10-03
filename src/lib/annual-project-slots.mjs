import { randomUUID } from "node:crypto";

// Called inside the annual-plan transaction. Dates and day counts come from
// the server calendar, never from the editable/client projection.
export async function persistAnnualProjectSlots(db, planId, schedule) {
  const plan = (await db.query(`select proposal,classroom_id,school_year_id from annual_plans where id=$1`, [planId])).rows[0];
  if (!plan) throw new Error("El plan anual no está disponible.");
  const existing = (await db.query(`select id,slot_index from project_slots where annual_plan_id=$1`, [planId])).rows;
  const byIndex = new Map(existing.map((item) => [Number(item.slot_index), item.id]));
  const indices = new Set(schedule.projects.map((item) => item.index));
  // Clear the partial unique key before proposals are reordered between stable calendar slots.
  // Callers persist the proposal and slots in the same annual-plan transaction.
  await db.query(`update project_slots set proposal_id=null where annual_plan_id=$1 and proposal_id is not null`, [planId]);
  for (const item of existing) if (!indices.has(Number(item.slot_index)))
    await db.query(`delete from project_slots where id=$1 and annual_plan_id=$2`, [item.id, planId]);
  for (const slot of schedule.projects) {
    const proposalId = plan?.proposal?.proposed_experiences?.[slot.index - 1]?.proposal_id ?? null;
    if (byIndex.has(slot.index)) await db.query(`update project_slots set calendar_block_id=$1,duration_weeks=$2,
      starts_on=$3::date,ends_on=$4::date,proposal_id=$5 where id=$6 and annual_plan_id=$7`,
    [slot.calendar_block_id, slot.duration_weeks, slot.starts_on, slot.ends_on, proposalId, byIndex.get(slot.index), planId]);
    else await db.query(`insert into project_slots(id,annual_plan_id,slot_index,calendar_block_id,duration_weeks,starts_on,ends_on,proposal_id)
      values($1,$2,$3,$4,$5,$6::date,$7::date,$8)`, [randomUUID(), planId, slot.index, slot.calendar_block_id,
      slot.duration_weeks, slot.starts_on, slot.ends_on, proposalId]);
  }
  if (!plan?.proposal?.proposed_experiences) return;
  // Journey V2 already carries dates/counts from its single effective-calendar snapshot.
  // Do not create a second projection or increment CAS after returning a saved revision.
  if (plan.proposal.journey_version === 2) return;
  const counts = [];
  for (const slot of schedule.projects) {
    const count = (await db.query(`select count(*)::int as n from school_calendar_days d
      join school_calendar_versions v on v.id=d.calendar_version_id and v.school_year_id=$1 and v.status='active'
      left join classroom_calendar_overrides o on o.classroom_id=$2 and o.override_date=d.date and o.reverted_at is null
      where d.date between $3::date and $4::date and coalesce(o.new_is_instructional,d.is_instructional)=true`,
    [plan.school_year_id, plan.classroom_id, slot.starts_on, slot.ends_on])).rows[0];
    counts.push(Number(count?.n ?? slot.duration_weeks * 5));
  }
  const proposal = { ...plan.proposal, proposed_experiences: plan.proposal.proposed_experiences.map((item, index) => ({
    ...item, planned_start_date: schedule.projects[index]?.starts_on ?? item.planned_start_date,
    planned_end_date: schedule.projects[index]?.ends_on ?? item.planned_end_date,
    planned_instructional_days: counts[index] ?? item.planned_instructional_days,
    period_label: item.period,
  })) };
  // Revalidation must not bump the optimistic revision when nothing changed.
  // JSONB equality also ignores serialization/key ordering after a reload.
  await db.query(`update annual_plans set proposal=$1::jsonb,updated_at=now()
    where id=$2 and proposal is distinct from $1::jsonb`, [JSON.stringify(proposal), planId]);
}
