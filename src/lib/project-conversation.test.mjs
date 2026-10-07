import test from "node:test";
import assert from "node:assert/strict";
import { projectConversation } from "./project-conversation.mjs";

const card={title:"Miramos semillas",purpose:"Elegir una pregunta",primary_competency_ids:["CYT_INDAGA"]};
test("conversación de proyecto neutraliza también el texto de apoyo y conserva su turno",async()=>{
  let request;
  const result=await projectConversation({card,knownContext:"Alba eligió una mesa",names:["Alba"],
    messages:[{id:"private_message_id",role:"teacher",text:"Alba usará la mesa del aula",source_turn:"turn_1",support_text:"Alba usará la mesa del aula"}],
    createProvider:plan=>{assert.equal(plan.model,"gpt-6-luna");assert.equal(plan.reasoning_effort,"medium");return{generate:async input=>{request=input;return{output:{question:"¿Cómo compartirán los materiales?",ready:false}};}};}});
  assert.equal(result.ready,false);
  assert.ok(!JSON.stringify(request.ai_context_bundle).includes("Alba"));
  assert.equal(request.ai_context_bundle.messages[0].source_turn,"turn_1");
  assert.equal(request.ai_context_bundle.messages[0].support_text,request.ai_context_bundle.messages[0].text);
  assert.ok(!JSON.stringify(request.ai_context_bundle).includes("private_message_id"));
});
test("tres respuestas o continuar cierran con código sin una llamada adicional",async()=>{
  const createProvider=()=>{throw new Error("No debe llamar IA");};
  for(const messages of [[{role:"teacher",text:"continuar"}],Array.from({length:3},()=>({role:"teacher",text:"Usaremos lo disponible"}))]){
    const result=await projectConversation({card,messages,knownContext:"",createProvider});
    assert.equal(result.ready,true);assert.equal(result.metadata.execution,"code");
  }
});
