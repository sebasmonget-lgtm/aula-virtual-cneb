import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { loadExperimentConfig } from "./config.mjs";
import { createJevCompetencyClassifier, resolveGateway } from "./jev-classifier.mjs";
import { loadKnowledgeBase } from "./kb-loader.mjs";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const publicDirectory = path.join(EXPERIMENT_ROOT, "public");
const { classifier: config, pricing: directPricing, openrouterPricing } = await loadExperimentConfig();
const gateway = resolveGateway();
const pricing = gateway === "openrouter" ? openrouterPricing : directPricing;
const configured = Boolean(gateway === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.TYPESAFE_API_KEY);
const knowledgeBase = await loadKnowledgeBase();
const classifiers = Object.fromEntries(["choice", "parallel-noul"].flatMap((method) => ["compact", "enriched", "focused"].map((criteriaProfile) => [`${method}:${criteriaProfile}`, createJevCompetencyClassifier({ knowledgeBase, config, gateway, method, criteriaProfile })])));
const names = Object.fromEntries(knowledgeBase.cards.map((card) => [card.id, card.official_name]));
names.NO_CLASIFICABLE = "Información insuficiente / no clasificable";
const providerName = gateway === "openrouter" ? "OpenRouter" : "TypeSafe";
const classificationErrors = {
  auth: `${providerName} rechazó la clave. Revisa la clave en .env.local.`,
  insufficient_credits: "OpenRouter indica que no hay créditos suficientes.",
  rate_limited: `${providerName} limitó temporalmente las solicitudes.`,
  model_unavailable: "El modelo Jev no está disponible para esta solicitud.",
  timeout: "La consulta a Jev superó el tiempo límite.",
  network: `No se pudo conectar con ${providerName}.`,
  invalid_response: "Jev devolvió una respuesta incompatible con el experimento.",
};

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
    if (request.method === "GET" && url.pathname === "/api/config") return send(response, 200, JSON.stringify({ configured, gateway, pricing, classifier_version: config.classifier_version }), { "content-type": "application/json" });
    if (request.method === "GET" && url.pathname === "/api/options") {
      const plan = buildCriteria(knowledgeBase, { age: Number(url.searchParams.get("age")), observation: "consulta", applicability: { castellano_as_second_language: url.searchParams.get("l2") === "true", religion_applicable: url.searchParams.get("religion") === "true" } }, config);
      return send(response, 200, JSON.stringify({ options: plan.options.map(({ id, name }) => ({ id, name })), names }), { "content-type": "application/json" });
    }
    if (request.method === "POST" && url.pathname === "/api/classify") {
      if (!configured) return send(response, 503, JSON.stringify({ error: `El clasificador Jev no está configurado. Define ${gateway === "openrouter" ? "OPENROUTER_API_KEY" : "TYPESAFE_API_KEY"} en .env.local.` }), { "content-type": "application/json" });
      const body = await readBody(request);
      const classifier = classifiers[`${body.method ?? "choice"}:${body.criteria_profile ?? "compact"}`];
      if (!classifier) return send(response, 400, JSON.stringify({ error: "Método inválido." }), { "content-type": "application/json" });
      const result = await classifier.classifyObservation(body);
      return send(response, result.status === "classification_failed" ? 502 : 200, JSON.stringify({ result, names, ...(result.status === "classification_failed" ? { error: classificationErrors[result.error_code] ?? "No se pudo completar la clasificación." } : {}) }), { "content-type": "application/json" });
    }
    return serveStatic(response, url.pathname);
  } catch (error) { return send(response, 400, JSON.stringify({ error: error.message }), { "content-type": "application/json" }); }
});

server.listen(4179, "127.0.0.1", () => console.log("Experimento Jev–CNEB en http://127.0.0.1:4179"));
