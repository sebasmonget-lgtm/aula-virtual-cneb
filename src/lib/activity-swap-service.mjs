import { randomUUID } from "node:crypto";
import { assertRevision,expectedRevision,VersionConflictError } from "./version-integrity.mjs";
import { lockClassroomSchedule,assertActivityScheduleMutable,limaToday } from "./activity-schedule-integrity.mjs";
import { loadEffectiveCalendar,validateSelectedInstructionalDates,syncActivitySchedule } from "./school-calendar-service.mjs";

export async function swapActivityDates(db,teacherId,input,{today=limaToday()}={}){
  if(input.activityId===input.otherActivityId)throw new VersionConflictError("Elige otra actividad.");
  return db.transaction(async tx=>{
    const owner=(await tx.query(`select e.classroom_id from activities a join learning_experiences e on e.id=a.experience_id
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$2 where a.id=$1`,[input.activityId,teacherId])).rows[0];
    if(!owner)throw new VersionConflictError("Actividad no disponible.");await lockClassroomSchedule(tx,owner.classroom_id);
    const rows=(await tx.query(`select a.*,a.occurs_on::text as date,e.classroom_id,e.starts_on::text,e.ends_on::text from activities a
      join learning_experiences e on e.id=a.experience_id where a.id=any($1::uuid[]) and e.classroom_id=$2
      and a.status='active' and a.linked_main_activity_id is null and e.type in ('project','unit') for update of a`,[[input.activityId,input.otherActivityId],owner.classroom_id])).rows;
    if(rows.length!==2 || rows[0].experience_id!==rows[1].experience_id)throw new VersionConflictError("Intercambia actividades confirmadas del mismo proyecto.");
    const first=rows.find(row=>row.id===input.activityId),second=rows.find(row=>row.id===input.otherActivityId);
    assertRevision(first,expectedRevision(input.expectedRevision));assertRevision(second,expectedRevision(input.otherExpectedRevision));
    const pairs=[];
    for(const [row,target] of [[first,second.date],[second,first.date]]){
      await assertActivityScheduleMutable(tx,{...row,occurs_on:row.date},today);
      const calendar=await loadEffectiveCalendar(tx,{teacherId,classroomId:owner.classroom_id,from:target,to:target});
      validateSelectedInstructionalDates(calendar.days,[target],row.starts_on,row.ends_on);
      pairs.push([row,target]);
      const workshops=(await tx.query(`select a.*,a.occurs_on::text as date from activities a where linked_main_activity_id=$1 and status='active' for update`,[row.id])).rows;
      for(const workshop of workshops){await assertActivityScheduleMutable(tx,{...workshop,occurs_on:workshop.date},today);pairs.push([workshop,target]);}
    }
    for(const [row,target] of pairs){
      await tx.query(`update activities set occurs_on=$2::date,schedule_status='rescheduled',updated_at=now() where id=$1`,[row.id,target]);
      await syncActivitySchedule(tx,{activityId:row.id,classroomId:owner.classroom_id,title:row.title,occursOn:target});
      await tx.query(`insert into activity_schedule_changes(id,activity_id,previous_date,new_date,change_type,reason,changed_by)
        values($1,$2,$3::date,$4::date,'rescheduled',$5,$6)`,[randomUUID(),row.id,row.date,target,"Intercambio confirmado por la docente",teacherId]);
    }
    return {activity_id:first.id,other_activity_id:second.id,occurs_on:second.date,other_occurs_on:first.date};
  });
}
