import { randomUUID } from "node:crypto";
import { pilotSchoolYearDefaults } from "./pilot-school-year-defaults.mjs";

export const currentSchoolYear = (now = new Date()) => Number(new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric" }).format(now));

// Unpublished years stay associated in Auth metadata, without invented dates.
export async function provisionAccountSchoolYear(db, teacherId, year, name = "Docente") {
  const dates = pilotSchoolYearDefaults(year);
  if (!dates) return { year, calendarAvailable: false };
  await db.query("insert into profiles(user_id,display_name) values($1,$2) on conflict(user_id) do nothing",[teacherId,name]);
  const row = (await db.query(`insert into school_years(id,owner_id,year,starts_on,ends_on)
    values($1,$2,$3,$4::date,$5::date) on conflict(owner_id,year) do update set year=school_years.year
    returning id,year`, [randomUUID(),teacherId,year,dates.startsOn,dates.endsOn])).rows[0];
  return { year:Number(row.year),schoolYearId:row.id,calendarAvailable:true };
}
