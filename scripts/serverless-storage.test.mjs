import test from "node:test";
import assert from "node:assert/strict";
import { createSupabasePrivateEvidenceStorage } from "../src/lib/private-evidence-storage.mjs";
import { createSupabasePrivateInterviewStorage } from "../src/lib/private-interview-storage.mjs";
import { createSupabasePrivateLogoStorage } from "../src/lib/private-logo-storage.mjs";

const teacherId = "11111111-1111-4111-8111-111111111111";
const otherTeacherId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const assetId = "44444444-4444-4444-8444-444444444444";
const calls = [];
const fetchImpl = async (url, init = {}) => {
  calls.push({ url, method: init.method ?? "GET", headers: init.headers });
  return new Response(init.method === "POST" || init.method === "DELETE" ? null : Buffer.from("private"),
    { status: init.method === "POST" || init.method === "DELETE" ? 200 : 200 });
};
const options = { url: "https://ayni.example", serviceRoleKey: "test-service-role", fetchImpl };

test("opaque Supabase secret authenticates private Storage without a JWT bearer", async () => {
  calls.length = 0;
  const storage = createSupabasePrivateEvidenceStorage({ ...options, serviceRoleKey: "sb_secret_test" });
  await storage.save({ teacherId, studentId, mimeType: "audio/webm", bytes: Buffer.from("audio") });
  assert.equal(calls[0].headers.apikey, "sb_secret_test");
  assert.equal(calls[0].headers.Authorization, undefined);
});

test("private evidence stays within the teacher and student prefix", async () => {
  calls.length = 0;
  const storage = createSupabasePrivateEvidenceStorage(options);
  const mediaPath = await storage.save({ teacherId, studentId, mimeType: "audio/webm", bytes: Buffer.from("audio") });
  assert.match(mediaPath, new RegExp(`^student-evidence/${teacherId}/${studentId}/`));
  assert.equal(calls[0].method, "POST");
  await assert.rejects(storage.read(mediaPath, { teacherId: otherTeacherId, studentId }), /no disponible/);
  assert.equal(calls.length, 1, "an unauthorized read never reaches Storage");
  assert.equal((await storage.read(mediaPath, { teacherId, studentId })).data.toString(), "private");
  await storage.delete(mediaPath);
  assert.equal(calls.at(-1).method, "DELETE");
});

test("private interview validates file signature and ownership", async () => {
  calls.length = 0;
  const storage = createSupabasePrivateInterviewStorage(options);
  await assert.rejects(storage.save({ teacherId, studentId, mimeType: "application/pdf", bytes: Buffer.from("text") }), /formato/);
  const key = await storage.save({ teacherId, studentId, mimeType: "application/pdf", bytes: Buffer.from("%PDF-1.7") });
  await assert.rejects(storage.read(key, otherTeacherId, studentId), /no autorizado/);
  assert.equal(calls.length, 1);
  assert.equal((await storage.read(key, teacherId, studentId)).mimeType, "application/pdf");
});

test("private logo rejects another teacher before fetching", async () => {
  calls.length = 0;
  const storage = createSupabasePrivateLogoStorage(options);
  const mediaPath = await storage.save({ teacherId, assetId, mimeType: "image/svg+xml", bytes: Buffer.from("<svg/>") });
  await assert.rejects(storage.read(mediaPath, otherTeacherId), /no disponible/);
  assert.equal(calls.length, 1);
  assert.equal((await storage.read(mediaPath, teacherId)).toString(), "private");
});
