import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { prepareBenchmark, executeBenchmark } from "../src/luna-benchmark-job.mjs";

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith("--")) throw new Error(`Argumento inesperado: ${arg}`);
    const key = arg.slice(2);
    if (["execute", "no-luna"].includes(key)) { values[key] = true; continue; }
    if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new Error(`Falta valor para ${arg}.`);
    values[key] = argv[++index];
  }
  return values;
}
const args = parse(process.argv.slice(2));
if (!args.dataset) throw new Error("Indica --dataset archivo.json o archivo.jsonl.");
const dataset = path.resolve(process.cwd(), args.dataset);
const prepared = await prepareBenchmark({ dataset,
  limit: args.limit == null ? undefined : Number(args.limit),
  runs: args.runs == null ? 1 : Number(args.runs), methods: args.methods ?? "both",
  includeLuna: !args["no-luna"], currentMode: args["current-mode"] ?? "product-teacher",
  criteriaProfile: args["criteria-profile"] ?? "focused" });
console.log(JSON.stringify({ dataset: path.relative(EXPERIMENT_ROOT, dataset), preflight: prepared.preflight,
  current_method: prepared.options.currentMode, methods: prepared.options.methods,
  note: "Estimación previa. El costo final se basa en usage real; cada repetición ejecuta llamadas nuevas." }, null, 2));
if (!args.execute) {
  console.log("Vista previa solamente. Añade --execute --max-live-requests N para hacer llamadas pagadas.");
} else {
  const result = await executeBenchmark(prepared, { maxLiveRequests: Number(args["max-live-requests"]),
    onProgress: ({ completed, total, actual_cost_usd }) => console.log(`${completed}/${total} casos-repetición · costo conocido $${actual_cost_usd.toFixed(6)}`) });
  console.log(JSON.stringify({ results: result.directory, status: result.summary.status, error: result.summary.error }, null, 2));
  if (result.summary.status !== "completed") process.exitCode = 1;
}
