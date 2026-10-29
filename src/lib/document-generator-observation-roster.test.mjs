import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeMultiAgeDocumentFixture} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {classroomCurriculumScope} from './classroom-curriculum-scope.mjs';
import {captureDocumentObservationRoster, validateDocumentObservationRoster} from './document-generator-observation-roster.mjs';
import {documentObservationRegisterWord} from './document-generator-observation-register-word.mjs';

test('nómina autorizada conserva nombres completos, edades y orden; exportar no vuelve a leer matrícula',{timeout:90000}, async () => {
  const f = await makeMultiAgeDocumentFixture();
  try {
    const scope = await classroomCurriculumScope(f.db, f.teacher, f.classroom.classroomId);
    const roster = await captureDocumentObservationRoster(f.db, f.teacher, scope);
    assert.equal(roster.students.length, 3);
    assert.deepEqual(roster.students.map(s => s.name), ['Ana Ficticio', 'Bruno Ficticio', 'Clara Ficticio']);
    assert.deepEqual(roster.students.map(s => s.age), [3,4,5]);
    await assert.rejects(() => captureDocumentObservationRoster(f.db, f.other, scope), /no está disponible/);
    await f.db.query("update students set first_name='Nombre posterior' where id=$1", [f.children[0].studentId]);
    const d = {identity:{ages:[3,4,5]},content:{title:'Actividad ficticia',occursOn:'2026-04-01',observationRoster:roster}};
    const xml = documentObservationRegisterWord(d);
    assert.match(xml, /Ana Ficticio/); assert.doesNotMatch(xml, /Nombre posterior/);
    assert.match(xml, /Puedes dejar filas sin completar/);
    assert.equal((xml.match(/<w:trHeight w:val="900"/g) ?? []).length, 3);
    const rows = [...xml.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].slice(1);
    for (const row of rows) {
      const cells = [...row[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
      assert.equal(cells.length,4);
      for (const blank of cells.slice(2)) assert.doesNotMatch(blank[0], /<w:t[^>]*>[^<]+<\/w:t>/);
    }
  } finally {await f.db.close();}
});

test('la nómina rechaza IDs repetidos, edad ajena, datos de evaluación y alumnos sin nombre', () => {
  const student = {studentId:randomUUID(),name:'Niña ficticia',age:3};
  const roster = students => ({contract:'ayni-document-observation-roster-v1',students});
  assert.throws(() => validateDocumentObservationRoster(roster([student,student]),[3]), /nómina/);
  assert.throws(() => validateDocumentObservationRoster(roster([{...student,age:5}]),[3]), /nómina/);
  assert.throws(() => validateDocumentObservationRoster(roster([{...student,observation:'No debe venir de IA'}]),[3]), /nómina/);
  assert.throws(() => validateDocumentObservationRoster(roster([{...student,name:' '}]),[3]), /nómina/);
  assert.throws(() => validateDocumentObservationRoster(roster(Array.from({length:46},()=>({...student,studentId:randomUUID()}))),[3]), /nómina/);
});

test('nóminas grandes repiten encabezados y no fuerzan toda la tabla a una página; nombres se escapan', () => {
  const students = Array.from({length:35}, (_,i) => ({studentId:randomUUID(),name:i===0?'Ana & Luis <prueba>':`Alumno ficticio ${i+1}`,age:[3,4,5][i%3]}));
  const xml = documentObservationRegisterWord({identity:{ages:[3,4,5]},content:{title:'Actividad ficticia',occursOn:'2026-04-01',observationRoster:{contract:'ayni-document-observation-roster-v1',students}}});
  assert.match(xml, /Ana &amp; Luis &lt;prueba&gt;/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.equal((xml.match(/<w:trHeight w:val="900"/g)??[]).length,35);
  const bodyRows = [...xml.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].slice(1);
  for (const row of bodyRows) {assert.match(row[0], /<w:cantSplit\/>/);assert.doesNotMatch(row[0], /<w:keepNext\/>/);}
});
