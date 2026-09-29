import { randomUUID } from "node:crypto";

const iso = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0,10);
  const text=String(value??"");
  if(/^\d{4}-\d{2}-\d{2}/.test(text))return text.slice(0,10);
  const parsed=new Date(text);return Number.isNaN(parsed.getTime())?text.slice(0,10):parsed.toISOString().slice(0,10);
};
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");

export class SchoolCalendarError extends Error {
  constructor(reason, message) { super(message); this.name = "SchoolCalendarError"; this.reason = reason; }
}
const BLOCKS_2026=[
  [0,"management","Gestión inicial","2026-03-02","2026-03-13"],[1,"instructional","Periodo lectivo 1","2026-03-16","2026-05-15"],
  [2,"management","Semana de gestión","2026-05-18","2026-05-22"],[3,"instructional","Periodo lectivo 2","2026-05-25","2026-07-24"],
  [4,"management","Semanas de gestión","2026-07-27","2026-08-07"],[5,"instructional","Periodo lectivo 3","2026-08-10","2026-10-09"],
  [6,"management","Semana de gestión","2026-10-12","2026-10-16"],[7,"instructional","Periodo lectivo 4","2026-10-19","2026-12-18"],
  [8,"management","Gestión final","2026-12-21","2026-12-31"]
];

export function classifyCalendarDay({ date, block = null, holiday = null }) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (holiday) return { calendar_type: "national_holiday", is_instructional: false,
    source: holiday.source_name ?? "Plataforma del Estado Peruano", reason: holiday.name, editable: false, school_override: false };
  if (block?.type === "management") return { calendar_type: "management_week", is_instructional: false,
    source: "MINEDU", reason: block.label, editable: false, school_override: false };
  if (day === 0 || day === 6) return { calendar_type: "weekend", is_instructional: false,
    source: "Sistema", reason: "Fin de semana", editable: false, school_override: false };
  if (block?.type === "instructional") return { calendar_type: "instructional_day", is_instructional: true,
    source: "MINEDU", reason: block.label, editable: true, school_override: false };
  return { calendar_type: "school_non_instructional", is_instructional: false,
    source: "MINEDU", reason: block?.label ?? "Fuera de bloque lectivo", editable: false, school_override: false };
}

export function effectiveCalendarDay(base, override = null) {
  if (!override || override.reverted_at) return { ...base, date: iso(base.date) };
  return { ...base, date: iso(base.date), calendar_type: override.new_calendar_type,
    is_instructional: override.new_is_instructional, source: "Calendario del aula", reason: override.reason,
    editable: true, school_override: true, override_id: override.id };
}

export function candidateProjectDates(days, startsOn, endsOn, exclusions = []) {
  if (!isDate(startsOn) || !isDate(endsOn) || startsOn > endsOn)
    throw new SchoolCalendarError("invalid_interval", "Revisa las fechas propuestas para el proyecto.");
  const excluded = new Map(exclusions.map((item) => [iso(item.date), item]));
  return days.filter((item) => startsOn <= iso(item.date) && iso(item.date) <= endsOn).map((item) => {
    const exclusion = excluded.get(iso(item.date));
    return { ...item, date: iso(item.date), selected: item.is_instructional && !exclusion,
      exclusion_reason: exclusion?.exclusion_reason ?? null };
  });
}

export function validateSelectedInstructionalDates(days, selectedDates, startsOn, endsOn) {
  const byDate = new Map(days.map((item) => [iso(item.date), item]));
  const unique = [...new Set(selectedDates ?? [])].sort();
  if (!unique.length) throw new SchoolCalendarError("no_dates", "Selecciona al menos un día de clase para continuar.");
  for (const date of unique) {
    const day = byDate.get(date);
    if (!isDate(date) || date < startsOn || date > endsOn || !day?.is_instructional)
      throw new SchoolCalendarError("blocked_date", `${date} no es un día de clase disponible.`);
  }
  return unique;
}

export function validateBlueprintDates(blueprints, selectedDates) {
  const expected = [...selectedDates].sort();
  const actual = (blueprints ?? []).map((item) => item.planned_date ?? item.date).sort();
  if (actual.length !== expected.length || actual.some((date, index) => date !== expected[index]))
    throw new SchoolCalendarError("blueprint_dates_mismatch", "El mapa debe tener exactamente una actividad por cada día confirmado.");
  return true;
}

export async function ensureSchoolCalendar(db, schoolYearId) {
  let version = (await db.query(`select * from school_calendar_versions where school_year_id=$1 and status='active' limit 1`, [schoolYearId])).rows[0];
  if (version) return version;
  const schoolYear = (await db.query(`select id,year,starts_on,ends_on from school_years where id=$1`, [schoolYearId])).rows[0];
  if (!schoolYear) throw new SchoolCalendarError("year_missing", "No se encontró el año escolar.");
  if (Number(schoolYear.year) !== 2026) throw new SchoolCalendarError("calendar_unavailable", `El calendario oficial ${schoolYear.year} todavía no está cargado.`);
  const id = randomUUID();
  version = (await db.query(`insert into school_calendar_versions(id,school_year_id,calendar_year,name,version,source_name,source_url,source_metadata)
    values($1,$2,$3,$4,'MINEDU-2026-RM-501-2025-v1','Ministerio de Educación del Perú',
    'https://repositorio.minedu.gob.pe/handle/20.500.12799/11753',$5::jsonb) returning *`,
  [id,schoolYearId,schoolYear.year,`Calendario MINEDU ${schoolYear.year}`,JSON.stringify({ resolution:"RM 501-2025-MINEDU",instructional_weeks:36,management_weeks:8 })])).rows[0];
  // The official base is independent from the legacy, editable annual-plan blocks.
  // Classroom differences belong in classroom_calendar_overrides.
  const blocks = BLOCKS_2026.map(([sort_order,type,label,start_date,end_date]) =>
    ({ sort_order,type,label,start_date,end_date }));
  const holidays = (await db.query(`select * from school_calendar_holidays where calendar_year=$1`,[schoolYear.year])).rows;
  const start = blocks.length ? iso(blocks[0].start_date) : iso(schoolYear.starts_on);
  const end = blocks.length ? iso(blocks.at(-1).end_date) : iso(schoolYear.ends_on);
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor <= new Date(`${end}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate()+1)) {
    const date = cursor.toISOString().slice(0,10);
    const block = blocks.find((item) => iso(item.start_date)<=date && date<=iso(item.end_date));
    const holiday = holidays.find((item) => iso(item.holiday_date)===date);
    const day = classifyCalendarDay({ date, block, holiday });
    await db.query(`insert into school_calendar_days(id,calendar_version_id,date,day_of_week,calendar_type,is_instructional,source,reason,editable,school_override)
      values($1,$2,$3::date,$4,$5,$6,$7,$8,$9,false) on conflict(calendar_version_id,date) do nothing`,
    [randomUUID(),id,date,cursor.getUTCDay(),day.calendar_type,day.is_instructional,day.source,day.reason,day.editable]);
  }
  return version;
}

export async function loadEffectiveCalendar(db, { teacherId, classroomId = null, from = null, to = null }) {
  const classroom = (await db.query(`select c.id,c.section,c.school_year_id,sy.year,sy.starts_on,sy.ends_on
    from classrooms c join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and ($2::uuid is null or c.id=$2) and c.status='active' limit 1`,[teacherId,classroomId])).rows[0];
  if (!classroom) throw new SchoolCalendarError("classroom_missing", "No se encontró el aula.");
  const version = await ensureSchoolCalendar(db,classroom.school_year_id);
  const start = from && isDate(from) ? from : iso(classroom.starts_on);
  const end = to && isDate(to) ? to : iso(classroom.ends_on);
  const rows = (await db.query(`select d.*,o.id as override_id,o.new_calendar_type,o.new_is_instructional,o.reason as override_reason,o.reverted_at
    from school_calendar_days d
    left join classroom_calendar_overrides o on o.classroom_id=$1 and o.override_date=d.date and o.reverted_at is null
    where d.calendar_version_id=$2 and d.date between $3::date and $4::date order by d.date`,[classroom.id,version.id,start,end])).rows;
  const days = rows.map((row) => effectiveCalendarDay({ id:row.id,date:row.date,day_of_week:Number(row.day_of_week),calendar_type:row.calendar_type,
    is_instructional:row.is_instructional,source:row.source,reason:row.reason,editable:row.editable,school_override:row.school_override },
  row.override_id ? { id:row.override_id,new_calendar_type:row.new_calendar_type,new_is_instructional:row.new_is_instructional,reason:row.override_reason,reverted_at:row.reverted_at } : null));
  const blocks = Number(classroom.year) === 2026 ? BLOCKS_2026.map(([sort_order,type,label,start_date,end_date]) =>
    ({ sort_order,type,label,start_date,end_date })) : [];
  const experiences = (await db.query(`select id,title,type,starts_on::text,ends_on::text,status,details from learning_experiences
    where classroom_id=$1 and status in ('active','draft') and starts_on<=$3::date and ends_on>=$2::date order by starts_on`,[classroom.id,start,end])).rows;
  const activities = (await db.query(`select a.id,a.title,a.occurs_on::text,a.planned_date::text,a.schedule_status,a.status,
    a.experience_id,e.title as experience_title,e.type as experience_type,a.details,
    coalesce(se.start_time::text,'') as start_time
    from activities a join learning_experiences e on e.id=a.experience_id
    left join lateral(select start_time from class_schedule_entries where activity_id=a.id and scheduled_on=a.occurs_on order by start_time limit 1)se on true
    where e.classroom_id=$1 and a.occurs_on between $2::date and $3::date and a.status in ('draft','active','archived') order by a.occurs_on,se.start_time`,[classroom.id,start,end])).rows;
  return { classroom:{ id:classroom.id,section:classroom.section,year:Number(classroom.year),starts_on:iso(classroom.starts_on),ends_on:iso(classroom.ends_on) },
    version:{ id:version.id,name:version.name,version:version.version,source_name:version.source_name,source_url:version.source_url,source_metadata:version.source_metadata },
    days,blocks,experiences,activities };
}

export async function saveClassroomOverride(db, { teacherId, classroomId, date, isInstructional, reason, confirmOfficialException = false }) {
  if (!isDate(date) || !String(reason ?? "").trim()) throw new SchoolCalendarError("invalid_override", "Indica la fecha y el motivo del cambio.");
  const calendar = await loadEffectiveCalendar(db,{teacherId,classroomId,from:date,to:date});
  const day = calendar.days[0];
  if (!day) throw new SchoolCalendarError("date_outside_year", "La fecha está fuera del calendario escolar.");
  if (isInstructional && ["national_holiday","management_week","weekend"].includes(day.calendar_type) && confirmOfficialException !== true)
    throw new SchoolCalendarError("authorization_required", "Este día está bloqueado por el calendario oficial y requiere un flujo autorizado.");
  await db.query(`update classroom_calendar_overrides set reverted_at=now(),reverted_by=$1 where classroom_id=$2 and override_date=$3::date and reverted_at is null`,[teacherId,classroomId,date]);
  const inserted = (await db.query(`insert into classroom_calendar_overrides(id,classroom_id,override_date,previous_calendar_type,new_calendar_type,
    previous_is_instructional,new_is_instructional,reason,changed_by) values($1,$2,$3::date,$4,$5,$6,$7,$8,$9) returning *`,
  [randomUUID(),classroomId,date,day.calendar_type,isInstructional?"school_instructional_override":"school_non_instructional",day.is_instructional,isInstructional,String(reason).trim(),teacherId])).rows[0];
  return inserted;
}

export async function syncActivitySchedule(db, { activityId, classroomId, title, occursOn, runner = db }) {
  const existing = (await runner.query(`select id from class_schedule_entries where activity_id=$1 and classroom_id=$2 and scheduled_on is not null order by scheduled_on limit 1`,[activityId,classroomId])).rows[0];
  if (existing) {
    await runner.query(`update class_schedule_entries set scheduled_on=$1::date,title=$2 where id=$3`,[occursOn,title,existing.id]);
    return existing.id;
  }
  const id=randomUUID();
  await runner.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title,is_instructional,sort_order)
    values($1,$2,$3::date,'09:00','09:45','activity',$4,$5,true,50)`,[id,classroomId,occursOn,activityId,title]);
  return id;
}

export async function reprogramActivity(db,{teacherId,activityId,newDate,reason,changeType="rescheduled"}) {
  const row=(await db.query(`select a.id,a.title,a.occurs_on::text,a.experience_id,e.classroom_id,e.starts_on::text,e.ends_on::text
    from activities a join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id
    where a.id=$1 and c.teacher_id=$2`,[activityId,teacherId])).rows[0];
  if(!row)throw new SchoolCalendarError("activity_missing","No se encontró la actividad.");
  if(changeType!=="rescheduled"){
    await db.query(`update activities set schedule_status=$1 where id=$2`,[changeType,activityId]);
    await db.query(`insert into activity_schedule_changes(id,activity_id,previous_date,new_date,change_type,reason,changed_by) values($1,$2,$3::date,null,$4,$5,$6)`,[randomUUID(),activityId,row.occurs_on,changeType,String(reason??"").trim()||"Decisión docente",teacherId]);
    return {id:activityId,occurs_on:row.occurs_on,schedule_status:changeType};
  }
  const calendar=await loadEffectiveCalendar(db,{teacherId,classroomId:row.classroom_id,from:newDate,to:newDate});
  validateSelectedInstructionalDates(calendar.days,[newDate],row.starts_on,row.ends_on);
  const conflict=(await db.query(`select a.id,a.title from activities a join learning_experiences e on e.id=a.experience_id
    where e.classroom_id=$1 and a.occurs_on=$2::date and a.id<>$3 and a.status in ('draft','active') limit 1`,[row.classroom_id,newDate,activityId])).rows[0];
  if(conflict)throw new SchoolCalendarError("date_conflict",`Ya existe una actividad ese día: ${conflict.title}.`);
  await db.query("begin");
  try{
    await db.query(`update activities set occurs_on=$1::date,schedule_status='rescheduled',updated_at=now() where id=$2`,[newDate,activityId]);
    await syncActivitySchedule(db,{activityId,classroomId:row.classroom_id,title:row.title,occursOn:newDate});
    await db.query(`insert into activity_schedule_changes(id,activity_id,previous_date,new_date,change_type,reason,changed_by) values($1,$2,$3::date,$4::date,'rescheduled',$5,$6)`,[randomUUID(),activityId,row.occurs_on,newDate,String(reason??"").trim()||"Reprogramación docente",teacherId]);
    await db.query("commit");
  }catch(error){await db.query("rollback");throw error;}
  return {id:activityId,occurs_on:newDate,schedule_status:"rescheduled"};
}
