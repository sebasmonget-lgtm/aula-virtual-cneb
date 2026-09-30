import path from "node:path";
import { readFile } from "node:fs/promises";

export async function loadActivitySkill() {
  const files = [
    ["SKILL.md", path.join(process.cwd(), "skills/crear-actividad/SKILL.md")],
    ["references/herencia-y-curriculo.md", path.join(process.cwd(), "skills/crear-actividad/references/herencia-y-curriculo.md")],
  ];
  return (await Promise.all(files.map(async ([name, url]) => `## ${name}\n${(await readFile(url, "utf8")).trim()}`))).join("\n\n");
}
