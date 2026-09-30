import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { buildInstitutionInitialsLogo, normalizeInstitutionLogoUpload } from "./institution-logo.mjs";
import { displayPersonName } from "./person-name.mjs";

const yearPattern = /^\d{4}-\d{2}-\d{2}$/;
const text = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const validDate = (value) => yearPattern.test(value ?? "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const isoDay = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const gradeId = (age) => `30000000-0000-4000-8000-00000000000${age}`;

export function validatePilotSetup(value) {
  const result = { teacherName: text(value?.teacherName, 100), institutionName: text(value?.institutionName, 200), section: text(value?.section, 80), institutionCode: text(value?.institutionCode, 40) || null, district: text(value?.district, 100) || null, ugel: text(value?.ugel, 100) || null, directorName: text(value?.directorName, 120) || null, age: Number(value?.age), year: Number(value?.year), startsOn: value?.startsOn, endsOn: value?.endsOn, castellanoL2Applicable: value?.castellanoL2Applicable === true, religionApplicable: value?.religionApplicable === true };
  if (result.teacherName.length < 2 || result.institutionName.length < 2 || !result.section || ![3, 4, 5].includes(result.age) || !Number.isInteger(result.year) || result.year < 2020 || result.year > 2100 || !validDate(result.startsOn) || !validDate(result.endsOn) || result.startsOn > result.endsOn || Number(result.startsOn.slice(0, 4)) !== result.year || Number(result.endsOn.slice(0, 4)) !== result.year) throw new Error("Completa docente, institución, aula, edad 3/4/5 y fechas válidas del año escolar.");
  return result;
}

export async function createPilotClassroom(db, teacherId, input, { assetsDir, logoStorage } = {}) {
  const value = validatePilotSetup(input);
  if (input?.createLogo && input?.logoUpload) throw new TypeError("Elige subir un logo o crearlo con iniciales.");
  const logoBytes = input?.logoUpload ? await normalizeInstitutionLogoUpload(input.logoUpload)
    : input?.createLogo ? buildInstitutionInitialsLogo({ initials: input.logoInitials, primary: input.logoPrimary, accent: input.logoAccent }) : null;
  const logoExtension = input?.createLogo ? "svg" : "png";
  const logoMimeType = input?.createLogo ? "image/svg+xml" : "image/png";
  const logoSize = input?.createLogo ? 512 : 384;
  if (logoBytes && !assetsDir && !logoStorage) throw new Error("No se puede guardar el logo en esta instalación.");
  const logoAssetId = logoBytes ? randomUUID() : null;
  let createdLogoPath = null;
  await db.exec("begin");
  try {
    const active = (await db.query(`select id from classrooms where teacher_id=$1 and status='active'`, [teacherId])).rows[0];
    if (active) throw new Error("Ya existe un aula activa. Edita su perfil antes de crear otra.");
    await db.query(`insert into profiles(user_id,display_name) values($1,$2) on conflict(user_id) do update set display_name=excluded.display_name,updated_at=now()`, [teacherId, value.teacherName]);
    await db.query(`insert into levels(id,name) values('20000000-0000-4000-8000-000000000001','Educación Inicial') on conflict(id) do nothing`);
    await db.query(`insert into age_grades(id,level_id,label,age_years) values($1,'20000000-0000-4000-8000-000000000001',$2,$3) on conflict(level_id,age_years) do nothing`, [gradeId(value.age), `${value.age} años`, value.age]);
    const grade = (await db.query(`select id from age_grades where level_id='20000000-0000-4000-8000-000000000001' and age_years=$1`, [value.age])).rows[0];
    const schoolYearId = randomUUID(), classroomId = randomUUID();
    await db.query(`insert into school_years(id,owner_id,year,starts_on,ends_on) values($1,$2,$3,$4::date,$5::date) on conflict(owner_id,year) do nothing`, [schoolYearId, teacherId, value.year, value.startsOn, value.endsOn]);
    const actualYear = (await db.query(`select id,starts_on,ends_on from school_years where owner_id=$1 and year=$2`, [teacherId, value.year])).rows[0];
    if (isoDay(actualYear.starts_on) !== value.startsOn || isoDay(actualYear.ends_on) !== value.endsOn) throw new Error("El año escolar ya existe con otras fechas; revísalo antes de continuar.");
    await db.query(`insert into institution_profiles(id,owner_user_id,display_name,institution_code,district,ugel,director_name)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(owner_user_id) do update set display_name=excluded.display_name,
      institution_code=excluded.institution_code,district=excluded.district,ugel=excluded.ugel,director_name=excluded.director_name,updated_at=now()`,
    [randomUUID(), teacherId, value.institutionName, value.institutionCode, value.district, value.ugel, value.directorName]);
    if (logoBytes) {
      let relativePath;
      if (logoStorage) {
        relativePath = await logoStorage.save({ teacherId, assetId: logoAssetId, mimeType: logoMimeType, bytes: logoBytes });
        createdLogoPath = relativePath;
      } else {
        relativePath = `.local/assets/${logoAssetId}.${logoExtension}`;
        const filePath = path.join(assetsDir, `${logoAssetId}.${logoExtension}`);
        await writeFile(filePath, logoBytes, { flag: "wx", mode: 0o600 });
        createdLogoPath = filePath;
      }
      await db.query(`insert into institution_assets
        (id, owner_user_id, type, original_path, normalized_path, mime_type, width, height)
        values ($1, $2, 'logo', $3, $3, $4, $5, $5)`, [logoAssetId, teacherId, relativePath, logoMimeType, logoSize]);
      await db.query(`update institution_profiles set logo_asset_id=$1 where owner_user_id=$2`, [logoAssetId, teacherId]);
    }
    await db.query(`insert into classrooms(id,school_year_id,teacher_id,age_grade_id,institution_name,section,castellano_l2_applicable,religion_applicable) values($1,$2,$3,$4,$5,$6,$7,$8)`, [classroomId, actualYear.id, teacherId, grade.id, value.institutionName, value.section, value.castellanoL2Applicable, value.religionApplicable]);
    await db.exec("commit");
    return { classroomId, schoolYearId: actualYear.id };
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    if (createdLogoPath) {
      if (logoStorage) await logoStorage.remove(createdLogoPath, teacherId).catch(() => {});
      else await unlink(createdLogoPath).catch(() => {});
    }
    throw error;
  }
}

function parseDelimited(input, separator) {
  const rows = [], row = [];
  let field = "", quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') { if (quoted && input[index + 1] === '"') { field += '"'; index++; } else if (quoted || !field) quoted = !quoted; else throw new Error("CSV con comillas inválidas."); }
    else if (char === separator && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[index + 1] === "\n") index++; row.push(field); if (row.some((part) => part.trim())) rows.push([...row]); row.length = 0; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV con comillas sin cerrar.");
  row.push(field); if (row.some((part) => part.trim())) rows.push(row);
  return rows;
}

export function parseStudentCsv(input) {
  if (typeof input !== "string" || input.length > 20_000) throw new Error("El CSV es inválido o demasiado grande.");
  const rows = parseDelimited(input.replace(/^\uFEFF/, ""), input.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",");
  const header = rows.shift()?.map((field) => field.trim().toLowerCase());
  if (!header || !["first_name", "last_name", "preferred_name"].every((field, index) => header[index] === field)
    || ![3, 4].includes(header.length) || (header.length === 4 && header[3] !== "birth_date"))
    throw new Error("El CSV debe comenzar con first_name,last_name,preferred_name y puede añadir birth_date.");
  return rows.map((row) => { if (row.length !== header.length) throw new Error("Cada fila CSV debe tener las columnas del encabezado."); return { firstName: row[0], lastName: row[1], preferredName: row[2], birthDate: row[3] }; });
}

export function validateStudentsForImport(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 40) throw new Error("Importa entre 1 y 40 niños por vez.");
  return input.map((row) => {
    const firstName = text(row?.firstName, 80), lastName = text(row?.lastName, 80), preferredName = text(row?.preferredName, 80);
    const birthDate = typeof row?.birthDate === "string" ? row.birthDate.trim() || null : null;
    if (firstName.length < 2 || lastName.length < 2 || [firstName, lastName, preferredName].some((part) => /[\x00-\x1F<>]|^[=+@]/.test(part))) throw new Error("Cada niño requiere nombre y apellido válidos.");
    if (birthDate && (!validDate(birthDate) || birthDate > new Date().toISOString().slice(0, 10) || birthDate < "2000-01-01"))
      throw new Error("La fecha de nacimiento debe ser válida y no futura.");
    return { firstName: displayPersonName(firstName), lastName: displayPersonName(lastName), preferredName: preferredName ? displayPersonName(preferredName) : null, birthDate };
  });
}

export async function importStudentsForTeacher(db, teacherId, input) {
  const students = validateStudentsForImport(input);
  await db.exec("begin");
  try {
    const classroom = (await db.query(`select id from classrooms where teacher_id=$1 and status='active'`, [teacherId])).rows[0];
    if (!classroom) throw new Error("Configura primero un aula activa.");
    const current = Number((await db.query(`select count(*)::int as count from students where classroom_id=$1 and status='active'`, [classroom.id])).rows[0].count);
    if (current + students.length > 45) throw new Error("El aula admite hasta 45 niños activos en este piloto.");
    for (const student of students) await db.query(`insert into students(id,classroom_id,first_name,last_name,preferred_name,birth_date) values($1,$2,$3,$4,$5,$6::date)`, [randomUUID(), classroom.id, student.firstName, student.lastName, student.preferredName, student.birthDate]);
    await db.exec("commit");
    return students.length;
  } catch (error) { await db.exec("rollback"); throw error; }
}
