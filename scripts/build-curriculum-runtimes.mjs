import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const master = JSON.parse(await readFile(path.join(root, "curriculum/official/initial-cycle-ii-master.json"), "utf8"));
await mkdir(path.join(root, "curriculum/runtime"), { recursive: true });
for (const age of master.ages) {
  const competencies = master.competencies.map((competency) => ({ ...competency, performances: (competency.performances ?? []).filter((performance) => performance.age === age) })).filter((competency) => competency.performances.length || competency.review_status === "verified");
  await writeFile(path.join(root, `curriculum/runtime/initial-${age}.ai.json`), JSON.stringify({ schema_version: 1, generated_from: "initial-cycle-ii-master.json", source_status: master.status, age, competencies }, null, 2) + "\n");
}
