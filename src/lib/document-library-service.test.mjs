import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import JSZip from "jszip";
import { listSavedDocuments, loadSavedDocument } from "./document-library-service.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table profiles(user_id uuid primary key,display_name text);
    create table institution_profiles(owner_user_id uuid, display_name text, institution_code text, district text, ugel text);
    create table school_years(id uuid primary key,owner_id uuid,year int,starts_on date,ends_on date);
    create table age_grades(id uuid primary key,age_years int);
    create table classrooms(id uuid primary key,teacher_id uuid,school_year_id uuid,age_grade_id uuid,section text,institution_name text);
    create table annual_plans(id uuid primary key,classroom_id uuid,school_year_id uuid,status text,version int,proposal jsonb,document_context jsonb,updated_at timestamptz,teacher_confirmed_at timestamptz,generation_metadata jsonb);
    create table diagnostic_group_reviews(id uuid primary key,classroom_id uuid,status text,version int,details jsonb,updated_at timestamptz,teacher_confirmed_at timestamptz,source_snapshot jsonb);
    create table learning_experiences(id uuid primary key,classroom_id uuid,type text,title text,purpose text,status text,details jsonb,starts_on date,ends_on date,origin text,planning_reason text,source_proposal_index int);
    create table activities(id uuid primary key,experience_id uuid,title text,purpose text,status text,details jsonb,preparation jsonb,occurs_on date);
    create table activity_criteria(id uuid primary key,activity_id uuid,competency_v4_id text,criterion_text text,details jsonb,status text,teacher_confirmed_at timestamptz);
    create table evidences(id uuid primary key,student_id uuid,activity_id uuid,criterion_id uuid,observation_text text,observation_status text,type text,observed_at timestamptz,media_path text,created_by uuid);
    create table class_schedule_entries(id uuid primary key,activity_id uuid,classroom_id uuid);
    create table daily_execution_logs(id uuid primary key,schedule_entry_id uuid,execution_date date,teacher_closure_note text);
    create table students(id uuid primary key,classroom_id uuid,first_name text,preferred_name text,status text default 'active');
    create table family_reports(id uuid primary key,student_id uuid,status text,version int,details jsonb,updated_at timestamptz,period_start date,period_end date,teacher_confirmed_at timestamptz,generation_metadata jsonb);
  `);
  await db.query(`insert into profiles values($1,'Docente A'),($2,'Docente B')`, [id(1), id(2)]);
  await db.query(`insert into age_grades values($1,5)`, [id(3)]);
  await db.query(`insert into school_years values($1,$2,2026,'2026-03-01','2026-12-20'),($3,$4,2026,'2026-03-01','2026-12-20')`, [id(4), id(1), id(5), id(2)]);
  await db.query(`insert into classrooms values($1,$2,$3,$4,'Sala Amarilla','Jardín A'),($5,$6,$7,$4,'Sala Azul','Jardín B')`, [id(6), id(1), id(4), id(3), id(7), id(2), id(5)]);
  await db.query(`insert into annual_plans values($1,$2,$3,'active',1,$4::jsonb,$5::jsonb,now(),now(),$6::jsonb),($7,$8,$9,'draft',1,$4::jsonb,$5::jsonb,now(),null,$6::jsonb)`,
    [id(8), id(6), id(4), JSON.stringify({ title: "Plan anual 2026" }), JSON.stringify({ institution_name: "Jardín A" }), JSON.stringify({ response_id: "secret" }), id(18), id(7), id(5)]);
  await db.query(`insert into annual_plans values($1,$2,$3,'archived',1,'{}'::jsonb,'{}'::jsonb,now(),null,'{}'::jsonb)`, [id(19), id(6), id(4)]);
  await db.query(`insert into diagnostic_group_reviews values($1,$2,'confirmed',1,$3::jsonb,now(),now(),$4::jsonb)`,
    [id(9), id(6), JSON.stringify({ strengths: "Juegan juntos", needs: "Más diálogo", planning_priorities: "Conversar", private_note: "hidden" }), JSON.stringify({ raw: "hidden" })]);
  await db.query(`insert into learning_experiences values($1,$2,'project','El huerto','Explorar plantas','active',$3::jsonb,'2026-04-01','2026-05-01','planned','Desde el plan',0),($4,$2,'workshop','Taller antiguo','Legacy','active','{}'::jsonb,'2026-04-01','2026-05-01','planned',null,null)`,
    [id(10), id(6), JSON.stringify({ starting_point: "Vimos semillas", possible_pathways: [], generation_metadata: { response_id: "hidden" } }), id(11)]);
  await db.exec(`alter table learning_experiences add column version integer not null default 1`);
  await db.query(`insert into activities values($1,$2,'Jugar con sombras','Observar luz','active',$3::jsonb,$4::jsonb,'2026-04-02')`,
    [id(12), id(10), JSON.stringify({ meaningful_situation: "El patio cambia", child_actions: ["Mueven la luz"], response_id: "hidden" }), JSON.stringify({ materials: ["linternas"], private_path: "hidden" })]);
  await db.query(`insert into activity_criteria values($1,$2,'CYT_INDAGA','Explica lo que observó',$3::jsonb,'active',now())`,
    [id(20), id(12), JSON.stringify({ observation_focus: ["Pregunta por el cambio de luz"] })]);
  await db.query(`insert into students values($1,$2,'Alessia',null)`, [id(13), id(6)]);
  await db.query(`insert into family_reports values($1,$2,'active',1,$3::jsonb,now(),'2026-03-01','2026-06-01',now(),$4::jsonb)`,
    [id(14), id(13), JSON.stringify({ introduction: "Compartimos avances", sections: [], closing_note: "Seguimos juntos", source_snapshot: "hidden" }), JSON.stringify({ tokens: 300 })]);
  return db;
}

test("la biblioteca lista registros canónicos de la docente y excluye contenido y filas legacy", async () => {
  const db = await fixture();
  try {
    const documents = await listSavedDocuments(db, id(1));
    assert.deepEqual(documents.map((row) => row.kind).sort(), ["activity", "annual_plan", "diagnostic_summary", "experience", "family_report"]);
    assert.ok(documents.every((row) => row.school_year === 2026 && row.classroom === "Sala Amarilla"));
    assert.ok(documents.every((row) => !Object.hasOwn(row, "content") && !Object.hasOwn(row, "generation_metadata")));
    assert.equal((await listSavedDocuments(db, id(2))).length, 1);
  } finally { await db.close(); }
});

test("cada documento se abre solo para su docente y sin metadata técnica", async () => {
  const db = await fixture();
  try {
    for (const [kind, number] of [["annual_plan", 8], ["diagnostic_summary", 9], ["experience", 10], ["activity", 12], ["family_report", 14]]) {
      const document = await loadSavedDocument(db, id(1), kind, id(number));
      assert.equal(document.kind, kind);
      assert.equal(document.school_year, 2026);
      assert.doesNotMatch(JSON.stringify(document), /generation_metadata|response_id|source_snapshot|private_note|private_path/);
      assert.equal(await loadSavedDocument(db, id(2), kind, id(number)), null);
    }
    assert.equal(await loadSavedDocument(db, id(1), "experience", id(11)), null);
    assert.equal(await loadSavedDocument(db, id(1), "annual_plan", "../../etc/passwd"), null);
    assert.equal(await loadSavedDocument(db, id(1), "other", id(8)), null);
  } finally { await db.close(); }
});

test("el Word de actividad recibe solo evidencia nominal real del aula autorizada", async () => {
  const db = await fixture();
  try {
    await db.query(`insert into evidences values($1,$2,$3,$4,'Propuso esperar su turno',null,'observation',now(),null,$5)`,
      [id(21), id(13), id(12), id(20), id(1)]);
    await db.query(`insert into class_schedule_entries values($1,$2,$3)`, [id(22), id(12), id(6)]);
    await db.query(`insert into daily_execution_logs values($1,$2,'2026-04-02','El grupo pidió otro turno')`, [id(23), id(22)]);
    const document = await loadSavedDocument(db, id(1), "activity", id(12));
    assert.deepEqual(document.registered_evidence.map((item) => [item.student_name, item.observation_text]),
      [["Alessia", "Propuso esperar su turno"]]);
    assert.equal(document.registered_evidence[0].criterion_id, id(20));
    assert.equal(document.registered_evidence[0].criterion_text, "Explica lo que observó");
    assert.equal(document.registered_evidence[0].competency_v4_id, "CYT_INDAGA");
    assert.deepEqual(document.active_criterion.observation_focus, ["Pregunta por el cambio de luz"]);
    const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({ id: card.id,
      name: card.official_name, capacities: card.capacities, ages: card.ages }));
    const activity = { ...document, content: { ...document.content, document_template_version: "activity-unified-v1", competency_id: "CYT_INDAGA", evaluation_criterion: "Criterio anterior" } };
    const word = await JSZip.loadAsync(await renderActivityUnifiedWord(activity, cards));
    const xml = await word.file("word/document.xml").async("string");
    assert.match(xml, /Alessia/);
    assert.match(xml, /Explica lo que observó/);
    assert.match(xml, /Pregunta por el cambio de luz/);
    assert.match(xml, /Propuso esperar su turno/);
    assert.doesNotMatch(xml, /\{\{|Registro sin texto descriptivo/);
    assert.equal(document.teacher_closure_note, "El grupo pidió otro turno");
    assert.doesNotMatch(JSON.stringify(document), /media_path|private_path/);
    assert.equal(await loadSavedDocument(db, id(2), "activity", id(12)), null);
  } finally { await db.close(); }
});

test("un plan histórico completo obtiene el diagnóstico grupal confirmado que antes faltaba", async () => {
  const db = await fixture();
  try {
    const plan = await loadSavedDocument(db, id(1), "annual_plan", id(8));
    assert.equal(plan.document_context.diagnostic_group.strengths, "Juegan juntos");
    assert.equal(plan.document_context.diagnostic_group.needs, "Más diálogo");
    assert.equal(plan.document_context.student_count, 1);
    assert.doesNotMatch(JSON.stringify(plan), /private_note|source_snapshot|hidden/);
  } finally { await db.close(); }
});

test("un borrador usa la UGEL y el nombre institucional guardados si su snapshot está vacío", async () => {
  const db = await fixture();
  try {
    await db.query("insert into institution_profiles values($1,'Jardín actual',null,null,'UGEL 01')", [id(2)]);
    await db.query("update annual_plans set document_context=$1::jsonb where id=$2",
      [JSON.stringify({ institution_name: "", ugel: "", teacher_name: "" }), id(18)]);
    const plan = await loadSavedDocument(db, id(2), "annual_plan", id(18));
    assert.equal(plan.document_context.institution_name, "Jardín actual");
    assert.equal(plan.document_context.ugel, "UGEL 01");
    assert.equal(plan.document_context.teacher_name, "Docente B");
  } finally { await db.close(); }
});
