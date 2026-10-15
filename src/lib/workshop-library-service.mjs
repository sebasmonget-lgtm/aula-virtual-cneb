import {randomUUID} from 'node:crypto';
import {workshopCatalog,workshopActivityDetails,rankWorkshopCatalog} from './workshop-catalog.mjs';
import {workshopForAge} from './workshop-ages.mjs';
import {versionTransaction,VersionConflictError} from './version-integrity.mjs';
import {lockClassroomSchedule,limaToday} from './activity-schedule-integrity.mjs';
import {loadEffectiveCalendar} from './school-calendar-service.mjs';
import {classroomObservationCoverage} from './classroom-observation-coverage.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';

const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
async function classroom(db,teacherId,classroomId){
  if(!uuid(classroomId))throw new TypeError('Selecciona un aula.');
  const row=(await db.query(`select c.id,ag.age_years as age,sy.id as school_year_id,sy.starts_on,sy.ends_on
    from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
    where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2 and c.status='active'`,[classroomId,teacherId])).rows[0];
  if(!row)throw new TypeError('El aula no está disponible.');
  return row;
}

export async function loadWorkshopLibrary(db,{teacherId,classroomId,today=limaToday()}){
  const own=await classroom(db,teacherId,classroomId),kb=await loadKnowledgeBaseV4();
  const [calendar,counts,developed]=await Promise.all([
    loadEffectiveCalendar(db,{teacherId,classroomId}),
    classroomObservationCoverage(db,{classroomId,year:own,competencyId:null,allCompetencies:true}),
    db.query(`select ac.competency_v4_id as competency_id,count(distinct a.id)::int as developed,
      max(d.execution_date)::text as last_developed from activity_criteria ac join activities a on a.id=ac.activity_id
      join learning_experiences e on e.id=a.experience_id join class_schedule_entries se on se.activity_id=a.id
      join daily_execution_logs d on d.schedule_entry_id=se.id
      where e.classroom_id=$1 and d.status in ('active','completed') and d.actual_started_at is not null
      and d.execution_date between $2::date and $3::date and ac.status='active'
      group by ac.competency_v4_id`,[classroomId,date(own.starts_on),date(own.ends_on)]),
  ]);
  const coverage={};
  for(const w of workshopCatalog)coverage[w.competency_id]??={developed:0,observed_students:0,last_developed:null};
  for(const key of counts.keys()){const id=key.split(':')[0];if(coverage[id])coverage[id].observed_students++;}
  for(const row of developed.rows)if(coverage[row.competency_id])Object.assign(coverage[row.competency_id],row);
  const availableDates=calendar.days.filter(d=>d.is_instructional&&d.date>=today).map(d=>d.date);
  const scheduled=calendar.activities.filter(a=>a.experience_type==='workshop'&&a.status==='active'&&a.schedule_status!=='cancelled')
    .map(a=>({id:a.id,date:a.occurs_on,title:a.title}));
  return {age:Number(own.age),today,available_dates:availableDates,scheduled,coverage,
    competencies:kb.competencyCards.map(c=>({id:c.id,name:c.official_name})),
    workshops:rankWorkshopCatalog(workshopCatalog.map(w=>workshopForAge(w,Number(own.age))??w),coverage)};
}

/** Selection snapshots authored content into existing activities/criteria/calendar. No AI, no parallel observation store. */
export async function scheduleLibraryWorkshop(db,{teacherId,classroomId,workshopId,occursOn,clientRequestId,today=limaToday()}){
  const own=await classroom(db,teacherId,classroomId),entry=workshopCatalog.find(w=>w.id===workshopId);
  const w=entry&&workshopForAge(entry,Number(own.age));
  if(!w)throw new TypeError('Elige un taller de la edad de tu aula.');
  if(!uuid(clientRequestId)||typeof occursOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(occursOn))throw new TypeError('Revisa la fecha del taller.');
  return versionTransaction(db,`workshop-library:${classroomId}`,async tx=>{
    await lockClassroomSchedule(tx,classroomId);
    // Recheck ownership under the same classroom lock used by schedule and observation writers.
    await classroom(tx,teacherId,classroomId);
    const replay=(await tx.query(`select a.id,a.occurs_on::text,a.details from activities a join learning_experiences e on e.id=a.experience_id
      where e.classroom_id=$1 and a.generation_metadata->>'client_request_id'=$2`,[classroomId,clientRequestId])).rows[0];
    if(replay){if(replay.occurs_on!==occursOn||replay.details?.workshop_catalog?.id!==w.id)throw new VersionConflictError('La solicitud ya corresponde a otro taller.');return {id:replay.id,replayed:true};}
    if(occursOn<today||occursOn<date(own.starts_on)||occursOn>date(own.ends_on))throw new TypeError('Elige un día de clase de hoy en adelante.');
    const calendar=await loadEffectiveCalendar(tx,{teacherId,classroomId,from:occursOn,to:occursOn});
    if(!calendar.days.find(d=>d.date===occursOn&&d.is_instructional))throw new TypeError('Ese día no hay clases. Elige otro día.');
    if(calendar.activities.some(a=>a.experience_type==='workshop'&&a.status==='active'&&a.schedule_status!=='cancelled'))
      throw new VersionConflictError('Este día ya tiene un taller. Puedes abrir el que guardaste.');
    const experienceId=randomUUID(),activityId=randomUUID(),details=workshopActivityDetails(w);
    await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'workshop',$3,$4,$5::date,$5::date,'active',$6::jsonb)`,
      [experienceId,classroomId,w.title,w.purpose,occursOn,JSON.stringify({schema:'library-workshop-v1',workshop_catalog:details.workshop_catalog})]);
    await tx.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,status,details,preparation,teacher_confirmed_at,generation_metadata)
      values($1,$2,$3::date,$3::date,$4,$5,'active',$6::jsonb,$7::jsonb,now(),$8::jsonb)`,
      [activityId,experienceId,occursOn,w.title,w.purpose,JSON.stringify(details),JSON.stringify({materials:w.materials}),
        JSON.stringify({source:'workshop_catalog',catalog_version:w.version,client_request_id:clientRequestId,teacher_selected:true})]);
    await tx.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at)
      values($1,$2,$3,$4,$5::jsonb,'active',now())`,[randomUUID(),activityId,w.competency_id,w.criterion,
        JSON.stringify({competency_id:w.competency_id,expected_evidence:w.evidence,observation_focus:[w.criterion]})]);
    // Clock is a presentation default, not a change to the project's daily activity or its sequence.
    const end=11*60+20+w.duration_minutes;
    await tx.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title,is_instructional,sort_order)
      values($1,$2,$3::date,'11:20',$4::time,'workshop',$5,$6,true,70)`,
      [randomUUID(),classroomId,occursOn,`${Math.floor(end/60)}:${String(end%60).padStart(2,'0')}`,activityId,w.title]);
    return {id:activityId,replayed:false};
  });
}
