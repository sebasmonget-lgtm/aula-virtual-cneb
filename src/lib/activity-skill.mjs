import { readFile } from "node:fs/promises";

export async function loadActivitySkill() {
  const files = [
    ["SKILL.md", new URL("../../skills/crear-actividad/SKILL.md", import.meta.url)],
    ["references/herencia-y-curriculo.md", new URL("../../skills/crear-actividad/references/herencia-y-curriculo.md", import.meta.url)],
  ];
  return (await Promise.all(files.map(async ([name, url]) => `## ${name}\n${(await readFile(url, "utf8")).trim()}`))).join("\n\n");
}
