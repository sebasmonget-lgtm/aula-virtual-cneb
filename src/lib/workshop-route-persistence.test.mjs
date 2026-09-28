import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { createWorkshopRouteHandler } from "../../scripts/workshop-routes.mjs";

test("rutas reales guardan, confirman y versionan talleres con el esquema migrado", async () => {
  const db = await PGlite.create();
  try {
    const migrations = new URL("../../local-db/migrations/", import.meta.url);
    for (const file of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrations), "utf8"));
    const teacher = randomUUID();
    const setup = await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Jardín", section: "A", age: 5, year: 2026, startsOn: "2026-03-02", endsOn: "2026-12-31", castellanoL2Applicable: false, religionApplicable: false });
    const projectId = randomUUID(), masterId = randomUUID();
    const route = [{ id: "dia-1", title: "Jugamos", planned_date: "2026-04-06", competency_id: "PS_CONVIVE" }];
    const items = [{ index: 1, linked_activity_index: 1, title: "Agrupamos objetos", workshop_type: "matemática", competency_id: "MAT_CANTIDAD", purpose: "Agrupar objetos según criterios propios", rationale: "Otra oportunidad de exploración", observation_focus: "Explica cómo agrupó", materials: ["objetos"], brief_outline: "Juego y conversación", sheet_id: null, sheet_reason: null, day_decision: "suggested" }];
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details) values($1,$2,'project','Jugamos','Acuerdos','2026-04-06','2026-04-10','active',$3::jsonb)`, [projectId, setup.classroomId, JSON.stringify({ flow_version: "project-master-v2", activity_route: route })]);
    const insertMaster = async (id, version, previous = null) => db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,parent_project_id,version,lineage_id,supersedes_experience_id) values($1,$2,'workshop','Talleres','Explorar','2026-04-06','2026-04-10','draft',$3::jsonb,$4,$5,$6,$7)`, [id, setup.classroomId, JSON.stringify({ schema: "workshop-master-v1", items }), projectId, version, masterId, previous]);
    await insertMaster(masterId, 1);
    let body, result;
    const handler = createWorkshopRouteHandler({ db, teacherId: teacher, readJson: async () => body, send: (_response, status, payload) => { result = { status, payload }; } });
    const call = async (method, pathname, values) => { body = { projectId, ...values }; result = null; await handler({ request: { method }, url: new URL(pathname, "http://qa.local"), response: {}, origin: null }); return result; };
    const edited = items.map(item => ({ ...item, day_decision: "accepted" }));
    const saved = await call("PUT", "/api/workshops/master", { masterId, expectedRevision: 1, items: edited });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    assert.equal(saved.payload.master.revision, 2);
    assert.equal(saved.payload.master.details.items[0].day_decision, "accepted");
    const stale = await call("PUT", "/api/workshops/master", { masterId, expectedRevision: 1, items: edited });
    assert.equal(stale.status, 409);
    const confirmed = await call("POST", "/api/workshops/master/confirm", { masterId, expectedRevision: 2 });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.payload));
    assert.equal(confirmed.payload.master.status, "active");
    const next = randomUUID(); await insertMaster(next, 2, masterId);
    const acceptedNext = await call("PUT", "/api/workshops/master", { masterId: next, expectedRevision: 1, items: edited });
    assert.equal(acceptedNext.status, 200);
    const nextConfirmed = await call("POST", "/api/workshops/master/confirm", { masterId: next, expectedRevision: 2 });
    assert.equal(nextConfirmed.status, 200, JSON.stringify(nextConfirmed.payload));
    assert.equal((await db.query(`select status from learning_experiences where id=$1`, [masterId])).rows[0].status, "archived");
  } finally { await db.close(); }
});
