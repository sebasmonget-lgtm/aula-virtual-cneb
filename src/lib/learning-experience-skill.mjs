import { readFile } from "node:fs/promises";

const files = [
  ["SKILL.md", new URL("../../skills/crear-proyecto-unidad/SKILL.md", import.meta.url)],
  ["references/fuentes-cneb.md", new URL("../../skills/crear-proyecto-unidad/references/fuentes-cneb.md", import.meta.url)],
  ["references/contrato-ruta.md", new URL("../../skills/crear-proyecto-unidad/references/contrato-ruta.md", import.meta.url)],
  ["references/plantilla-unificada.md", new URL("../../skills/crear-proyecto-unidad/references/plantilla-unificada.md", import.meta.url)],
];

export async function loadLearningExperienceSkill() {
  return (await Promise.all(files.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Skill de proyecto vacía: ${name}`);
    return `## ${name}\n${content}`;
  }))).join("\n\n");
}
