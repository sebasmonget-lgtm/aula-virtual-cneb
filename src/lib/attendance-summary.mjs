import { defaultEvaluationPeriods } from "./period-evaluation-service.mjs";
import { loadEffectiveCalendar } from "./school-calendar-service.mjs";
import { limaToday } from "./activity-schedule-integrity.mjs";

const dateOnly = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

/** Missing attendance is explicitly pending, never an invented absence/presence. */
export function summarizeAttendance({ students, records, days, from, to, today }) {
  const dates = new Set(days.filter(day => day.is_instructional && day.date >= from && day.date <= to && day.date <= today).map(day => day.date));
  const byStudent = new Map(students.map(student => [student.id, { id: student.id, name: student.name, status: student.status,
    present: 0, late: 0, absent: 0, excused: 0, recorded: 0, total: dates.size }]));
  const distinct = new Map();
  for (const record of records) if (dates.has(dateOnly(record.attendance_date)) && byStudent.has(record.student_id))
    distinct.set(`${record.student_id}:${dateOnly(record.attendance_date)}`, record);
  for (const record of distinct.values()) {
    const child = byStudent.get(record.student_id);
    if (["present", "late", "absent", "excused"].includes(record.status)) { child[record.status]++; child.recorded++; }
  }
  const complete = child => ({ ...child, attended: child.present + child.late, pending: child.total - child.recorded,
    percentage: child.total && child.recorded ? Math.round((child.present + child.late) / child.total * 10000) / 100 : null });
  const children = [...byStudent.values()].map(complete);
  const totals = complete(children.reduce((sum, child) => {
    for (const key of ["present", "late", "absent", "excused", "recorded", "total"]) sum[key] += child[key];
    return sum;
  }, { present: 0, late: 0, absent: 0, excused: 0, recorded: 0, total: 0 }));
  return { from, to, as_of: today < to ? today : to, instructional_days: dates.size, children, totals };
}

export async function loadAttendanceSummary(db, { teacherId, classroomId = null, periodId = null, today = limaToday() }) {
  const classroom = (await db.query(`select c.id,c.section,c.institution_name,c.school_year_id,sy.starts_on,sy.ends_on,ag.age_years as age
    from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
    where c.teacher_id=$1 and sy.owner_id=$1 and c.status='active' and ($2::uuid is null or c.id=$2) limit 1`, [teacherId, classroomId])).rows[0];
  if (!classroom) throw new TypeError("El aula no está disponible.");
  let periods = (await db.query(`select id,label,starts_on::text,ends_on::text from evaluation_periods where school_year_id=$1 order by starts_on`, [classroom.school_year_id])).rows;
  if (!periods.length) {
    const blocks = (await db.query("select type,start_date,end_date from calendar_blocks where school_year_id=$1 order by start_date", [classroom.school_year_id])).rows;
    // Attendance is read-only. Reuse the calendar's period rules without creating
    // evaluation records or backfilling historical assessments from this screen.
    periods = defaultEvaluationPeriods(classroom, blocks).map(row=>({...row,id:`calendar-${row.kind}-${row.ordinal}`}));
  }
  const selected = periodId ? periods.find(period => period.id === periodId) : null;
  if (periodId && !selected) throw new TypeError("El bimestre no pertenece a tu aula.");
  const from = selected?.starts_on ?? dateOnly(classroom.starts_on), to = selected?.ends_on ?? dateOnly(classroom.ends_on);
  const [calendar, students, records] = await Promise.all([
    loadEffectiveCalendar(db, { teacherId, classroomId: classroom.id, from, to }),
    db.query(`select id,concat_ws(' ',first_name,last_name) as name,status from students where classroom_id=$1 order by last_name,first_name,id`, [classroom.id]),
    db.query(`select student_id,attendance_date::text,status from attendance_records where classroom_id=$1 and attendance_date between $2::date and $3::date`, [classroom.id, from, to]),
  ]);
  return { classroom: { id: classroom.id, section: classroom.section, institution_name: classroom.institution_name, age: Number(classroom.age) },
    periods, period_id: periodId, label: selected?.label ?? "Año escolar", ...summarizeAttendance({ students: students.rows, records: records.rows, days: calendar.days, from, to, today }) };
}
