import { displayPersonName } from "./person-name.mjs";

function isoDate(value) {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

/** Project only the authorized roster; no birth year or photograph leaves here. */
export function birthdayEvents(students, from, to) {
  const start = isoDate(from), end = isoDate(to);
  if (!start || !end || start > end) throw new TypeError("Indica un intervalo de fechas válido.");
  const events = [];
  for (const student of students) {
    if (student.status && student.status !== "active") continue;
    const born = isoDate(student.birth_date);
    if (!born) continue;
    const name = displayPersonName(student.full_name || [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" "));
    if (!student.id || !name) continue;
    const month = Number(born.slice(5, 7)), day = Number(born.slice(8));
    for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const date = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
      if (date < born || date < start || date > end) continue;
      events.push({ student_id: student.id, name,
        short_name: displayPersonName(student.preferred_name || student.first_name || name.split(" ")[0]),
        date, leap_day_adjusted: day > lastDay });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "es") || a.student_id.localeCompare(b.student_id));
}

export function todayBirthdayNotices(students, today) {
  const date = isoDate(today);
  if (!date) throw new TypeError("La fecha de hoy no es válida.");
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);
  const events = birthdayEvents(students, date, tomorrow);
  return { today: events.filter(event => event.date === date), tomorrow: events.filter(event => event.date === tomorrow) };
}

/** Teacher-facing calendar only: do not add these names to planning/AI calendars. */
export async function loadClassroomBirthdays(db, { teacherId, classroomId, year }) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new TypeError("El año del calendario no es válido.");
  const students = (await db.query(`select s.id,s.first_name,s.last_name,s.preferred_name,s.birth_date::text
    from students s join classrooms c on c.id=s.classroom_id
    where c.id=$1 and c.teacher_id=$2 and c.status='active' and s.status='active' and s.birth_date is not null`, [classroomId, teacherId])).rows;
  // Include adjacent years for the first/last week of a month or year.
  return birthdayEvents(students, `${year - 1}-01-01`, `${year + 1}-12-31`);
}
