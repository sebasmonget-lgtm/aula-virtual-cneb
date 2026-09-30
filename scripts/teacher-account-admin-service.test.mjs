import test from "node:test";
import assert from "node:assert/strict";
import { dniLoginAlias } from "./dni-login.mjs";
import { createTeacherAccount, resetTeacherPassword } from "./teacher-account-admin-service.mjs";

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
