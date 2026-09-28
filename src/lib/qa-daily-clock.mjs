/** Opt-in, local-clone-only daily execution clock. It never changes the OS or H34 closure dates. */
export function readQADailyClock(env = process.env) {
  if (env.AYNI_QA_DAILY_CLOCK !== "1") return null;
  if (env.NODE_ENV !== "test" || !/(?:^|[\\/])\.local[\\/]qa-backups[\\/]f(?:[3-9]|1[0-2])-restored(?:-v\d+)?$/.test(env.AYNI_LOCAL_DATA_DIR ?? "") || env.DATABASE_URL)
    throw new Error("El reloj QA solo funciona en un clon local aislado y proceso test.");
  const date = env.AYNI_QA_DATE, time = env.AYNI_QA_TIME;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time ?? "") ||
    !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date)
    throw new Error("Fecha u hora QA inválida.");
  return { date, time };
}
