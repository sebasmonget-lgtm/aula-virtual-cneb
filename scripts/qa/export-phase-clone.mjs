import { PGlite } from "@electric-sql/pglite";
import { access, writeFile } from "node:fs/promises";
import path from "node:path";
const name = process.argv[2], output = process.argv[3];
if (!/^f(?:[3-9]|1[0-2])-restored(?:-v[2-9][0-9]*)?$/.test(name ?? "") || !/^f(?:[3-9]|1[0-2])-checkpoint-full\.json$/.test(output ?? ""))
  throw new Error("Solo se exportan clones QA explícitos.");
const source = path.resolve(".local/qa-backups", name), target = path.resolve(".local/qa-backups", output);
await access(source);
try { await access(target); throw new Error("El checkpoint existe, no se sobrescribe."); } catch (error) { if (error.code !== "ENOENT") throw error; }
const db = await PGlite.create(source);
try {
  const tables = {};
  for (const { table_name: name } of (await db.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name")).rows) {
    if (!/^[a-z0-9_]+$/.test(name)) throw new Error("Tabla inválida.");
    tables[name] = (await db.query(`select * from ${name}`)).rows;
  }
  await writeFile(target, JSON.stringify({ format: "ayni-f1-full-qa-export-v1", source, exportedAt: new Date().toISOString(), tables }), { flag: "wx" });
  console.log(JSON.stringify({ target, tables: Object.keys(tables).length }));
} finally { await db.close(); }
