import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderLearningExperienceUnifiedWord } from "./learning-experience-unified-word.mjs";

test("el proyecto unificado clona la ruta, usa currículo de la edad y no anticipa evidencias posteriores", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({
    id: card.id, name: card.official_name, area_name: card.area_name, capacities: card.capacities, ages: card.ages,
  }));
  const document = { id: "12345678-1234-1234-1234-123456789abc", kind: "experience", subtype: "project", origin: "planned",
    school_year: 2026, age: 5, classroom: "Sala", title: "Jugamos juntos", starts_on: "2026-04-13", ends_on: "2026-04-24",
    content: { document_template_version: "experience-unified-v1", purpose: "Organizar juegos", starting_point: "El grupo pide juegos", trigger_or_interest: "Quieren jugar",
      primary_competency_ids: ["PS_CONVIVE"], possible_secondary_competency_ids: [], spaces_and_materials: ["aula"], evidence_opportunities: ["Acuerdos"], family_or_community_links: [], adjustment_points: [], flexibility_notes: "Flexible",
      possible_pathways: [{ title: "Juegos", possible_child_actions: "Elegir" }],
      activity_route: [{ id: "a", number: 1, title: "Elegimos juegos", specific_purpose: "Decidir juntos", competency_id: "PS_CONVIVE", evaluation_criterion: "Propone acuerdos", expected_evidence: "Explica su acuerdo" },
        { id: "b", number: 2, title: "Nos organizamos", specific_purpose: "Compartir", competency_id: "PS_CONVIVE", evaluation_criterion: "Respeta turnos", expected_evidence: "Participa por turnos" }] } };
  const rendered = await renderLearningExperienceUnifiedWord(document, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "project-unified-qa.docx"), rendered);
  const archive = await JSZip.loadAsync(rendered);
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /Elegimos juegos/);
  assert.match(xml, /Nos organizamos/);
  for (const label of ["Qué podríamos observar durante el proceso", "Primeros pasos", "Cómo acompañará la docente", "Qué observar", "Evidencia esperada"])
    assert.match(xml, new RegExp(label));
  assert.doesNotMatch(xml, /¿QUÉ HAREMOS\?|¿CÓMO LO HAREMOS\?|¿QUÉ NECESITAREMOS\?/);
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /XI\. SEGUIMIENTO/);
  assert.doesNotMatch(xml, /Fila repetible/);
  const logo = await sharp({ create: { width: 80, height: 80, channels: 4, background: "#087d96" } }).png().toBuffer();
  const withLogoBuffer = await renderLearningExperienceUnifiedWord(document, cards, { logo });
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "project-unified-logo-qa.docx"), withLogoBuffer);
  const withLogo = await JSZip.loadAsync(withLogoBuffer);
  const logoXml = await withLogo.file("word/document.xml").async("string");
  assert.match(logoXml, /name="Logo institucional"/);
  assert.doesNotMatch(logoXml, /r:embed="rId8"/);
});

test("el Word V2 usa el mapa confirmado y las fechas reales sin inventar registros posteriores", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({
    id: card.id, name: card.official_name, area_name: card.area_name, capacities: card.capacities, ages: card.ages,
  }));
  const document = { id: "12345678-1234-1234-1234-123456789abc", kind: "experience", subtype: "project",
    origin: "planned", school_year: 2026, age: 5, classroom: "Sala", title: "Investigamos el patio",
    starts_on: "2026-04-13", ends_on: "2026-04-24", content: {
      document_template_version: "experience-unified-v2", purpose: "Observar y conversar", starting_point: "Hay plantas en el patio",
      trigger_or_interest: "El grupo pregunta por plantas", primary_competency_ids: ["PS_CONVIVE"],
      possible_secondary_competency_ids: [], spaces_and_materials: ["patio"], evidence_opportunities: ["Conversaciones"],
      adjustment_points: [], family_or_community_links: [], flexibility_notes: "Ajustar según el grupo",
      dependents: { guiding_questions: ["¿Qué encontramos?"], journey: [{ title: "Exploramos", description: "Observamos" }],
        general_criteria: [{ competency_id: "PS_CONVIVE", criterion: "Propone acuerdos durante la exploración",
          expected_evidence: ["Intervenciones orales"] }] },
      project_master: { closing_description: "Compartir lo investigado" },
      formal_content: { situation: "Exploramos el patio.", foundation: "Partimos de preguntas del grupo.",
        methodology: "Jugar, observar y conversar.", diversity_support: "Ofrecer materiales diversos.",
        assessment_followup: "Registrar actuaciones reales.", family_collaboration: "Conversar en casa si es pertinente.",
        closing: "Compartir ideas." },
      activity_route: [{ number: 1, date: "2026-04-13", title: "Miramos el patio", specific_purpose: "Observar",
        competency_id: "PS_CONVIVE", competency_ids: ["PS_CONVIVE"], evaluation_criterion: "Propone acuerdos",
        expected_evidence: "Intervenciones orales" }] } };
  const rendered = await renderLearningExperienceUnifiedWord(document, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "project-v2-qa.docx"), rendered);
  const archive = await JSZip.loadAsync(rendered);
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /13\/04\/2026/);
  assert.match(xml, /2 semanas lectivas previstas/);
  assert.match(xml, /Partimos de preguntas del grupo/);
  assert.match(xml, /Compartir lo investigado/);
  for (const heading of ["III. PREPLANIFICACIÓN DOCENTE", "IV. PROPÓSITO GENERAL", "V. PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN", "VI. ENFOQUES", "VII. ESTRATEGIA GENERAL DE EVALUACIÓN", "VIII. RUTA DE ACTIVIDADES", "IX. RECURSOS"])
    assert.ok(xml.includes(heading), `Falta ${heading}`);
  assert.ok(!xml.includes("<w:t>V. PROPÓSITO GENERAL</w:t>"), "No debe saltar el IV");
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /Pendiente de completar por la docente/);
});
