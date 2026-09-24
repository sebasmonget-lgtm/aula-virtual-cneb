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
