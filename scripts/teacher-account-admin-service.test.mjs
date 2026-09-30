import test from "node:test";
import assert from "node:assert/strict";
import { dniLoginAlias } from "./dni-login.mjs";
import { createFirstAdmin, createTeacherAccount, listAuthUsers, recoverFirstAdmin, resetPasswordByUserId, resetTeacherPassword } from "./teacher-account-admin-service.mjs";

const base = { dni: "12345678", password: "una clave de prueba 2026", pepper: "test-only-secret-with-more-than-32-characters",
  domain: "login.example.test", url: "https://example.supabase.co", key: "private-test-key" };

test("the administrator provisions and resets by DNI without sending that DNI to Auth", async () => {
  const alias = dniLoginAlias(base.dni, base.pepper, base.domain);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("?page=")) return Response.json({ users: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: alias }] });
    return Response.json({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  };
  await createTeacherAccount({ ...base, fetchImpl });
  await resetTeacherPassword({ ...base, fetchImpl });
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: alias, password: base.password,
    email_confirm: true, app_metadata: { ayni_role: "teacher" } });
  assert.equal(calls[2].options.method, "PUT");
  assert.equal(JSON.parse(calls[2].options.body).password, base.password);
  assert.equal(calls.some(({ url, options }) => url.includes(base.dni) || options.body?.includes(base.dni)), false);
});

test("the administrator cannot reset an account that was not provisioned", async () => {
  await assert.rejects(() => resetTeacherPassword({ ...base, fetchImpl: async () => Response.json({ users: [] }) }),
    /No se encontró una cuenta/);
});

test("opaque Supabase secret reaches Auth admin only in the apikey header", async () => {
  let headers;
  await createTeacherAccount({ ...base, key: "sb_secret_test", fetchImpl: async (_url, options) => {
    headers = options.headers;
    return Response.json({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  } });
  assert.equal(headers.apikey, "sb_secret_test");
  assert.equal(headers.Authorization, undefined);
});

test("first administrator and teacher accounts are created with server-owned roles", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(String(url).includes("?page=") ? { users: [] } : { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  };
  await createFirstAdmin({ ...base, name: "Admin Ayni", fetchImpl });
  await createTeacherAccount({ ...base, dni: "87654321", name: "Docente Ficticia", fetchImpl });
  assert.equal(JSON.parse(calls[1].options.body).app_metadata.ayni_role, "admin");
  assert.equal(JSON.parse(calls[2].options.body).app_metadata.ayni_role, "teacher");
  assert.equal(JSON.parse(calls[2].options.body).user_metadata.display_name, "Docente Ficticia");
  assert.equal(calls.some((call) => call.options.body?.includes(base.dni)), false);
});

test("administrator creation is closed once an admin exists and reset is limited to teachers", async () => {
  const admin = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", app_metadata: { ayni_role: "admin" } };
  const teacher = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", app_metadata: { ayni_role: "teacher" } };
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push(options); return Response.json(String(url).includes("?page=")
    ? { users: [admin, teacher] } : { id: teacher.id }); };
  assert.equal((await listAuthUsers({ ...base, fetchImpl })).length, 2);
  await assert.rejects(() => createFirstAdmin({ ...base, name: "Admin Ayni", fetchImpl }), /Ya existe/);
  await assert.rejects(() => resetPasswordByUserId({ ...base, fetchImpl }, admin.id), /no disponible/);
  await resetPasswordByUserId({ ...base, fetchImpl }, teacher.id);
  assert.equal(calls.filter((call) => call.method === "PUT").length, 1);
});

test("initial recovery changes only the never-used administrator's login and password", async () => {
  const admin = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", app_metadata: { ayni_role: "admin" }, last_sign_in_at: null };
  const teacher = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", app_metadata: { ayni_role: "teacher" } };
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(String(url).includes("?page=") ? { users: [admin, teacher] } : { id: admin.id });
  };
  await recoverFirstAdmin({ ...base, fetchImpl });
  const update = calls.find((call) => call.options.method === "PUT");
  assert.match(update.url, new RegExp(`${admin.id}$`));
  assert.deepEqual(JSON.parse(update.options.body), { email: dniLoginAlias(base.dni, base.pepper, base.domain),
    email_confirm: true, password: base.password });
  assert.equal(update.options.body.includes(base.dni), false);
  await assert.rejects(() => recoverFirstAdmin({ ...base, fetchImpl: async () => Response.json({ users: [
    { ...admin, last_sign_in_at: "2026-09-30T17:00:00Z" }, teacher,
  ] }) }), /no está disponible/);
});
