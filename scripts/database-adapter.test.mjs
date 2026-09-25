import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, createPostgresSession, postgresPoolConfig } from "./database-adapter.mjs";
import { expectedRevision, versionTransaction } from "../src/lib/version-integrity.mjs";

function fakePool() {
  const calls = [];
  let releases = 0;
  let nextClient = 0;
  const pool = {
    calls,
    get releases() { return releases; },
    query: async (sql, params) => { calls.push({ connection: "pool", sql, params }); return { rows: [] }; },
    connect: async () => {
      const connection = `client-${++nextClient}`;
      return {
        query: async (sql, params) => { calls.push({ connection, sql, params }); return { rows: [{ revision: 2 }] }; },
        release: () => { releases++; },
      };
    },
    on: () => {},
    end: async () => { calls.push({ connection: "pool", sql: "END" }); },
  };
  return pool;
}

test("PostgreSQL adapter uses one pooled client per transaction and releases it", async () => {
  const pool = fakePool();
  const db = createPostgresSession(pool);
  await db.query("select 1");
  await db.exec("begin");
  await db.query("select $1::int", [1]);
  await db.exec("commit");
  assert.deepEqual(pool.calls.map((call) => call.connection), ["pool", "client-1", "client-1", "client-1"]);
  assert.equal(pool.releases, 1);
  await db.transaction(async (tx) => {
    await tx.query("select 2");
    await tx.query("select 3");
  });
  assert.deepEqual(pool.calls.slice(4).map((call) => call.connection), Array(4).fill("client-2"));
  assert.equal(pool.releases, 2);
  await db.close();
});

test("rollback, nested savepoint and request cleanup use the pinned client", async () => {
  const pool = fakePool();
  const db = createPostgresSession(pool);
  await db.exec("BEGIN");
  await assert.rejects(db.transaction(async (tx) => { await tx.query("update row"); throw new Error("stop"); }), /stop/);
  assert(pool.calls.some((call) => call.sql.startsWith("ROLLBACK TO SAVEPOINT")));
  await db.close();
  assert.equal(pool.calls.at(-1).sql, "ROLLBACK");
  assert.equal(pool.releases, 1);
  await assert.rejects(db.query("select 1"), /terminó/);
});

test("version locks and expected revisions work on PostgreSQL transaction contract", async () => {
  const pool = fakePool();
  const db = createPostgresSession(pool);
  const result = await versionTransaction(db, "annual:year", async (tx) => {
    const row = (await tx.query("select revision from annual_plans where id=$1", ["id"])).rows[0];
    return expectedRevision(Number(row.revision));
  });
  assert.equal(result, 2);
  assert(pool.calls.some((call) => call.sql.includes("pg_advisory_xact_lock")));
  assert.equal(pool.releases, 1);
  await db.close();
});

test("database selection validates connection settings and closes a shared pool", async () => {
  assert.throws(() => postgresPoolConfig(""), /SUPABASE_DB_URL/);
  assert.throws(() => postgresPoolConfig("https://example.com"), /PostgreSQL/);
  const config = postgresPoolConfig("postgresql://user:pass@db.example.com:5432/postgres");
  assert.equal(config.max, 5);
  assert.equal(config.ssl.rejectUnauthorized, true);
  const pool = fakePool();
  const database = await createDatabase({ mode: "postgres", connectionString: "postgresql://user:pass@db.example.com/postgres", poolFactory: () => pool });
  assert.notEqual(database.requestDb(), database.requestDb());
  await database.close();
  assert.equal(pool.calls.at(-1).sql, "END");
});
