import { readFile } from "node:fs/promises";
const dir = ".local/test-results/project-master-f2/reduced";
const pass = process.argv[2] === "2" ? 2 : 1;
const start = Number(process.argv[3] ?? 0), count = Number(process.argv[4] ?? 2);
const rows = JSON.parse(await readFile(`${dir}/blind-bundles.json`, "utf8"));
// Different order in the second pass; never print arms, usage, latencies or the lookup table.
if (pass === 2) rows.reverse();
for (const row of rows.slice(start, start + count)) {
  const p = row.project;
  if (pass === 2) {
    // Second pass audits curriculum/criterion linkage and progression in reverse order.
    // This is the same agent, not independent evaluation or a second human specialist.
    console.log(JSON.stringify({ blind_id: row.blind_id, age: row.case.age,
      context: row.case.decisions.additional_context, purpose: p.purpose,
      criteria: p.criteria.map((c) => [c.competency_id, c.text]),
      stages: p.progression, resources: p.resources,
      map: p.activity_map.map((r) => [r.date, r.title, r.competency_ids,
        p.criteria.some((c) => c.text === r.criterion_text) ? "general criterion repeated" : r.criterion_text,
        r.expected_evidence]), closing: p.closing }));
    continue;
  }
  console.log(JSON.stringify({ blind_id: row.blind_id, case: row.case,
    curriculum_reference: row.curriculum_reference, purpose: p.purpose,
    starting_point: p.starting_point, competencies: p.competency_ids,
    foundation: p.foundation, questions: p.guiding_questions,
    criteria: p.criteria.map((item) => ({ competency: item.competency_id, criterion: item.text,
      evidence: p.expected_evidence.filter((entry) => entry.criterion_id === item.criterion_id).map((entry) => entry.description) })),
    progression: p.progression, resources: p.resources, closing: p.closing,
    map: p.activity_map.map((item) => ({ date: item.date, title: item.title, purpose: item.purpose,
      competencies: item.competency_ids, criterion: p.criteria.some((c) => c.text === item.criterion_text) ?
        `Same general criterion: ${p.criteria.find((c) => c.text === item.criterion_text).competency_id}` : item.criterion_text, evidence: item.expected_evidence,
      resources: item.resource_refs, mediation: item.mediation, progression: item.progression, role: item.role })) }));
}
