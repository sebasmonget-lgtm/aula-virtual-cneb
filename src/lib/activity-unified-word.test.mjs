import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";
import {workshopCatalog,workshopActivityDetails} from './workshop-catalog.mjs';
import {workshopForAge} from './workshop-ages.mjs';

test('el Word de taller identifica el taller e incluye la orientación de sus fichas',async()=>{
 const workshop=workshopForAge(workshopCatalog.find(row=>row.id==='taller-biblioteca-canastas-para-comparar'),4);
 const content=workshopActivityDetails(workshop),before=structuredClone(content);
 const cards=(await loadKnowledgeBaseV4()).competencyCards.map(card=>({...card,name:card.official_name}));
 const bytes=await renderActivityUnifiedWord({kind:'activity',school_year:2026,age:4,classroom:'Girasoles',title:workshop.title,occurs_on:'2026-04-14',content},cards);
 const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
 const text=[...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match=>match[1]).join('');
 assert.doesNotMatch(text,/Actividad|APRENDIZAJEEducación|N\.°|Del proyecto|\{\{/);
 assert.match(text,/TALLER/);assert.match(text,/Fichas opcionales/);assert.match(text,/hoy cada gallina del señor Cristóbal puso un huevo/);
 assert.equal(text.split(workshop.opening.teacher).length-1,1);
 assert.equal(text.split(workshop.closure.teacher).length-1,1);
 assert.deepEqual(content,before);
 if(process.env.AYNI_QA_DOCX_DIR)await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR,'taller-huevos-qa.docx'),bytes);
});

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
  const officialDocument = { ...document, content: { ...document.content, official_performance_refs: ["PCI2016.PS_CONVIVE.5.03"] } };
  const officialZip = await JSZip.loadAsync(await renderActivityUnifiedWord(officialDocument, cards));
  const officialXml = await officialZip.file("word/document.xml").async("string");
  assert.match(officialXml, /Desempeño de 5 años · MINEDU, p\. 87/);
  assert.match(officialXml, /Participa en la construcción colectiva/);
  assert.doesNotMatch(officialXml, /Síntesis orientativa/);
  assert.equal(document.content.official_performance_refs, undefined, "No modifica la actividad histórica");
  for (const label of ["Niños · qué harán", "Docente · cómo acompaña", "Materiales", "Qué observar"])
    assert.match(xml, new RegExp(label));
  assert.equal((xml.match(/¿Cómo podemos compartir\?/g) ?? []).length, 1, "La pregunta acompaña la mediación, sin duplicarse en otro bloque");
  assert.match(xml, /ACTIVIDAD DE/);
  assert.match(xml, /APRENDIZAJE/);
  const coverEnd = xml.indexOf('w:type="page"');
  assert.ok(coverEnd > 0 && coverEnd < xml.indexOf("I. DATOS GENERALES"), "La portada del original ocupa su propia página");
  assert.ok((xml.match(/<w:tbl>/g) ?? []).length >= 7, "Conserva una guía tabulada y la portada");
  assert.match(xml, /w:fill="F4EFFA"/, "El criterio se distingue dentro del momento");
  const source = await JSZip.loadAsync(await readFile("assets/templates/actividad-aprendizaje-inicial-ayni-v2.docx"));
  for (const name of Object.keys(source.files).filter(name => /word\/(styles\.xml|theme\/|media\/)/.test(name) && !source.files[name].dir))
    assert.deepEqual(await archive.file(name).async("nodebuffer"), await source.file(name).async("nodebuffer"), `Preserva ${name}`);
  assert.doesNotMatch(xml, /¿QUÉ\?|¿CÓMO\?|¿PARA QUÉ\?/);
  assert.doesNotMatch(xml, /\{\{/);
  assert.doesNotMatch(xml, /V\. REGISTRO DE OBSERVACIONES Y EVIDENCIAS/);
  assert.match(xml, /Aún no hay observaciones registradas/);
  const general=structuredClone(document);
  general.experience_details.source_proposal_snapshot={supports:['Acompañar la manipulación y atender derrames.']};
  const scoped=await JSZip.loadAsync(await renderActivityUnifiedWord(general,cards));
  const scopedXml=await scoped.file('word/document.xml').async('string');
  assert.doesNotMatch(scopedXml,/atender derrames/);assert.match(scopedXml,/¿Cómo podemos compartir/);
  general.content.supports=['Mostrar los objetos mientras cuenta su propuesta.'];
  const own=await JSZip.loadAsync(await renderActivityUnifiedWord(general,cards));
  assert.match(await own.file('word/document.xml').async('string'),/Mostrar los objetos mientras cuenta su propuesta/);
  assert.equal((xml.match(/Aún no hay observaciones registradas/g)??[]).length,1);
  assert.ok(xml.indexOf('Aún no hay observaciones registradas')<xml.indexOf('III. SECUENCIA DE LA ACTIVIDAD'),'El aviso no crea una sección final vacía');
  assert.doesNotMatch(xml, /Nombre del estudiante/);
  const longPurpose='Explorar distintas maneras de construir un paso para que atraviese un carro, conversar sobre las decisiones que toman y comprobar sus ideas mediante intentos que puedan cambiar y explicar con los materiales a la vista.';
  const longZip=await JSZip.loadAsync(await renderActivityUnifiedWord({...document,content:{...document.content,purpose:longPurpose}},cards));
  const longXml=await longZip.file('word/document.xml').async('string');
  assert.ok(longXml.includes(longPurpose),'El propósito largo se conserva íntegro en el cuerpo');
  assert.equal(longXml.slice(0,longXml.indexOf('w:type="page"')).includes(longPurpose),false,'La vista opcional no desborda la portada con el propósito largo');
  const integratedDocument={...document,experience_details:{activity_route:[{...route,competency_ids:['PS_CONVIVE','COM_ORAL']}]},active_criterion:{...document.active_criterion,observation_focus:['Acordar turnos']}};
  const integratedZip=await JSZip.loadAsync(await renderActivityUnifiedWord(integratedDocument,cards));
  const integratedXml=await integratedZip.file('word/document.xml').async('string');
  assert.match(integratedXml,/Se comunica oralmente en su lengua materna/);
  assert.match(integratedXml,/Integración prevista en el mapa/);
  assert.doesNotMatch(integratedXml,/No se prioriza otra competencia|No se ha previsto otra competencia/);
  assert.match(integratedXml,/Escuchar acuerdos/,'El foco genérico no vuelve a copiar el criterio');
  assert.deepEqual(document.active_criterion.observation_focus,['Escuchar cómo propone los turnos']);
  const phasedDocument = { ...document, content: { ...document.content,
    child_actions: "Inicio: Eligen una caja.\nDesarrollo: Prueban cómo apoyarla.\nCierre: Señalan lo que cambió.",
    mediation: "Inicio: Ofrece dos cajas.\nDesarrollo: Pregunta: ¿Qué ayuda a sostenerla?\nCierre: Recupera la prueba que hicieron." } };
  const phasedZip = await JSZip.loadAsync(await renderActivityUnifiedWord(phasedDocument,cards));
  const phasedXml = await phasedZip.file('word/document.xml').async('string');
  const sequence = phasedXml.slice(phasedXml.indexOf('III. SECUENCIA DE LA ACTIVIDAD'),phasedXml.indexOf('IV. REFERENTES CURRICULARES'));
  assert.match(sequence,/INICIO[\s\S]*Eligen una caja[\s\S]*Ofrece dos cajas[\s\S]*DESARROLLO[\s\S]*Prueban cómo apoyarla[\s\S]*CIERRE[\s\S]*Señalan lo que cambió/);
  assert.doesNotMatch(sequence,/Inicio:|Desarrollo:|Cierre:|Preguntas para conversar/);
  assert.equal((sequence.match(/¿Qué ayuda a sostenerla\?/g)??[]).length,1);
  assert.equal(phasedDocument.content.child_actions,"Inicio: Eligen una caja.\nDesarrollo: Prueban cómo apoyarla.\nCierre: Señalan lo que cambió.");
  const completed = { ...document, registered_evidence: [{ student_name: "Ana", criterion_id: "criterion-1", criterion_text: "Explica cómo acuerda un turno", competency_v4_id: "PS_CONVIVE", observed_at: "2026-04-14T15:00:00Z", observation_text: "Propuso esperar su turno.", observation_status: null, has_attachment: true }], teacher_closure_note: "El grupo propuso nuevos turnos." };
  const completedWord = await renderActivityUnifiedWord(completed, cards);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "activity-with-observation-qa.docx"), completedWord);
  const completedArchive = await JSZip.loadAsync(completedWord);
  const completedXml = await completedArchive.file("word/document.xml").async("string");
  assert.match(completedXml, /Ana/);
  assert.match(completedXml, /V\. REGISTRO DE OBSERVACIONES Y EVIDENCIAS/);
  assert.doesNotMatch(completedXml, /Aún no hay observaciones registradas/);
  assert.match(completedXml, /Explica cómo acuerda un turno/);
  assert.match(completedXml, /Propuso esperar su turno/);
  assert.match(completedXml, /14\/04\/2026/);
  assert.match(completedXml, /Guardada en Ayni/);
  const observationTable = [...completedXml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)]
    .find(match => match[0].includes("Nombre del estudiante"))?.[0];
  assert.ok(observationTable);
  const observationRows = [...observationTable.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)];
  assert.match(observationRows[0][0], /<w:tblHeader\/>/);
  for (const row of observationRows) assert.match(row[0], /<w:cantSplit\/>/);
  assert.match(observationRows[1][0], /Ana[\s\S]*Explica cómo acuerda un turno[\s\S]*Propuso esperar su turno/);
  const freeZip=await JSZip.loadAsync(await renderActivityUnifiedWord({...document,registered_evidence:[{student_name:"Ana",criterion_id:null,criterion_text:null,observation_text:"Dijo que le gustan las semillas rojas.",observed_at:"2026-04-14T15:00:00Z",source:"ordinary_observation"}]},cards));
  const freeXml=await freeZip.file("word/document.xml").async("string"),freeTable=[...freeXml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)].find(match=>match[0].includes("Nombre del estudiante"))?.[0];
  assert.match(freeTable,/Observación libre/);assert.doesNotMatch(freeTable,/Acordar turnos/);
  assert.doesNotMatch(freeTable,/Sin adjunto/,'Sin archivos, el espacio se dedica a leer la observación');
  assert.equal(([...freeTable.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)][0][0].match(/<w:tc>/g)??[]).length,3);
  const literal='Dijo COM_ORAL mientras miraba su dibujo.';
  const literalZip=await JSZip.loadAsync(await renderActivityUnifiedWord({...document,content:{...document.content,meaningful_situation:'COM_ORAL: escuchar su explicación.'},registered_evidence:[{student_name:'Ana',observation_text:literal}]},cards));
  const literalXml=await literalZip.file('word/document.xml').async('string');
  assert.match(literalXml,/Se comunica: escuchar su explicación/,'El texto de planificación usa una etiqueta comprensible');
  assert.ok(literalXml.includes(literal),'La observación literal nunca se reescribe al presentar las competencias');
  assert.match(completedXml, /El grupo propuso nuevos turnos/);
  const reflectionTable=[...completedXml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)].find(item=>item[0].includes('El grupo propuso nuevos turnos'))?.[0];
  assert.match(reflectionTable,/<w:keepNext\/>/,'La reflexión breve se mantiene con su rótulo');
  const closureWithoutEvidence=await JSZip.loadAsync(await renderActivityUnifiedWord({...document,teacher_closure_note:'Mañana ofreceré un espacio más amplio.'},cards));
  const closureXml=await closureWithoutEvidence.file('word/document.xml').async('string');
  assert.match(closureXml,/Mañana ofreceré un espacio más amplio\./,'Una reflexión guardada se conserva aunque no haya observaciones individuales');
  assert.doesNotMatch(closureXml,/V\. REGISTRO DE OBSERVACIONES Y EVIDENCIAS/);
  assert.doesNotMatch(completedXml, /VIII\. TALLER|\{\{/);
  const withWorkshop = { ...document, content: { ...document.content, document_template_version: "activity-with-workshop-v1" },
    workshop: { content: { workshop_type: "Arte", purpose: "Explorar formas", opening: "Mirar", development: "Crear", closure: "Compartir", materials: ["papel"] } } };
  const workshopWord = await JSZip.loadAsync(await renderActivityUnifiedWord(withWorkshop, cards));
  const workshopXml = await workshopWord.file("word/document.xml").async("string");
  assert.doesNotMatch(workshopXml, /V\. CUADERNO DE CAMPO/);
  assert.match(workshopXml, /V\. TALLER/,'La sección opcional sigue a los referentes sin saltos de numeración');
  assert.doesNotMatch(workshopXml, /VIII\. TALLER/);
  assert.match(workshopXml, /Aún no hay observaciones registradas/);
  assert.doesNotMatch(workshopXml, /\{\{/);
});
