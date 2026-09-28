import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { projectDraftChanges, jsonValuesDiffer } from "./project-draft-changes.mjs";

const decisions = { context_summary: "Acuerdos al jugar", purpose: "Compartir materiales",
  competency_ids: ["PS_CONVIVE", "COM_ORAL"], additional_context: "Participar en pareja" };
const dependents = { guiding_questions: ["¿Cómo compartimos?", "¿Qué acordamos?"],
  journey: [{ title: "Proponer", description: "Conversamos sobre turnos" }],
  general_criteria: [{ competency_id: "PS_CONVIVE", criterion: "Propone acuerdos",
    expected_evidence: ["Una propuesta", "Un acuerdo"] }] };
const route = [{ id: "primera", number: 1, date: "2026-03-30", title: "Elegimos el juego",
  competency_ids: ["PS_CONVIVE", "COM_ORAL"] },
  { id: "segunda", number: 2, date: "2026-03-31", title: "Probamos acuerdos", competency_ids: ["PS_CONVIVE"] }];

test("persistir y recargar JSONB no oculta preguntas ni bloquea confirmar un mapa intacto", async () => {
  const db = await PGlite.create();
  try {
    const details = { decisions, dependents, activity_route: route };
    const saved = (await db.query("select $1::jsonb as details", [JSON.stringify(details)])).rows[0].details;
    assert.notEqual(JSON.stringify(saved.decisions), JSON.stringify(decisions), "reproduce el orden distinto que causaba el bloqueo");
    assert.deepEqual(projectDraftChanges(saved, decisions, dependents, route),
      { decisionsChanged: false, depChanged: false, mapChanged: false });
  } finally { await db.close(); }
});

test("los cambios pedagógicos y el orden de listas/actividades siguen requiriendo revisión", () => {
  const details = { decisions, dependents, activity_route: route };
  assert.equal(projectDraftChanges(details, { ...decisions, purpose: "Otro propósito" }, dependents, route).decisionsChanged, true);
  assert.equal(projectDraftChanges(details, { ...decisions, competency_ids: [...decisions.competency_ids].reverse() }, dependents, route).decisionsChanged, true);
  assert.equal(projectDraftChanges(details, decisions, { ...dependents, guiding_questions: ["Otra pregunta"] }, route).depChanged, true);
  assert.equal(projectDraftChanges(details, decisions, dependents, route.map((row, i) => i ? row : { ...row, date: "2026-04-01" })).mapChanged, true);
  assert.equal(projectDraftChanges(details, decisions, dependents, [...route].reverse()).mapChanged, true);
  assert.deepEqual(projectDraftChanges({}, decisions, dependents, []),
    { decisionsChanged: false, depChanged: false, mapChanged: false });
});

test("el par diario no trata el reordenamiento JSONB del taller como una edición pendiente", async () => {
  const source = await readFile(new URL("../features/dashboard/components/parent-activity-generator.tsx", import.meta.url), "utf8");
  assert.ok(/jsonValuesDiffer\(workshopProposal,\s*activities\.find/.test(source));
  assert.doesNotMatch(source, /JSON\.stringify\(workshopProposal\)\s*!==/);
  const db = await PGlite.create();
  try {
    const workshop = { title: "Construimos lugares", purpose: "Explorar posiciones", materials: ["bloques", "aros"], sheet_id: null, competency_id: "MAT_FORMA" };
    const saved = (await db.query("select $1::jsonb as details", [JSON.stringify(workshop)])).rows[0].details;
    assert.notEqual(JSON.stringify(saved), JSON.stringify(workshop));
    assert.equal(jsonValuesDiffer(workshop, saved), false);
    assert.equal(jsonValuesDiffer({ ...workshop, purpose: "Otro propósito" }, saved), true);
    assert.equal(jsonValuesDiffer({ ...workshop, materials: [...workshop.materials].reverse() }, saved), true);
    assert.equal(jsonValuesDiffer(workshop, null), true);
    assert.equal(jsonValuesDiffer(null, null), false);
  } finally { await db.close(); }
});
