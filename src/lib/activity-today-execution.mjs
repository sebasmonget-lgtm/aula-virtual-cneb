import {randomUUID} from 'node:crypto';
import {lockClassroomSchedule} from './activity-schedule-integrity.mjs';
import {VersionConflictError} from './version-integrity.mjs';

/** Actual execution is separate from the immutable date accepted in the project. */
export async function startActivityToday(db,teacherId,activityId,today){
  const owner=(await db.query(`select e.classroom_id from activities a join learning_experiences e on e.id=a.experience_id
    join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id
    where a.id=$1 and c.teacher_id=$2 and y.owner_id=$2 and c.status='active'`,[activityId,teacherId])).rows[0];
  if(!owner)throw new VersionConflictError('Esta actividad no está disponible en tu aula.');
  return db.transaction(async tx=>{
    await lockClassroomSchedule(tx,owner.classroom_id);
    const rows=(await tx.query(`select se.id from class_schedule_entries se join activities a on a.id=se.activity_id
      join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id join school_years y on y.id=c.school_year_id
      where a.id=$1 and se.classroom_id=$2 and e.classroom_id=$2 and c.teacher_id=$3 and y.owner_id=$3 and c.status='active'
      and a.status='active' and e.status='active' and a.schedule_status not in ('cancelled','not_worked')
      and se.block_type='activity' and se.scheduled_on=a.occurs_on for update of se,a`,[activityId,owner.classroom_id,teacherId])).rows;
    if(rows.length!==1)throw new VersionConflictError('Abre una actividad confirmada y programada de tu proyecto.');
    const entry=rows[0];
    const logs=(await tx.query(`select d.*,d.execution_date::text as execution_date from daily_execution_logs d join class_schedule_entries se on se.id=d.schedule_entry_id
      join activities a on a.id=se.activity_id where a.lineage_id=(select lineage_id from activities where id=$1)
      and (d.status<>'planned' or d.actual_started_at is not null or d.actual_ended_at is not null)`,[activityId])).rows;
    if(logs.some(log=>String(log.execution_date).slice(0,10)!==today||log.schedule_entry_id!==entry.id||log.status!=='active'))
      throw new VersionConflictError('Esta actividad ya tiene una jornada registrada. Puedes consultar sus registros.');
    await tx.query(`update daily_execution_logs d set current_override=false from class_schedule_entries se
      where se.id=d.schedule_entry_id and se.classroom_id=$1 and d.execution_date=$2::date and d.current_override`,[owner.classroom_id,today]);
    await tx.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status,actual_started_at,current_override)
      values($1,$2,$3::date,'active',now(),true) on conflict(schedule_entry_id,execution_date)
      do update set current_override=true,actual_started_at=coalesce(daily_execution_logs.actual_started_at,excluded.actual_started_at),status='active'`,[randomUUID(),entry.id,today]);
    return entry.id;
  });
}
