import test from "node:test";
import assert from "node:assert/strict";
import { confirmedProjectFoundation, confirmedDailyRouteContext,
  confirmedProjectFormalContext } from "./direct-ai-context-contracts.mjs";

test("el contrato diario conserva decisiones y vecinas sin duplicar el mapa completo", () => {
  const route = [
    { id: "a", title: "Primera exploración", continuity_to_next: "Seguiremos probando" },
    { id: "b", title: "Continuamos probando", continuity_from_previous: "Retoma las ideas" },
    { id: "c", title: "Compartimos" },
  ];
  const project = { id: "p", title: "La luz", purpose: "Explorar cambios", details: {
    decisions: { purpose: "Explorar cambios" }, dependents: { guiding_questions: ["¿Qué cambia?"] },
    project_master: { foundation: "Pregunta del grupo", closing_description: "Conversar",
      activity_blueprints: route }, activity_route: route } };
  const foundation = confirmedProjectFoundation(project);
  assert.equal(foundation.project_master.foundation, "Pregunta del grupo");
  assert.equal(foundation.project_master.activity_blueprints, undefined);
  const daily = confirmedDailyRouteContext(route, 1);
  assert.deepEqual(daily.route_position, { number: 2, total: 3 });
  assert.equal(daily.inherited_route_item.title, "Continuamos probando");
  assert.equal(daily.previous_map_item.id, "a");
  assert.equal(daily.next_map_item.id, "c");
  assert.throws(() => confirmedDailyRouteContext(route, 3));
  const formal = confirmedProjectFormalContext(project);
  assert.deepEqual(formal.activity_route, route);
  assert.equal(formal.project_master.activity_blueprints, undefined);
});
