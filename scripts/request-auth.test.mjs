import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createRequestAuth, RequestAuthError } from "./request-auth.mjs";
import { dniLoginAlias } from "./dni-login.mjs";
import { authorizeRequestSelectors, RequestAccessError } from "./request-authorization.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const roomA = "11111111-1111-4111-8111-111111111111";
const roomB = "22222222-2222-4222-8222-222222222222";
const studentA = "33333333-3333-4333-8333-333333333333";
const studentB = "44444444-4444-4444-8444-444444444444";
const yearA = "55555555-5555-4555-8555-555555555555";
const yearB = "66666666-6666-4666-8666-666666666666";
const periodA = "77777777-7777-4777-8777-777777777777";
const periodB = "88888888-8888-4888-8888-888888888888";
const dniPepper = "test-only-secret-with-more-than-32-characters";
const dniAliasDomain = "login.example.test";
const sessionSigningKey = "separate-test-session-key-over-32-characters";
const teacherADni = "12345678";
let clock = Date.UTC(2026, 8, 30);

function fakeAuthFetch(url, options) {
  if (url.includes("grant_type=refresh_token")) {
    const body = JSON.parse(options.body);
    return Promise.resolve(Response.json(body.refresh_token === "refresh-a"
      ? { access_token: "token-a-renewed", refresh_token: "refresh-a-new", expires_in: 3600 }
      : { error: "invalid_grant" }, { status: body.refresh_token === "refresh-a" ? 200 : 401 }));
  }
  if (url.includes("/auth/v1/token?")) {
    const body = JSON.parse(options.body);
    const valid = body.email === dniLoginAlias(teacherADni, dniPepper, dniAliasDomain) && body.password === "correcta";
    return Promise.resolve(Response.json(valid
      ? { access_token: "token-a", refresh_token: "refresh-a", expires_in: 3600 }
      : { error: "invalid_grant" }, { status: valid ? 200 : 401 }));
  }
  if (url.endsWith("/auth/v1/user")) {
    const token = options.headers.authorization;
    const id = ["Bearer token-a", "Bearer token-a-renewed", "Bearer token-unmarked"].includes(token) ? teacherA : token === "Bearer token-b" ? teacherB : null;
    return Promise.resolve(Response.json(id ? { id, role: "authenticated", app_metadata: token === "Bearer token-unmarked" ? {} : { ayni_role: "teacher" } } : { error: "invalid_token" }, { status: id ? 200 : 401 }));
  }
  return Promise.resolve(new Response(null, { status: 204 }));
}

const auth = createRequestAuth({ mode: "supabase", supabaseUrl: "https://test.supabase.co", publishableKey: "public-test-key", dniPepper, dniAliasDomain, sessionSigningKey, fetchImpl: fakeAuthFetch, now: () => clock });
const request = (token, extraHeaders = {}) => ({ headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders } });

test("identity is verified for every request and never comes from client IDs", async () => {
  const db = { query() {} };
  await assert.rejects(() => auth.resolve(request(null), db), (error) => error instanceof RequestAuthError && error.status === 401);
  await assert.rejects(() => auth.resolve(request("invalid"), db), (error) => error instanceof RequestAuthError && error.status === 401);
  await assert.rejects(() => auth.resolve(request("expired"), db), (error) => error instanceof RequestAuthError && error.status === 401);
  await assert.rejects(() => auth.resolve(request("token-unmarked"), db), (error) => error instanceof RequestAuthError && error.status === 401);
  const a = await auth.resolve(request("token-a", { "x-teacher-id": teacherB }), db);
  const b = await auth.resolve(request("token-b"), db);
  assert.equal(a.teacherId, teacherA);
  assert.equal(b.teacherId, teacherB);
  assert.equal(a.db, db);
  assert.notEqual(a.requestId, b.requestId);
  const saved = auth.sessionCookies({ token: "token-a", refreshToken: "refresh-a", expiresIn: 3600 })
    .map((value) => value.split(";")[0]).join("; ");
  assert.equal((await auth.resolve({ headers: { cookie: saved } }, db)).teacherId, teacherA);
});

test("DNI/password sign-in verifies the returned token and sets HTTP-only cookies", async () => {
  const session = await auth.signIn(teacherADni, "correcta");
  assert.equal(session.teacherId, teacherA);
  const cookies = auth.sessionCookies(session);
  assert.equal(cookies.length, 3);
  assert(cookies.every((cookie) => /HttpOnly; Path=\/api; SameSite=Lax; Secure/.test(cookie)));
  assert.match(cookies[1], /Max-Age=2592000/);
  await assert.rejects(() => auth.signIn(teacherADni, "incorrecta"), (error) => error.status === 401);
  await assert.rejects(() => auth.signIn("123", "correcta"), (error) => error.status === 401);
  assert.notEqual(dniLoginAlias(teacherADni, dniPepper, dniAliasDomain), dniLoginAlias("87654321", dniPepper, dniAliasDomain));
  assert.doesNotMatch(dniLoginAlias(teacherADni, dniPepper, dniAliasDomain), /12345678/);
});

test("activity renews the 30-day window and an expired access token is refreshed", async () => {
  clock = Date.UTC(2026, 8, 30);
  const session = await auth.signIn(teacherADni, "correcta");
  const cookieMap = Object.fromEntries(auth.sessionCookies(session).map((value) => value.split(";")[0].split(/=(.*)/s).slice(0, 2)));
  const cookieHeader = (values) => Object.entries(values).map(([key, value]) => `${key}=${value}`).join("; ");
  clock += 29 * 24 * 60 * 60 * 1000;
  const active = await auth.resolve({ headers: { cookie: cookieHeader(cookieMap) } }, {});
  assert.equal(active.teacherId, teacherA);
  assert.equal(active.sessionCookies.length, 2);
  cookieMap.ayni_refresh = active.sessionCookies[0].split(";")[0].split(/=(.*)/s)[1];
  cookieMap.ayni_active = active.sessionCookies[1].split(";")[0].split(/=(.*)/s)[1];
  const [seenAt, signature] = cookieMap.ayni_active.split(".");
  await assert.rejects(() => auth.resolve({ headers: { cookie: cookieHeader({ ...cookieMap,
    ayni_active: `${seenAt}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}` }) } }, {}),
  (error) => error instanceof RequestAuthError && error.status === 401);
  clock += 2 * 24 * 60 * 60 * 1000;
  delete cookieMap.ayni_session;
  const renewed = await auth.resolve({ headers: { cookie: cookieHeader(cookieMap) } }, {});
  assert.equal(renewed.teacherId, teacherA);
  assert.equal(renewed.sessionCookies.length, 3);
  assert.match(renewed.sessionCookies[0], /token-a-renewed/);
  clock += 30 * 24 * 60 * 60 * 1000;
  await assert.rejects(() => auth.resolve({ headers: { cookie: cookieHeader(cookieMap) } }, {}),
    (error) => error instanceof RequestAuthError && error.status === 401);
  assert.equal(auth.clearCookies().length, 3);
  clock = Date.UTC(2026, 8, 30);
});

test("local mode retains PGlite identity without any token", async () => {
  const local = createRequestAuth({ mode: "local", localTeacherId: teacherA });
  assert.equal((await local.resolve(request(null), {})).teacherId, teacherA);
});

test("request selectors are scoped to the verified classroom tree", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table school_years(id uuid primary key, owner_id uuid);
      create table classrooms(id uuid primary key, school_year_id uuid, teacher_id uuid);
      create table students(id uuid primary key, classroom_id uuid);
      create table evaluation_periods(id uuid primary key, school_year_id uuid);
    `);
    for (const [teacher, year, room, student, period] of [
      [teacherA, yearA, roomA, studentA, periodA], [teacherB, yearB, roomB, studentB, periodB],
    ]) {
      await db.query("insert into school_years values ($1,$2)", [year, teacher]);
      await db.query("insert into classrooms values ($1,$2,$3)", [room, year, teacher]);
      await db.query("insert into students values ($1,$2)", [student, room]);
      await db.query("insert into evaluation_periods values ($1,$2)", [period, year]);
    }
    const check = (pathname, body) => authorizeRequestSelectors({ db, teacherId: teacherA, url: new URL(`http://localhost${pathname}`), body });
    assert.equal((await db.query("select count(*)::int as count from classrooms")).rows[0].count, 2);
    assert.equal((await db.query("select count(*)::int as count from evaluation_periods")).rows[0].count, 2);
    assert.equal((await db.query("select c.teacher_id as owner_id from classrooms c join school_years y on y.id=c.school_year_id and y.owner_id=c.teacher_id where c.id=$1", [roomA])).rows[0]?.owner_id, teacherA);
    assert.equal((await db.query("select y.owner_id from evaluation_periods p join school_years y on y.id=p.school_year_id where p.id=$1", [periodA])).rows[0]?.owner_id, teacherA);
    await check(`/api/period-evaluations/coverage?classroomId=${roomA}&periodId=${periodA}`);
    await check(`/api/students/${studentA}`);
    await assert.rejects(() => check(`/api/period-evaluations/coverage?classroomId=${roomB}&periodId=${periodB}`), (error) => error instanceof RequestAccessError && error.status === 403);
    await assert.rejects(() => check(`/api/students/${studentB}`), (error) => error instanceof RequestAccessError && error.status === 404);
    await assert.rejects(() => check("/api/evidences", { studentId: studentB, teacherId: teacherA }), (error) => error instanceof RequestAccessError && error.status === 404);
    await assert.rejects(() => check("/api/attendance", { records: [{ studentId: studentA }, { studentId: studentB }] }), (error) => error instanceof RequestAccessError && error.status === 404);
  } finally { await db.close(); }
});
