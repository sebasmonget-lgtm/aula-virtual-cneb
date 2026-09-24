import { readFile } from "node:fs/promises";

// Fixed, repository-owned files: no path or instruction can be supplied by a teacher request.
const SKILL_FILES = [
  ["SKILL.md", new URL("../../skills/crear-plan-anual/SKILL.md", import.meta.url)],
  ["references/lectura-del-contexto.md", new URL("../../skills/crear-plan-anual/references/lectura-del-contexto.md", import.meta.url)],
  ["references/criterios-cneb.md", new URL("../../skills/crear-plan-anual/references/criterios-cneb.md", import.meta.url)],
  ["references/calendario-pedagogico.md", new URL("../../skills/crear-plan-anual/references/calendario-pedagogico.md", import.meta.url)],
  ["references/estructura-plan-maestro.md", new URL("../../skills/crear-plan-anual/references/estructura-plan-maestro.md", import.meta.url)],
];

export async function loadAnnualPlanSkill() {
  const contents = await Promise.all(SKILL_FILES.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Annual plan Skill empty: ${name}`);
    return `## ${name}\n${content}`;
  }));
  return `Skill crear-plan-anual (instrucciones de la aplicación para el Plan Maestro):\n\n${contents.join("\n\n")}`;
}
