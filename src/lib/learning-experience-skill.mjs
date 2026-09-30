import path from "node:path";
import { readFile } from "node:fs/promises";

const files = [
  ["SKILL.md", path.join(process.cwd(), "skills/crear-proyecto-unidad/SKILL.md")],
  ["references/fuentes-cneb.md", path.join(process.cwd(), "skills/crear-proyecto-unidad/references/fuentes-cneb.md")],
  ["references/contrato-ruta.md", path.join(process.cwd(), "skills/crear-proyecto-unidad/references/contrato-ruta.md")],
  ["references/plantilla-unificada.md", path.join(process.cwd(), "skills/crear-proyecto-unidad/references/plantilla-unificada.md")],
];

export async function loadLearningExperienceSkill() {
  return (await Promise.all(files.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Skill de proyecto vacía: ${name}`);
    return `## ${name}\n${content}`;
  }))).join("\n\n");
}
