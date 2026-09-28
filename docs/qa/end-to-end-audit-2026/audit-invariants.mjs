// Reproduce el fallo del dato YA guardado. Todo se analiza en memoria; no hay escrituras API/SQL.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { validateAnnualPreplan } from '../../../src/lib/annual-preplan-service.mjs';
const root = new URL('./', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('evidencias/final-ui-qa-snapshot.json', root), 'utf8'));
const teacher = 'd97b5d03-b64d-405e-9de5-ae6e407bf126';
const classrooms = snapshot.tables.classrooms.filter(row => row.teacher_id === teacher);
const ids = classrooms.map(row => row.id);
const plan = snapshot.tables.annual_plans.find(row => ids.includes(row.classroom_id));
const proposal = plan.proposal;
const allowed = [...new Set(proposal.proposed_experiences.flatMap(row => row.primary_competency_ids))];
const keys = ['proposal_id', 'experience_type', 'title', 'period', 'month', 'duration_weeks', 'rationale', 'purpose', 'primary_competency_ids'];
let originalValidation;
try { validateAnnualPreplan(proposal, allowed, 2026); originalValidation = { accepted: true }; }
catch (error) { originalValidation = { accepted: false, reason: error.reason, message: error.message }; }
const projection = { ...proposal, proposed_experiences: proposal.proposed_experiences.map(row => Object.fromEntries(keys.map(key => [key, row[key]]))) };
const projectedRows = validateAnnualPreplan(projection, allowed, 2026).proposed_experiences.length;
const coverage = {};
for (const row of proposal.proposed_experiences) for (const id of row.primary_competency_ids) {
  coverage[id] ??= { proposals: 0, periods: [] };
  coverage[id].proposals++;
  if (!coverage[id].periods.includes(row.period)) coverage[id].periods.push(row.period);
}
const group = snapshot.tables.diagnostic_group_reviews.find(row => ids.includes(row.classroom_id));
const report = group.details.report_snapshot;
const baseline = JSON.parse(await readFile(new URL('baseline-source-hashes.json', root), 'utf8'));
const changed = [], missing = [];
for (const [file, hash] of Object.entries(baseline.hashes)) {
  try { if (createHash('sha256').update(await readFile(file)).digest('hex') !== hash) changed.push(file); }
  catch { missing.push(file); }
}
const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const addedOutsideAudit = currentFiles.filter(file => !file.startsWith('docs/qa/end-to-end-audit-2026/') && !Object.hasOwn(baseline.hashes, file));
const results = {
  at: new Date().toISOString(), annual: { id: plan.id, status: plan.status, revision: plan.revision, originalValidation,
    derivedExtraKeys: Object.keys(proposal.proposed_experiences[0]).filter(key => !keys.includes(key)),
    memoryOnlyProjectionAccepted: projectedRows === 12, note: 'La proyección es una prueba diagnóstica, NO se guardó ni aplicó al producto.',
    plannedProjectDays: proposal.proposed_experiences.reduce((sum, row) => sum + row.planned_instructional_days, 0), coverage,
    rows: proposal.proposed_experiences.map(row => ({ title: row.title, period: row.period, type: row.experience_type, starts: row.planned_start_date, ends: row.planned_end_date, days: row.planned_instructional_days, competencies: row.primary_competency_ids })) },
  diagnostic: { rawGuided: snapshot.tables.diagnostic_experience_observations.length, rawSpontaneous: snapshot.tables.diagnostic_spontaneous_observations.length,
    curricularAssociationsInDocument: report.observations.length, uniqueCurricularNotes: new Set(report.observations.map(row => row.id)).size,
    curricularChildren: new Set(report.observations.map(row => row.student_id)).size, religionApplicable: report.religion_applicable, castellanoL2Applicable: report.castellano_l2_applicable,
    birthDatesPersisted: snapshot.tables.students.filter(row => ids.includes(row.classroom_id) && row.birth_date).length,
    recentContextCases: ['Bruno', 'Valeria'].map(name => { const child = report.children.find(row => row.name === name); const rows = report.observations.filter(row => row.student_id === child.student_id); return { name, firstTwoExcerpted: rows.slice(0,2), laterRows: rows.slice(2) }; }) },
  downstreamOwnData: Object.fromEntries(['learning_experiences','activities','period_competency_scope','period_closures','classroom_period_reports','competency_assessments','competency_descriptive_conclusions','family_reports'].map(table => [table, snapshot.tables[table].filter(row => ids.includes(row.classroom_id)).length])),
  sourceIntegrity: { baselineAt: baseline.at, files: Object.keys(baseline.hashes).length, changed, missing, addedOutsideAudit },
};
await writeFile(new URL('evidencias/invariants.json', root), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ annual: results.annual.originalValidation, memoryOnlyProjectionAccepted: results.annual.memoryOnlyProjectionAccepted, diagnostic: {associations:report.observations.length, uniqueNotes:results.diagnostic.uniqueCurricularNotes, birthDatesPersisted:results.diagnostic.birthDatesPersisted}, downstream:results.downstreamOwnData, integrity:results.sourceIntegrity }));
