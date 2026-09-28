import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = process.cwd(), sourceName = process.argv[3] ?? "f2-baseline-export-full.json";
if (!/^(?:f2-baseline-export-full|f[3-9]-checkpoint-full)\.json$/.test(sourceName)) throw new Error("Checkpoint QA inválido.");
const backup = path.join(root, ".local/qa-backups", sourceName);
const name = process.argv[2] ?? "f3-restored";
if (!/^f[3-9]-restored(?:-v[2-9][0-9]*)?$/.test(name)) throw new Error("Destino QA inválido.");
const target = path.join(root, ".local/qa-backups", name);
try { await access(target); throw new Error("El clon F3 ya existe; no se sobrescribe."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const snapshot = JSON.parse(await readFile(backup, "utf8"));
if (snapshot.format !== "ayni-f1-full-qa-export-v1") throw new Error("Snapshot inesperado.");
const digest = rows => createHash("sha256").update(JSON.stringify(rows.map(row => JSON.stringify(row)).sort())).digest("hex");
const db = await PGlite.create(target);
try {
  await db.exec("create table if not exists local_schema_migrations(version text primary key,applied_at timestamptz not null default now())");
  for (const name of (await readdir(path.join(root, "local-db/migrations"))).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(path.join(root, "local-db/migrations", name), "utf8"));
    await db.query("insert into local_schema_migrations(version) values($1)", [name]);
  }
  const types = (await db.query("select table_name,column_name,data_type from information_schema.columns where table_schema='public'")).rows;
  const typeByColumn = new Map(types.map(item => [`${item.table_name}.${item.column_name}`, item.data_type]));
  await db.transaction(async tx => {
    await tx.exec("set local session_replication_role=replica");
    // Migrations seed demo rows. Remove only those rows in this newly-created isolated clone before exact restore.
    const tables = Object.keys(snapshot.tables).filter(table => table !== "local_schema_migrations");
    if (tables.some(table => !/^[a-z0-9_]+$/.test(table))) throw new Error("Nombre de tabla inválido.");
    await tx.exec(`truncate ${tables.join(",")} restart identity cascade`);
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      if (table === "local_schema_migrations") continue;
      if (!/^[a-z0-9_]+$/.test(table)) throw new Error("Nombre de tabla inválido.");
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.some(column => !/^[a-z0-9_]+$/.test(column) || !typeByColumn.has(`${table}.${column}`))) throw new Error("Columna desconocida.");
        const values = columns.map(column => row[column] !== null && ["json", "jsonb"].includes(typeByColumn.get(`${table}.${column}`)) ? JSON.stringify(row[column]) : row[column]);
        await tx.query(`insert into ${table}(${columns.join(",")}) values(${columns.map((_,i) => `$${i+1}`).join(",")})`, values);
      }
    }
  });
  const checks = [];
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (table === "local_schema_migrations") continue;
    const restored = (await db.query(`select * from ${table}`)).rows;
    // Column-order-independent comparison; timestamps are normalized by the database driver.
    const normalize = items => items.map(row => Object.fromEntries(Object.keys(row).sort().map(key => [key,
      types.find(item => item.table_name === table && item.column_name === key)?.data_type.startsWith("timestamp") && row[key] ? new Date(row[key]).toISOString() : row[key]])));
    const equal = digest(normalize(rows)) === digest(normalize(restored));
    checks.push({ table, expected: rows.length, actual: restored.length, equal });
    if (!equal) throw new Error(`Restauración distinta: ${table}`);
  }
  const results = path.join(root, ".local/test-results", name.split("-")[0]);
  await mkdir(results, { recursive: true });
  await writeFile(path.join(results, "restore.json"), JSON.stringify({ backup, target, checks }, null, 2));
  console.log(JSON.stringify({ target, tables: checks.length, equal: checks.every(item => item.equal) }));
} finally { await db.close(); }
