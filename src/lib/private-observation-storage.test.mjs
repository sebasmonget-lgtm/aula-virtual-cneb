import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSupabasePrivateObservationStorage } from "./private-observation-storage.mjs";

test("Storage privado usa servicio de servidor y solo ruta docente/alumno, sin URL pública", async () => {
  const teacherId = randomUUID(), studentId = randomUUID(), otherStudent = randomUUID();
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from([1,2,3]).buffer };
  };
  const store = createSupabasePrivateObservationStorage({ url: "https://new-project.supabase.co",
    serviceRoleKey: "test-secret-only", fetchImpl });
  const path = await store.save({ teacherId, studentId, mimeType: "image/png", bytes: Buffer.from([1,2,3]) });
  assert.match(path, new RegExp(`^ordinary-observations/${teacherId}/${studentId}/`));
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-secret-only");
  assert.doesNotMatch(calls[0].url, /\/public\//);
  await assert.rejects(store.read(path, { teacherId, studentId: otherStudent }), /no disponible/);
  assert.equal(calls.length, 1);
  const media = await store.read(path, { teacherId, studentId });
  assert.equal(media.mimeType, "image/png");
  assert.deepEqual(media.data, Buffer.from([1,2,3]));
  await store.delete(path, { teacherId, studentId });
  assert.equal(calls[2].init.method, "DELETE");
});
