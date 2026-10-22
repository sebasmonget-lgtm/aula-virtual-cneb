import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "__Host-ayni_qa_clock";
const defaultClock = Object.freeze({ date: "2026-02-16", time: "08:00" });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function previewQAClockAllowed(teacherId, role, env = process.env) {
  const allowedId = env.VERCEL_ENV === "preview" && env.AYNI_QA_PREVIEW_CLOCK === "1"
    ? env.AYNI_QA_TEACHER_ID
    : env.VERCEL_ENV === "production" && env.AYNI_QA_PRODUCTION_CLOCK === "1"
      ? env.AYNI_QA_PRODUCTION_TEACHER_ID : null;
  return uuid.test(allowedId ?? "") && teacherId === allowedId
    && role === "teacher" && typeof env.AYNI_SESSION_SIGNING_KEY === "string"
    && env.AYNI_SESSION_SIGNING_KEY.length >= 32;
}

export function realQAClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

export function resetPreviewQAClockCookie(context, env = process.env) {
  if (!previewQAClockAllowed(context.teacherId, context.role, env)) throw new Error("Reloj QA no disponible.");
  return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function validateQAClock(value) {
  if (!value || !/^2026-\d{2}-\d{2}$/.test(value.date ?? "")
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time ?? "")
    || !Number.isFinite(Date.parse(`${value.date}T12:00:00Z`))
    || new Date(`${value.date}T12:00:00Z`).toISOString().slice(0, 10) !== value.date)
    throw new TypeError("Elige una fecha válida de 2026 y una hora entre 00:00 y 23:59.");
  return { date: value.date, time: value.time };
}

const sign = (payload, key) => createHmac("sha256", key).update(`ayni-qa-clock-v1.${payload}`).digest();

export function readPreviewQAClock(request, context, env = process.env) {
  if (!previewQAClockAllowed(context.teacherId, context.role, env)) return null;
  const fallback = env.VERCEL_ENV === "preview" ? { ...defaultClock } : null;
  const cookie = String(request.headers.cookie ?? "").split(";")
    .map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!cookie) return fallback;
  try {
    if (cookie.length > 1024) return fallback;
    const [payload, signature, extra] = cookie.split(".");
    if (extra || !payload || !signature) return fallback;
    const expected = sign(payload, env.AYNI_SESSION_SIGNING_KEY);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return fallback;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.teacherId !== context.teacherId) return fallback;
    return validateQAClock(value);
  } catch { return fallback; }
}

export function previewQAClockCookie(clock, context, env = process.env) {
  if (!previewQAClockAllowed(context.teacherId, context.role, env)) throw new Error("Reloj QA no disponible.");
  const payload = Buffer.from(JSON.stringify({ ...validateQAClock(clock), teacherId: context.teacherId })).toString("base64url");
  return `${cookieName}=${payload}.${sign(payload, env.AYNI_SESSION_SIGNING_KEY).toString("base64url")}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}

export function previewQAClockForJob(job, env = process.env, inheritedClock = null) {
  if (!previewQAClockAllowed(job.teacher_id, "teacher", env)) return null;
  const clock = job.payload?.qa_clock ?? inheritedClock;
  return clock ? validateQAClock(clock) : null;
}
