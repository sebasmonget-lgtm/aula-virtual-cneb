import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticBrief } from "./diagnostic-brief.mjs";
const students=[{id:"a",first_name:"Luna",last_name:"Ficticia",preferred_name:null},{id:"b",first_name:"Nico",last_name:"Ficticio",preferred_name:null}];
test("síntesis insuficiente conserva el desconocimiento y no inventa niveles",()=>{
  const result=diagnosticBrief({students,observations:[]});assert.equal(result.information_status,"insufficient_information");assert.match(result.text,/falta conocer mejor/);assert.deepEqual(result.source_refs,[]);assert.doesNotMatch(result.text,/lograron|nivel [ABC]/);
});
test("un registro concreto se cita sin generalizar y sin nombres privados",()=>{
  const result=diagnosticBrief({students,observations:[{id:"o",student_id:"a",experience_id:"spontaneous",observed_at:"2026-10-07T14:00:00Z",observation_text:"Luna contó a Nico que eligió construir una casa."}]});
  assert.equal(result.information_status,"insufficient_information");assert.match(result.text,/eligió construir una casa/);assert.match(result.text,/no permiten generalizar/);assert.doesNotMatch(result.text,/Luna|Nico/);assert.deepEqual(result.source_refs,[{id:"o",source_type:"spontaneous_observation"}]);
});
test("patrón familiar conserva su procedencia y nunca prueba aprendizaje",()=>{
  const group=Array.from({length:5},(_,i)=>({id:String(i),first_name:`Persona${i}`}));
  const result=diagnosticBrief({students:group,observations:[],interests:[{key:"construction",label:"Construcción",count:3}],interviews:Array.from({length:3},(_,i)=>({id:`f${i}`,version:2,details:{interest_tags:["construction"]}}))});
  assert.match(result.text,/Varias familias mencionan construcción/);assert.match(result.text,/no indica un nivel/);assert.equal(result.source_refs.length,3);assert.ok(result.source_refs.every(row=>row.source_type==="family_interview"&&row.version===2));
});
