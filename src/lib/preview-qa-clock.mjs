import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "__Host-ayni_qa_clock";
const defaultClock = Object.freeze({ date: "2026-02-16", time: "08:00" });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function previewQAClockAllowed(teacherId, role, env = process.env) {
  return env.VERCEL_ENV === "preview" && env.AYNI_QA_PREVIEW_CLOCK === "1"
    && uuid.test(env.AYNI_QA_TEACHER_ID ?? "") && teacherId === env.AYNI_QA_TEACHER_ID
    && role === "teacher" && typeof env.AYNI_SESSION_SIGNING_KEY === "string"
    && env.AYNI_SESSION_SIGNING_KEY.length >= 32;
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
  const cookie = String(request.headers.cookie ?? "").split(";")
    .map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!cookie) return { ...defaultClock };
  try {
    if (cookie.length > 1024) return { ...defaultClock };
    const [payload, signature, extra] = cookie.split(".");
    if (extra || !payload || !signature) return { ...defaultClock };
    const expected = sign(payload, env.AYNI_SESSION_SIGNING_KEY);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return { ...defaultClock };
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.teacherId !== context.teacherId) return { ...defaultClock };
    return validateQAClock(value);
  } catch { return { ...defaultClock }; }
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
