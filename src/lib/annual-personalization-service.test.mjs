import test from "node:test";
import assert from "node:assert/strict";
import { projectPlanningSignals, proposePersonalization, validatePersonalization } from "./annual-personalization-service.mjs";
import { generateAnnualPreplan, validatePreplanTrace } from "./annual-preplan-service.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026 } from "./annual-plan-calendar.mjs";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { preparePersonalization, confirmPersonalization, currentPersonalization, savePersonalizationDraft } from "./annual-personalization-service.mjs";
import { loadPersonalizedPreplanSkill } from "./annual-plan-skill.mjs";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const curriculum = [{ id: "COM_ORAL", name: "Comunicación oral" }, { id: "PS_CONV", name: "Convivencia" }];
const calendar = { school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() };
const source = (interview, observation = "") => ({
  students: [{ id: id(1) }], names: [], group: null, prior: null, references: [], fingerprint: "fixture",
  interviews: interview ? [{ id: id(2), student_id: id(1), version: 1, details: { interests: interview } }] : [],
  observations: observation ? [{ id: id(3), student_id: id(1), observation_text: observation, competency_v4_id: "COM_ORAL" }] : [],
});

test("extrae señales de texto libre sin ocultarlas en aulas pequeñas y distingue sus fuentes", () => {
  const projected = projectPlanningSignals(source("Le gustan los animales y las plantas. La familia trabaja en agricultura.",
    "Construyó una casa con bloques durante el juego."), { id: id(4), group_context: "", available_resources: [] });
  assert.ok(projected.interests.some((item) => item.label === "Animales" && item.source_kinds.includes("family_report")));
  assert.ok(projected.interests.some((item) => item.label === "Construcción" && item.source_kinds.includes("teacher_observation")));
  assert.ok(projected.opportunities.some((item) => item.label === "Agricultura y cultivos"));
  assert.equal(projected.interests[0].source_refs[0].id, id(2));
});

test("poca evidencia permite contrato sin prioridades ni dificultad inventada", async () => {
  const result = await proposePersonalization(source(null), { id: id(4), age: 5, available_resources: [] }, curriculum);
  assert.deepEqual(result.priorities, []);
  assert.equal(result.evidence_coverage.observations, 0);
  assert.match(result.needs_more_observation.join(" "), /seguir observando/i);
  assert.doesNotMatch(result.group_profile, /dificultad|bajo logro/i);
  assert.deepEqual(validatePersonalization(result, curriculum).priorities, []);
});

test("una ventana construida no se interpreta como venta ni comercio", () => {
  const context = { id: id(4), group_context: "", available_resources: [] };
  assert.deepEqual(projectPlanningSignals(source(null, "Construyó una casa y agregó una ventana."), context).opportunities, []);
  assert.ok(projectPlanningSignals(source(null, "Jugó a la venta en el mercado."), context).opportunities.some((row) => row.label === "Comercio local"));
});

test("la guía del contrato confirmado conserva fechas sin imponer efemérides como temas", async () => {
  const instructions = await loadPersonalizedPreplanSkill();
  assert.match(instructions, /efemérides no determinan el tema/);
  assert.doesNotMatch(instructions, /Reserva \*\*exactamente cuatro/);
  assert.doesNotMatch(instructions, /Ubica las cuatro propuestas/);
});

test("dos contratos distintos cambian temas, razones y énfasis de las doce propuestas", async () => {
  const scenario = async (interest, contextText, priorityTitle, competencyId) => {
    const details = { group_profile: "Grupo que participa en el juego.",
      interests: [{ id: id(10), label: interest }],
      priorities: [{ id: id(11), title: priorityTitle, reason: "Patrón observado por la docente.",
        related_competency_ids: [competencyId], importance: "higher", evidence_status: "supported" }],
      context_opportunities: [{ id: id(12), text: contextText }],
      classroom_conditions: [], evidence_coverage: { observations: 5 }, needs_more_observation: [], additional_notes: "" };
    let request;
    const plan = await generateAnnualPreplan({ context: { id: id(4), year: 2026, age: 5, calendar,
      personalization: { id: id(20), details }, group_context: contextText,
      source_diagnostic_review_id: null, source_priority_review_id: null }, curriculum,
    createProvider: () => ({ generate: async (value) => {
      request = value;
      return { output: { proposals: value.ai_context_bundle.initial_slots.map((slot, index) => ({
        experience_type: "project", title: `${interest} ${index + 1}`, period: slot.period,
        month: slot.month, duration_weeks: slot.duration_weeks, rationale: "El modelo sugiere una razón",
        purpose: `Explorar ${interest} mediante ${priorityTitle}`, primary_competency_ids: [competencyId],
        source_interest_keys: ["i1"], source_priority_keys: ["p1"], source_context_keys: ["c1"], source_condition_keys: [],
      })) }, provider_metadata: {} };
    } }), loadSkill: async () => "Skill de prueba" });
    return { plan, request, details };
  };
  const a = await scenario("Animales", "Agricultura y cultivos", "Comunicación oral", "COM_ORAL");
  const b = await scenario("Construcción", "Comercio local", "Convivencia", "PS_CONV");
  assert.notDeepEqual(a.plan.proposal.proposed_experiences.map((row) => row.title),
    b.plan.proposal.proposed_experiences.map((row) => row.title));
  assert.match(a.plan.proposal.proposed_experiences[0].rationale, /Animales.*Comunicación oral.*Agricultura/);
  assert.match(b.plan.proposal.proposed_experiences[0].rationale, /Construcción.*Convivencia.*Comercio/);
  assert.deepEqual(a.plan.proposal.proposed_experiences[0].primary_competency_ids, ["COM_ORAL"]);
  assert.deepEqual(b.plan.proposal.proposed_experiences[0].primary_competency_ids, ["PS_CONV"]);
  assert.equal(a.request.ai_context_bundle.personalization.interests[0].label, "Animales");
  assert.equal(b.request.ai_context_bundle.personalization.context[0].text, "Comercio local");
  assert.throws(() => validatePreplanTrace({ proposed_experiences: [{
    ...a.plan.proposal.proposed_experiences[0], source_interest_ids: [id(999)] }] }, a.details), /no fue confirmada/);
});

test("recorrido persistente con poca evidencia confirma V1 y conserva historia al aparecer evidencia nueva", async () => {
  const db = await PGlite.create();
  try {
    const migrations = new URL("../../local-db/migrations/", import.meta.url);
    for (const name of (await readdir(migrations)).filter((file) => file.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(name, migrations), "utf8"));
    const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const { classroomId, schoolYearId } = await createPilotClassroom(db, teacher, {
      teacherName: "Docente", institutionName: "Jardín", section: "A", age: 5, year: 2026,
      startsOn: "2026-03-01", endsOn: "2026-12-18" });
    await importStudentsForTeacher(db, teacher, [{ firstName: "Lucía", lastName: "Prueba", preferredName: "" }]);
    const context = { id: classroomId, school_year_id: schoolYearId, age: 5, group_context: "Aula A",
      available_resources: [], annual_planning_context: {} };
    const [draft, concurrent] = await Promise.all([preparePersonalization(db, teacher, context), preparePersonalization(db, teacher, context)]);
    assert.equal(draft.id, concurrent.id);
    assert.equal((await db.query("select count(*)::int as total from annual_personalization_reviews where status='draft'")).rows[0].total, 1);
    assert.equal(draft.status, "draft");
    assert.deepEqual(draft.details.priorities, []);
    const confirmed = await confirmPersonalization(db, teacher, context, draft.id, { ...draft.details,
      interests: [{ id: id(70), label: "Construcción", source_refs: [{ type: "family_interview", id: id(999) }] }] });
    assert.equal(confirmed.status, "confirmed");
    assert.deepEqual(confirmed.details.interests[0].source_refs, []);
    assert.equal((await currentPersonalization(db, teacher, context)).id, draft.id);
    const same = await preparePersonalization(db, teacher, context);
    assert.equal(same.id, draft.id);
    const studentId = (await db.query("select id from students where classroom_id=$1", [classroomId])).rows[0].id;
    await db.query(`insert into diagnostic_spontaneous_observations
      (id,classroom_id,student_id,context_label,observation_text,created_by)
      values($1,$2,$3,'Juego','Construyó una casa con bloques.', $4)`, [id(50), classroomId, studentId, teacher]);
    const next = await preparePersonalization(db, teacher, context, { refresh: true });
    assert.equal(next.version, 2);
    assert.notEqual(next.id, confirmed.id);
    const reopened = await Promise.all([preparePersonalization(db, teacher, context, { refresh: true }),
      preparePersonalization(db, teacher, context, { refresh: true })]);
    assert.deepEqual(reopened.map((review) => review.details), [next.details, next.details]);
    assert.deepEqual(reopened.map((review) => review.snapshot), [next.snapshot, next.snapshot]);
    assert.equal((await currentPersonalization(db, teacher, context)).id, confirmed.id);
    assert.equal((await db.query("select status from annual_personalization_reviews where id=$1", [confirmed.id])).rows[0].status, "confirmed");
    const edited = { ...next.details, group_profile: "El grupo disfruta construir y conversar durante el juego.",
      classroom_conditions: [{ id: "materials", kind: "materials", value: "Bloques, cajas y cuentos." }],
      evidence_coverage: { observations: 999 } };
    const saved = await savePersonalizationDraft(db, teacher, context, next.id, edited, next.snapshot);
    assert.equal(saved.status, "draft");
    assert.notEqual(saved.details.evidence_coverage.observations, 999);
    assert.deepEqual((await preparePersonalization(db, teacher, context)).details, saved.details);
    await assert.rejects(savePersonalizationDraft(db, id(999), context, next.id, edited, saved.snapshot), { reason: "not_found" });
    await assert.rejects(savePersonalizationDraft(db, teacher, context, next.id, next.details, next.snapshot), { reason: "conflict" });
    await db.query(`insert into diagnostic_spontaneous_observations
      (id,classroom_id,student_id,context_label,observation_text,created_by)
      values($1,$2,$3,'Patio','Exploró las plantas del patio.', $4)`, [id(51), classroomId, studentId, teacher]);
    await assert.rejects(confirmPersonalization(db, teacher, context, saved.id, saved.details, saved.snapshot), { reason: "stale" });
    assert.equal((await preparePersonalization(db, teacher, context)).sources_changed, true);
    const refreshed = await preparePersonalization(db, teacher, context, { refresh: true,
      details: { ...saved.details, additional_notes: "Alternar juegos tranquilos y de movimiento." }, expectedSnapshot: saved.snapshot });
    assert.equal(refreshed.id, saved.id);
    assert.equal(refreshed.sources_changed, false);
    assert.equal(refreshed.details.group_profile, edited.group_profile);
    assert.deepEqual(refreshed.details.classroom_conditions, edited.classroom_conditions);
    assert.equal(refreshed.details.additional_notes, "Alternar juegos tranquilos y de movimiento.");
    assert.equal(refreshed.details.evidence_coverage.observations, 2);
    await assert.rejects(confirmPersonalization(db, teacher, context, saved.id, saved.details, saved.snapshot), { reason: "conflict" });
    assert.equal((await currentPersonalization(db, teacher, context)).id, confirmed.id);
    const confirmedNext = await confirmPersonalization(db, teacher, context, refreshed.id, refreshed.details, refreshed.snapshot);
    assert.equal(confirmedNext.status, "confirmed");
    assert.equal((await currentPersonalization(db, teacher, context)).id, refreshed.id);
    assert.deepEqual((await db.query("select details from annual_personalization_reviews where id=$1", [confirmed.id])).rows[0].details, confirmed.details);
  } finally { await db.close(); }
});
