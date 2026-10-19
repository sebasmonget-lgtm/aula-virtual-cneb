import test from "node:test";
import assert from "node:assert/strict";
import { activityPedagogicalBlocks, diagnosticPedagogicalBlocks } from "./pedagogical-blocks.mjs";

test("explicit fields produce modular guidance and only a real criterion opens an observation moment",()=>{
  const details={meaningful_situation:"Construimos",child_actions:"Prueban distintas bases",mediation:"Permite comparar",closure_or_continuity:"Comparten lo ocurrido",expected_evidence:"Modifica la base"};
  const empty=activityPedagogicalBlocks(details,[],[]);assert.equal(empty.length,3);assert.ok(empty.every(block=>!block.observations));
  const blocks=activityPedagogicalBlocks(details,[],[{id:"criterion",competency_v4_id:"CYT_INDAGA",criterion_text:"Modifica su propuesta"}]);
  assert.equal(blocks[1].expected_actions,details.child_actions);assert.equal(blocks[1].observations[0].expected_evidence,details.expected_evidence);
  assert.ok(blocks.every(block=>!block.examples));assert.equal(blocks[0].observations,undefined);
});
test("literal legacy instructions are not parsed into invented sections or examples",()=>{
  assert.deepEqual(activityPedagogicalBlocks({},["Por ejemplo: texto literal"],[]),[{id:"instruction-1",title:"Actividad · 1",instruction:"Por ejemplo: texto literal"}]);
});
test("diagnostic blocks preserve the exact observed aspect and examples",()=>{
  const blocks=diagnosticPedagogicalBlocks({teacher_instructions:"Ofrece materiales",aspects:[{id:"compare",label:"Comparan",prompt:"Qué compara",examples:["Pone dos piedras juntas"]}]});
  assert.equal(blocks[0].observations,undefined);assert.deepEqual(blocks[1].examples,["Pone dos piedras juntas"]);assert.equal(blocks[1].observations[0].id,"compare");
});


test("explicit stages provide one moment each, retaining introductions, original fields and criterion provenance",()=>{
  const details={meaningful_situation:"Situación formal",child_actions:"Pueden participar a su manera. Inicio: Eligen una semilla. Desarrollo: Comparan las semillas. Cierre: Comparten un hallazgo.",mediation:"Respeta sus tiempos. Inicio: Ofrece semillas. Desarrollo: Pregunta qué cambia. Cierre: Recupera sus ideas.",closure_or_continuity:"Continuidad formal",expected_evidence:"Una comparación registrada"};
  const original=structuredClone(details);
  const blocks=activityPedagogicalBlocks(details,[],[{id:"criterion-real",competency_v4_id:"CYT_INDAGA",criterion_text:"Compara las semillas"}]);
  assert.deepEqual(blocks.map(block=>block.instruction),["Respeta sus tiempos.\n\nOfrece semillas.","Pregunta qué cambia.","Recupera sus ideas."]);
  assert.deepEqual(blocks.map(block=>block.expected_actions),["Pueden participar a su manera.\n\nEligen una semilla.","Comparan las semillas.","Comparten un hallazgo."]);
  assert.deepEqual(blocks.filter(block=>block.observations).map(block=>block.id),["development"]);
  assert.equal(blocks[1].observations[0].id,"criterion-real");assert.equal(blocks[1].observations[0].competency_id,"CYT_INDAGA");
  assert.deepEqual(details,original);
});

test('an explicitly planned closing observation retains its criterion only in closure',()=>{
 const criteria=[{id:'criterion',competency_v4_id:'COM_LECTURA',criterion_text:'Comenta lo que le gustó.'}];
 const details={child_actions:'Inicio: Miran. Desarrollo: Escuchan. Cierre: Comentan.',mediation:'Inicio: Invita. Desarrollo: Lee. Cierre: Escucha.',evidence_opportunities:'Cierre: Un comentario sobre el cuento.'};
 const blocks=activityPedagogicalBlocks(details,[],criteria);
 assert.deepEqual(blocks.filter(block=>block.observations?.length).map(block=>block.id),['closure']);
 assert.equal(blocks.at(-1).observations[0].id,'criterion');
});
