import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const component = async (name) => readFile(new URL(`../features/dashboard/components/${name}.tsx`, import.meta.url), "utf8");

test("plan anual reabre el mismo borrador y no genera otro mientras existe", async () => {
  const source = await component("annual-plan-generator");
  assert.match(source, /const saved = plans\.draft \?\? plans\.active \?\? plans\.archived\?\.\[0\] \?\? null/);
  assert.match(source, /setProposal\(saved\?\.proposal \?\? null\); setPlanId\(saved\?\.id \?\? null\)/);
  assert.match(source, /if \(operation \|\| loading \|\| loadError \|\| \(existingPlan && !canReplaceLegacy\) \|\| calendarWarning/);
  assert.match(source, /const readOnly = existingPlan\?\.status === "active" \|\| existingPlan\?\.status === "archived"/);
  assert.match(source, /if \(!planId \|\| !proposal \|\| operation \|\| readOnly \|\| hasUnsavedChanges \|\| calendarWarning\) return/);
  assert.match(source, /get<PlansResponse>\("\/api\/annual-plans\/current", "No se pudo cargar el plan anual\."\)/);
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
  const sql = source.match(/const experiences = \(await db\.query\(`(select id,type,title,purpose,starts_on,ends_on,status,annual_plan_id,origin,planning_reason,source_proposal_index,details,teacher_confirmed_at,version,revision,lineage_id,supersedes_experience_id,superseded_at from learning_experiences[^`]+)`/i)?.[1];
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
  assert.match(route, /select id,classroom_id,status,proposal from annual_plans where school_year_id=\$1 and status in \('active','draft'\)/);
  assert.match(route, /if \(draft \|\| \(active && !replacingLegacy\) \|\| \(!active && body\.replacementPlanId\)\)/);
  assert.match(route, /update annual_plans set proposal=\$1::jsonb, updated_at=now\(\) where id=\$2 and status='draft' and revision=\$3/);
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

test("Evaluar reúne nivel y conclusión en una ficha y reconstruye el estado al recargar", async () => {
  const evaluation = await component("period-evaluation");
  const workspace = await component("teacher-workspace");
  assert.match(evaluation, /period-evaluations\/detail/);
  assert.match(evaluation, /Nivel que confirmas/);
  assert.match(evaluation, /Conclusión descriptiva/);
  assert.match(evaluation, /reloadOverview\(\)/);
  assert.match(workspace, /<EvaluationHome dashboard=\{dashboard\}/);
  assert.match(workspace, /<PeriodEvaluation key=\{.*initialStudentId=\{target\?\.studentId\}/);
});

test("el perfil propone solo acciones posibles para competencias v4 y los vacíos vuelven a planificar", async () => {
  const source = await component("students-screen");
  assert.match(source, /recommendedStudentGuidance\(competencies\)/);
  assert.match(source, /if \(guidance\.action && competency\.competency_v4_id\) onEvaluate\?\./);
  assert.match(source, /onPlan && <EmptyState title="Prepara nuevas observaciones"/);
  assert.match(source, /Observación registrada/);
});
