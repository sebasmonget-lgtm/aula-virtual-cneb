import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("el preplan personalizado lee referencias desde el directorio de ejecución, no desde el módulo empaquetado", async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "ayni-annual-skill-runtime-"));
  try {
    const references = path.join(runtimeRoot, "skills/crear-plan-anual/references");
    await mkdir(references, { recursive: true });
    await writeFile(path.join(references, "criterios-cneb.md"), "  Referencia curricular del paquete de ejecución.  ");
    await writeFile(path.join(references, "preplan-personalizado.md"), "  Referencia de personalización del paquete de ejecución.  ");
    const moduleUrl = new URL("./annual-plan-skill.mjs", import.meta.url).href;
    const actual = execFileSync(process.execPath, ["--input-type=module", "-e",
      `const { loadPersonalizedPreplanSkill } = await import(${JSON.stringify(moduleUrl)}); process.stdout.write(await loadPersonalizedPreplanSkill());`],
    { cwd: runtimeRoot, encoding: "utf8" });
    assert.equal(actual, "Skill crear-plan-anual (propuestas desde decisiones docentes confirmadas):\n\n"
      + "## references/criterios-cneb.md\nReferencia curricular del paquete de ejecución.\n\n"
      + "## references/preplan-personalizado.md\nReferencia de personalización del paquete de ejecución.");
  } finally {
    assert.equal(path.dirname(path.resolve(runtimeRoot)), path.resolve(tmpdir()));
    assert.match(path.basename(runtimeRoot), /^ayni-annual-skill-runtime-/);
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});
