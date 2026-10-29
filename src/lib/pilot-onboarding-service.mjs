import {writeMultiAgeClassroom} from './multi-age-local-service.mjs';
import { createHash, randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { buildInstitutionInitialsLogo, normalizeInstitutionLogoUpload } from "./institution-logo.mjs";
import { validateStudentsForImport } from "./student-import.mjs";
import { measureSetupPhase } from "./setup-performance.mjs";
import { VersionConflictError } from "./version-integrity.mjs";
export { parseStudentCsv, validateStudentsForImport } from "./student-import.mjs";

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

export async function createPilotClassroom(db, teacherId, input, { assetsDir, logoStorage, multiAge, assetsRelativeRoot } = {}) {
  const value = validatePilotSetup(input);
  const submissionId = input?.submissionId ?? null;
  if (submissionId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) throw new TypeError("Identificador de guardado inválido.");
  if (input?.createLogo && input?.logoUpload) throw new TypeError("Elige subir un logo o crearlo con iniciales.");
  const logoBytes = await measureSetupPhase("logo_decode", () => input?.logoUpload ? normalizeInstitutionLogoUpload(input.logoUpload)
    : input?.createLogo ? buildInstitutionInitialsLogo({ initials: input.logoInitials, primary: input.logoPrimary, accent: input.logoAccent }) : null);
  const fingerprint = createHash("sha256").update(JSON.stringify(multiAge?{...value,multiAge}:value)).update(logoBytes ?? "").digest("hex");
  const logoExtension = input?.createLogo ? "svg" : "png";
  const logoMimeType = input?.createLogo ? "image/svg+xml" : "image/png";
  const logoSize = input?.createLogo ? 512 : 384;
  if (logoBytes && !assetsDir && !logoStorage) throw new Error("No se puede guardar el logo en esta instalación.");
  const logoAssetId = logoBytes ? randomUUID() : null;
  let createdLogoPath = null;
  let commitAttempted = false;
  let classroomId = randomUUID();
  await db.exec("begin");
  try {
    await db.query("select pg_advisory_xact_lock(hashtext($1))", [`pilot-setup:${teacherId}`]);
    const active = (await db.query(`select id,school_year_id,to_jsonb(c)->'setup_submission' as setup_submission from classrooms c where teacher_id=$1 and status='active'`, [teacherId])).rows[0];
    if (active) {
      if (submissionId && active.setup_submission?.id === submissionId) {
        if (active.setup_submission.fingerprint !== fingerprint) throw new VersionConflictError("Esta solicitud ya guardó otros datos. Recarga para revisar el aula guardada.");
        await db.exec("commit");
        return { classroomId: active.id, schoolYearId: active.school_year_id, replayed: true };
      }
      throw new VersionConflictError("Ya existe un aula activa. Recarga para revisar sus datos antes de editarla.");
    }
    await db.query(`insert into profiles(user_id,display_name) values($1,$2) on conflict(user_id) do update set display_name=excluded.display_name,preferences=profiles.preferences-'classroom_setup',updated_at=now()`, [teacherId, value.teacherName]);
    if(!(await db.query("select id from levels where id='20000000-0000-4000-8000-000000000001'")).rows.length)await db.query(`insert into levels(id,name) values('20000000-0000-4000-8000-000000000001','Educación Inicial') on conflict(id) do nothing`);
    if(!(await db.query("select id from age_grades where level_id='20000000-0000-4000-8000-000000000001' and age_years=$1",[value.age])).rows.length)await db.query(`insert into age_grades(id,level_id,label,age_years) values($1,'20000000-0000-4000-8000-000000000001',$2,$3) on conflict(level_id,age_years) do nothing`, [gradeId(value.age), `${value.age} años`, value.age]);
    const grade = (await db.query(`select id from age_grades where level_id='20000000-0000-4000-8000-000000000001' and age_years=$1`, [value.age])).rows[0];
    const schoolYearId = randomUUID();
    await db.query(`insert into school_years(id,owner_id,year,starts_on,ends_on) values($1,$2,$3,$4::date,$5::date) on conflict(owner_id,year) do nothing`, [schoolYearId, teacherId, value.year, value.startsOn, value.endsOn]);
    const actualYear = (await db.query(`select id,starts_on,ends_on from school_years where owner_id=$1 and year=$2`, [teacherId, value.year])).rows[0];
    if (isoDay(actualYear.starts_on) !== value.startsOn || isoDay(actualYear.ends_on) !== value.endsOn) throw new Error("El año escolar ya existe con otras fechas; revísalo antes de continuar.");
    const institution = (await db.query(`insert into institution_profiles(id,owner_user_id,display_name,institution_code,district,ugel,director_name)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(owner_user_id) do update set display_name=excluded.display_name,
      institution_code=excluded.institution_code,district=excluded.district,ugel=excluded.ugel,director_name=excluded.director_name,updated_at=now() returning logo_asset_id`,
    [randomUUID(), teacherId, value.institutionName, value.institutionCode, value.district, value.ugel, value.directorName])).rows[0];
    if (logoBytes) {
      let relativePath;
      if (logoStorage) {
        relativePath = await measureSetupPhase("logo_upload", () => logoStorage.save({ teacherId, assetId: logoAssetId, mimeType: logoMimeType, bytes: logoBytes }));
        createdLogoPath = relativePath;
      } else {
        relativePath = `${assetsRelativeRoot??".local/assets"}/${logoAssetId}.${logoExtension}`;
        const filePath = path.join(assetsDir, `${logoAssetId}.${logoExtension}`);
        await writeFile(filePath, logoBytes, { flag: "wx", mode: 0o600 });
        createdLogoPath = filePath;
      }
      await db.query(`insert into institution_assets
        (id, owner_user_id, type, original_path, normalized_path, mime_type, width, height)
        values ($1, $2, 'logo', $3, $3, $4, $5, $5)`, [logoAssetId, teacherId, relativePath, logoMimeType, logoSize]);
      await db.query(`update institution_profiles set logo_asset_id=$1 where owner_user_id=$2`, [logoAssetId, teacherId]);
    }
    if(multiAge){
      const saved=await writeMultiAgeClassroom(db,teacherId,{...input,...multiAge},multiAge);classroomId=saved.classroomId;
      if(submissionId)await db.query('update classrooms set setup_submission=$2::jsonb where id=$1',[classroomId,JSON.stringify({id:submissionId,fingerprint})]);
    }else{
    await db.query(`insert into classrooms(id,school_year_id,teacher_id,age_grade_id,institution_name,section,castellano_l2_applicable,religion_applicable${submissionId ? ",setup_submission" : ""}) values($1,$2,$3,$4,$5,$6,$7,$8${submissionId ? ",$9::jsonb" : ""})`, [classroomId, actualYear.id, teacherId, grade.id, value.institutionName, value.section, value.castellanoL2Applicable, value.religionApplicable, ...(submissionId ? [JSON.stringify({ id: submissionId, fingerprint })] : [])]);
    }
    commitAttempted = true;
    await db.exec("commit");
    return { classroomId, schoolYearId: actualYear.id, initialProfile: {
      teacher_name: value.teacherName, institution_name: value.institutionName, section: value.section,
      institution_code: value.institutionCode, district: value.district, ugel: value.ugel,
      director_name: value.directorName, age_years: value.age, age_label: `${value.age} años`,
      school_year: value.year, logo_asset_id: logoAssetId ?? institution.logo_asset_id,
    } };
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    if (commitAttempted) {
      // A lost COMMIT response does not mean the write failed. Preserve its logo
      // unless the database positively confirms this new classroom is absent.
      let confirmed;
      try { confirmed = (await db.query("select id,school_year_id from classrooms where id=$1 and teacher_id=$2",[classroomId,teacherId])).rows[0]; }
      catch { throw error; }
      if (confirmed) return {classroomId:confirmed.id,schoolYearId:confirmed.school_year_id,replayed:true};
    }
    if (createdLogoPath) {
      if (logoStorage) await logoStorage.remove(createdLogoPath, teacherId).catch(() => {});
      else await unlink(createdLogoPath).catch(() => {});
    }
    throw error;
  }
}

export async function importStudentsForTeacher(db, teacherId, input, { clientRequestId, returnReceipt = false } = {}) {
  const students = validateStudentsForImport(input);
  if (clientRequestId != null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientRequestId))
    throw new TypeError("Identificador de registro inválido.");
  const fingerprint = createHash("sha256").update(JSON.stringify(students)).digest("hex");
  await db.exec("begin");
  try {
    const classroom = (await db.query(`select id from classrooms where teacher_id=$1 and status='active' for update`, [teacherId])).rows[0];
    if (!classroom) throw new Error("Configura primero un aula activa.");
    // Receipt and pupils commit together. Names are never used as a uniqueness key.
    const receiptKey = clientRequestId?.toLowerCase();
    const profile = receiptKey ? (await db.query(`select preferences from profiles where user_id=$1 for update`, [teacherId])).rows[0] : null;
    if (receiptKey && !profile) throw new Error("Perfil docente no disponible.");
    const previous = profile?.preferences?.student_import_requests?.[receiptKey];
    if (previous) {
      if (previous.fingerprint !== fingerprint || previous.classroomId !== classroom.id)
        throw new VersionConflictError("Este registro ya se utilizó con otros datos. Recarga la lista.");
      await db.exec("commit");
      return returnReceipt ? { count: previous.studentIds.length, studentIds: previous.studentIds, replayed: true, classroomId: classroom.id } : previous.studentIds.length;
    }
    const current = Number((await db.query(`select count(*)::int as count from students where classroom_id=$1 and status='active'`, [classroom.id])).rows[0].count);
    if (current + students.length > 45) throw new Error("El aula admite hasta 45 niños activos en este piloto.");
    const studentIds = students.map(() => randomUUID());
    await db.query(`insert into students(id,classroom_id,first_name,last_name,preferred_name,birth_date)
      select id,$1,first_name,last_name,preferred_name,birth_date from jsonb_to_recordset($2::jsonb)
      as x(id uuid,first_name text,last_name text,preferred_name text,birth_date date)`,
      [classroom.id, JSON.stringify(students.map((student, index) => ({ id: studentIds[index], first_name: student.firstName,
        last_name: student.lastName, preferred_name: student.preferredName, birth_date: student.birthDate })))]);
    if (receiptKey) await db.query(`update profiles set preferences=jsonb_set(coalesce(preferences,'{}'::jsonb),
      '{student_import_requests}',coalesce(preferences->'student_import_requests','{}'::jsonb)||$2::jsonb),updated_at=now() where user_id=$1`,
      [teacherId, JSON.stringify({ [receiptKey]: { fingerprint, classroomId: classroom.id, studentIds } })]);
    await db.exec("commit");
    return returnReceipt ? { count: students.length, studentIds, replayed: false, classroomId: classroom.id } : students.length;
  } catch (error) { await db.exec("rollback"); throw error; }
}
