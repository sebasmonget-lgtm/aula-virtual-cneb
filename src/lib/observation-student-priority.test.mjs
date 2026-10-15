import test from 'node:test';import assert from 'node:assert/strict';
import {prioritizeObservationStudents,observationCountTone} from './observation-student-priority.mjs';
test('prioriza cantidades exactas, conserva todos los niños y no transforma un conteo desconocido en cero',()=>{
 const students=[{id:'b',name:'Bruno'},{id:'a',name:'Ana'},{id:'d',name:'Diana'},{id:'c',name:'Carmen'},{id:'e',name:'Elena'}];
 const rows=[{student_id:'b',record_count:3},{student_id:'a',record_count:1},{student_id:'d',record_count:0},{student_id:'c',record_count:2}];
 const result=prioritizeObservationStudents(students,rows);assert.deepEqual(result.map(row=>row.id),['d','a','c','b','e']);assert.equal(result.at(-1).observation_count,null);assert.deepEqual(students.map(row=>row.id),['b','a','d','c','e']);
 assert.deepEqual(result.map(row=>observationCountTone(row.observation_count)),['none','one','multiple','multiple','unknown']);
});
