import test from "node:test";
import assert from "node:assert/strict";
import { projectConversation, projectChangeConversation } from "./project-conversation.mjs";

const card={title:"Miramos semillas",purpose:"Elegir una pregunta",primary_competency_ids:["CYT_INDAGA"]};
test('cambiar proyecto recibe el contexto actual, distingue sus fuentes y conserva los registros',async()=>{
 const snapshot={source_fingerprint:'current',facts:[
  {key:'o1',kind:'observed',subject:'child_1',scope:'individual',competency_id:'CYT_INDAGA',support_text:'Ana comparó dos semillas.'},
  {key:'f1',kind:'family_report',support_text:'Su familia cuenta que cuida una planta.'},
  {key:'old',kind:'observed',uncertainty:'historical_source_preserved_for_trace',support_text:'Fuente anterior.'}]};
 snapshot.facts.push(...Array.from({length:30},(_,i)=>({key:'family'+i,kind:'family_report',support_text:'La familia aporta contexto.'})));
 const before=structuredClone(snapshot);let bundle;
 await projectChangeConversation({card,messages:[{role:'teacher',text:'Quiero explorar las semillas.'}],classroomSnapshot:snapshot,
  curriculum:[{id:'CYT_INDAGA'}],createProvider:()=>({generate:async request=>{bundle=request.ai_context_bundle;return{output:{message:'Podemos explorar las semillas.',question:'',ready:true,chips:[],competency_ids:['CYT_INDAGA']}};}})});
 assert.equal(bundle.classroom_context.source_fingerprint,'current');
 assert.equal(bundle.classroom_context.records.filter(row=>row.kind==='observed').length,1);
 assert.equal(bundle.classroom_context.records.filter(row=>row.kind==='family_report').length,6);
 assert.equal(bundle.classroom_context.recorded_observations,1);
 assert.equal(bundle.classroom_context.records[0].text,snapshot.facts[0].support_text);
 assert.match(bundle.task,/No pidas copiar un diagnóstico/);assert.deepEqual(snapshot,before);
});
test("conversación de proyecto conserva el texto de apoyo y conserva su turno",async()=>{
  let request;
  const result=await projectConversation({card,knownContext:"Alba eligió una mesa",names:["Alba"],
    messages:[{id:"private_message_id",role:"teacher",text:"Alba usará la mesa del aula",source_turn:"turn_1",support_text:"Alba usará la mesa del aula"}],
    createProvider:plan=>{assert.equal(plan.model,"gpt-6-luna");assert.equal(plan.reasoning_effort,"medium");return{generate:async input=>{request=input;return{output:{question:"¿Cómo compartirán los materiales?",ready:false}};}};}});
  assert.equal(result.ready,false);
  assert.ok(JSON.stringify(request.ai_context_bundle).includes("Alba"));
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
test("confirmed card conditions reach conversation with student prose intact",async()=>{
 let bundle;
 await projectConversation({card:{...card,materials:["Papel","Crayones de Alba"],supports:["Familias voluntarias, sin compras"],children_actions:["Observar sin tocar ni alimentar animales"],invitation:"¿Qué observar?",flexibility:"Conservar preguntas sin respuesta"},names:["Alba"],knownContext:"Visita ya acordada",messages:[],createProvider:()=>({generate:async request=>{bundle=request.ai_context_bundle;return{output:{question:"¿Cómo compartirán sus hallazgos?",ready:false}};}})});
 assert.ok(JSON.stringify(bundle).includes("Alba"));assert.equal(bundle.card.materials[0],"Papel");assert.match(bundle.card.supports[0],/sin compras/);assert.match(bundle.card.children_actions[0],/sin tocar/);assert.match(bundle.known_context,/ya acordada/);
});
