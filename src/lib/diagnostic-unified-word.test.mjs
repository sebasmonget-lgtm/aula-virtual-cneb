import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDiagnosticUnifiedWord } from "./diagnostic-unified-word.mjs";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

test("el informe unificado conserva nombres autorizados, evidencia factual e información insuficiente", async () => {
  const document = { kind: "diagnostic_summary", status: "confirmed", school_year: 2026,
    content: { document_format: "diagnostic-unified-v1", strengths: "El grupo comparte ideas durante el juego.",
      needs: "Ofrecer más oportunidades para comparar cantidades.",
      planning_priorities: "Organizar juegos de comparación.",
      report_snapshot: { version: "diagnostic-unified-v1", religion_applicable: false, castellano_l2_applicable: false,
        children: [
          { student_id: id(1), name: "Ana Pérez", information_status: "information_available",
            teacher_comment: "Ana explicó cómo organizó los bloques.", has_confirmed_interview: true },
          { student_id: id(2), name: "Luis Rojas", information_status: "insufficient_information",
            teacher_comment: "Necesito observar a Luis en otros juegos.", has_confirmed_interview: false },
        ],
        observations: [{ id: id(3), student_id: id(1), competency_id: "PS_IDENTIDAD",
          observed_at: "2026-03-20", observation_text: "Eligió materiales y explicó su elección.",
          observation_status: "observed_without_judgment" }],
        competency_coverage: [] } } };
  const context = { school_year: 2026, institution_name: "Jardín Sol", teacher_name: "Marisol",
    age: 5, classroom: "Sala Amarilla", ugel: "UGEL 03",
    diagnostic_period_start: "2026-03-16", diagnostic_period_end: "2026-03-27",
    reported_interests: ["Animales", "Construcción", "Música"], confirmed_priorities: [
      { title: "Explorar, construir y probar alternativas", reason: "Ensayan estructuras", related_competency_ids: ["PS_IDENTIDAD"] },
      { title: "Observar la participación en conversaciones diversas", reason: "Registrar turnos", related_competency_ids: [] },
      { title: "Acompañar la organización compartida del juego", reason: "Acordar materiales", related_competency_ids: [] },
    ] };
  const rendered = await renderDiagnosticUnifiedWord(document, context,
    [{ id: "PS_IDENTIDAD", name: "Construye su identidad" }, { id: "PS_CONVIVE", name: "Convive" }]);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "diagnostic-unified-qa.docx"), rendered);
  const zip = await JSZip.loadAsync(rendered);
  const xml = await zip.file("word/document.xml").async("string");
  for (const value of ["Ana Pérez", "Luis Rojas", "En el aula:", "Eligió materiales", "Retomar Construye su identidad", "Información insuficiente", "UGEL 03"])
    assert.match(xml, new RegExp(value));
  assert.match(xml, /16\/03\/2026/);
  assert.match(xml, /27\/03\/2026/);
  assert.doesNotMatch(xml, /Revisar fechas:/);
  for (const title of context.confirmed_priorities.map((item) => item.title)) assert.match(xml, new RegExp(title));
  assert.match(xml, /Las familias mencionaron intereses como Animales, Construcción, Música/);
  assert.doesNotMatch(xml, /estos intereses:|\.;|Animales; Construcción/);
  assert.doesNotMatch(xml, /\{\{|SEGUIMIENTO_2|SEGUIMIENTO_3|EVID_RELIGION|EVID_CASTELLANO_L2/);
  assert.match(xml, /2 comentarios individuales confirmados por la docente/);
  const optional = structuredClone(document);
  for (const child of optional.content.report_snapshot.children) { child.teacher_comment = ""; child.review_id = null; child.information_status = "insufficient_information"; }
  const optionalZip = await JSZip.loadAsync(await renderDiagnosticUnifiedWord(optional, context, [{ id: "PS_IDENTIDAD", name: "Construye su identidad" }, { id: "PS_CONVIVE", name: "Convive" }]));
  const optionalXml = await optionalZip.file("word/document.xml").async("string");
  assert.match(optionalXml, /0 comentarios individuales confirmados por la docente/);
  assert.match(optionalXml, /Sin comentarios individuales registrados/);
  assert.match(optionalXml, /Ana Pérez/);
  assert.match(optionalXml, /Luis Rojas/);
  assert.match(optionalXml, /Eligió materiales/);
  assert.doesNotMatch(optionalXml, /2 comentarios individuales confirmados|Ana explicó cómo organizó/);
  const late = structuredClone(document);
  late.content.report_snapshot.observations[0].observed_at = "2026-09-28";
  const lateXml = await (await JSZip.loadAsync(await renderDiagnosticUnifiedWord(late, context,
    [{ id: "PS_IDENTIDAD", name: "Construye su identidad" }]))).file("word/document.xml").async("string");
  assert.match(lateXml, /Registros revisados: del 28\/09\/2026 al 28\/09\/2026/);
  assert.match(lateXml, /Revisar fechas: hay registros fuera del período previsto \(16\/03\/2026 al 27\/03\/2026\)/);
});

test("diagnóstico exportado respeta Lima, notas únicas y áreas no aplicables", async () => {
  const cards = [
    ["PS_IDENTIDAD", "Construye su identidad"], ["PS_CONVIVE", "Convive"],
    ["PS_RELIGION", "Educación religiosa no aplicable"], ["CAST_L2_ORAL", "Castellano segunda lengua no aplicable"],
  ].map(([id, name]) => ({ id, name }));
  const snapshot = { version: "diagnostic-unified-v1", religion_applicable: false, castellano_l2_applicable: false,
    children: [{ student_id: id(1), name: "Ana Pérez", information_status: "information_available" }],
    observations: [
      { id: id(3), student_id: id(1), competency_id: "PS_IDENTIDAD", observed_at: "2026-03-20T02:30:00.000Z", observation_text: "Eligió materiales." },
      { id: id(3), student_id: id(1), competency_id: "PS_CONVIVE", observed_at: "2026-03-20T02:30:00.000Z", observation_text: "Eligió materiales." },
    ], competency_coverage: [] };
  const document = { school_year: 2026, content: { document_format: "diagnostic-unified-v1", report_snapshot: snapshot } };
  const context = { school_year: 2026, institution_name: "Jardín Sol", teacher_name: "Marisol", age: 5, classroom: "Amarilla" };
  const xmlOf = async () => (await JSZip.loadAsync(await renderDiagnosticUnifiedWord(document, context, cards))).file("word/document.xml").async("string");
  const textOf = (xml) => xml.replace(/<[^>]*>/g, "");
  const text = textOf(await xmlOf());
  assert.match(text, /19\/03\/2026/);
  assert.doesNotMatch(text, /20\/03\/2026/);
  assert.match(text, /1 registro de observación incluidos en este corte/);
  assert.doesNotMatch(text, /2 registros de observación incluidos/);
  assert.doesNotMatch(text, /Educación religiosa no aplicable|Castellano segunda lengua no aplicable/);
  snapshot.observations[0].observed_at = "2026-03-20";
  snapshot.observations[1].observed_at = "2026-03-20";
  assert.match(textOf(await xmlOf()), /20\/03\/2026/);
  snapshot.religion_applicable = true;
  snapshot.castellano_l2_applicable = true;
  const enabled = textOf(await xmlOf());
  assert.match(enabled, /Educación religiosa no aplicable/);
  assert.match(enabled, /Castellano segunda lengua no aplicable/);
});

test("seguimiento nominal conserva primer y último registro distinto, no duplicados de competencias", async () => {
  const snapshot = { version: "diagnostic-unified-v1", religion_applicable: false, castellano_l2_applicable: false,
    children: [{ student_id: id(1), name: "Ana Pérez", information_status: "information_available" }],
    observations: [
      { id: id(5), student_id: id(1), competency_id: "PS_IDENTIDAD", observed_at: "2026-03-22", observation_text: "Último: ahora espera sin recordatorio." },
      { id: id(3), student_id: id(1), competency_id: "PS_IDENTIDAD", observed_at: "2026-03-20", observation_text: "Primero: pide ayuda para esperar." },
      { id: id(3), student_id: id(1), competency_id: "PS_CONVIVE", observed_at: "2026-03-20", observation_text: "Primero: pide ayuda para esperar." },
      { id: id(4), student_id: id(1), competency_id: "PS_IDENTIDAD", observed_at: "2026-03-21", observation_text: "Intermedio: usa tarjeta." },
    ], competency_coverage: [] };
  const document = { school_year: 2026, content: { document_format: "diagnostic-unified-v1", report_snapshot: snapshot } };
  const zip = await JSZip.loadAsync(await renderDiagnosticUnifiedWord(document, { school_year: 2026, age: 5 },
    [{ id: "PS_IDENTIDAD", name: "Identidad" }, { id: "PS_CONVIVE", name: "Convive" }]));
  const text = (await zip.file("word/document.xml").async("string")).replace(/<[^>]*>/g, "");
  const nominal = text.slice(text.indexOf("En el aula:"));
  assert.match(nominal, /Primero: pide ayuda/);
  assert.match(nominal, /Último: ahora espera/);
  assert.match(nominal, /2 de 3 registros/);
  assert.doesNotMatch(nominal, /Intermedio: usa tarjeta/);
});
