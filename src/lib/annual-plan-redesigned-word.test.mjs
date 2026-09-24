import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import sharp from "sharp";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { annualCalendarDay, buildAnnualProjectSchedule, AnnualPlanScheduleError } from "./annual-plan-schedule.mjs";
import { buildFlexibleAnnualSchedule, defaultInitialStage, nationalCalendarBlocks2026, AnnualCalendarError } from "./annual-plan-calendar.mjs";
import { validateAnnualPlanProposal, validateAnnualPlanDevelopment, mergeAnnualPlanDevelopment, AnnualPlanValidationError } from "./annual-plan-contract.mjs";
import { prepareWordDownload, renderSavedDocumentWord } from "./document-word-export.mjs";
import { buildAnnualPlanPresentation } from "./annual-plan-presentation.mjs";
import { loadInstitutionLogoForDocuments } from "./institution-logo.mjs";

const calendar = { school_year: 2026, starts_on: "2026-03-16", ends_on: "2026-12-18",
  blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() };
const topics = ["Nos conocemos y acordamos cómo jugar", "Historias que llegan de casa", "Jugamos con sonidos y palabras", "Cuidamos las plantas del patio", "Construimos caminos y puentes", "Jugamos con formas y tamaños", "Preguntamos por los animales", "Inventamos juegos de movimiento", "Organizamos una tienda de juego", "Contamos historias con imágenes", "Descubrimos luces y sombras", "Preparamos una muestra de arte", "Escuchamos relatos de la comunidad", "Medimos espacios para jugar", "Cuidamos el agua cada día", "Creamos música con objetos", "Buscamos soluciones en equipo", "Exploramos semillas y frutos", "Compartimos lo que aprendimos", "Celebramos nuestras ideas"];
const master = {
  title: "Aprendemos y jugamos", school_year: "2026", general_context_summary: "El grupo disfruta explorar plantas.",
  planning_priorities: ["Conversar sobre lo observado"], competency_overview: ["Indagar en el entorno"],
  review_checkpoints: ["Al terminar cada bimestre"], flexibility_notes: "Ajustar con nuevas observaciones.",
  annual_purposes: ["Explorar juntos"], teaching_strategies: ["Jugar y preguntar"],
  assessment_followup: ["Registrar hechos observables"], family_collaboration: [], inclusive_supports: [],
  proposed_experiences: Array.from({ length: 12 }, (_, index) => ({
    period: `Bimestre ${Math.floor(index / 3) + 1}`, experience_type: "project", title: topics[index],
    rationale: `Ofrecer oportunidades para ${topics[index].toLocaleLowerCase("es")}.`, primary_competency_ids: ["COMP-1"],
    possible_secondary_competency_ids: [], context_or_trigger: `Una situación de juego sobre ${topics[index].toLocaleLowerCase("es")}.`,
    expected_evidence_categories: [`Actuación individual del proyecto ${index + 1}`], flexibility_notes: "Cambiar materiales si hace falta.",
  })),
};
const development = { organization_criteria: ["Escuchar al grupo", "Empezar por el patio", "Dar tiempo para jugar", "Revisar lo observado"],
  transversal_approaches: ["Convivir y cuidar el entorno"],
  project_details: Array.from({ length: 12 }, (_, index) => ({ index: index + 1,
    purpose: `Explorar y conversar sobre ${topics[index].toLocaleLowerCase("es")}.`, final_product: `Registro de ${topics[index].toLocaleLowerCase("es")}`,
    materials: ["Papel", "Lápices"] })) };
const proposal = mergeAnnualPlanDevelopment(master, development);
const documentContext = { institution_name: "Jardín de prueba", teacher_name: "Docente ficticia", age: 5,
  classroom_section: "Sala Amarilla", school_year: 2026, starts_on: calendar.starts_on, ends_on: calendar.ends_on,
  diagnostic_group: { strengths: "Juegan juntos.", needs: "Más oportunidades para preguntar." },
  group_interests: ["plantas", "cuentos"], calendar };
const saved = { kind: "annual_plan", school_year: 2026, content: proposal, document_context: documentContext };
const cards = [{ id: "COMP-1", name: "Indaga mediante métodos científicos" }];

test("la agenda separa acogida y doce proyectos de dos o tres semanas lectivas", () => {
  const { initial_stage: stage, projects: schedule } = buildFlexibleAnnualSchedule(calendar, proposal.proposed_experiences);
  assert.equal(stage.starts_on, "2026-03-16");
  assert.equal(stage.ends_on, "2026-03-27");
  assert.equal(schedule.length, 12);
  assert.equal(schedule[0].starts_on, "2026-03-30");
  assert.equal(schedule[11].period, "Bimestre 4");
  assert.ok(schedule.every((item) => [2, 3].includes(item.duration_weeks) && item.starts_on <= item.ends_on));
  assert.ok(schedule.every((item, index) => index === 0 || schedule[index - 1].ends_on < item.starts_on));
  assert.equal(annualCalendarDay(new Date("2026-03-16T00:00:00.000Z")), "2026-03-16");
  assert.throws(() => buildFlexibleAnnualSchedule({ ...calendar, blocks: calendar.blocks.filter((block) => block.type === "management") }, proposal.proposed_experiences),
    (error) => error instanceof AnnualCalendarError && error.reason === "invalid");
});

test("los documentos históricos de veinte proyectos conservan su agenda original", () => {
  const old = buildAnnualProjectSchedule(calendar);
  assert.equal(old.length, 20);
  assert.throws(() => buildAnnualProjectSchedule({ ...calendar, ends_on: "2026-05-31" }),
    (error) => error instanceof AnnualPlanScheduleError && error.reason === "calendar_too_short");
});

test("las dos salidas validan número, orden, detalle y competencias antes de guardar", () => {
  assert.equal(validateAnnualPlanProposal(proposal, new Set(["COMP-1"]), 2026), proposal);
  assert.equal(validateAnnualPlanDevelopment(development), development);
  assert.throws(() => validateAnnualPlanProposal({ ...proposal, proposed_experiences: proposal.proposed_experiences.slice(1) }, new Set(["COMP-1"]), 2026),
    (error) => error instanceof AnnualPlanValidationError && error.reason === "annual_plan_project_count_invalid");
  assert.throws(() => validateAnnualPlanDevelopment({ ...development, project_details: development.project_details.map((item, index) => index === 1 ? { ...item, index: 1 } : item) }),
    (error) => error instanceof AnnualPlanValidationError && error.reason === "annual_plan_development_invalid");
  const numbered = { ...master, proposed_experiences: master.proposed_experiences.map((item, index) => ({ ...item,
    title: `Exploramos el entorno ${index + 1}` })) };
  assert.throws(() => mergeAnnualPlanDevelopment(numbered, development),
    (error) => error instanceof AnnualPlanValidationError && error.reason === "annual_plan_project_diversity_invalid" && error.details.field === "title");
  assert.throws(() => validateAnnualPlanDevelopment({ ...development, project_details: development.project_details.map((item, index) => ({ ...item,
    final_product: `Mural colectivo ${index + 1}` })) }),
  (error) => error instanceof AnnualPlanValidationError && error.reason === "annual_plan_project_diversity_invalid" && error.details.field === "final_product");
  const tooLong = { ...proposal, proposed_experiences: proposal.proposed_experiences.map((item, index) => index < 3 ? { ...item, duration_weeks: 3 } : item) };
  assert.match(buildAnnualPlanPresentation(tooLong, documentContext, cards).calendarWarning, /no cabe/i);
});

test("la vista y el Word usan las doce propuestas y la etapa inicial sin placeholders", async () => {
  const view = buildAnnualPlanPresentation(proposal, documentContext, cards);
  assert.equal(view.experiences.length, 12);
  assert.equal(view.experiences[0].purpose, "Explorar y conversar sobre nos conocemos y acordamos cómo jugar.");
  assert.equal(view.experiences[0].durationWeeks, 2);
  assert.equal(view.initialStage.endsOn, "27/03/2026");
  assert.equal(view.organizationCriteria.length, 4);
  const logo = await sharp({ create: { width: 16, height: 16, channels: 4, background: "#087d96" } }).png().toBuffer();
  const archive = await JSZip.loadAsync(await renderSavedDocumentWord(saved, cards, { logo }));
  const xml = await archive.file("word/document.xml").async("string");
  for (const expected of ["Jardín de prueba", "Docente ficticia", "Juegan juntos.", "Registro de nos conocemos", "Registro de preparamos una muestra de arte", "Indaga mediante métodos científicos", "2 semanas lectivas", "acogida, adaptación y evaluación diagnóstica"]) {
    assert.match(xml, new RegExp(expected, "i"));
  }
  assert.doesNotMatch(xml, /\{\{|Pendiente de completar por la docente|Plantilla editable|sesiones de aprendizaje|Resumen breve construido|proyectos, unidades o experiencias|Se prioriza la competencia eje/);
  assert.match(xml, /Las entrevistas ayudan a conocer el contexto/);
  assert.match(xml, /El plan anual organiza los proyectos y las actividades/);
  assert.match(xml, /Las familias mencionaron intereses como plantas, cuentos/);
  assert.match(xml, /Actuación individual del proyecto 1; [\s\S]*Actuación individual del proyecto 12/);
  assert.match(xml, /Registros de observación y notas anecdóticas de la docente en Ayni/);
  assert.match(xml, /Producto posible del proyecto/);
  assert.doesNotMatch(xml, /criterios de cada actividad|Producto o evidencia final/);
  assert.equal((xml.match(/PLANIFICACIÓN ANUAL/g) ?? []).length, 1);
  assert.equal((xml.match(/<w:br w:type="page"\/>/g) ?? []).length, 12,
    "las secciones llenas y el primer proyecto no deben añadir hojas vacías");
  assert.doesNotMatch(await archive.file("word/header1.xml").async("string"), /PLANIFICACIÓN ANUAL/);
  assert.deepEqual(await sharp(await archive.file("word/media/image1.png").async("nodebuffer")).metadata().then(({ width, height }) => [width, height]), [320, 480]);
  assert.match(await archive.file("word/_rels/document.xml.rels").async("string"), /Id="rId8"[^>]*media\/image1.png/);
  const withoutLogo = await JSZip.loadAsync(await renderSavedDocumentWord(saved, cards));
  const cleanCover = await withoutLogo.file("word/document.xml").async("string");
  assert.doesNotMatch(cleanCover, /r:embed="rId8"|\{\{LOGO_COLEGIO\}\}/);
});

test("la plantilla unificada utiliza exactamente los mismos doce objetos en cronograma y fichas", async () => {
  const unified = { ...saved, document_context: { ...documentContext, template_version: "annual-unified-v1" } };
  const rendered = await renderSavedDocumentWord(unified, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "annual-unified-qa.docx"), rendered);
  const zip = await JSZip.loadAsync(rendered);
  const xml = await zip.file("word/document.xml").async("string");
  assert.doesNotMatch(xml, /\{\{|PROYECTO_13_|P13 \||P20 \||Plantilla editable|Producto o evidencia final/);
  for (let index = 1; index <= 12; index += 1) {
    const code = `P${String(index).padStart(2, "0")}`;
    assert.match(xml, new RegExp(code));
    assert.match(xml, new RegExp(topics[index - 1]));
  }
  const documentText = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");
  assert.match(documentText, /Diciembre/);
  assert.match(documentText, /Doce propuestas iniciales/);
  assert.doesNotMatch(documentText, /Producto o evidencia final/);
});

test("el Word resume párrafos extensos y completa orientaciones sin repetir instrucciones técnicas", async () => {
  const lengthy = { ...proposal,
    general_context_summary: "El grupo juega en el patio. Varios niños hacen preguntas. Se necesitan más ocasiones para conversar. Esta cuarta idea queda en el borrador.",
    planning_priorities: ["Escuchar al grupo.", "Explorar materiales.", "Conversar sobre cambios.", "Esta cuarta prioridad queda en el borrador."],
    transversal_approaches: [], teaching_strategies: ["Organizar juegos con materiales conocidos."],
    flexibility_notes: "No incluye fechas porque serán calculadas por el servidor.",
    assessment_followup: ["Una explicación muy extensa que no necesita repetirse en el cuadro de evaluación."],
  };
  const archive = await JSZip.loadAsync(await renderSavedDocumentWord({ ...saved, content: lengthy }, cards));
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /Organizar juegos con materiales conocidos/);
  assert.match(xml, /Observar lo que hacen y dicen los niños durante el juego/);
  assert.doesNotMatch(xml, /Esta cuarta idea|Esta cuarta prioridad|serán calculadas por el servidor|Una explicación muy extensa/);
  assert.doesNotMatch(xml, /Escuchar al grupo\.; Explorar materiales\./);
});

test("la descarga del plan guardado usa la plantilla nueva y verifica propiedad", async () => {
  const db = new PGlite();
  const temp = await mkdtemp(path.join(tmpdir(), "ayni-annual-logo-"));
  const teacherId = "00000000-0000-4000-8000-000000000001";
  const otherId = "00000000-0000-4000-8000-000000000002";
  const yearId = "00000000-0000-4000-8000-000000000003";
  const ageId = "00000000-0000-4000-8000-000000000004";
  const classroomId = "00000000-0000-4000-8000-000000000005";
  const planId = "00000000-0000-4000-8000-000000000006";
  try {
    await db.exec(`create table profiles(user_id uuid,display_name text);
      create table institution_profiles(owner_user_id uuid,display_name text,institution_code text,district text,ugel text,logo_asset_id uuid);
      create table institution_assets(id uuid,owner_user_id uuid,type text,original_path text,mime_type text);
      create table school_years(id uuid,owner_id uuid,year int,starts_on date,ends_on date);
      create table age_grades(id uuid,age_years int);
      create table classrooms(id uuid,teacher_id uuid,school_year_id uuid,age_grade_id uuid,section text,institution_name text);
      create table annual_plans(id uuid,classroom_id uuid,school_year_id uuid,status text,version int,proposal jsonb,document_context jsonb,teacher_confirmed_at timestamptz);`);
    await db.query("insert into profiles values($1,'Docente ficticia')", [teacherId]);
    const assetsRoot = path.join(temp, ".local", "assets");
    await mkdir(assetsRoot, { recursive: true });
    const logo = await sharp({ create: { width: 16, height: 16, channels: 4, background: "#087d96" } }).png().toBuffer();
    await writeFile(path.join(assetsRoot, "logo.png"), logo);
    await db.query("insert into institution_profiles values($1,'Jardín de prueba',null,null,'UGEL 01',$2)", [teacherId, otherId]);
    await db.query("insert into institution_assets values($1,$2,'logo',$3,'image/png')",
      [otherId, teacherId, path.join('.local', 'assets', 'logo.png')]);
    await db.query("insert into school_years values($1,$2,2026,'2026-03-16','2026-12-18')", [yearId, teacherId]);
    await db.query("insert into age_grades values($1,5)", [ageId]);
    await db.query("insert into classrooms values($1,$2,$3,$4,'Sala Amarilla','Jardín de prueba')", [classroomId, teacherId, yearId, ageId]);
    await db.query("insert into annual_plans values($1,$2,$3,'draft',1,$4::jsonb,$5::jsonb,null)",
      [planId, classroomId, yearId, JSON.stringify(proposal), JSON.stringify(documentContext)]);
    assert.equal(await prepareWordDownload(db, otherId, "annual_plan", planId, cards), null);
    const loadedLogo = await loadInstitutionLogoForDocuments(db, teacherId, assetsRoot);
    assert.ok(loadedLogo);
    const download = await prepareWordDownload(db, teacherId, "annual_plan", planId, cards, { logo: loadedLogo });
    assert.equal(download.filename, "plan-anual-2026-00000006.docx");
    const archive = await JSZip.loadAsync(download.buffer);
    const xml = await archive.file("word/document.xml").async("string");
    assert.match(xml, /Registro de preparamos una muestra de arte/);
    assert.match(xml, /UGEL 01/);
    assert.ok((await archive.file("word/media/image1.png").async("nodebuffer")).length > 0);
    assert.doesNotMatch(xml, /\{\{|Pendiente de completar/);
  } finally { await db.close(); await rm(temp, { recursive: true, force: true }); }
});
