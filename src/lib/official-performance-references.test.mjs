import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { officialPerformances, officialPerformanceContext, validateOfficialPerformanceRefs, OFFICIAL_PERFORMANCE_VERSION } from "./official-performance-references.mjs";
import { loadKnowledgeBaseV4, KNOWLEDGE_BASE_V4_0_ROOT } from "./knowledge-base-v4.mjs";
import { ageReference } from "./pedagogical-word-presentation.mjs";

test("134 desempeños fuente-indexados cubren exactamente las edades y competencias publicadas", async () => {
  const kb = await loadKnowledgeBaseV4();
  const curriculum = JSON.parse(await readFile(new URL("../../knowledge/cneb-initial-3-5/v4.1.0/02_official_reference/curriculum_reference.json", import.meta.url)));
  const counts = { 3: 0, 4: 0, 5: 0 };
  const ids = new Set();
  for (const competency of curriculum.competencies) for (const age of [3, 4, 5]) {
    const rows = officialPerformances(competency.id, age);
    assert.equal(rows.length, competency.age_references[age].official_performance_count);
    counts[age] += rows.length;
    for (const row of rows) {
      assert.ok(!ids.has(row.id)); ids.add(row.id);
      assert.equal(row.pdf_page, row.printed_page + 2);
      assert.doesNotMatch(row.text, /\uFFFD|Ejemplo:|DESEMPEÑOS|CONDICIONES/);
      assert.ok(row.text.endsWith("."));
    }
    const card = kb.competencyCards.find(card => card.id === competency.id);
    assert.deepEqual(card.ages[age].official_performance_ids, rows.map(row => row.id));
  }
  assert.deepEqual(counts, { 3: 35, 4: 44, 5: 55 });
  assert.equal(kb.officialPerformanceVersion, OFFICIAL_PERFORMANCE_VERSION);
  assert.equal((await loadKnowledgeBaseV4(KNOWLEDGE_BASE_V4_0_ROOT)).officialPerformanceVersion, null);
});

test("referentes de otra edad, competencia, inventados, duplicados o vacíos se rechazan", () => {
  const ref = "PCI2016.COM_LECTURA.5.02";
  assert.equal(validateOfficialPerformanceRefs([ref], "COM_LECTURA", 5, { required: true })[0].id, ref);
  for (const refs of [["inventado"], [ref, ref], [], undefined])
    assert.throws(() => validateOfficialPerformanceRefs(refs, "COM_LECTURA", 5, { required: true }));
  assert.throws(() => validateOfficialPerformanceRefs([ref], "COM_LECTURA", 3));
  assert.throws(() => validateOfficialPerformanceRefs([ref], "COM_ORAL", 5));
  for (const competency of ["COM_ESCRITURA", "CAST_L2_ORAL", "TRANS_TIC", "TRANS_AUTONOMO"])
    assert.deepEqual(validateOfficialPerformanceRefs([], competency, 3, { required: true }), []);
  assert.deepEqual(validateOfficialPerformanceRefs(undefined, "COM_ORAL", 5), [], "Histórico sin modificación");
});

test("Word imprime únicamente los referentes seleccionados y mantiene explícita la paráfrasis histórica", async () => {
  const card = (await loadKnowledgeBaseV4()).competencyCards.find(card => card.id === "COM_LECTURA");
  const before = JSON.stringify(card);
  const text = ageReference(card, 5, ["PCI2016.COM_LECTURA.5.02"]);
  assert.match(text, /MINEDU, p\. 125/);
  assert.match(text, /Dice de qué tratará/);
  assert.doesNotMatch(text, /Opina dando razones|Síntesis orientativa/);
  assert.match(ageReference(card, 5, "Dice de qué tratará"), /paráfrasis curricular general/);
  assert.equal(JSON.stringify(card), before);
  const context = officialPerformanceContext(["COM_ORAL", "COM_LECTURA"], 4);
  assert.deepEqual(context.competencies.map(row => row.performances.length), [5, 3]);
  assert.ok(context.competencies.flatMap(row => row.performances).every(row => row.age === 4));
});
