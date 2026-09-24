import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { prepareWordDownload, renderSavedDocumentWord, wordFilenameFor } from "./document-word-export.mjs";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const cards = [{ id: "COM_ORAL", name: "Se comunica oralmente en su lengua materna" }];
const annualProposal = {
  title: "Plan anual de Sala Amarilla", school_year: "2026", general_context_summary: "El grupo disfruta explorar. Trazabilidad interna: secreto de auditoría",
  planning_priorities: ["Escuchar las preguntas del grupo"], competency_overview: ["Ofrecer oportunidades de comunicación"],
  proposed_experiences: [{ period: "Abril", experience_type: "project", title: "Exploramos sombras", rationale: "Investigar la luz",
    primary_competency_ids: ["COM_ORAL"], possible_secondary_competency_ids: [], context_or_trigger: "Preguntas de los niños",
    expected_evidence_categories: ["Explicaciones orales"], flexibility_notes: "Seguir el interés del grupo" }],
  review_checkpoints: ["Revisar en julio"], flexibility_notes: "Ajustar según observaciones",
  annual_purposes: ["Explorar juntos"], teaching_strategies: ["Juego libre"], assessment_followup: ["Registrar observaciones"],
  family_collaboration: ["Compartir avances"], inclusive_supports: ["Ofrecer materiales diversos"], response_id: "secreto de metadata",
};
const base = (kind, content) => ({ id: id(9), kind, title: "Documento de prueba", status: "active", school_year: 2026,
  classroom: "Sala Amarilla", institution_name: "Jardín Los Girasoles", content });

async function xmlForWithCards(document, competencyCards = cards) {
  const buffer = await renderSavedDocumentWord(document, competencyCards);
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const archive = await JSZip.loadAsync(buffer);
  assert.ok(archive.file("[Content_Types].xml"));
  assert.ok(archive.file("word/styles.xml"));
  return archive.file("word/document.xml").async("string");
}
const xmlFor = xmlForWithCards;

test("el plan anual se exporta a Word con secciones, encabezado y competencias, sin trazabilidad interna", async () => {
  const document = { ...base("annual_plan", annualProposal), title: annualProposal.title, document_context: { institution_name: "Jardín Los Girasoles",
    teacher_name: "Marisol Rojas", age: 5, classroom_section: "Sala Amarilla", starts_on: "2026-03-01", ends_on: "2026-12-20" } };
  const xml = await xmlFor(document);
  for (const expected of ["Plan anual de Sala Amarilla", "Marisol Rojas", "Lo que sabemos del grupo", "Escuchar las preguntas del grupo", "Explorar juntos", "Ofrecer oportunidades de comunicación", "Exploramos sombras", "Se comunica oralmente en su lengua materna", "Al terminar cada bimestre", "4 bimestres"]) {
    assert.match(xml, new RegExp(expected));
  }
  assert.doesNotMatch(xml, /secreto de auditoría|secreto de metadata|Trazabilidad interna|response_id/);
  assert.match(xml, /PLANIFICACIÓN/);
  assert.match(xml, /Cuándo revisaremos el plan/);
  assert.equal(wordFilenameFor(document), "plan-anual-2026-00000009.docx");
});

test("la plantilla anual muestra experiencias reales sin celdas pendientes", async () => {
  const proposal = { ...annualProposal, title: "Plan de juego & exploración",
    proposed_experiences: [annualProposal.proposed_experiences[0], {
      ...annualProposal.proposed_experiences[0], title: "Cuidamos <plantas>", period: "Bimestre 2",
      primary_competency_ids: ["PS_IDENTIDAD"], expected_evidence_categories: ["Decisiones propias"],
    }] };
  const document = { ...base("annual_plan", proposal), title: proposal.title,
    document_context: { institution_name: "Jardín & Sol", teacher_name: "Marisol", age: 5,
      classroom_section: "Sala Amarilla", student_count: 6 } };
  const xml = await xmlForWithCards(document, [...cards, { id: "PS_IDENTIDAD", name: "Construye su identidad",
    area_name: "Personal Social", capacities: [{ official_name: "Se valora a sí mismo" }] }]);
  assert.match(xml, /Plan de juego &amp; exploración/);
  assert.match(xml, /Cuidamos &lt;plantas&gt;/);
  assert.match(xml, /Personal Social/);
  assert.match(xml, /Se valora a sí mismo/);
  assert.doesNotMatch(xml, /Se completará durante el bimestre|Pendiente de completar por la docente/);
  assert.doesNotMatch(xml, /\{\{|Fila dinámica|Bloque dinámico|imagen dinámica|Plantilla para automatización/);
  assert.equal((xml.match(/Cuidamos &lt;plantas&gt;/g) ?? []).length, 1);
  const archive = await JSZip.loadAsync(await renderSavedDocumentWord(document, cards));
  for (const name of Object.keys(archive.files).filter((part) => /^word\/header\d+\.xml$/.test(part))) {
    const header = await archive.file(name).async("string");
    assert.match(header, /2026/);
    assert.doesNotMatch(header, /AÑO_ESCOLAR/);
  }
});

test("el plan antiguo sin competencias omite el mapa vacío y acepta un logo autorizado", async () => {
  const document = { ...base("annual_plan", { ...annualProposal, competency_overview: [],
    proposed_experiences: annualProposal.proposed_experiences.map((item) => ({ ...item, primary_competency_ids: [] })) }),
  document_context: { institution_name: "Jardín Los Girasoles", age: 5, classroom_section: "Sala Amarilla",
    diagnostic_group: { strengths: "Juegan juntos", needs: "Practicar el diálogo" } } };
  const logo = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#087d96" } }).png().toBuffer();
  const buffer = await renderSavedDocumentWord(document, cards, { logo });
  const archive = await JSZip.loadAsync(buffer);
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /Juegan juntos|Practicar el diálogo/);
  assert.doesNotMatch(xml, /Se elegirán al preparar cada experiencia/);
  assert.doesNotMatch(xml, /Pendiente de completar por la docente|Sin competencias priorizadas|\{\{/);
  assert.ok(archive.file("word/media/ayni-logo.png"));
  assert.match(await archive.file("word/_rels/document.xml.rels").async("string"), /media\/ayni-logo.png/);
  assert.match(xml, /<w:drawing>/);
});

test("el cronograma de un plan nuevo agrupa experiencias por bimestre sin imponer proyectos", async () => {
  const experiences = ["Bimestre 1", "Bimestre 1", "Bimestre 2"].map((period, index) => ({
    ...annualProposal.proposed_experiences[0], period, title: `Experiencia ${index + 1}`,
  }));
  const xml = await xmlFor({ ...base("annual_plan", { ...annualProposal, proposed_experiences: experiences }),
    document_context: { institution_name: "Jardín de prueba", age: 5 } });
  assert.equal((xml.match(/<w:t>Bimestre 1<\/w:t>/g) ?? []).length, 1);
  assert.equal((xml.match(/<w:t>Bimestre 2<\/w:t>/g) ?? []).length, 1);
  assert.match(xml, /Experiencia 1|Experiencia 2|Experiencia 3/);
  assert.doesNotMatch(xml, /Producto final|20 proyectos/);
});

test("un plan antiguo prioriza el diagnóstico confirmado y omite avisos curriculares de trámite", async () => {
  const proposal = { title: "Plan antiguo", school_year: "2026", general_context_summary: "Resumen técnico largo.",
    planning_priorities: ["Regla larga de revisión automática"],
    competency_overview: ["No se incluyen identificadores de competencias porque faltan tarjetas de competencias."],
    proposed_experiences: [], review_checkpoints: [], flexibility_notes: "Ajustable." };
  const xml = await xmlFor({ ...base("annual_plan", proposal), document_context: {
    institution_name: "Jardín de prueba", age: 5,
    diagnostic_group: { strengths: "Juegan juntos", needs: "Conversar más" },
  } });
  assert.match(xml, /Juegan juntos|Conversar más/);
  assert.doesNotMatch(xml, /Resumen técnico largo|Regla larga de revisión automática|No se incluyen identificadores|Pendiente de completar/);
});

test("diagnóstico, experiencia, actividad e informe conservan contenido pedagógico y omiten datos técnicos", async () => {
  const examples = [
    [base("diagnostic_summary", { strengths: "Juegan juntos", needs: "Más oportunidades", planning_priorities: "Explorar el patio", source_snapshot: "oculto" }), "Explorar el patio"],
    [{ ...base("experience", { purpose: "Explorar plantas", starting_point: "Hallaron semillas", trigger_or_interest: "Preguntaron por brotes",
      primary_competency_ids: ["COM_ORAL"], possible_pathways: [{ title: "Sembrar", pedagogical_intention: "Observar cambios", possible_child_actions: "Preparar macetas" }], generation_metadata: "oculto" }), subtype: "project", starts_on: "2026-04-01", ends_on: "2026-05-01" }, "Preparar macetas"],
    [{ ...base("activity", { purpose: "Observar sombras", meaningful_situation: "Una sombra se mueve", teacher_preparation: ["Preparar linternas"],
      child_actions: ["Explorar"], mediation: ["Preguntar"], evidence_opportunities: ["Explican"], closure_or_continuity: "Volver mañana", materials: ["linternas"], competency_id: "COM_ORAL", private_path: "oculto" }), occurs_on: "2026-04-02", experience_title: "El patio" }, "Volver mañana"],
    [{ ...base("family_report", { introduction: "Compartimos avances", sections: [{ competency_id: "COM_ORAL", progress_summary: "Cuenta lo que observa", examples: ["Explicó su idea"], next_steps: ["Escuchar más"] }], closing_note: "Seguiremos juntos", source_snapshot: "oculto" }), period_start: "2026-03-01", period_end: "2026-06-01" }, "Seguiremos juntos"],
  ];
  for (const [document, expected] of examples) {
    const xml = await xmlFor(document);
    assert.match(xml, new RegExp(expected));
    assert.doesNotMatch(xml, /source_snapshot|generation_metadata|private_path|oculto/);
  }
});

test("Word familiar identifica el período formal y conserva el contenido del informe", async () => {
  const xml=await xmlFor({ ...base("family_report",{introduction:"Avances confirmados",sections:[],closing_note:"Seguimos observando"}),
    period_label:"Bimestre 2",period_start:"2026-05-01",period_end:"2026-07-01",teacher_name:"Docente de prueba" });
  assert.match(xml,/Bimestre 2/);
  assert.match(xml,/Docente de prueba/);
  assert.match(xml,/Avances confirmados/);
  assert.doesNotMatch(xml,/Informe histórico sin período formal/);
});

test("la descarga consulta de nuevo la propiedad docente y rechaza IDs ajenos", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table profiles(user_id uuid,display_name text);
      create table institution_profiles(owner_user_id uuid, display_name text, institution_code text, district text, ugel text);
      create table school_years(id uuid,owner_id uuid,year int,starts_on date,ends_on date);
      create table age_grades(id uuid,age_years int);
      create table classrooms(id uuid,teacher_id uuid,school_year_id uuid,age_grade_id uuid,section text,institution_name text);
      create table annual_plans(id uuid,classroom_id uuid,school_year_id uuid,status text,version int,proposal jsonb,document_context jsonb,teacher_confirmed_at timestamptz);
      create table diagnostic_group_reviews(classroom_id uuid,status text,version int,details jsonb);
      create table students(classroom_id uuid,status text);`);
    await db.query(`insert into profiles values($1,'Marisol'),($2,'Otra')`, [id(1), id(2)]);
    await db.query(`insert into school_years values($1,$2,2026,'2026-03-01','2026-12-20')`, [id(3), id(1)]);
    await db.query(`insert into age_grades values($1,5)`, [id(4)]);
    await db.query(`insert into classrooms values($1,$2,$3,$4,'Sala Amarilla','Jardín A')`, [id(5), id(1), id(3), id(4)]);
    await db.query(`insert into annual_plans values($1,$2,$3,'active',1,$4::jsonb,$5::jsonb,now())`, [id(6), id(5), id(3), JSON.stringify(annualProposal), JSON.stringify({ teacher_name: "Marisol" })]);
    assert.equal(await prepareWordDownload(db, id(2), "annual_plan", id(6), cards), null);
    assert.equal(await prepareWordDownload(db, id(1), "annual_plan", id(7), cards), null);
    const result = await prepareWordDownload(db, id(1), "annual_plan", id(6), cards);
    assert.equal(result.filename, "plan-anual-2026-00000006.docx");
    assert.ok(result.buffer.length > 1000);
  } finally { await db.close(); }
});
