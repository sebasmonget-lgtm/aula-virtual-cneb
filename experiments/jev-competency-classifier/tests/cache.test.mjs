import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { cacheKey, createFileCache } from "../src/cache.mjs";

test("la caché reutiliza una respuesta con una clave determinista", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jev-cneb-cache-"));
  try {
    const cache = createFileCache({ directory }); const key = cacheKey({ age: 5, observation: "Ficticia", model: "jev-1.13.0" });
    await cache.set(key, { status: "classified", primary_competency_id: "MAT_CANTIDAD" });
    assert.deepEqual(await cache.get(key), { status: "classified", primary_competency_id: "MAT_CANTIDAD" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
