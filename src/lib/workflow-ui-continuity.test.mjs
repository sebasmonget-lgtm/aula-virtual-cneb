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
  const activity = (await component("parent-activity-generator")).replace(/\s+/g, " ");
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
  const sql = source.match(/const experiences = \(await db\.query\(`(select id,type,title,purpose,starts_on,ends_on,status,annual_plan_id,origin,planning_reason,source_proposal_index,source_proposal_id,details,teacher_confirmed_at,version,revision,lineage_id,supersedes_experience_id,superseded_at from learning_experiences[^`]+)`/i)?.[1];
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

test("Evaluar separa valoración docente y conclusión posterior y reconstruye el estado al recargar", async () => {
  const evaluation = await component("period-evaluation");
  const workspace = await component("teacher-workspace");
  assert.match(evaluation, /period-evaluations\/detail/);
  assert.match(evaluation, /Valoración que confirmas/);
  assert.match(evaluation, /Ahora prepara la conclusión descriptiva/);
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

test("Aula distingue campos, acciones y estado de carga al añadir niños", async () => {
  const students = await component("students-screen");
  const workflow = await component("workflow-ui");
  const input = await readFile(new URL("../../components/ui/input.tsx", import.meta.url), "utf8");
  const textarea = await readFile(new URL("../../components/ui/textarea.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  for (const id of ["student-first-name", "student-last-name", "student-preferred-name", "students-csv"]) {
    assert.match(students, new RegExp(`htmlFor="${id}"`));
    assert.match(students, new RegExp(`id="${id}"`));
  }
  assert.match(students, /<form className="mt-5" aria-busy=/);
  assert.match(students, /<AsyncButton type="submit"/);
  assert.match(students, /Guardando al niño en el aula…/);
  assert.match(students, /Importando la lista de niños…/);
  assert.match(workflow, /role="status"><p className="text-sm font-semibold text-\[#126177\]">Cargando información del aula…/);
  assert.match(input, /border border-input bg-white/);
  assert.match(textarea, /border border-input bg-white/);
  assert.match(css, /--input: #71869d/);
  assert.match(css, /button\[data-slot="button"\]\[data-variant="outline"\] \{ border-color: var\(--input\)/);
  assert.match(css, /select:not\(\[class\]\), textarea:not\(\[class\]\)\)/);
  assert.doesNotMatch(input, /dark:bg-input/);
  assert.doesNotMatch(textarea, /dark:bg-input/);
});

test("alta y entrevista presentan datos completos, fecha opcional y audio por pregunta", async () => {
  const setup = await component("pilot-setup");
  const students = await component("students-screen");
  const interview = await component("family-interview-v4");
  const guided = await component("guided-diagnostic-v4");
  const interviewRecorder = await component("interview-audio-recorder");
  const recorder = await component("dictation-recorder");
  for (const field of ["institutionCode", "district", "ugel", "directorName", "createLogo"]) {
    assert.match(setup, new RegExp(field));
  }
  assert.match(students, /Añadir alumno<\/button>/);
  assert.match(students, /id="student-birth-date" type="date"/);
  assert.match(students, /Importar lista CSV/);
  assert.match(students, /student\.birth_date &&/);
  assert.match(interview, /max-w-3xl space-y-7/);
  assert.match(interview, /<InterviewAudioRecorder studentId=/);
  assert.match(interview, /<section key=\{group\.title\} aria-labelledby=/);
  assert.doesNotMatch(interview, /<details key=\{group\.title\}/);
  assert.match(interview, /Guardar entrevista/);
  assert.match(interview, /await saveAndConfirmFamilyInterview\(studentId, details\)/);
  assert.match(interview, /onSaved\?\.\(result\); onBack\?\.\(\)/);
  assert.doesNotMatch(interview, />Confirmar entrevista<|>Guardar borrador</);
  assert.match(interview, /disabled=\{audioBusy\}/);
  assert.match(interview, /displayPersonName\(rawStudentName\)/);
  assert.match(guided, /Entrevista de \{displayPersonName\(item.name\)\}/);
  assert.doesNotMatch(recorder, /Máximo 1 minuto\. El audio no se guarda/);
  assert.doesNotMatch(recorder, /Transcripción añadida/);
  assert.match(recorder, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(recorder, /new MediaRecorder\(stream, \{ mimeType \}\)/);
  assert.match(recorder, /MAX_RECORDING_MS = 59_000/);
  assert.match(interviewRecorder, /purpose="interview"/);
  assert.match(recorder, /purpose === "observation" \? result\.improvedText : result\.transcript/);
  assert.match(recorder, /Grabar respuesta/);
  assert.match(recorder, /Aceptar grabación/);
  assert.match(recorder, /Rehacer grabación/);
  assert.doesNotMatch(recorder, /Transcribir grabación/);
  assert.match(recorder, /onPointerUp=\{releaseHeldRecording\}/);
  assert.match(recorder, /busyCallbackRef\.current\?\./);
  assert.doesNotMatch(recorder, /type="file"/);
});

test("los accesos docentes llegan al diagnóstico dentro de Planificar", async () => {
  const workspace = await component("teacher-workspace");
  const evaluation = await component("evaluation-home");
  assert.match(workspace, /function openDiagnostic.*setPlanningTarget\("diagnostic"\).*navigate\("Planificar"\)/);
  assert.match(workspace, /<PlanningArea dashboard=\{dashboard\} initialTab=\{planningTarget\}/);
  assert.match(workspace, /onDiagnostic=\{\(\) => openDiagnostic\(\)\}/);
  assert.match(workspace, /aria-label="Calendario" title="Calendario"/);
  assert.doesNotMatch(evaluation, /title: "Diagnóstico"|onDiagnostic/);
  assert.doesNotMatch(workspace, /setEvaluationEntry\("diagnostic"\)/);
});

test("guiadas y espontáneas comparten dictado revisable sin autoguardar observaciones", async () => {
  const guided = await component("guided-diagnostic-v4");
  const spontaneous = await component("spontaneous-diagnostic-v4");
  const recorder = await component("dictation-recorder");
  for (const source of [guided, spontaneous]) {
    assert.match(source, /<DictationRecorder key=/);
    assert.match(source, /currentText=\{note\}/);
    assert.match(source, /onTranscribed=\{\(text\) => setNote\(text\)\}/);
    assert.match(source, /disabled=\{audioBusy \|\|/);
  }
  assert.match(guided, /disabled=\{working \|\| audioBusy\}/);
  assert.match(spontaneous, /setRecordingRevision\(\(value\) => value \+ 1\)/);
  assert.match(recorder, /purpose = "observation"/);
  assert.match(recorder, /mergeDictationText\(currentTextRef\.current, text, maxLength\)/);
  assert.match(recorder, /Dictar observación/);
  assert.match(recorder, /Mantén pulsado para \$\{recordingLabel\.toLocaleLowerCase\("es"\)\}; suelta para añadir el texto/);
  assert.doesNotMatch(recorder, /saveSpontaneousObservation|saveDiagnosticExperienceObservation/);
  assert.doesNotMatch(guided, /Ver ejemplos/);
});

test("Ayni presenta recomendación automática y abre el catálogo solo cuando la docente edita", async () => {
  const source = await component("spontaneous-diagnostic-v4");
  assert.match(source, /Recomendación de Ayni/);
  assert.match(source, /Cambiar o agregar competencia/);
  assert.match(source, /\{editing && <fieldset/);
  assert.match(source, /Usar recomendación/);
  assert.match(source, /observationRecommendationMessage\(result.recommendation_state\)/);
  assert.match(source, /recommendation.state === "unavailable"/);
  assert.match(source, /classification_status === "pending"/);
  assert.match(source, /<section aria-labelledby="spontaneous-observations-title"/);
  assert.doesNotMatch(source, /Sugerir con Jev|Consultando Jev|Jev actualizó|Jev propone/);
  assert.doesNotMatch(source, /<details|ClassificationChoices/);
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.match(server, /queueDiagnosticClassification\(saved.id, saved.student_id, teacherId\)/);
  for (const name of ["project-development-workspace", "workshop-master-panel"]) {
    const componentSource = await component(name);
    assert.doesNotMatch(componentSource, /con Jev|por Jev|Consultando Jev|Jev sugirió|Jev señaló/);
  }
});

test("el resumen tiene comentarios opcionales debajo del mapa, dictado y navegación ordenada", async () => {
  const source = await component("diagnostic-review-v4");
  assert.ok(source.indexOf('aria-labelledby="optional-child-comments"') > source.indexOf("</table>"));
  assert.match(source, /Puedes continuar al resumen del aula sin escribir comentarios individuales/);
  assert.match(source, /Agregar comentario de la docente/);
  assert.match(source, /purpose="teacher_comment"/);
  assert.match(source, /classroomScope purpose="group_summary"/);
  assert.doesNotMatch(source, /suggestDiagnosticStudentReview|Sugerir comentario|allReviewed|max-h-48|overflow-y-auto/);
  assert.match(source, /aria-label="Continuar el diagnóstico" className="flex items-stretch justify-between/);
  assert.match(source, /backLabel="Volver a observar"/);
  assert.match(source, /backLabel="Volver al mapa"/);
  assert.match(source, /backLabel="Así está mi grupo"/);
  assert.match(source, /Sugerir resumen con Ayni/);
  assert.match(source, /group_information\.interests\.map/);
  assert.match(source, /placeholder="Por ejemplo: Que los niños expresen sus ideas/);
  assert.match(source, /placeholder="Por ejemplo: En la asamblea/);
  assert.match(source, /Añadir otra competencia \(opcional\)/);
  assert.match(source, /priorityDraft\.priorities\.length >= 6/);
  assert.match(source, /Sin prioridades específicas por ahora/);
  assert.match(source, /Boolean\(priorityDraft\) && priorityDraft!\.priorities\.every/);
});
