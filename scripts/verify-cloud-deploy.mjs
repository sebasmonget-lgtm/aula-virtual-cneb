import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const failures = [];
const apiRoute = "app/api/[...path]/route.ts";
const apiServer = read("scripts/local-db-server.mjs");
const apiClient = read("src/lib/local-database.ts");

if (!existsSync(path.join(root, apiRoute))) {
  failures.push("Falta una función de Vercel que atienda /api/* con el mismo contrato que la API local.");
}
if (/server\.listen\(port, listenHost/.test(apiServer)) {
  failures.push("La API aún inicia un servidor HTTP persistente; falta el adaptador para peticiones de Vercel.");
}
if (/await mkdir\(assetsDir, \{ recursive: true \}\)/.test(apiServer)) {
  failures.push("La API aún escribe en .local/assets al arrancar, incompatible con el filesystem de la función.");
}
if (/dbMode === "postgres"[^\n]*503/.test(apiServer)) {
  failures.push("Los archivos privados todavía tienen rutas 503 en PostgreSQL; falta paridad de Storage.");
}
if (/NEXT_PUBLIC_LOCAL_DATABASE_URL \|\| "http:\/\/127\.0\.0\.1:8788"/.test(apiClient)) {
  failures.push("El cliente todavía puede resolver la API a 127.0.0.1 en un build público.");
}

if (failures.length) {
  console.error("Ayni: despliegue Vercel/Supabase bloqueado para evitar una versión incompleta:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Ver docs/VERCEL_SUPABASE_READINESS.md. Este chequeo no lee ni muestra secretos.");
  process.exitCode = 1;
} else {
  console.log("Los bloqueos estáticos conocidos están resueltos. Aún se exige staging y smoke test antes de publicar.");
}
