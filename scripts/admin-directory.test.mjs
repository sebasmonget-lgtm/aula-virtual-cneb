import test from "node:test";
import assert from "node:assert/strict";
import { loadAdminDirectory } from "./admin-directory.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const admin = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("admin directory combines Auth accounts with ledger totals without exposing credentials or prompts", async () => {
  const authConfig = { url: "https://example.supabase.co", key: "private-test-key", fetchImpl: async () => Response.json({ users: [
    { id: teacher, app_metadata: { ayni_role: "teacher" }, user_metadata: { display_name: "Docente Ficticia" }, created_at: "2026-09-01T00:00:00Z" },
    { id: admin, app_metadata: { ayni_role: "admin" }, user_metadata: { display_name: "Admin" } },
  ] }) };
  const db = { query: async (_sql, args) => {
    assert.deepEqual(args[0], [teacher]);
    assert.equal(args[1], "2026-09-01T05:00:00.000Z");
    return { rows: [{ teacher_id: teacher, calls: 3, unpriced_calls: 1, estimated_calls: 1,
      cost_usd: "0.1234", month_calls: 2, month_cost_usd: "0.1000" }] };
  } };
  const result = await loadAdminDirectory(db, authConfig, new Date("2026-09-30T15:00:00Z"));
  assert.equal(result.month, "2026-09");
  assert.equal(result.totalCostUsd, 0.1234);
  assert.equal(result.monthCostUsd, 0.1);
  assert.equal(result.accounts[0].ai.unpricedCalls, 1);
  assert.equal(result.accounts[1].ai.costUsd, 0);
  assert.equal(JSON.stringify(result).includes("password"), false);
  assert.equal(JSON.stringify(result).includes("email"), false);
});
