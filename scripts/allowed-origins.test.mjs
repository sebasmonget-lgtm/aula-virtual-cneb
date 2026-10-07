import test from "node:test";
import assert from "node:assert/strict";
import { configuredOrigins } from "./allowed-origins.mjs";

test("exact deployment origin coexists with configured alias without allowing other previews", () => {
  const origins = configuredOrigins("supabase", { VERCEL: "1", VERCEL_URL: "ayni-aula-staging-abc-ayni4.vercel.app", AYNI_ALLOWED_ORIGIN: "https://qa.example.test" });
  assert.deepEqual([...origins], ["https://qa.example.test", "https://ayni-aula-staging-abc-ayni4.vercel.app"]);
  assert.equal(origins.has("https://ayni-aula-staging-other-ayni4.vercel.app"), false);
  assert.equal(origins.has("http://ayni-aula-staging-abc-ayni4.vercel.app"), false);
  assert.equal(origins.has("http://localhost:5173"), false);
});
test("deployment metadata is ignored outside Vercel and malformed hosts fail closed", () => {
  assert.equal(configuredOrigins("supabase", { VERCEL_URL: "example.vercel.app" }).size, 0);
  for (const host of ["example.vercel.app.evil.test", "https://example.vercel.app", "example.vercel.app:443", "example.vercel.app/path", "*.vercel.app", "evil.test"]) {
    assert.equal(configuredOrigins("supabase", { VERCEL: "1", VERCEL_URL: host }).size, 0);
  }
  assert.deepEqual([...configuredOrigins("local", {})], ["http://localhost:5173", "http://127.0.0.1:5173"]);
});
