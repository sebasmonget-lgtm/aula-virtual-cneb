import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { loadPeriodEvaluationRows, periodClosureFingerprint } from "./period-evaluation-service.mjs";
import { confirmBimesterReplan, loadBimesterReplanPreview, recommendWorkshops, replanSummary } from "./bimester-replan-service.mjs";
import { createPeriodEvaluationRouteHandler } from "../../scripts/period-evaluation-routes.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const competenceA = "10000000-0000-4000-8000-000000000001";
const competenceB = "10000000-0000-4000-8000-000000000002";
const day = (offset, instant = new Date()) => {
  const civilDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  return new Date(new Date(`${civilDate}T12:00:00Z`).getTime() + offset * 86_400_000).toISOString().slice(0, 10);
};

async function database() {
  const db = await PGlite.create();
  const directory = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  return db;
}
async function seed(db, teacher, section) {
  const year = Number(day(0).slice(0, 4));
  const { classroomId, schoolYearId } = await createPilotClassroom(db, teacher, { teacherName: `Docente ${section}`,
    institutionName: "Jardín de prueba", section, age: 5, year,
    startsOn: `${year}-01-01`, endsOn: `${year}-12-31`, castellanoL2Applicable: false, religionApplicable: false });
  const period = { id: randomUUID(), school_year_id: schoolYearId, kind: "bimester", ordinal: 1,
    label: "Bimestre 1", starts_on: day(-60), ends_on: day(-1) };
  await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on)
    values($1,$2,$3,$4,$5,$6,$7)`, [period.id, schoolYearId, period.kind, period.ordinal,
    period.label, period.starts_on, period.ends_on]);
  await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on)
    values($1,$2,'bimester',2,'Bimestre 2',$3,$4)`, [randomUUID(), schoolYearId, day(1), day(60)]);
  const model = await loadPeriodEvaluationRows(db, { classroomId, period,
    applicableIds: new Set([competenceA, competenceB]) });
  const fingerprint = periodClosureFingerprint(model.rows), closureId = randomUUID();
  await db.query(`insert into period_closure_versions(id,classroom_id,evaluation_period_id,version,source_fingerprint,
    confirmed_by,manifest) values($1,$2,$3,1,$4,$5,'{}'::jsonb)`,
  [closureId, classroomId, period.id, fingerprint, teacher]);
  await db.query(`insert into period_closures(id,classroom_id,evaluation_period_id,source_fingerprint,
    confirmed_by,current_version_id) values($1,$2,$3,$4,$5,$6)`,
  [randomUUID(), classroomId, period.id, fingerprint, teacher, closureId]);
  const curriculumId = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
  const planId = randomUUID();
  const proposals = Array.from({ length: 12 }, (_, index) => ({ proposal_id: randomUUID(),
    experience_type: "project", title: `Proyecto ${index + 1}`, period: `Bimestre ${Math.floor(index / 3) + 1}`,
    month: 3 + Math.floor(index * 9 / 12), duration_weeks: 2, rationale: "Contexto del grupo",
    purpose: "Aprender jugando", primary_competency_ids: [competenceA] }));
  const proposal = { plan_format: "annual_preplan_v1", title: "Mi año", school_year: String(year),
    proposed_experiences: proposals };
  await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
    teacher_confirmed_at) values($1,$2,$3,$4,1,'active',$5::jsonb,now())`,
  [planId, classroomId, schoolYearId, curriculumId, JSON.stringify(proposal)]);
  await db.query(`insert into annual_plan_formal_content(annual_plan_id,content,source_revision)
    values($1,$2::jsonb,1)`, [planId, JSON.stringify({ competency_overview: [competenceA],
    proposed_experiences: proposals.map((item) => ({ ...item, context_or_trigger: "Juego del grupo",
      final_product: "Conversación", materials: ["Bloques"] })) })]);
  for (let index = 0; index < 12; index++) await db.query(`insert into project_slots(id,annual_plan_id,slot_index,
    duration_weeks,starts_on,ends_on,proposal_id) values($1,$2,$3,2,$4,$5,$6)`,
  [randomUUID(), planId, index + 1, day(index < 10 ? -30 : 7 + index),
    day(index < 10 ? -20 : 20 + index), proposals[index].proposal_id]);
  return { teacher, classroom: { id: classroomId, school_year_id: schoolYearId }, period,
    planId, closureId, proposals, model, fingerprint };
}
const expected = (fixture) => ({ plan_id: fixture.planId, plan_revision: 1, closure_version_id: fixture.closureId });
const args = (fixture, adjustments = []) => ({ teacherId: fixture.teacher, classroom: fixture.classroom,
  period: fixture.period, applicableIds: [competenceA, competenceB], expected: expected(fixture),
  priorities: [{ competency_id: competenceB, choice: "prioritize" }], adjustments,
  workshops: [{ competency_id: competenceB, choice: "ignore" }] });

test("resumen distingue poca evidencia de bajo logro", () => {
  const summary = replanSummary({ classroom: { confirmed_assessments: 2, total_assessments: 2 },
    competencies: [{ competency_id: competenceA, short_label: "Indaga", levels: { C: 0, B: 0 },
      students_without_evidence: 3, evaluated: 0, evidence_coverage: 0 }] }, [{}, {}, {}], { label: "Bimestre 1" });
  assert.equal(summary.competencies[0].tone, "opportunities");
  assert.match(summary.competencies[0].reason, /más oportunidades/);
});

test("recomienda un taller del catálogo solo si corresponde a edad y competencia", () => {
  const resources = [{ id: "arte-5", kind: "workshop", title: "Pintamos huellas", age: 5,
    area: "Taller gráfico-plástico", purpose: "Crear con pintura" },
  { id: "arte-3", kind: "workshop", title: "Huellas pequeñas", age: 3,
    area: "Taller gráfico-plástico", purpose: "Crear con pintura" }];
  const options = recommendWorkshops(resources, 5, [{ competency_id: competenceA,
    name: "Crea proyectos desde los lenguajes artísticos", reason: "Se necesitan oportunidades" },
  { competency_id: competenceB, name: "Resuelve problemas de cantidad", reason: "Se necesitan oportunidades" }]);
  assert.deepEqual(options.map((item) => item.resource_id), ["arte-5"]);
});

test("reajuste crea versión y modifica solo una propuesta futura; bloquea pasado, repetición y aula ajena", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-28T02:30:00Z") });
  const db = await database();
  try {
    const a = await seed(db, teacherA, "A"), b = await seed(db, teacherB, "B");
    const statistics = { classroom: { confirmed_assessments: 0, total_assessments: 0 }, competencies: [] };
    const preview = await loadBimesterReplanPreview(db, { teacherId: teacherA, classroom: a.classroom,
      period: a.period, statistics, model: a.model, closure: { closed: true, current: true, current_version_id: a.closureId } });
    assert.equal(preview.plan.proposals.filter((item) => item.editable).length, 2);
    await assert.rejects(confirmBimesterReplan(db, args(a, [{ proposal_id: a.proposals[0].proposal_id,
      competency_id: competenceB, choice: "accept" }])), /comenzó|futura/);
    assert.equal((await db.query(`select count(*)::int as n from annual_plans where classroom_id=$1`, [a.classroom.id])).rows[0].n, 1);
    await assert.rejects(confirmBimesterReplan(db, { ...args(b),
      expected: { ...expected(b), plan_id: a.planId } }), /plan cambió/);
    const developedId = randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,
      status,details,annual_plan_id,origin,source_proposal_index,source_proposal_id)
      values($1,$2,'project','Proyecto desarrollado','Explorar',$3,$4,'active','{}'::jsonb,$5,'planned',11,$6)`,
    [developedId, a.classroom.id, day(18), day(31), a.planId, a.proposals[11].proposal_id]);
    await assert.rejects(confirmBimesterReplan(db, args(a, [{ proposal_id: a.proposals[11].proposal_id,
      competency_id: competenceB, choice: "accept" }])), /ya fue desarrollada/);
    await assert.rejects(confirmBimesterReplan(db, { ...args(a),
      workshops: [{ competency_id: competenceB, choice: "library", resource_id: "taller-ajeno" }] }), /talleres/);
    const saved = await confirmBimesterReplan(db, args(a, [{ proposal_id: a.proposals[10].proposal_id,
      competency_id: competenceB, choice: "accept" }]));
    assert.equal(saved.version, 2);
    const plans = (await db.query(`select id,status,proposal,generation_metadata,supersedes_plan_id from annual_plans
      where classroom_id=$1 order by version`, [a.classroom.id])).rows;
    assert.deepEqual(plans.map((row) => row.status), ["archived", "active"]);
    assert.equal(plans[1].supersedes_plan_id, a.planId);
    assert.deepEqual(plans[0].proposal.proposed_experiences, a.proposals);
    assert.deepEqual(plans[1].proposal.proposed_experiences.slice(0, 10), a.proposals.slice(0, 10));
    assert.deepEqual(plans[1].proposal.proposed_experiences[10].primary_competency_ids, [competenceA, competenceB]);
    assert.deepEqual(plans[1].proposal.proposed_experiences[11], a.proposals[11]);
    assert.equal(plans[1].generation_metadata.source_closure_version_id, a.closureId);
    assert.equal((await db.query(`select count(*)::int as n from annual_plan_changes where plan_id=$1`, [saved.id])).rows[0].n, 1);
    assert.equal((await db.query(`select count(*)::int as n from project_slots where annual_plan_id=$1`, [saved.id])).rows[0].n, 12);
    const formal = (await db.query(`select content,ai_metadata from annual_plan_formal_content where annual_plan_id=$1`, [saved.id])).rows[0];
    assert.deepEqual(formal.content.competency_overview, [competenceA, competenceB]);
    assert.deepEqual(formal.content.proposed_experiences[10].primary_competency_ids, [competenceA, competenceB]);
    assert.equal(formal.content.proposed_experiences[10].context_or_trigger, "Juego del grupo");
    assert.equal(formal.ai_metadata.derived_from_plan_id, a.planId);
    assert.equal((await db.query(`select annual_plan_id from learning_experiences where id=$1`, [developedId])).rows[0].annual_plan_id, a.planId);
    const after = await loadBimesterReplanPreview(db, { teacherId: teacherA, classroom: a.classroom,
      period: a.period, statistics, model: a.model, closure: { closed: true, current: true, current_version_id: a.closureId } });
    assert.equal(after.adjusted, true);
    await assert.rejects(confirmBimesterReplan(db, { ...args(a), expected: { ...expected(a), plan_id: saved.id } }), /plan cambió|reajuste confirmado/);
    assert.equal((await db.query(`select status from annual_plans where id=$1`, [b.planId])).rows[0].status, "active");
  } finally { await db.close(); }
});

test("F9 conserva el fingerprint F8 al aceptar un reajuste después de una observación ordinaria", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-28T06:30:00Z") });
  const db = await database();
  try {
    const f = await seed(db, teacherA, "F8-F9");
    const student = randomUUID(), observation = randomUUID();
    await db.query(`insert into students(id,classroom_id,status,first_name,last_name)
      values($1,$2,'active','Ana','Prueba')`,[student,f.classroom.id]);
    await db.query(`insert into ordinary_observations(id,classroom_id,student_id,created_by,client_request_id,
      request_fingerprint,occurred_at,raw_text,source_kind,context_snapshot)
      values($1,$2,$3,$4,$5,$6,$7,'Agrupó objetos por color.','spontaneous','{}'::jsonb)`,
    [observation,f.classroom.id,student,teacherA,randomUUID(),"a".repeat(64),`${day(-5)}T16:00:00Z`]);
    await db.query(`insert into ordinary_observation_attributions(id,observation_id,version,state,source,
      confirmed_competency_ids,raw_revision,created_by) values($1,$2,1,'confirmed','teacher',array[$3],1,$4)`,
    [randomUUID(),observation,competenceB,teacherA]);
    const model = await loadPeriodEvaluationRows(db,{ classroomId:f.classroom.id,period:f.period,
      applicableIds:new Set([competenceA,competenceB]),includeOrdinary:true });
    assert.equal(model.rows.find(row=>row.competency_v4_id===competenceB)?.sourceRows.length,1);
    const fingerprint = periodClosureFingerprint(model.rows);
    await db.query(`update period_closures set source_fingerprint=$1 where classroom_id=$2 and evaluation_period_id=$3`,
    [fingerprint,f.classroom.id,f.period.id]);
    await assert.rejects(confirmBimesterReplan(db,args(f)),/nueva información/);
    const saved = await confirmBimesterReplan(db,{...args(f),includeOrdinary:true});
    assert.equal(saved.version,2);
    assert.equal((await db.query(`select count(*)::int as n from ordinary_observations where id=$1`,[observation])).rows[0].n,1);
  } finally { await db.close(); }
});

test("la ruta de revisión usa la identidad verificada del docente y aísla las aulas", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-28T06:30:00Z") });
  const db = await database();
  try {
    const a = await seed(db, teacherA, "A"), b = await seed(db, teacherB, "B");
    const calls = [];
    const handler = (teacherId) => createPeriodEvaluationRouteHandler({ db, teacherId,
      readJson: async (request) => request.body,
      send: (_response, status, body) => calls.push({ status, body }),
      pending: new Map(), metadataForAudit: (value) => value,
      refreshStudentContext: async () => {}, mediaAvailable: false });
    const own = handler(teacherA), other = handler(teacherB);
    async function get(route, classroomId, periodId) {
      calls.length = 0;
      await route({ request: { method: "GET" },
        url: new URL(`http://localhost/api/period-evaluations/replan?classroomId=${classroomId}&periodId=${periodId}`),
        response: {}, origin: null });
      return calls[0];
    }
    const allowed = await get(own, a.classroom.id, a.period.id);
    assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
    assert.equal(allowed.body.plan.id, a.planId);
    assert.equal(allowed.body.closure.current_version_id, a.closureId);
    const crossed = await get(other, a.classroom.id, a.period.id);
    assert.notEqual(crossed.status, 200);
    assert.equal(JSON.stringify(crossed.body).includes(a.planId), false);
    const foreignPeriod = await get(own, a.classroom.id, b.period.id);
    assert.notEqual(foreignPeriod.status, 200);
  } finally { await db.close(); }
});

test("los fixtures respetan el día Lima a ambos lados de medianoche UTC y cambio de año", () => {
  assert.equal(day(-1, new Date("2026-09-28T02:30:00Z")), "2026-09-26");
  assert.equal(day(-1, new Date("2026-09-28T06:30:00Z")), "2026-09-27");
  assert.equal(day(0, new Date("2027-01-01T02:30:00Z")), "2026-12-31");
  assert.equal(day(1, new Date("2027-01-01T02:30:00Z")), "2027-01-01");
});
