import { nationalCalendarBlocks2026, nationalSchoolHolidays2026, defaultInitialStage } from "../annual-plan-calendar.mjs";
import { classifyCalendarDay } from "../school-calendar-service.mjs";
export function fixtureCalendar() {
  const blocks = nationalCalendarBlocks2026(), holidays = nationalSchoolHolidays2026(), days = [];
  for (let d = new Date("2026-03-02T00:00:00Z"); d <= new Date("2026-12-31T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const value = d.toISOString().slice(0, 10), block = blocks.find((b) => b.start_date <= value && value <= b.end_date);
    const holiday = holidays.find((h) => h.exception_date === value);
    days.push({ date: value, ...classifyCalendarDay({ date: value, block, holiday: holiday ? { name: holiday.label } : null }) });
  }
  return { days, blocks, version: { id: "fixture", version: "MINEDU-2026-fixture" }, initial_stage: defaultInitialStage() };
}
export const opportunityFixture = (card) => ({ competency_id: card.id, capacity_names: [card.capacities[0]],
  child_action: "Los niños comparan sus colecciones y explican sus decisiones al jugar.", conditions: "Colecciones disponibles y tiempo para probar diferentes formas de organizar.",
  mediation: "Escuchar y ofrecer preguntas abiertas sin resolver por ellos.", observation: "Cómo explica sus decisiones y cambia de estrategia.", supports: "Permitir gestos y acompañamiento individual." });
export function generationFixture(cards) {
  return { organization_criteria: ["Previsión flexible"], transversal_approaches: ["Respeto a las diferencias"],
    teaching_strategies: ["Escuchar y acompañar el juego"], assessment_followup: ["Registrar actuaciones contextualizadas"],
    family_collaboration: ["Escuchar reportes familiares sin convertirlos en evidencia"], inclusive_supports: ["Ofrecer diferentes formas de participar"],
    evidence_interpretations: [], everyday_opportunities: cards.map((c) => ({ moment: "Juego y conversación", ...opportunityFixture(c) })),
    proposals: Array.from({ length: 15 }, (_, i) => ({ title: `Invitación ${i + 1}`, rationale: "Oportunidad curricular para seguir conociendo al grupo; no supone un interés observado.",
      purpose: "Explorar y compartir decisiones durante el juego.", invitation: "Invitar a organizar y comparar materiales del aula.",
      children_actions: ["Explorar, comparar y explicar decisiones"], materials: ["Materiales disponibles del aula"],
      supports: ["Tiempo y gestos"], flexibility: "Los niños pueden proponer otros caminos.", source_fact_keys: [], opportunities: [opportunityFixture(cards[0])] })) };
}
