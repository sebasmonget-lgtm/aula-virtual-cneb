import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const component = async (name) => readFile(new URL(`../features/dashboard/components/${name}.tsx`, import.meta.url), "utf8");

test("plan anual reabre el mismo borrador y no genera otro mientras existe", async () => {
  const source = await component("annual-plan-generator");
  assert.match(source, /function openPlan\(plan: SavedPlan\).*setProposal\(plan\.proposal\).*setPlanId\(plan\.id\)/);
  assert.match(source, /existingPlan\.status === "draft" \? "Abrir borrador" : "Ver plan"/);
  assert.match(source, /existingPlan\?\.status === "draft"\) return/);
  assert.match(source, /disabled=\{Boolean\(operation\) \|\| loading \|\| loadError \|\| existingPlan\?\.status === "draft"\}/);
  assert.match(source, /fieldset disabled=\{activeView \|\| Boolean\(operation\)\}/);
  assert.match(source, /!planId \|\| operation \|\| activeView \|\| hasUnsavedChanges/);
  assert.match(source, /disabled=\{Boolean\(operation\) \|\| !planId \|\| hasUnsavedChanges\}/);
  assert.match(source, /if \(!response\.ok\) throw new Error\("No se pudo cargar el plan anual\."\)/);
});

test("criterio no convierte un error de lectura en un formulario nuevo", async () => {
  const source = await component("criterion-evidence-generator");
  assert.match(source, /activity-criteria\?activityId=\$\{activityId\}/);
  assert.match(source, /if \(!response\.ok\) throw new Error\("No se pudo cargar el criterio/);
  assert.match(source, /if \(loadError\) return .*Reintentar carga/);
  assert.match(source, /if \(!stored \|\| operation \|\| hasUnsavedChanges\) return/);
  assert.match(source, /disabled=\{Boolean\(operation\) \|\| hasUnsavedChanges\}/);
});

test("actividad y experiencia distinguen fallos de lectura y de refresco de un fallo de guardado", async () => {
  const activity = await component("parent-activity-generator");
  const experience = await component("learning-experience-generator");
  assert.match(activity, /if \(!response\.ok\) throw new Error\("No se pudieron cargar las experiencias\."\)/);
  assert.match(activity, /Borrador guardado, pero no se pudo actualizar la lista de actividades/);
  assert.match(activity, /Actividad confirmada, pero no se pudo actualizar la lista de actividades/);
  assert.match(activity, /if \(!draftId \|\| !parent \|\| operation \|\| hasUnsavedChanges\) return/);
  assert.match(experience, /if\(!r\.ok\)throw new Error\("No se pudieron cargar las experiencias\."\)/);
  assert.match(experience, /Borrador guardado, pero no se pudo actualizar la lista de experiencias/);
  assert.match(experience, /Experiencia confirmada, pero no se pudo actualizar la lista de experiencias/);
  assert.match(experience, /if\(operation\|\|hasUnsavedChanges\)return/);
  assert.match(experience, /filter\(isV4Experience\)/);
  assert.match(activity, /item\.type === "project" \|\| item\.type === "unit"/);
});

test("la consulta real de experiencias usa columnas presentes en las migraciones locales", async () => {
  const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const sql = source.match(/const experiences = \(await db\.query\(`(select id,type,title,purpose,starts_on,ends_on,status,annual_plan_id,origin,planning_reason,source_proposal_index,details,teacher_confirmed_at from learning_experiences[^`]+)`/i)?.[1];
  assert.ok(sql, "La ruta GET debe conservar una consulta verificable.");
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  const db = await PGlite.create();
  try {
    for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(await readFile(new URL(file, migrations), "utf8"));
    }
    const rows = await db.query(sql, ["00000000-0000-4000-8000-000000000001"]);
    assert.ok(Array.isArray(rows.rows));
  } finally {
    await db.close();
  }
});

test("el servidor rechaza una segunda creación anual cuando ya existe un draft", async () => {
  const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const route = source.slice(source.indexOf('url.pathname === "/api/annual-plans"'), source.indexOf('url.pathname.startsWith("/api/annual-plans/")'));
  assert.match(route, /select id from annual_plans where classroom_id=\$1 and school_year_id=\$2 and status='draft' limit 1/);
  assert.match(route, /if \(openDraft\.rows\.length\) throw new Error\("Ya existe un borrador anual/);
});

test("análisis no presenta evidencias inexistentes ante un error HTTP", async () => {
  const source = await component("assessment-generator");
  assert.match(source, /if \(!response\.ok\) throw new Error\("No se pudieron cargar las evidencias del periodo\."\)/);
  assert.match(source, /!optionsError && options\.length === 0/);
  assert.match(source, /!contextError && <div className="ayni-panel/);
  assert.match(source, /Reintentar carga de competencias/);
  assert.match(source, /Reintentar carga de evidencias/);
  assert.match(source, /if \(!stored \|\| !proposal \|\| hasUnsavedChanges \|\| contextError\) return/);
});

test("conclusiones e informes exigen guardar cambios antes de confirmar", async () => {
  for (const name of ["descriptive-conclusion-generator", "family-report-generator"]) {
    const source = await component(name);
    assert.match(source, /const hasUnsavedChanges = Boolean\(/);
    assert.match(source, /Guarda los cambios antes de confirmar\./);
    assert.match(source, /disabled=\{busy \|\| hasUnsavedChanges/);
  }
  const conclusion = await component("descriptive-conclusion-generator");
  assert.match(conclusion, /!optionsError && assessments\.length === 0/);
  assert.match(conclusion, /!contextError && <div className="ayni-panel/);
  assert.match(conclusion, /Reintentar carga de análisis/);
  const report = await component("family-report-generator");
  assert.match(report, /!loadingOptions && !loadError &&/);
  assert.match(report, /Reintentar carga de informes/);
});
