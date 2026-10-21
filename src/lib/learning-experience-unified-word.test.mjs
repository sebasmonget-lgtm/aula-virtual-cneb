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
  assert.match(xml, /ajustar el acompañamiento docente, conservando la secuencia confirmada/);
  assert.doesNotMatch(xml, /ajustar las siguientes actividades/);
  for (const label of ["Primeros pasos", "Cómo acompañará la docente", "Qué observar", "Evidencia esperada"])
    assert.match(xml, new RegExp(label));
  assert.doesNotMatch(xml, /¿QUÉ HAREMOS\?|¿CÓMO LO HAREMOS\?|¿QUÉ NECESITAREMOS\?/);
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /XI\. SEGUIMIENTO/);
  assert.doesNotMatch(xml, /Fila repetible/);
  assert.match(xml,/VI\. ESTRATEGIA GENERAL DE EVALUACIÓN/);
  assert.match(xml,/VII\. RUTA DE ACTIVIDADES/);
  const officialDocument = { ...document, content: { ...document.content, dependents: { general_criteria: [
    { competency_id: "PS_CONVIVE", criterion: "Propone acuerdos", expected_evidence: ["Explica su acuerdo"], official_performance_refs: ["PCI2016.PS_CONVIVE.5.03"] },
  ] } } };
  const officialZip = await JSZip.loadAsync(await renderLearningExperienceUnifiedWord(officialDocument, cards));
  assert.match(await officialZip.file("word/document.xml").async("string"), /Desempeño de 5 años · MINEDU, p\. 87/);
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
  assert.match(xml,/1 día elegido: 13\/04\/2026/,'Conserva el tramo anual y aclara el día realmente seleccionado');
  assert.match(xml, /Partimos de preguntas del grupo/);
  const meaningful='La docente propone explorar las hojas del patio: ¿qué diferencias podemos descubrir?';
  const updated={...document,content:{...document.content,project_master:{...document.content.project_master,meaningful_situation:meaningful}}};
  const updatedArchive=await JSZip.loadAsync(await renderLearningExperienceUnifiedWord(updated,cards));
  const updatedXml=await updatedArchive.file('word/document.xml').async('string');
  assert.ok(updatedXml.includes(meaningful));
  assert.doesNotMatch(updatedXml,/De dónde parte/,'La situación canónica ya contiene el origen del proyecto');
  assert.equal(updatedXml.split(meaningful).length-1,1,'La situación aparece una sola vez');
  const shortArchive=await JSZip.loadAsync(await renderLearningExperienceUnifiedWord({...updated,ends_on:'2026-04-16'},cards));
  assert.match(await shortArchive.file('word/document.xml').async('string'),/1 semana lectiva prevista/);
  assert.doesNotMatch(updatedXml,/Exploramos el patio\.|Partimos de preguntas del grupo\./,'No mezcla la situación nueva con el fundamento o texto formal anterior');
  assert.match(xml, /Compartir lo investigado/);
  for (const heading of ["III. PREPLANIFICACIÓN DOCENTE", "IV. PROPÓSITO GENERAL", "V. PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN", "VI. ENFOQUES", "VII. ESTRATEGIA GENERAL DE EVALUACIÓN", "VIII. RUTA DE ACTIVIDADES", "Materiales y recursos previstos"])
    assert.ok(xml.includes(heading), `Falta ${heading}`);
  assert.ok(!xml.includes("<w:t>V. PROPÓSITO GENERAL</w:t>"), "No debe saltar el IV");
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /Pendiente de completar por la docente/);
  const integrated={...document,content:{...document.content,activity_route:[{...document.content.activity_route[0],competency_ids:['PS_CONVIVE','COM_ORAL'],additional_criteria:[{competency_id:'COM_ORAL',criterion_text:'Explica su elección a un compañero',expected_evidence:'Respuesta sobre su propio intento',observation_moments:['closure']}]}]}};
  const integratedXml=await (await JSZip.loadAsync(await renderLearningExperienceUnifiedWord(integrated,cards))).file('word/document.xml').async('string');
  assert.match(integratedXml,/Explica su elección a un compañero/);assert.match(integratedXml,/Respuesta sobre su propio intento/);
  assert.deepEqual(document.content.activity_route[0].competency_ids,['PS_CONVIVE'],'El formato no altera la ruta confirmada');
});
