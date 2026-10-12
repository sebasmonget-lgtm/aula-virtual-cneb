import { VersionConflictError } from "./version-integrity.mjs";

export function normalizeSetupDraft(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Datos del aula inválidos.");
  const result = {};
  for (const [key, max] of Object.entries({ teacherName: 100, institutionName: 200, section: 80, institutionCode: 40, district: 100, ugel: 100, directorName: 120, logoInitials: 3 })) {
    result[key] = typeof input[key] === "string" ? input[key].slice(0, max) : "";
  }
  result.age = [3, 4, 5].includes(input.age) ? input.age : null;
  result.year = Number.isInteger(input.year) && input.year >= 2020 && input.year <= 2100 ? input.year : 2026;
  result.createLogo = input.createLogo === true;
  for (const [key, fallback] of Object.entries({ logoPrimary: "#087d96", logoAccent: "#f6c85f" })) result[key] = /^#[0-9a-f]{6}$/i.test(input[key] ?? "") ? input[key] : fallback;
  if (input.logoUpload && !result.createLogo) {
    const { mimeType, base64 } = input.logoUpload;
    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType) || typeof base64 !== "string" || !base64.length || base64.length > 2_666_668 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || Buffer.from(base64, "base64").length > 2_000_000) throw new TypeError("Elige un logo PNG, JPG o WebP de hasta 2 MB.");
    result.logoUpload = { mimeType, base64 };
  }
  return result;
}

export async function loadSetupDraft(db, teacherId) {
  return (await db.query("select preferences->'classroom_setup' as draft from profiles where user_id=$1", [teacherId])).rows[0]?.draft ?? null;
}

export async function saveSetupDraft(db, teacherId, input) {
  const draft = normalizeSetupDraft(input);
  await db.exec("begin");
  try {
    // Share the final creation lock: a delayed autosave cannot resurrect completed setup.
    await db.query("select pg_advisory_xact_lock(hashtext($1))", [`pilot-setup:${teacherId}`]);
    if ((await db.query("select id from classrooms where teacher_id=$1 and status='active'", [teacherId])).rows[0]) throw new VersionConflictError("El aula ya se guardó. Recarga para continuar.");
    await db.query(`insert into profiles(user_id,display_name,preferences) values($1,'Docente',jsonb_build_object('classroom_setup',$2::jsonb))
      on conflict(user_id) do update set preferences=jsonb_set(profiles.preferences,'{classroom_setup}',$2::jsonb),updated_at=now()`, [teacherId, JSON.stringify(draft)]);
    await db.exec("commit");
    return { saved: true };
  } catch (error) { await db.exec("rollback").catch(() => {}); throw error; }
}
