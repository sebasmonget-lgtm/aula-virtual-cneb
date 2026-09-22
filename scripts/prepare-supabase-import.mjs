import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.resolve(process.cwd());
const args = process.argv.slice(2);
const input = args[0];
const generate = args.includes("--generate");
const includeDemo = args.includes("--include-demo");
const userIndex = args.indexOf("--new-user-id");
const newUserId = userIndex >= 0 ? args[userIndex + 1] : null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tableOrder = [
  "profiles", "curriculum_source_documents", "levels", "cycles", "curriculum_versions", "age_grades", "curriculum_areas",
  "competencies", "capacities", "standards", "performances", "transversal_approaches", "school_years", "classrooms",
  "institution_assets", "institution_profiles", "students", "learning_experiences",
  "activities", "activity_criteria", "evidences", "competency_observation_guides",
  "document_templates", "document_versions", "diagnostic_sessions",
  "diagnostic_entries", "observation_references", "student_observations",
  "class_schedule_entries", "daily_execution_logs", "attendance_records", "calendar_exceptions",
  "student_context_snapshots",
  "annual_plans", "annual_plan_competencies", "annual_plan_changes",
  "competency_assessments", "competency_descriptive_conclusions", "family_reports",
];
const userFields = new Set(["user_id", "owner_id", "owner_user_id", "teacher_id", "created_by", "author_id"]);
const arrayFields = new Set(["official_performance_ids", "performance_ids"]);

if (!input) {
  console.error("Uso: npm run db:prepare-import -- <export.json> [--generate --new-user-id UUID] [--include-demo]");
  process.exit(2);
}

const source = JSON.parse(await readFile(path.resolve(input), "utf8"));
if (source.format !== "ayni-supabase-transfer-v1" || !source.tables || typeof source.tables !== "object") {
  throw new Error("Formato de exportación Ayni no reconocido.");
}
const tables = source.tables;
const problems = [];
for (const table of tableOrder) {
  if (!Array.isArray(tables[table])) problems.push(`Falta la tabla ${table} en la exportación.`);
}
for (const table of Object.keys(tables)) {
  if (!tableOrder.includes(table)) problems.push(`La tabla exportada ${table} no está contemplada por el importador.`);
}
const localUsers = new Set((tables.profiles ?? []).map((row) => row.user_id));
if (localUsers.size !== 1) problems.push("Esta versión del importador requiere exactamente una docente local.");
const sourceUserId = [...localUsers][0];
const performances = new Map((tables.performances ?? []).map((row) => [row.id, row]));
const guides = new Map((tables.competency_observation_guides ?? []).map((row) => [row.id, row]));
const nonOfficial = (tables.performances ?? []).filter((row) => !row.source_ref || row.source_ref === "seed-local-no-oficial");
if (nonOfficial.length && !includeDemo) problems.push("Hay desempeños de demostración no oficiales; no se genera paquete de producción.");
for (const ref of tables.observation_references ?? []) {
  const ids = ref.performance_ids;
  const guide = guides.get(ref.guide_id);
  if (!Array.isArray(ids) || !ids.length || !guide) {
    problems.push(`Referente ${ref.id}: sin guía o sin performance_ids.`); continue;
  }
  for (const id of ids) {
    const p = performances.get(id);
    if (!p || p.competency_id !== guide.competency_id) problems.push(`Referente ${ref.id}: desempeño ${id} inválido.`);
  }
}
if (generate && (!newUserId || !uuid.test(newUserId))) problems.push("--new-user-id debe ser el UUID del usuario creado en la cuenta nueva.");
if (generate && newUserId === sourceUserId) problems.push("El UUID nuevo no debe ser el usuario ficticio local.");

const report = {
  source: path.resolve(input), exportedAt: source.exportedAt,
  mode: generate ? "generate" : "dry-run", newUserId: generate ? newUserId : null,
  demoData: nonOfficial.length > 0, counts: Object.fromEntries(tableOrder.map((table) => [table, tables[table]?.length ?? 0])),
  problems,
  next: problems.length ? "Corregir problemas; para staging con datos ficticios usar --include-demo explícitamente." :
    generate ? "Revisar SQL y assets; aplicar manualmente solo en el proyecto Supabase nuevo, vacío y con migraciones aplicadas." :
      "Para generar paquete usar --generate --new-user-id UUID, solo con una cuenta nueva.",
};
console.log(JSON.stringify(report, null, 2));
if (!generate || problems.length) process.exit(problems.length ? 1 : 0);

function sqlValue(value, field) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("Número no finito."); return String(value); }
  if (Array.isArray(value) && arrayFields.has(field)) return `ARRAY[${value.map((item) => sqlValue(item, "item")).join(", ")}]::uuid[]`;
  if (typeof value === "object") return `${sqlValue(JSON.stringify(value), "json")}::jsonb`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

const outputDir = path.join(root, ".local", "supabase-import", randomUUID());
await mkdir(path.join(outputDir, "assets"), { recursive: true });
const assetManifest = [];
const sql = [
  "-- Ayni Aula: importar SOLO en un proyecto Supabase nuevo, vacío y con migraciones aplicadas.",
  "-- Revisar el manifiesto de logos. Este SQL no sube objetos a Storage.",
  "-- Las rutas de evidencias multimedia se preservan como referencias; no se copian fotos privadas.",
  "begin;",
  `do $$ begin if not exists (select 1 from auth.users where id = '${newUserId}') then raise exception 'Usuario destino no existe en auth.users'; end if; end $$;`,
];
for (const table of tableOrder) {
  for (const original of tables[table]) {
    const row = { ...original };
    for (const key of Object.keys(row)) if (userFields.has(key) && row[key] === sourceUserId) row[key] = newUserId;
    if (table === "institution_assets") {
      const ext = row.mime_type === "image/svg+xml" ? "svg" : row.mime_type === "image/png" ? "png" : "bin";
      const sourcePath = path.resolve(root, row.original_path);
      const safeRoot = path.resolve(root, ".local", "assets") + path.sep;
      if (!sourcePath.startsWith(safeRoot)) throw new Error(`Ruta de asset fuera de .local/assets: ${row.id}`);
      const targetPath = `${newUserId}/${row.id}.${ext}`;
      await copyFile(sourcePath, path.join(outputDir, "assets", `${row.id}.${ext}`));
      assetManifest.push({ id: row.id, bucket: "institution-logos", targetPath,
        localFile: `assets/${row.id}.${ext}`, mimeType: row.mime_type });
      row.original_path = targetPath;
      row.normalized_path = targetPath;
    }
    const columns = Object.keys(row);
    sql.push(`insert into public.${table} (${columns.map((column) => `"${column}"`).join(", ")}) values (${columns.map((column) => sqlValue(row[column], column)).join(", ")});`);
  }
}
sql.push("commit;");
await writeFile(path.join(outputDir, "import.sql"), sql.join("\n") + "\n", "utf8");
await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify({ ...report, assetManifest }, null, 2), "utf8");
console.log(`Paquete preparado: ${outputDir}`);
