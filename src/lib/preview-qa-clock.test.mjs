import test from "node:test";
import assert from "node:assert/strict";
import { previewQAClockAllowed, readPreviewQAClock, previewQAClockCookie, previewQAClockForJob, validateQAClock } from "./preview-qa-clock.mjs";
import { currentPedagogicalClock, pedagogicalNow, simulatedObservationInstant, withPedagogicalClock } from "./pedagogical-clock.mjs";
import { limaToday } from "./activity-schedule-integrity.mjs";

const teacherId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { teacherId, role: "teacher" };
const env = { VERCEL_ENV: "preview", AYNI_QA_PREVIEW_CLOCK: "1", AYNI_QA_TEACHER_ID: teacherId,
  AYNI_SESSION_SIGNING_KEY: "isolated-test-key-with-at-least-32-characters" };
const request = cookie => ({ headers: { cookie } });

test('nested project operations retain only an authorized QA teaching clock',()=>{
 const clock={date:'2026-03-16',time:'08:00'},job={teacher_id:teacherId,payload:{}};
 withPedagogicalClock(clock,()=>{
  assert.deepEqual(previewQAClockForJob(job,env,currentPedagogicalClock()),clock);
  assert.equal(previewQAClockForJob(job,env),null);
  assert.equal(previewQAClockForJob({...job,teacher_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},env,currentPedagogicalClock()),null);
  assert.equal(previewQAClockForJob(job,{...env,VERCEL_ENV:'production'},currentPedagogicalClock()),null);
  assert.deepEqual(previewQAClockForJob({...job,payload:{qa_clock:{date:'2026-04-01',time:'09:00'}}},env,currentPedagogicalClock()),{date:'2026-04-01',time:'09:00'});
 });
});

test("clock requires Preview, opt-in, a single authenticated teacher and a signing key", () => {
  assert.equal(previewQAClockAllowed(teacherId, "teacher", env), true);
  for (const patch of [{ VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { AYNI_QA_PREVIEW_CLOCK: "0" },
    { AYNI_QA_TEACHER_ID: "invalid" }, { AYNI_SESSION_SIGNING_KEY: "short" }]) {
    assert.equal(readPreviewQAClock(request(""), context, { ...env, ...patch }), null);
  }
  assert.equal(readPreviewQAClock(request(""), { ...context, role: "admin" }, env), null);
  assert.equal(readPreviewQAClock(request(""), { ...context, teacherId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, env), null);
});

test("signed host cookie recovers date/time and rejects tampering and a different teacher", () => {
  const clock = { date: "2026-12-18", time: "23:59" };
  const cookie = previewQAClockCookie(clock, context, env);
  assert.match(cookie, /^__Host-ayni_qa_clock=/);
  assert.match(cookie, /Path=\/; HttpOnly; Secure; SameSite=Lax;/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.deepEqual(readPreviewQAClock(request(cookie), context, env), clock);
  const defaultClock = { date: "2026-02-16", time: "08:00" };
  const payload = Buffer.from(JSON.stringify({ ...clock, date: "2026-03-01", teacherId })).toString("base64url");
  const signature = cookie.split(";")[0].split(".")[1];
  assert.deepEqual(readPreviewQAClock(request(`__Host-ayni_qa_clock=${payload}.${signature}`), context, env), defaultClock);
  assert.deepEqual(readPreviewQAClock(request(`__Host-ayni_qa_clock=${"x".repeat(2000)}`), context, env), defaultClock);
  const other = { teacherId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "teacher" };
  assert.deepEqual(readPreviewQAClock(request(cookie), other, { ...env, AYNI_QA_TEACHER_ID: other.teacherId }), defaultClock);
});

test("civil date validation rejects overflow dates, wrong year and invalid times", () => {
  for (const value of [{ date: "2026-02-29", time: "08:00" }, { date: "2026-04-31", time: "08:00" },
    { date: "2027-01-01", time: "08:00" }, { date: "2026-02-16", time: "24:00" },
    { date: "2026-02-16", time: "08:60" }, null]) assert.throws(() => validateQAClock(value));
  assert.deepEqual(validateQAClock({ date: "2026-02-16", time: "00:00", ignored: "discard" }), { date: "2026-02-16", time: "00:00" });
});

test("concurrent request scopes isolate teachers; Lima midnight and real security time remain distinct", async () => {
  const before = Date.now();
  const first = { date: "2026-02-16", time: "23:59" };
  const second = { date: "2026-12-18", time: "00:01" };
  const values = await Promise.all([first, second, null].map(clock => withPedagogicalClock(clock, async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
    return { day: limaToday(), clock: currentPedagogicalClock(), observedAt: simulatedObservationInstant() };
  })));
  assert.deepEqual(values[0], { day: first.date, clock: first, observedAt: "2026-02-17T04:59:00.000Z" });
  assert.equal(values[1].day, second.date);
  assert.equal(values[2].clock, null);
  assert.equal(values[2].observedAt, null);
  assert.equal(currentPedagogicalClock(), null);
  assert.ok(Math.abs(pedagogicalNow().getTime() - Date.now()) < 100);
  assert.ok(Date.now() >= before && Date.now() - before < 1000);
});

test("durable preparation clock is honored only for the allowed teacher in Preview", () => {
  const job = { teacher_id: teacherId, payload: { qa_clock: { date: "2026-03-16", time: "09:15" } } };
  assert.deepEqual(previewQAClockForJob(job, env), job.payload.qa_clock);
  assert.equal(previewQAClockForJob(job, { ...env, VERCEL_ENV: "production" }), null);
  assert.equal(previewQAClockForJob({ ...job, teacher_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, env), null);
});
