import { prepareCurrentDev, executeCurrentDev } from "../src/current-dev-job.mjs";

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const name = process.argv[i];
  if (name === "--execute") args.execute = true;
  else if (["--dataset", "--adjudication", "--runs", "--limit", "--max-live-requests"].includes(name) && process.argv[i + 1]) args[name.slice(2)] = process.argv[++i];
  else throw new Error(`Argumento inválido: ${name}`);
}
if (!args.dataset) throw new Error("Indica --dataset DEV.jsonl. El test final congelado está prohibido en este comando.");
const prepared = await prepareCurrentDev({ dataset: args.dataset, adjudicationFile: args.adjudication,
  runs: Number(args.runs ?? 3), limit: args.limit == null ? undefined : Number(args.limit) });
console.log(JSON.stringify({ preflight: prepared.preflight, note: "Presupuesto estimado. Sin --execute no hay llamadas. Requiere gold adjudicado por humano y manifest SHA-256." }, null, 2));
if (args.execute) {
  const result = await executeCurrentDev(prepared, { maxLiveRequests: Number(args["max-live-requests"]),
    onProgress: (progress) => console.log(JSON.stringify(progress)) });
  console.log(JSON.stringify({ directory: result.directory, status: result.summary.status, error: result.summary.error }, null, 2));
  if (result.summary.status !== "completed") process.exitCode = 1;
}
