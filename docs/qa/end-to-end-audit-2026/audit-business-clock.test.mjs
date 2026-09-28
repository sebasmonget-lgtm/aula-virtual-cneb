import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";

test("clock preload cannot run in the original environment", () => {
  const result = spawnSync(process.execPath, ["--import=./docs/qa/end-to-end-audit-2026/audit-business-clock.mjs", "-e", "console.log('UNSAFE')"], { encoding: "utf8", env: { ...process.env, AYNI_AUTH_MODE: "local", AYNI_LOCAL_DB_PORT: "8788" } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /restricted to the isolated fictitious classroom/);
  assert.doesNotMatch(result.stdout, /UNSAFE/);
});

test("clock only replaces now; explicit persisted dates retain UTC date and instanceof", () => {
  const at = readFileSync(".local/qa/end-to-end-audit-2026/business-clock.json", "utf8");
  const result = spawnSync(process.execPath, ["--import=./docs/qa/end-to-end-audit-2026/audit-business-clock.mjs", "-e", "console.log(JSON.stringify({now:new Date().toISOString(),explicit:new Date('2026-04-01T00:00:00Z').toISOString(),instance:new Date() instanceof Date,utc:Date.UTC(2026,3,1),parse:Date.parse('2026-04-01T00:00:00Z')}))"], { encoding: "utf8", env: { ...process.env, AYNI_AUTH_MODE: "local", AYNI_LOCAL_DB_PORT: "8790", AYNI_LOCAL_TEACHER_ID: "d97b5d03-b64d-405e-9de5-ae6e407bf126", AYNI_LOCAL_DATA_DIR: path.resolve(".local/qa/end-to-end-audit-2026/pgdata") } });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout), expected = Date.parse(JSON.parse(at).at);
  assert.ok(Date.parse(output.now) >= expected && Date.parse(output.now) < expected + 3000);
  assert.equal(output.explicit, "2026-04-01T00:00:00.000Z");
  assert.equal(output.instance, true);
  assert.equal(output.utc, output.parse);
});
