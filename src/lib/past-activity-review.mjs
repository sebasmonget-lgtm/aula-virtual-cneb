import { randomUUID } from "node:crypto";
import { lockClassroomSchedule } from "./activity-schedule-integrity.mjs";
import { VersionConflictError } from "./version-integrity.mjs";

/** Date elapsed is a presentation state, never proof of performance or an automatic closure. */
export async function pendingPastActivities(db, teacherId, today) {
  return (await db.query(`select se.id,se.title,se.scheduled_on::text as date,coalesce(del.status,'planned') as status,
      'date_elapsed_pending_review'::text as display_status
    from class_schedule_entries se join classrooms c on c.id=se.classroom_id and c.teacher_id=$1
    join activities a on a.id=se.activity_id
    left join daily_execution_logs del on del.schedule_entry_id=se.id and del.execution_date=se.scheduled_on
    where se.scheduled_on<$2::date and se.block_type in ('activity','workshop')
      and coalesce(del.status,'planned') in ('planned','active')
    order by se.scheduled_on desc,se.start_time limit 30`,[teacherId,today])).rows;
}

export async function reviewPastActivity(db, teacherId, input, today) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.scheduleEntryId??'')||!['complete','skip'].includes(input.action)||typeof input.closureNote!=='string'||input.closureNote.length>800)
    throw new TypeError("Elige si se realizó y añade una nota de hasta 800 caracteres, si deseas.");
  return db.transaction(async tx=>{
    const entry=(await tx.query(`select se.id,se.classroom_id,se.scheduled_on::text as date
      from class_schedule_entries se join classrooms c on c.id=se.classroom_id
      where se.id=$1 and c.teacher_id=$2 and se.activity_id is not null`,[input.scheduleEntryId,teacherId])).rows[0];
    if(!entry||!entry.date||entry.date>=today)throw new TypeError("La actividad anterior no está disponible para revisar.");
    await lockClassroomSchedule(tx,entry.classroom_id);
    const fresh=(await tx.query(`select scheduled_on::text as date from class_schedule_entries where id=$1`,[entry.id])).rows[0];
    if(fresh.date!==entry.date)throw new VersionConflictError("Cambió la fecha de la actividad. Recarga Hoy.");
    const status=input.action==='skip'?'skipped':'completed';
    const saved=await tx.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status,teacher_closure_note,closure_type)
      values($1,$2,$3::date,$4,$5,$6)
      on conflict(schedule_entry_id,execution_date) do update set status=excluded.status,
        teacher_closure_note=excluded.teacher_closure_note,closure_type=excluded.closure_type,current_override=false
      where daily_execution_logs.status in ('planned','active') returning id`,
    [randomUUID(),entry.id,entry.date,status,input.closureNote.trim()||null,input.action==='skip'?'cancelled':'note']);
    if(!saved.rows.length)throw new VersionConflictError("La actividad ya fue revisada. Recarga Hoy.");
    return saved.rows[0];
  });
}
