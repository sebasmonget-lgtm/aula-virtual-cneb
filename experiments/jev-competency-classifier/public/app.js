const form = document.querySelector("#form");
const button = document.querySelector("#compare-button");
const error = document.querySelector("#error");
const statusText = document.querySelector("#comparison-status");
const cards = { choice: document.querySelector("#choice-result .method-content"), "parallel-noul": document.querySelector("#parallel-result .method-content") };
let pricing;

const percent = (value) => value == null ? "—" : `${(value * 100).toFixed(1)} %`;
const label = (id, names) => names[id] ?? id ?? "—";
const cost = (usage) => !usage || !pricing ? "—" : `$${(usage.cost_usd ?? (usage.input_tokens / 1_000_000 * pricing.input_usd_per_million + usage.output_tokens / 1_000_000 * pricing.output_usd_per_million)).toFixed(6)}`;

function line(key, value) {
  const dt = document.createElement("dt"); dt.textContent = key;
  const dd = document.createElement("dd"); dd.textContent = value;
  return [dt, dd];
}

function renderScores(scores, names, method) {
  const details = document.createElement("details");
  const title = document.createElement("summary");
  title.textContent = method === "parallel-noul" ? `Ver las ${Object.keys(scores).length} preguntas sí/no` : "Ver todas las probabilidades";
  const list = document.createElement("ol");
  list.replaceChildren(...Object.entries(scores).sort(([, a], [, b]) => b - a).map(([id, score]) => {
    const item = document.createElement("li"); item.textContent = `${label(id, names)}: ${percent(score)}`; return item;
  }));
  details.append(title, list);
  return details;
}

function renderResult(method, item, names) {
  const content = cards[method];
  const headline = document.createElement("p"); headline.className = "key-result";
  const rows = method === "choice" ? [
    ["Estado", { classified: "Candidata (umbral experimental)", review: "Por revisar", unclassified: "No clasificable" }[item.status] ?? item.status],
    ["Competencia", label(item.primary_competency_id ?? item.proposed_competency_id, names)],
    ["Confidence", percent(item.model_confidence)],
    ["Segunda candidata", item.secondary_candidate ? `${label(item.secondary_candidate.competency_id, names)} (${percent(item.secondary_candidate.probability)})` : "—"],
  ] : [
    ["Competencias propuestas (≥80 %)", item.proposed_competency_ids?.map((id) => label(id, names)).join("; ") || "Ninguna"],
    ["Posibles para revisar (≥50 %)", item.possible_competency_ids?.map((id) => label(id, names)).join("; ") || "Ninguna"],
  ];
  headline.textContent = method === "choice" ? (item.status === "unclassified" ? "No clasificable" : rows[1][1]) : rows[0][1];
  if (item.sufficiency_probability != null) rows.push(["Suficiencia de la nota (experimental)", percent(item.sufficiency_probability)]);
  rows.push(["Latencia", item.latency_ms == null ? "—" : `${item.latency_ms} ms`], ["Costo aproximado", cost(item.usage)], ["Modelo", item.model_effective ?? "—"]);
  const summary = document.createElement("dl"); summary.replaceChildren(...rows.flatMap(([key, value]) => line(key, value)));
  content.replaceChildren(headline, summary, renderScores(method === "choice" ? item.probabilities ?? {} : item.competency_scores ?? {}, names, method));
}

async function runMethod(method, payload) {
  const response = await fetch("/api/classify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, method }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "No se pudo completar esta consulta.");
  return body;
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("No se pudo consultar la configuración local.");
    const value = await response.json(); pricing = value.pricing;
    const provider = value.gateway === "openrouter" ? "OpenRouter" : "TypeSafe";
    document.querySelector("#configuration").textContent = value.configured ? `Jev configurado mediante ${provider} · ${value.classifier_version}` : `Jev no está configurado. Añade ${value.gateway === "openrouter" ? "OPENROUTER_API_KEY" : "TYPESAFE_API_KEY"} en .env.local para probar.`;
  } catch (caught) { document.querySelector("#configuration").textContent = caught.message; }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); error.textContent = "";
  const payload = { criteria_profile: form.elements.namedItem("criteria_profile").value,
    age: Number(form.elements.namedItem("age").value), observation: form.elements.namedItem("observation").value,
    ...(form.elements.namedItem("context").value ? { context: form.elements.namedItem("context").value } : {}),
    applicability: { castellano_as_second_language: document.querySelector("#l2").checked, religion_applicable: document.querySelector("#religion").checked } };
  button.disabled = true; button.textContent = "Consultando Jev…";
  statusText.textContent = "Consultando ambos métodos con la misma observación…";
  for (const content of Object.values(cards)) { const loading = document.createElement("p"); loading.className = "loading"; loading.textContent = "Esperando respuesta…"; content.replaceChildren(loading); }
  const methods = ["choice", "parallel-noul"];
  const outcomes = await Promise.all(methods.map(async (method) => {
    try { const body = await runMethod(method, payload); renderResult(method, body.result, body.names); return true; }
    catch (caught) { const failure = document.createElement("p"); failure.className = "failure"; failure.textContent = caught.message; cards[method].replaceChildren(failure); return false; }
  }));
  statusText.textContent = outcomes.every(Boolean) ? "Comparación completada: dos respuestas del mismo modelo Jev." : "Comparación parcial: revisa el error mostrado en cada método.";
  button.disabled = false; button.textContent = "Probar ambos métodos";
});

loadConfig();
