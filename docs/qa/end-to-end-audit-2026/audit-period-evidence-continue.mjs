// Read-only reconciliation of UI action notes, not pedagogical seeding.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const response = await fetch('http://127.0.0.1:8790/api/export');
assert.ok(response.ok);
const snapshot = await response.json();
const classroomId = 'cda4ce72-78a6-4b39-a680-b7811fe8a605';
const students = snapshot.tables.students.filter(row => row.classroom_id === classroomId);
const results = [];
for (const period of ['p2', 'p3', 'p4']) {
  let notes;
  try { notes = JSON.parse(await readFile(new URL(`${period}-evidencias-ui.json`, root), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const note of notes) {
    const student = students.find(row => row.first_name === note.student);
    assert.ok(student, note.student);
    const matches = snapshot.tables.evidences.filter(row => row.student_id === student.id && row.observed_on.slice(0, 10) === note.day && row.observation_text === note.text);
    assert.equal(matches.length, 1, `${period} ${note.day} ${note.student}: UI note must belong to exactly that student`);
    results.push({ period: period.toUpperCase(), day: note.day, student: note.student, evidenceId: matches[0].id,
      corrections: matches[0].student_reassignment_history?.length ?? 0, status: 'PASS' });
  }
}
await writeFile(new URL('evidencias/period-evidence-ui-reconciliation.json', root), JSON.stringify({ at: new Date().toISOString(), notes: results.length, results }, null, 2));
console.log(JSON.stringify({ notes: results.length, status: 'PASS', corrections: results.filter(row => row.corrections).length }));
