import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnualPlanPresentation } from "./annual-plan-presentation.mjs";

const proposal = {
  title: "Aprendemos juntos durante 2026", school_year: "2026",
  general_context_summary: "El grupo disfruta explorar el patio.",
  planning_priorities: ["Conversar y observar"],
  annual_purposes: ["Participar en juegos compartidos"],
  teaching_strategies: ["Organizar juegos en grupos pequeños"],
  assessment_followup: ["Registrar hechos observados"],
  family_collaboration: ["Compartir propuestas de lectura"],
  inclusive_supports: ["Ofrecer distintos materiales"],
  competency_overview: ["Expresa sus ideas"],
  proposed_experiences: [{
    period: "Marzo", experience_type: "project", title: "Las sombras del patio",
    rationale: "Curiosidad por la luz", primary_competency_ids: ["COMP-1"],
    possible_secondary_competency_ids: ["COMP-2"], context_or_trigger: "Preguntas al jugar",
    expected_evidence_categories: ["Preguntas y dibujos"], flexibility_notes: "Ajustar al interés",
  }],
  review_checkpoints: ["Al terminar marzo"], flexibility_notes: "Ajustar según observaciones",
};

test("el documento anual conserva todas las secciones y muestra nombres de competencias", () => {
  const context = {
    institution_name: "Jardín de prueba", institution_code: "123456", district: "Distrito ficticio",
    ugel: "UGEL ficticia", teacher_name: "Docente ficticia", classroom_section: "Sala Amarilla",
    age: 5, student_count: 6, starts_on: "2026-03-16", ends_on: "2026-12-18",
    diagnostic_group: { strengths: "Participan en el juego.", needs: "Más oportunidades de conversación." },
    group_interests: ["plantas", "cuentos"],
  };
  const cards = [{ id: "COMP-1", name: "Indaga mediante métodos científicos" }, { id: "COMP-2", name: "Se comunica oralmente" }];
  const document = buildAnnualPlanPresentation(proposal, context, cards);
  assert.deepEqual(document.header, {
    institution: "Jardín de prueba", institutionCode: "123456", district: "Distrito ficticio",
    ugel: "UGEL ficticia", teacher: "Docente ficticia", classroom: "Sala Amarilla",
    age: 5, cycle: "II", studentCount: 6, year: "2026", dates: ["16/03/2026", "18/12/2026"],
  });
  assert.equal(document.context, proposal.general_context_summary);
  assert.deepEqual(document.diagnostic, { strengths: "Participan en el juego.", needs: "Más oportunidades de conversación.", interests: ["plantas", "cuentos"] });
  assert.deepEqual(document.priorities, proposal.planning_priorities);
  assert.deepEqual(document.annualPurposes, proposal.annual_purposes);
  assert.deepEqual(document.teachingStrategies, proposal.teaching_strategies);
  assert.deepEqual(document.assessmentFollowup, proposal.assessment_followup);
  assert.deepEqual(document.familyCollaboration, proposal.family_collaboration);
  assert.deepEqual(document.inclusiveSupports, proposal.inclusive_supports);
  assert.deepEqual(document.competencyOverview, proposal.competency_overview);
  assert.deepEqual(document.checkpoints, proposal.review_checkpoints);
  assert.equal(document.flexibility, proposal.flexibility_notes);
  assert.equal(document.experiences[0].typeLabel, "Proyecto");
  assert.deepEqual(document.experiences[0].primaryCompetencies, ["Indaga mediante métodos científicos"]);
  assert.deepEqual(document.experiences[0].secondaryCompetencies, ["Se comunica oralmente"]);
  assert.deepEqual(document.competencyMap[0], { id: "COMP-1", name: "Indaga mediante métodos científicos", opportunities: ["Marzo: Las sombras del patio"] });
  assert.deepEqual(buildAnnualPlanPresentation(proposal, context, cards), document);
  assert.deepEqual(proposal.proposed_experiences[0].primary_competency_ids, ["COMP-1"]);
});

test("datos institucionales ausentes no se inventan", () => {
  const document = buildAnnualPlanPresentation(proposal);
  assert.equal(document.header.teacher, null);
  assert.equal(document.header.institution, null);
  assert.equal(document.header.studentCount, null);
  assert.deepEqual(document.header.dates, []);
  assert.deepEqual(document.experiences[0].primaryCompetencies, ["COMP-1"]);
});

test("un plan histórico conserva la trazabilidad sin ponerla en el texto principal", () => {
  const old = { ...proposal, general_context_summary: "El grupo explora el patio. Trazabilidad interna: PLAN-01, DIA-02." };
  const document = buildAnnualPlanPresentation(old);
  assert.equal(document.context, "El grupo explora el patio.");
  assert.equal(document.technicalContext, "PLAN-01, DIA-02.");
  assert.equal(old.general_context_summary, "El grupo explora el patio. Trazabilidad interna: PLAN-01, DIA-02.");
});
