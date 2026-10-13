import test from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
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

test("Vercel attaches the shared pool once without changing transactional ownership or local mode", async () => {
  const previous = { serverless: process.env.AYNI_SERVERLESS, vercel: process.env.VERCEL };
  const pool = fakePool(); let attached = 0, config;
  try {
    process.env.AYNI_SERVERLESS = "1"; process.env.VERCEL = "1";
    const database = await createDatabase({ mode: "postgres", connectionString: "postgresql://user:pass@db.example.com/postgres",
      poolFactory: value => { config = value; return pool; }, attachPool: value => { assert.equal(value, pool); attached++; } });
    assert.equal(config.max, 1); assert.equal(config.idleTimeoutMillis, 1000); assert.equal(config.ssl.rejectUnauthorized, true);
    const request = database.requestDb();
    await request.transaction(tx => tx.query("select 1")); await request.close();
    assert.equal(attached, 1); assert.equal(pool.releases, 1); await database.close();
    process.env.VERCEL = "0";
    const standalone = await createDatabase({ mode: "postgres", connectionString: "postgresql://user:pass@db.example.com/postgres",
      poolFactory: () => pool, attachPool: () => { throw Error("Standalone must not attach to Vercel"); } });
    await standalone.close();
  } finally {
    if (previous.serverless === undefined) delete process.env.AYNI_SERVERLESS; else process.env.AYNI_SERVERLESS = previous.serverless;
    if (previous.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous.vercel;
  }
});

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
  assert.equal(config.ssl.ca, undefined);
  const supabase = postgresPoolConfig("postgresql://postgres.project:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres");
  assert.equal(supabase.ssl.rejectUnauthorized, true);
  const ca = new X509Certificate(supabase.ssl.ca);
  assert.equal(ca.ca, true);
  assert.equal(ca.fingerprint256.replaceAll(":", "").toLowerCase(), "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa");
  const pool = fakePool();
  const database = await createDatabase({ mode: "postgres", connectionString: "postgresql://user:pass@db.example.com/postgres", poolFactory: () => pool });
  assert.notEqual(database.requestDb(), database.requestDb());
  await database.close();
  assert.equal(pool.calls.at(-1).sql, "END");
});
