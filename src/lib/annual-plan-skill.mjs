import path from "node:path";
import { readFile } from "node:fs/promises";

// Fixed, repository-owned files: no path or instruction can be supplied by a teacher request.
const SKILL_FILES = [
  ["SKILL.md", path.join(process.cwd(), "skills/crear-plan-anual/SKILL.md")],
  ["references/lectura-del-contexto.md", path.join(process.cwd(), "skills/crear-plan-anual/references/lectura-del-contexto.md")],
  ["references/criterios-cneb.md", path.join(process.cwd(), "skills/crear-plan-anual/references/criterios-cneb.md")],
  ["references/calendario-pedagogico.md", path.join(process.cwd(), "skills/crear-plan-anual/references/calendario-pedagogico.md")],
  ["references/estructura-plan-maestro.md", path.join(process.cwd(), "skills/crear-plan-anual/references/estructura-plan-maestro.md")],
];

export async function loadAnnualPlanSkill() {
  const contents = await Promise.all(SKILL_FILES.map(async ([name, url]) => {
    const content = (await readFile(url, "utf8")).trim();
    if (!content) throw new Error(`Annual plan Skill empty: ${name}`);
    return `## ${name}\n${content}`;
  }));
  return `Skill crear-plan-anual (instrucciones de la aplicación para el Plan Maestro):\n\n${contents.join("\n\n")}`;
}

/** V3 only loads the references relevant to an editable preplan. */
export async function loadAnnualPreplanSkill() {
  const files = ["SKILL.md", "references/lectura-del-contexto.md", "references/criterios-cneb.md",
    "references/calendario-pedagogico.md", "references/preplan-editable.md"];
  return (await Promise.all(files.map(async (name) =>
    `## ${name}\n${(await readFile(path.join(process.cwd(), `skills/crear-plan-anual/${name}`), "utf8")).trim()}`))).join("\n\n");
}

/** The confirmed classroom contract drives themes; dates still come from the authorized calendar. */
export async function loadPersonalizedPreplanSkill() {
  const files = ["references/criterios-cneb.md", "references/preplan-personalizado.md"];
  return `Skill crear-plan-anual (propuestas desde decisiones docentes confirmadas):\n\n${(await Promise.all(files.map(async (name) =>
    `## ${name}\n${(await readFile(path.join(process.cwd(), `skills/crear-plan-anual/${name}`), "utf8")).trim()}`))).join("\n\n")}`;
}
