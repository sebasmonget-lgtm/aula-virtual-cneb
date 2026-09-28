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
    age: 5, classroom: "Sala Amarilla", ugel: "UGEL 03" };
  const rendered = await renderDiagnosticUnifiedWord(document, context,
    [{ id: "PS_IDENTIDAD", name: "Construye su identidad" }]);
  if (process.env.AYNI_QA_DOCX_DIR) await writeFile(path.join(process.env.AYNI_QA_DOCX_DIR, "diagnostic-unified-qa.docx"), rendered);
  const zip = await JSZip.loadAsync(rendered);
  const xml = await zip.file("word/document.xml").async("string");
  for (const value of ["Ana Pérez", "Luis Rojas", "En el aula:", "Eligió materiales", "Retomar Construye su identidad", "Información insuficiente", "UGEL 03"])
    assert.match(xml, new RegExp(value));
  assert.doesNotMatch(xml, /\{\{|SEGUIMIENTO_2|SEGUIMIENTO_3|EVID_RELIGION|EVID_CASTELLANO_L2/);
  assert.match(xml, /2 comentarios individuales confirmados por la docente/);
  const optional = structuredClone(document);
  for (const child of optional.content.report_snapshot.children) { child.teacher_comment = ""; child.review_id = null; child.information_status = "insufficient_information"; }
  const optionalZip = await JSZip.loadAsync(await renderDiagnosticUnifiedWord(optional, context, [{ id: "PS_IDENTIDAD", name: "Construye su identidad" }]));
  const optionalXml = await optionalZip.file("word/document.xml").async("string");
  assert.match(optionalXml, /0 comentarios individuales confirmados por la docente/);
  assert.match(optionalXml, /Sin comentarios individuales registrados/);
  assert.match(optionalXml, /Ana Pérez/);
  assert.match(optionalXml, /Luis Rojas/);
  assert.match(optionalXml, /Eligió materiales/);
  assert.doesNotMatch(optionalXml, /2 comentarios individuales confirmados|Ana explicó cómo organizó/);
});
