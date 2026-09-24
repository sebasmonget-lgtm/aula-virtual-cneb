import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { loadExperimentConfig } from "./config.mjs";
import { createJevCompetencyClassifier } from "./jev-classifier.mjs";
import { loadKnowledgeBase } from "./kb-loader.mjs";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const publicDirectory = path.join(EXPERIMENT_ROOT, "public");
const { classifier: config, pricing } = await loadExperimentConfig();
const knowledgeBase = await loadKnowledgeBase();
const classifier = createJevCompetencyClassifier({ knowledgeBase, config });
const names = Object.fromEntries(knowledgeBase.cards.map((card) => [card.id, card.official_name]));
names.NO_CLASIFICABLE = "Información insuficiente / no clasificable";

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "cache-control": "no-store", ...headers }); response.end(body);
}
async function readBody(request) {
  let body = "";
  for await (const chunk of request) { body += chunk; if (body.length > 12_000) throw new Error("La solicitud excede el tamaño permitido."); }
  try { return JSON.parse(body || "{}"); } catch { throw new Error("El cuerpo debe ser JSON válido."); }
}
async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filename = path.resolve(publicDirectory, requested);
  if (!filename.startsWith(`${publicDirectory}${path.sep}`)) return send(response, 403, "Prohibido");
  try { send(response, 200, await readFile(filename), { "content-type": MIME[path.extname(filename)] ?? "application/octet-stream" }); }
  catch (error) { send(response, error.code === "ENOENT" ? 404 : 500, "No disponible"); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  try {
    if (request.method === "GET" && url.pathname === "/api/config") return send(response, 200, JSON.stringify({ configured: Boolean(process.env.TYPESAFE_API_KEY), pricing, classifier_version: config.classifier_version }), { "content-type": "application/json" });
    if (request.method === "GET" && url.pathname === "/api/options") {
      const plan = buildCriteria(knowledgeBase, { age: Number(url.searchParams.get("age")), observation: "consulta", applicability: { castellano_as_second_language: url.searchParams.get("l2") === "true", religion_applicable: url.searchParams.get("religion") === "true" } }, config);
      return send(response, 200, JSON.stringify({ options: plan.options.map(({ id, name }) => ({ id, name })), names }), { "content-type": "application/json" });
    }
    if (request.method === "POST" && url.pathname === "/api/classify") {
      if (!process.env.TYPESAFE_API_KEY) return send(response, 503, JSON.stringify({ error: "El clasificador Jev no está configurado. Define TYPESAFE_API_KEY en .env.local." }), { "content-type": "application/json" });
      const result = await classifier.classifyObservation(await readBody(request));
      return send(response, result.status === "classification_failed" ? 502 : 200, JSON.stringify({ result, names }), { "content-type": "application/json" });
    }
    return serveStatic(response, url.pathname);
  } catch (error) { return send(response, 400, JSON.stringify({ error: error.message }), { "content-type": "application/json" }); }
});

server.listen(4179, "127.0.0.1", () => console.log("Experimento Jev–CNEB en http://127.0.0.1:4179"));
