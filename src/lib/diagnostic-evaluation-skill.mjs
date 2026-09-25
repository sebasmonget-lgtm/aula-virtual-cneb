import { readFile } from "node:fs/promises";

// Only repository-owned files can become model instructions.
const SKILL_FILES = [
  ["SKILL.md", new URL("../../skills/crear-evaluacion-diagnostica/SKILL.md", import.meta.url)],
  ["references/fuentes-y-criterio.md", new URL("../../skills/crear-evaluacion-diagnostica/references/fuentes-y-criterio.md", import.meta.url)],
  ["references/lectura-pedagogica-cneb.md", new URL("../../skills/crear-evaluacion-diagnostica/references/lectura-pedagogica-cneb.md", import.meta.url)],
  ["references/estructura-del-borrador.md", new URL("../../skills/crear-evaluacion-diagnostica/references/estructura-del-borrador.md", import.meta.url)],
  ["references/prioridades-del-ano.md", new URL("../../skills/crear-evaluacion-diagnostica/references/prioridades-del-ano.md", import.meta.url)],
  ["references/comentario-individual.md", new URL("../../skills/crear-evaluacion-diagnostica/references/comentario-individual.md", import.meta.url)],
];

export async function loadDiagnosticEvaluationSkill() {
  const contents = await Promise.all(SKILL_FILES.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Diagnostic Skill empty: ${name}`);
    return `## ${name}\n${content}`;
  }));
  return `Skill crear-evaluacion-diagnostica (visión grupal o prioridades, según stage):\n\n${contents.join("\n\n")}`;
}
