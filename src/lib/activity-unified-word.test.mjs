import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";

test("la actividad distingue qué observar de las observaciones registradas", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({ id: card.id, name: card.official_name,
    capacities: card.capacities, ages: card.ages }));
  const route = { id: "route-1", number: 2, title: "Nos organizamos", specific_purpose: "Compartir juegos",
    competency_id: "PS_CONVIVE", evaluation_criterion: "Acordar turnos", expected_evidence: "Explica un acuerdo" };
  const document = { kind: "activity", school_year: 2026, age: 5, classroom: "Sala A", title: "Nos organizamos",
    occurs_on: "2026-04-14", experience_title: "Jugamos juntos", experience_details: { activity_route: [route] },
    active_criterion: { criterion_text: "Acordar turnos", competency_v4_id: "PS_CONVIVE", observation_focus: ["Escuchar cómo propone los turnos"] },
    content: { document_template_version: "activity-unified-v1", route_item_id: route.id, title: "Nos organizamos", purpose: route.specific_purpose,
      competency_id: route.competency_id, evaluation_criterion: route.evaluation_criterion, expected_evidence: route.expected_evidence,
      meaningful_situation: "Los niños quieren jugar", teacher_preparation: "Preparar objetos", child_actions: "Elegir y conversar",
      mediation: "Preguntar: ¿Cómo podemos compartir?", evidence_opportunities: "Escuchar acuerdos", closure_or_continuity: "Conversar sobre acuerdos", materials: ["bloques"] } };
  const rendered = await renderActivityUnifiedWord(document, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "activity-unified-qa.docx"), rendered);
  const archive = await JSZip.loadAsync(rendered);
  const xml = await archive.file("word/document.xml").async("string");
  assert.match(xml, /Acordar turnos/);
  assert.match(xml, /Explica un acuerdo/);
  assert.match(xml, /Escuchar cómo propone los turnos/);
  assert.match(xml, /Síntesis orientativa para 5 años/);
  for (const label of ["Niños · qué harán", "Docente · cómo acompaña", "Preguntas para conversar", "Materiales", "Qué observar"])
    assert.match(xml, new RegExp(label));
  assert.doesNotMatch(xml, /¿QUÉ\?|¿CÓMO\?|¿PARA QUÉ\?/);
  assert.doesNotMatch(xml, /\{\{/);
  assert.match(xml, /VI\. REGISTRO DE OBSERVACIONES Y EVIDENCIAS/);
  assert.match(xml, /Aún no hay observaciones registradas/);
  assert.doesNotMatch(xml, /Nombre del estudiante/);
  const completed = { ...document, registered_evidence: [{ student_name: "Ana", criterion_id: "criterion-1", criterion_text: "Explica cómo acuerda un turno", competency_v4_id: "PS_CONVIVE", observed_at: "2026-04-14T15:00:00Z", observation_text: "Propuso esperar su turno.", observation_status: null, has_attachment: true }], teacher_closure_note: "El grupo propuso nuevos turnos." };
  const completedWord = await renderActivityUnifiedWord(completed, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "activity-with-observation-qa.docx"), completedWord);
  const completedArchive = await JSZip.loadAsync(completedWord);
  const completedXml = await completedArchive.file("word/document.xml").async("string");
  assert.match(completedXml, /Ana/);
  assert.match(completedXml, /VI\. REGISTRO DE OBSERVACIONES Y EVIDENCIAS/);
  assert.doesNotMatch(completedXml, /Aún no hay observaciones registradas/);
  assert.match(completedXml, /Explica cómo acuerda un turno/);
  assert.match(completedXml, /Propuso esperar su turno/);
  assert.match(completedXml, /14\/04\/2026/);
  assert.match(completedXml, /Guardada en Ayni/);
  assert.match(completedXml, /El grupo propuso nuevos turnos/);
  assert.doesNotMatch(completedXml, /VIII\. TALLER|\{\{/);
  const withWorkshop = { ...document, content: { ...document.content, document_template_version: "activity-with-workshop-v1" },
    workshop: { content: { workshop_type: "Arte", purpose: "Explorar formas", opening: "Mirar", development: "Crear", closure: "Compartir", materials: ["papel"] } } };
  const workshopWord = await JSZip.loadAsync(await renderActivityUnifiedWord(withWorkshop, cards));
  const workshopXml = await workshopWord.file("word/document.xml").async("string");
  assert.match(workshopXml, /VI\. CUADERNO DE CAMPO/);
  assert.match(workshopXml, /Aún no hay observaciones registradas/);
  assert.doesNotMatch(workshopXml, /\{\{/);
});
