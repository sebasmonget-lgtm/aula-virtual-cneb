import { AI_USAGE_PRICING_VERSION } from "../src/lib/ai-usage-service.mjs";
import { listAuthUsers } from "./teacher-account-admin-service.mjs";

export async function loadAdminDirectory(db, authConfig, now = new Date()) {
  const users = (await listAuthUsers(authConfig)).filter((user) => ["teacher", "admin"].includes(user.app_metadata?.ayni_role));
  const ids = users.filter((user) => user.app_metadata.ayni_role === "teacher").map((user) => user.id);
  const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).formatToParts(now);
  const month = `${monthParts.find((part) => part.type === "year")?.value}-${monthParts.find((part) => part.type === "month")?.value}`;
  const monthStart = `${month}-01T05:00:00.000Z`;
  const rows = ids.length ? (await db.query(`select teacher_id,
    count(*)::int as calls, count(*) filter (where cost_usd is null)::int as unpriced_calls,
    count(*) filter (where cost_source='estimate')::int as estimated_calls,
    coalesce(sum(cost_usd),0) as cost_usd,
    count(*) filter (where occurred_at >= $2::timestamptz)::int as month_calls,
    coalesce(sum(cost_usd) filter (where occurred_at >= $2::timestamptz),0) as month_cost_usd
    from ai_usage_events where teacher_id = any($1::uuid[]) group by teacher_id`, [ids, monthStart])).rows : [];
  const usage = new Map(rows.map((row) => [row.teacher_id, row]));
  const accounts = users.map((user) => {
    const row = usage.get(user.id);
    return { id: user.id, name: String(user.user_metadata?.display_name ?? "Sin nombre").slice(0, 100),
      role: user.app_metadata.ayni_role, createdAt: user.created_at ?? null, lastSignInAt: user.last_sign_in_at ?? null,
      ai: { calls: Number(row?.calls ?? 0), unpricedCalls: Number(row?.unpriced_calls ?? 0),
        estimatedCalls: Number(row?.estimated_calls ?? 0), costUsd: Number(row?.cost_usd ?? 0),
        monthCalls: Number(row?.month_calls ?? 0), monthCostUsd: Number(row?.month_cost_usd ?? 0) } };
  });
  return { month, pricingVersion: AI_USAGE_PRICING_VERSION, accounts,
    totalCostUsd: accounts.reduce((sum, account) => sum + account.ai.costUsd, 0),
    monthCostUsd: accounts.reduce((sum, account) => sum + account.ai.monthCostUsd, 0) };
}
