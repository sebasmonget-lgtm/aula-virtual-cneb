import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { loadExperimentConfig } from "./config.mjs";
import { createJevCompetencyClassifier, resolveGateway } from "./jev-classifier.mjs";
import { loadKnowledgeBase } from "./kb-loader.mjs";
import { prepareBenchmark, executeBenchmark } from "./luna-benchmark-job.mjs";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const publicDirectory = path.join(EXPERIMENT_ROOT, "public");
const port = Number(process.env.JEV_EXPERIMENT_PORT ?? 4179);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Puerto inválido.");
const benchmarkDatasetsDirectory = path.join(EXPERIMENT_ROOT, "datasets", "luna-benchmark");
let benchmarkJob = null;
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

function benchmarkOptions(body) {
  if (typeof body.dataset !== "string" || !/^[A-Za-z0-9_.-]+\.(?:json|jsonl)$/u.test(body.dataset))
    throw new Error("Selecciona un dataset disponible.");
  return { dataset: path.join(benchmarkDatasetsDirectory, body.dataset),
    limit: body.limit == null ? undefined : Number(body.limit), runs: Number(body.runs ?? 1),
    methods: body.methods ?? "both", includeLuna: body.include_luna !== false,
    currentMode: body.current_mode ?? "product-teacher", criteriaProfile: body.criteria_profile ?? "focused" };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  try {
    if (request.method === "POST" && request.headers.origin &&
        ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(request.headers.origin))
      return send(response, 403, JSON.stringify({ error: "Origen local no permitido." }), { "content-type": "application/json" });
    if (request.method === "GET" && url.pathname === "/api/benchmark/datasets") {
      const files = (await readdir(benchmarkDatasetsDirectory)).filter((name) => /^[A-Za-z0-9_.-]+\.(?:json|jsonl)$/u.test(name));
      return send(response, 200, JSON.stringify({ datasets: files }), { "content-type": "application/json" });
    }
    if (request.method === "POST" && url.pathname === "/api/benchmark/preview") {
      const prepared = await prepareBenchmark(benchmarkOptions(await readBody(request)));
      return send(response, 200, JSON.stringify({ preflight: prepared.preflight,
        dataset_fingerprint: prepared.loaded.fingerprint }), { "content-type": "application/json" });
    }
    if (request.method === "POST" && url.pathname === "/api/benchmark/start") {
      if (benchmarkJob?.status === "running") return send(response, 409, JSON.stringify({ error: "Ya hay un benchmark en curso." }), { "content-type": "application/json" });
      const body = await readBody(request);
      const prepared = await prepareBenchmark(benchmarkOptions(body));
      if (body.dataset_fingerprint !== prepared.loaded.fingerprint) throw new Error("El dataset cambió desde la vista previa.");
      const maxLiveRequests = Number(body.max_live_requests);
      const maximum = prepared.preflight.jev_calls_max + prepared.preflight.luna_calls_max;
      if (!Number.isInteger(maxLiveRequests) || maxLiveRequests < maximum) throw new Error(`El límite debe ser al menos ${maximum}.`);
      benchmarkJob = { status: "running", progress: { completed: 0, total: prepared.selected.length * prepared.options.runs,
        actual_cost_usd: 0 }, result: null, error: null };
      setImmediate(async () => {
        try { benchmarkJob.result = await executeBenchmark(prepared, { maxLiveRequests,
          onProgress: (progress) => { benchmarkJob.progress = progress; } });
          benchmarkJob.status = benchmarkJob.result.summary.status;
          benchmarkJob.error = benchmarkJob.result.summary.error;
        } catch (error) { benchmarkJob.status = "failed"; benchmarkJob.error = error.message; }
      });
      return send(response, 202, JSON.stringify({ status: "running" }), { "content-type": "application/json" });
    }
    if (request.method === "GET" && url.pathname === "/api/benchmark/status") {
      return send(response, 200, JSON.stringify(benchmarkJob ?? { status: "idle" }), { "content-type": "application/json" });
    }
    if (request.method === "GET" && url.pathname === "/api/benchmark/comparison") {
      if (!benchmarkJob?.result) return send(response, 404, "No hay comparación disponible.");
      return send(response, 200, await readFile(path.join(benchmarkJob.result.directory, "comparison.md"), "utf8"),
        { "content-type": "text/plain; charset=utf-8" });
    }
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

server.listen(port, "127.0.0.1", () => console.log(`Experimento Jev–CNEB en http://127.0.0.1:${port}`));
