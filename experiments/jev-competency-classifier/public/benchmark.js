const form = document.querySelector("#benchmark-form");
const dataset = document.querySelector("#benchmark-dataset");
const previewButton = document.querySelector("#benchmark-preview");
const startButton = document.querySelector("#benchmark-start");
const plan = document.querySelector("#benchmark-plan");
const progress = document.querySelector("#benchmark-progress");
const comparison = document.querySelector("#benchmark-comparison");
let preview = null;

async function request(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result;
}

function values() {
  const data = new FormData(form);
  return { dataset: data.get("dataset"), methods: data.get("methods"), current_mode: data.get("current_mode"),
    criteria_profile: data.get("criteria_profile"), include_luna: data.has("include_luna"), runs: Number(data.get("runs")) };
}

form.addEventListener("change", () => { preview = null; startButton.disabled = true; plan.textContent = ""; });
previewButton.addEventListener("click", async () => {
  try {
    preview = await request("/api/benchmark/preview", values());
    const p = preview.preflight;
    plan.textContent = `${p.cases} casos × ${p.runs} repeticiones: hasta ${p.jev_calls_max} llamadas Jev y ${p.luna_calls_max} Luna. ` +
      `Costo orientativo US$${p.estimated_cost_usd.toFixed(6)}; el real depende de tokens y respuestas.`;
    startButton.disabled = false;
  } catch (error) { plan.textContent = error.message; startButton.disabled = true; }
});

startButton.addEventListener("click", async () => {
  if (!preview) return;
  startButton.disabled = true; previewButton.disabled = true; comparison.textContent = "";
  try {
    const maximum = preview.preflight.jev_calls_max + preview.preflight.luna_calls_max;
    await request("/api/benchmark/start", { ...values(), dataset_fingerprint: preview.dataset_fingerprint,
      max_live_requests: maximum });
    progress.textContent = "Iniciando…";
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/benchmark/status");
        const job = await response.json();
        progress.textContent = `${job.status}: ${job.progress?.completed ?? 0}/${job.progress?.total ?? 0} casos-repetición; ` +
          `costo conocido US$${(job.progress?.actual_cost_usd ?? 0).toFixed(6)}${job.error ? `; ${job.error}` : ""}`;
        if (job.status !== "running") {
          clearInterval(timer); previewButton.disabled = false;
          if (job.result) comparison.textContent = await (await fetch("/api/benchmark/comparison")).text();
        }
      } catch (error) { clearInterval(timer); progress.textContent = error.message; previewButton.disabled = false; }
    }, 1000);
  } catch (error) { progress.textContent = error.message; previewButton.disabled = false; startButton.disabled = false; }
});

fetch("/api/benchmark/datasets").then((response) => response.json()).then(({ datasets }) => {
  dataset.replaceChildren(...datasets.map((name) => { const option = document.createElement("option"); option.value = name; option.textContent = name; return option; }));
}).catch((error) => { plan.textContent = error.message; });
