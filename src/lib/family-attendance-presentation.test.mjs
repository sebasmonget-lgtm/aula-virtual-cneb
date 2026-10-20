import test from 'node:test';import assert from 'node:assert/strict';
import {familyAttendanceChart,familyAttendanceDonutSvg} from './family-attendance-presentation.mjs';
test('círculo familiar conserva días excluyentes, colores y porcentajes que suman cien',()=>{
 const counts={total:43,present:37,late:3,absent:3,excused:0,pending:0,as_of:'2026-12-18'},before=structuredClone(counts),chart=familyAttendanceChart(counts);
 assert.equal(chart.attended,40);assert.deepEqual(chart.rows.map(r=>[r.label,r.count,r.percentageLabel]),[['Asistencia',37,'86 %'],['Tardanzas',3,'7 %'],['Faltas',3,'7 %']]);assert.equal(chart.total,43);assert.deepEqual(counts,before);
 const svg=familyAttendanceDonutSvg(chart);for(const color of ['#21835C','#C18B08','#C9434F'])assert.ok(svg.includes(color));assert.match(svg,/>43<\/text>/);assert.doesNotMatch(svg,/NaN|Infinity/);
});
test('justificada pertenece a faltas y los pendientes se indican fuera del círculo',()=>{
 const chart=familyAttendanceChart({total:10,present:6,late:1,absent:1,excused:1,pending:1});assert.equal(chart.recorded,9);assert.deepEqual(chart.rows.map(r=>r.count),[6,1,2]);assert.match(chart.note,/1 día sin registrar/);assert.match(chart.note,/9 días registrados/);assert.match(chart.note,/1 falta justificada/);assert.equal(chart.rows.reduce((sum,r)=>sum+r.percentage,0),100);
 const unknown=familyAttendanceChart({total:3,present:0,late:0,absent:0,excused:0,pending:3});assert.equal(unknown.summary,'Aún no hay asistencia registrada.');assert.equal(unknown.rows[2].count,0);assert.ok(unknown.rows.every(r=>r.percentageLabel==='—'));assert.doesNotMatch(familyAttendanceDonutSvg(unknown),/NaN|Infinity/);
});
test('redondeo de tercios y combinaciones pequeñas suma cien sin modificar días',()=>{
 for(let present=0;present<12;present++)for(let late=0;late<7;late++)for(let absent=0;absent<5;absent++){
  const total=present+late+absent;if(!total)continue;const chart=familyAttendanceChart({total,present,late,absent,excused:0,pending:0});assert.equal(Math.round(chart.rows.reduce((sum,r)=>sum+r.percentage,0)*10),1000);assert.equal(chart.rows.reduce((sum,r)=>sum+r.count,0),total);
 }
 const thirds=familyAttendanceChart({total:3,present:1,late:1,absent:1,excused:0,pending:0});assert.deepEqual(thirds.rows.map(r=>r.percentage),[33.4,33.3,33.3]);
});
test('sin días y totales inválidos no producen asistencias ni faltas inventadas',()=>{
 assert.equal(familyAttendanceChart(null),null);const empty=familyAttendanceChart({total:0,present:0,late:0,absent:0,excused:0,pending:0});assert.match(empty.summary,/Aún no hay días/);assert.ok(empty.rows.every(r=>r.width===0));
 assert.throws(()=>familyAttendanceChart({total:2,present:2,late:1,absent:0,excused:0,pending:0}),/incompleto/);
 assert.throws(()=>familyAttendanceChart({total:2,present:-1,late:1,absent:0,excused:0,pending:2}),/incompleto/);
});
