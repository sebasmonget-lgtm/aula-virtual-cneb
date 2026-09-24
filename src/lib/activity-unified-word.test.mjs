import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";

test("la actividad usa su fila heredada y oculta registros no realizados", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({ id: card.id, name: card.official_name,
    capacities: card.capacities, ages: card.ages }));
  const route = { id: "route-1", number: 2, title: "Nos organizamos", specific_purpose: "Compartir juegos",
    competency_id: "PS_CONVIVE", evaluation_criterion: "Acordar turnos", expected_evidence: "Explica un acuerdo" };
  const document = { kind: "activity", school_year: 2026, age: 5, classroom: "Sala A", title: "Nos organizamos",
    occurs_on: "2026-04-14", experience_title: "Jugamos juntos", experience_details: { activity_route: [route] },
    content: { document_template_version: "activity-unified-v1", route_item_id: route.id, title: "Nos organizamos", purpose: route.specific_purpose,
      competency_id: route.competency_id, evaluation_criterion: route.evaluation_criterion, expected_evidence: route.expected_evidence,
      meaningful_situation: "Los niños quieren jugar", teacher_preparation: "Preparar objetos", child_actions: "Elegir y conversar",
      mediation: "Preguntar cómo compartir", evidence_opportunities: "Escuchar acuerdos", closure_or_continuity: "Conversar sobre acuerdos", materials: ["bloques"] } };
  const rendered = await renderActivityUnifiedWord(document, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "activity-unified-qa.docx"), rendered);
  const archive = await JSZip.loadAsync(rendered);
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /Acordar turnos/);
  assert.match(xml, /Explica un acuerdo/);
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /VI\. CUADERNO DE CAMPO/);
  const completed = { ...document, registered_evidence: [{ student_name: "Ana", observation_text: "Propuso esperar su turno.", observation_status: "observed_without_judgment", has_attachment: false }], teacher_closure_note: "El grupo propuso nuevos turnos." };
  const completedArchive = await JSZip.loadAsync(await renderActivityUnifiedWord(completed, cards));
  const completedXml = await completedArchive.file("word/document.xml").async("string");
  assert.match(completedXml, /Ana/);
  assert.match(completedXml, /Propuso esperar su turno/);
  assert.match(completedXml, /El grupo propuso nuevos turnos/);
  assert.doesNotMatch(completedXml, /VIII\. TALLER|\{\{/);
});
