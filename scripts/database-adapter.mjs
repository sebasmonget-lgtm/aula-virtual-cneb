import { PGlite } from "@electric-sql/pglite";

const transactionCommand = (sql) => String(sql).trim().replace(/;$/, "").toLowerCase();

/** The same query/exec/transaction contract used by PGlite services. */
export function createPostgresSession(pool) {
  let transactionClient = null;
  let closed = false;
  let savepointNumber = 0;
  const open = () => { if (closed) throw new Error("La conexión de esta petición ya terminó."); };
  const query = async (sql, params) => {
    open();
    return (transactionClient ?? pool).query(sql, params);
  };
  const exec = async (sql) => {
    open();
    const command = transactionCommand(sql);
    if (command === "begin") {
      if (transactionClient) throw new Error("Ya existe una transacción activa.");
      const client = await pool.connect();
      try { await client.query("BEGIN"); transactionClient = client; }
      catch (error) { client.release(); throw error; }
      return;
    }
    if (command === "commit" || command === "rollback") {
      if (!transactionClient) throw new Error("No hay una transacción activa.");
      const client = transactionClient;
      transactionClient = null;
      try { await client.query(command.toUpperCase()); }
      finally { client.release(); }
      return;
    }
    await query(sql);
  };
  const transaction = async (work) => {
    open();
    if (transactionClient) {
      const name = `ayni_nested_${++savepointNumber}`;
      const client = transactionClient;
      await client.query(`SAVEPOINT ${name}`);
      try {
        const result = await work({ query: (sql, params) => client.query(sql, params), exec: (sql) => client.query(sql) });
        await client.query(`RELEASE SAVEPOINT ${name}`);
        return result;
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${name}`).catch(() => {});
        throw error;
      }
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work({ query: (sql, params) => client.query(sql, params), exec: (sql) => client.query(sql) });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  };
  const close = async () => {
    if (closed) return;
    closed = true;
    if (transactionClient) {
      const client = transactionClient;
      transactionClient = null;
      try { await client.query("ROLLBACK"); }
      finally { client.release(); }
    }
  };
  return { query, exec, transaction, close };
}

export function postgresPoolConfig(connectionString, options = {}) {
  if (!connectionString) throw new Error("Falta SUPABASE_DB_URL para PostgreSQL.");
  let url;
  try { url = new URL(connectionString); }
  catch { throw new Error("SUPABASE_DB_URL debe ser una URL PostgreSQL válida."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) {
    throw new Error("SUPABASE_DB_URL debe ser una URL PostgreSQL válida.");
  }
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  return {
    connectionString,
    max: options.max ?? 5,
    min: 0,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5000,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
    query_timeout: options.queryTimeoutMillis ?? 20000,
    statement_timeout: options.statementTimeoutMillis ?? 15000,
    idle_in_transaction_session_timeout: options.idleTransactionTimeoutMillis ?? 30000,
    keepAlive: true,
    ssl: localHost ? false : { rejectUnauthorized: true },
  };
}

export async function createDatabase({ mode, dataDir, connectionString, poolFactory } = {}) {
  if (mode === "local") {
    const db = await PGlite.create(dataDir);
    return { mode, db, requestDb: () => db, close: () => db.close() };
  }
  if (mode !== "postgres") throw new Error("AYNI_DB_MODE debe ser local o postgres.");
  const config = postgresPoolConfig(connectionString);
  const pg = poolFactory ? null : (await import("pg")).default;
  const pool = poolFactory ? poolFactory(config) : new pg.Pool(config);
  pool.on?.("error", () => { /* A future checkout will report a safe failure; never log credentials. */ });
  const db = createPostgresSession(pool);
  return { mode, db, requestDb: () => createPostgresSession(pool), close: () => pool.end() };
}
