import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { prepareDiagnosticStudentReview, saveDiagnosticStudentReview, confirmDiagnosticStudentReview,
  prepareDiagnosticGroupReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview } from "./diagnostic-assessment-v4.mjs";
import { prepareDiagnosticPriorities, suggestDiagnosticPriorities, saveDiagnosticPriorities,
  confirmDiagnosticPriorities, listDiagnosticPriorities, orderPrioritiesByObservationGaps } from "./diagnostic-priority-service.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("las competencias sin observaciones preceden las que ya tienen registros", () => {
  const observed = { title: "Más conteos", related_competency_ids: ["MAT_CANTIDAD"] };
  const missing = { title: "Observar diálogo", related_competency_ids: ["COM_ORAL"] };
  const ordered = orderPrioritiesByObservationGaps([observed, missing], [
    { competency_id: "MAT_CANTIDAD", children_without_observations: 0 },
    { competency_id: "COM_ORAL", children_without_observations: 5 },
  ]);
  assert.deepEqual(ordered, [missing, observed]);
});

test("prioridades usan la visión grupal confirmada, se editan aparte y quedan aisladas por docente", async () => {
  const db = await PGlite.create();
  try {
    const dir = new URL("../../local-db/migrations/", import.meta.url);
    for (const name of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(name, dir), "utf8"));
    await createPilotClassroom(db, teacherA, { teacherName: "Docente A", institutionName: "Escuela A", section: "A",
      age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18" });
    await createPilotClassroom(db, teacherB, { teacherName: "Docente B", institutionName: "Escuela B", section: "B",
      age: 4, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18" });
    await importStudentsForTeacher(db, teacherA, [{ firstName: "Ana", lastName: "Pérez" }]);
    const student = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
      where c.teacher_id=$1`, [teacherA])).rows[0];
    const child = await prepareDiagnosticStudentReview(db, teacherA, student.id);
    await saveDiagnosticStudentReview(db, teacherA, child.id, { information_status: "insufficient_information",
      comment_text: "Necesito observar más conversaciones durante el juego." });
    await confirmDiagnosticStudentReview(db, teacherA, child.id);
    const group = await prepareDiagnosticGroupReview(db, teacherA);
    await saveDiagnosticGroupReview(db, teacherA, group.id, { strengths: "El grupo participa en el juego.",
      needs: "Conviene ofrecer más ocasiones para conversar.", planning_priorities: "Observar conversaciones en pequeños grupos.", competency_priorities: [] });
    await confirmDiagnosticGroupReview(db, teacherA, group.id);
    const draft = await prepareDiagnosticPriorities(db, teacherA);
    assert.equal(draft.group_review_id, group.id);
    const requests = [];
    const suggested = await suggestDiagnosticPriorities(db, teacherA, draft.id, {
      createProvider: () => ({ generate: async (request) => { requests.push(request);
        return { output: { priorities: [{ title: "Conversar en los juegos", reason: "La visión confirmada pide más oportunidades de diálogo.",
          related_competency_ids: ["COM_ORAL"], importance: "higher" }] } }; } }),
    });
    assert.equal(requests[0].ai_context_bundle.context.confirmed_group.needs, "Conviene ofrecer más ocasiones para conversar.");
    assert.equal(requests[0].ai_context_bundle.context.age, 5);
    assert.ok(requests[0].ai_context_bundle.context.observation_coverage.some((item) =>
      item.competency_id === "COM_ORAL" && item.children_without_observations === 1));
    assert.equal(suggested.details.priorities[0].related_competency_ids[0], "COM_ORAL");
    await assert.rejects(saveDiagnosticPriorities(db, teacherB, draft.id, suggested.details));
    const edited = { priorities: [{ ...suggested.details.priorities[0], title: "Conversar y escuchar durante el juego" }] };
    await saveDiagnosticPriorities(db, teacherA, draft.id, edited);
    const confirmed = await confirmDiagnosticPriorities(db, teacherA, draft.id);
    assert.equal(confirmed.details.priorities[0].title, edited.priorities[0].title);
    assert.equal((await listDiagnosticPriorities(db, teacherA)).length, 1);
    await assert.rejects(saveDiagnosticPriorities(db, teacherA, draft.id, suggested.details));
    const next = await prepareDiagnosticPriorities(db, teacherA);
    assert.equal(next.version, 2);
    assert.deepEqual(next.details, confirmed.details);
  } finally { await db.close(); }
});
