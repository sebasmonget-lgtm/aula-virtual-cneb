import test from 'node:test';import assert from 'node:assert/strict';
import {familyAttendanceChart} from './family-attendance-presentation.mjs';
test('gráfica familiar: los días se reparten sin duplicar tardanzas ni ocultar faltas justificadas',()=>{
  const counts={total:10,present:6,late:1,absent:1,excused:1,pending:1,as_of:'2026-12-18'},before=structuredClone(counts),chart=familyAttendanceChart(counts);
  assert.equal(chart.attended,7);assert.equal(chart.summary,'Asistió 7 de 10 días de clase.');assert.deepEqual(chart.rows.map(r=>r.count),[6,1,1,1,1]);assert.equal(chart.rows.reduce((sum,r)=>sum+r.width,0),100);assert.equal(chart.rows[0].width,60);assert.match(chart.note,/1 día sin registrar/);assert.deepEqual(counts,before);
});
test('gráfica familiar: ausencia de registros y período sin clases no inventan faltas',()=>{
  const chart=familyAttendanceChart({total:3,present:0,late:0,absent:0,excused:0,pending:3});assert.equal(chart.summary,'Aún no hay asistencia registrada.');assert.equal(chart.rows.find(r=>r.key==='absent').count,0);assert.equal(chart.rows.find(r=>r.key==='pending').count,3);
  const empty=familyAttendanceChart({total:0,present:0,late:0,absent:0,excused:0,pending:0});assert.match(empty.summary,/Aún no hay días/);assert.ok(empty.rows.every(r=>r.width===0));assert.equal(familyAttendanceChart(null),null);
});
test('gráfica familiar rechaza totales incompletos o contados dos veces',()=>{
  assert.throws(()=>familyAttendanceChart({total:2,present:2,late:1,absent:0,excused:0,pending:0}),/incompleto/);
  assert.throws(()=>familyAttendanceChart({total:2,present:-1,late:1,absent:0,excused:0,pending:2}),/incompleto/);
});
