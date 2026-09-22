const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Server-only handoff. The browser receives only an opaque ID; audit data stays in PostgreSQL. */
export function createPendingAIGenerationsStore(db, { ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new RangeError("La vigencia de una generación debe ser positiva.");
  return {
    async set(id, value) {
      if (!value?.classroom_id || !value?.workflow) throw new TypeError("La generación necesita aula y workflow.");
      await this.pruneExpired();
      const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : now();
      await db.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at)
        values($1,$2,$3,$4::jsonb,$5::timestamptz,$6::timestamptz)
        on conflict(id) do update set classroom_id=excluded.classroom_id,workflow=excluded.workflow,payload=excluded.payload,created_at=excluded.created_at,expires_at=excluded.expires_at`,
      [id, value.classroom_id, value.workflow, JSON.stringify({ ...value, createdAt }), new Date(createdAt).toISOString(), new Date(createdAt + ttlMs).toISOString()]);
      return this;
    },
    async get(id) {
      if (typeof id !== "string" || !id) return undefined;
      const row = (await db.query(`select payload from ai_pending_generations where id=$1 and expires_at>$2::timestamptz`, [id, new Date(now()).toISOString()])).rows[0];
      return row?.payload;
    },
    async delete(id) {
      if (typeof id !== "string" || !id) return false;
      return (await db.query(`delete from ai_pending_generations where id=$1 returning id`, [id])).rows.length > 0;
    },
    async pruneExpired() {
      return (await db.query(`delete from ai_pending_generations where expires_at<=$1::timestamptz returning id`, [new Date(now()).toISOString()])).rows.length;
    },
  };
}
