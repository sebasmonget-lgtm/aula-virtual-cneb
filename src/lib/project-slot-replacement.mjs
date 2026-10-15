import {isDeepStrictEqual} from 'node:util';
import {libraryRow} from './annual-year-editor.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {limaToday} from './activity-schedule-integrity.mjs';

export async function protectedSlotDates(db,classroomId,startsOn,endsOn){
  const rows=(await db.query(`select distinct se.scheduled_on::text as date from class_schedule_entries se
    join activities main on main.id=se.activity_id where se.classroom_id=$1 and se.scheduled_on between $2::date and $3::date
    and se.block_type='activity' and main.status='active' and main.schedule_status not in ('cancelled','not_worked')
    and (se.scheduled_on<$4::date or exists(select 1 from activities a
      where (a.lineage_id=main.lineage_id or a.linked_main_activity_id in (select id from activities where lineage_id=main.lineage_id))
      and (exists(select 1 from evidences ev where ev.activity_id=a.id)
        or exists(select 1 from ordinary_observations o where o.activity_id=a.id)
        or exists(select 1 from class_schedule_entries s join daily_execution_logs d on d.schedule_entry_id=s.id
          where s.activity_id=a.id and (d.status<>'planned' or d.actual_started_at is not null or d.actual_ended_at is not null)))))`,[classroomId,startsOn,endsOn,limaToday()])).rows;
  return rows.map(row=>row.date);
}

/** Authorization comes from saved year versions and the outgoing library snapshot, never a browser ID. */
export function assertSavedSlotReplacement(next, previous, nextId, previousId) {
  const slot=next.resolved_calendar?.projects.find(item=>item.proposal_id===nextId);
  const oldSlot=previous.resolved_calendar?.projects.find(item=>item.proposal_id===previousId);
  const old=previous.proposed_experiences?.find(item=>item.proposal_id===previousId);
  const preserved=next.available_experiences?.find(item=>item.proposal_id===previousId);
  if(!slot||!oldSlot||!old||slot.slot_id!==oldSlot.slot_id||slot.starts_on!==oldSlot.starts_on||slot.ends_on!==oldSlot.ends_on||
    !isDeepStrictEqual(preserved,libraryRow(old)))throw new VersionConflictError('Este día pertenece a otro proyecto. Conservamos su programación.');
}

/** A literal library restoration changes the future plan, never the saved execution history. */
export function savedLibraryRestoration(next,previous,previousId,today){
  const oldSlot=previous.resolved_calendar?.projects.find(slot=>slot.proposal_id===previousId);
  const slot=next.resolved_calendar?.projects.find(slot=>slot.slot_id===oldSlot?.slot_id);
  const old=previous.proposed_experiences?.find(row=>row.proposal_id===previousId);
  const incoming=previous.available_experiences?.find(row=>row.proposal_id===slot?.proposal_id);
  const row=next.proposed_experiences?.find(row=>row.proposal_id===slot?.proposal_id);
  if(!old||old.teacher_protected||!incoming||incoming.teacher_protected||!row||slot.ends_on<today||
    !isDeepStrictEqual(libraryRow(row),libraryRow(incoming)))return false;
  try{assertSavedSlotReplacement(next,previous,row.proposal_id,previousId);return true;}catch{return false;}
}
