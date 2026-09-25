import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { renderDiagnosticReportWord } from "./diagnostic-report-word.mjs";
import { prepareWordDownload } from "./document-word-export.mjs";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const cards = [{ id: "COM_ORAL", name: "Se comunica oralmente en su lengua materna" }];
const document = { id: id(8), kind: "diagnostic_summary", status: "confirmed", school_year: 2026,
  content: { strengths: "Ana conversa con sus compañeros.", needs: "Necesitan más ocasiones para escuchar.",
    planning_priorities: "Ofrecer juegos de conversación." } };
const context = { school_year: 2026, institution_name: "Jardín Sol & Luna", ugel: "UGEL 03",
  teacher_name: "Marisol Rojas", classroom: "Sala Amarilla", age: 5, student_count: 2,
  student_names: ["Ana"], interview_count: 1, reviewed_children: 2,
  observed_children: 1, observation_count: 2, observed_from: "2026-03-16", observed_to: "2026-03-20",
  competency_coverage: [{ competency_id: "COM_ORAL", student_count: 1, record_count: 2 }] };

test("el Word diagnóstico rellena la plantilla con datos verificados y no inventa niveles", async () => {
  const logo = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#087d96" } }).png().toBuffer();
  const zip = await JSZip.loadAsync(await renderDiagnosticReportWord(document, context, cards, { logo }));
  const xml = await zip.file("word/document.xml").async("string");
  const header = await zip.file("word/header1.xml").async("string");
  for (const value of ["Jardín Sol &amp; Luna", "Marisol Rojas", "UGEL 03", "2 de 2",
    "Se comunica oralmente en su lengua materna", "Ofrecer juegos de conversación.", "[estudiante]"]) {
    assert.match(xml, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(header, /2026/);
  assert.doesNotMatch(xml, /\{\{|LECTURA_|DECISION_|SEGUIMIENTO_|Ana conversa|nivel de logro asignado/);
  assert.ok(zip.file("word/media/image10.png"));
  assert.notDeepEqual(await zip.file("word/media/image10.png").async("nodebuffer"), logo);
});

test("el Word diagnóstico sin logo conserva un documento válido y declara la ausencia de registros", async () => {
  const zip = await JSZip.loadAsync(await renderDiagnosticReportWord(document, {
    ...context, observation_count: 0, observed_children: 0, observed_from: null, observed_to: null,
    competency_coverage: [],
  }, cards));
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /Sin observaciones vinculadas a competencias/);
  assert.match(xml, /2 niños aún no tienen observaciones registradas/);
  assert.doesNotMatch(xml, /r:embed="rId20"|\{\{/);
});

test("la descarga toma recuentos autorizados sin incluir respuestas ni nombres de niños", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table profiles(user_id uuid,display_name text);
      create table institution_profiles(owner_user_id uuid,display_name text,ugel text);
      create table school_years(id uuid,owner_id uuid,year int);
      create table age_grades(id uuid,age_years int);
      create table classrooms(id uuid,teacher_id uuid,school_year_id uuid,age_grade_id uuid,section text,institution_name text);
      create table diagnostic_group_reviews(id uuid,classroom_id uuid,status text,version int,details jsonb,teacher_confirmed_at timestamptz);
      create table students(id uuid,classroom_id uuid,first_name text,last_name text,preferred_name text,status text);
      create table diagnostic_experience_observations(student_id uuid,classroom_id uuid,competency_v4_id text,observed_at timestamptz,observation_text text);
      create table diagnostic_spontaneous_observations(student_id uuid,classroom_id uuid,competency_v4_id text,competency_v4_ids text[] default '{}',classification_status text,observed_at timestamptz,observation_text text);
      create table diagnostic_sessions(id uuid,classroom_id uuid);
      create table diagnostic_entries(id uuid,student_id uuid,session_id uuid);
      create table student_observations(diagnostic_entry_id uuid,observed_at timestamptz);
      create table student_family_interviews(student_id uuid,classroom_id uuid,status text,details jsonb);
      create table diagnostic_student_reviews(student_id uuid,classroom_id uuid,status text,details jsonb);`);
    await db.query("insert into profiles values($1,'Marisol')", [id(1)]);
    await db.query("insert into school_years values($1,$2,2026)", [id(2), id(1)]);
    await db.query("insert into age_grades values($1,5)", [id(3)]);
    await db.query("insert into classrooms values($1,$2,$3,$4,'Sala Amarilla','Jardín de prueba')", [id(4), id(1), id(2), id(3)]);
    await db.query("insert into institution_profiles values($1,'Jardín oficial','UGEL 03')", [id(1)]);
    await db.query("insert into students values($1,$2,'Ana','Pérez',null,'active')", [id(5), id(4)]);
    await db.query("insert into diagnostic_group_reviews values($1,$2,'confirmed',1,$3::jsonb,now())",
      [id(8), id(4), JSON.stringify(document.content)]);
    await db.query("insert into diagnostic_experience_observations values($1,$2,'COM_ORAL',now(),'Dato privado del niño')", [id(5), id(4)]);
    await db.query("insert into diagnostic_spontaneous_observations(student_id,classroom_id,competency_v4_id,classification_status,observed_at,observation_text) values($1,$2,null,'pending',now(),'Otra nota privada')", [id(5), id(4)]);
    await db.query("insert into student_family_interviews values($1,$2,'confirmed',$3::jsonb)",
      [id(5), id(4), JSON.stringify({ answer: "Secreto familiar" })]);
    await db.query("insert into diagnostic_student_reviews values($1,$2,'confirmed',$3::jsonb)",
      [id(5), id(4), JSON.stringify({ comment_text: "Comentario privado" })]);
    assert.equal(await prepareWordDownload(db, id(6), "diagnostic_summary", id(8), cards), null);
    const result = await prepareWordDownload(db, id(1), "diagnostic_summary", id(8), cards);
    assert.equal(result.filename, "diagnostico-aula-2026-00000008.docx");
    const xml = await (await JSZip.loadAsync(result.buffer)).file("word/document.xml").async("string");
    for (const value of ["Jardín oficial", "UGEL 03", "1 de 1", "Se comunica oralmente", "2 registros de 1 niño"])
      assert.match(xml, new RegExp(value));
    assert.doesNotMatch(xml, /Secreto familiar|Dato privado del niño|Otra nota privada|Comentario privado|Ana conversa|source_snapshot|generation_metadata/);
  } finally { await db.close(); }
});
