import path from "node:path";
import { readFile } from "node:fs/promises";

// Only repository-owned files can become model instructions.
const SKILL_FILES = [
  ["SKILL.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/SKILL.md")],
  ["references/fuentes-y-criterio.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/references/fuentes-y-criterio.md")],
  ["references/lectura-pedagogica-cneb.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/references/lectura-pedagogica-cneb.md")],
  ["references/estructura-del-borrador.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/references/estructura-del-borrador.md")],
  ["references/prioridades-del-ano.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/references/prioridades-del-ano.md")],
  ["references/comentario-individual.md", path.join(process.cwd(), "skills/crear-evaluacion-diagnostica/references/comentario-individual.md")],
];

export async function loadDiagnosticEvaluationSkill() {
  const contents = await Promise.all(SKILL_FILES.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Diagnostic Skill empty: ${name}`);
    return `## ${name}\n${content}`;
  }));
  return `Skill crear-evaluacion-diagnostica (visión grupal o prioridades, según stage):\n\n${contents.join("\n\n")}`;
}
