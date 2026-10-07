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
