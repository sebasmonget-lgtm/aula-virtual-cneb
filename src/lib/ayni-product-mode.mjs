import { VersionConflictError } from './version-integrity.mjs';

export const AYNI_PRODUCT_MODES = ['daily', 'documents'];

/** Identity is supplied by request authentication, never by a request body. */
export async function loadAyniProductMode(db, teacherId) {
  const profile = (await db.query('select preferences from profiles where user_id=$1', [teacherId])).rows[0];
  const saved = profile?.preferences?.ayni_product_mode;
  if (AYNI_PRODUCT_MODES.includes(saved)) return { mode: saved, chosen: true };
  const existing = (await db.query('select id from classrooms where teacher_id=$1 limit 1', [teacherId])).rows.length > 0;
  return { mode: existing ? 'daily' : null, chosen: existing };
}

export async function chooseAyniProductMode(db, teacherId, input) {
  if (!input || Object.keys(input).length !== 1 || !AYNI_PRODUCT_MODES.includes(input.mode))
    throw new TypeError('Elige cómo quieres usar Ayni.');
  // Serialize first-use choices on the profile; preserve all other preferences.
  await db.query("insert into profiles(user_id,display_name) values($1,'Docente') on conflict(user_id) do nothing", [teacherId]);
  const result = await db.query(`update profiles set preferences=jsonb_set(coalesce(preferences,'{}'::jsonb),
    '{ayni_product_mode}',to_jsonb($2::text)),updated_at=now() where user_id=$1
    and (preferences->>'ayni_product_mode'=$2 or
      (preferences->>'ayni_product_mode' is null and not exists(select 1 from classrooms where teacher_id=$1)))
    returning user_id`, [teacherId, input.mode]);
  if (!result.rows.length) throw new VersionConflictError('Esta cuenta ya tiene una modalidad. Vuelve a abrir Ayni para continuar con su configuración.');
  return { mode: input.mode, chosen: true };
}

export async function isDocumentGenerator(db, teacherId) {
  return (await loadAyniProductMode(db, teacherId)).mode === 'documents';
}
