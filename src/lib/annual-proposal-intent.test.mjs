import test from "node:test";
import assert from "node:assert/strict";
import { namedProposalCompetencies, validateProposalCompetencies, proposalRequestedCompetencies, missingProposalCompetencies, proposalIntentIssues } from "./annual-proposal-intent.mjs";
import { annualJourneySafeText } from "./annual-journey-privacy.mjs";

const cards=[{id:"CYT_INDAGA",name:"Indaga mediante métodos científicos para construir sus conocimientos"},
  {id:"COM_ARTE",name:"Crea proyectos desde los lenguajes artísticos"},
  {id:"COM_LECTURA",name:"Lee diversos tipos de textos escritos en su lengua materna"}];
test("conserva las competencias nombradas explícitamente, con alias o nombres oficiales",()=>{
  assert.deepEqual(namedProposalCompetencies(["Quiero priorizar Indaga y Crea en una unidad de plantas."],cards),["CYT_INDAGA","COM_ARTE"]);
  assert.deepEqual(namedProposalCompetencies([`Quiero trabajar ${cards[1].name}.`],cards),["COM_ARTE"]);
  assert.deepEqual(namedProposalCompetencies(["Competencias: CYT_INDAGA y COM_ARTE"],cards),["CYT_INDAGA","COM_ARTE"]);
});
test("los verbos y temas cotidianos no asignan automáticamente competencias",()=>{
  assert.deepEqual(namedProposalCompetencies(["Crea una unidad de plantas. Podemos leer y dibujar."],cards),[]);
  assert.deepEqual(namedProposalCompetencies(["Quiero trabajar la creatividad y la indagación."],cards),[]);
  assert.deepEqual(namedProposalCompetencies(["No tenemos evidencias de Indaga ni Crea."],cards),[]);
});
test("una negación posterior retira la sugerencia y una selección explícita prevalece",()=>{
  const texts=["Quiero trabajar Crea.","Ya no quiero trabajar Crea. Quiero priorizar Indaga."];
  assert.deepEqual(namedProposalCompetencies(texts,cards),["CYT_INDAGA"]);
  assert.deepEqual(proposalRequestedCompetencies({safe_texts:texts,required_competency_ids:["COM_LECTURA"]},cards),["COM_LECTURA"]);
  assert.deepEqual(proposalRequestedCompetencies({safe_texts:texts,required_competency_ids:[]},cards),[]);
});
test("valida pertenencia curricular y límite real de cinco oportunidades",()=>{
  assert.deepEqual(validateProposalCompetencies(["COM_ARTE","COM_ARTE"],cards),["COM_ARTE"]);
  assert.deepEqual(validateProposalCompetencies([],cards),[]);
  for(const ids of ["COM_ARTE",null,["UNKNOWN"],Array(6).fill("COM_ARTE")])assert.throws(()=>validateProposalCompetencies(ids,cards),e=>e.reason==="invalid_competency");
});
test("no basta agregar un ID: exige oportunidad y competencia principal de la fila",()=>{
  const row={proposal_id:"row",primary_competency_ids:["CYT_INDAGA","COM_ARTE"],opportunities:[{competency_id:"CYT_INDAGA"}]};
  assert.deepEqual(missingProposalCompetencies(row,["CYT_INDAGA","COM_ARTE"]),["COM_ARTE"]);
  assert.match(proposalIntentIssues(row,["COM_ARTE"],cards)[0].reason,/Crea proyectos.*oportunidad real/);
  row.opportunities.push({competency_id:"COM_ARTE"});
  assert.deepEqual(proposalIntentIssues(row,["CYT_INDAGA","COM_ARTE"],cards),[]);
});
test("vocabulario curricular no se oculta como persona, sin exponer nombres ni contactos",()=>{
  const result=annualJourneySafeText("Quiero priorizar Indaga y Crea. Aurelio quiere visitar a Mariana. Correo: docente@example.com",["Mariana"],cards.map(c=>c.name));
  assert.match(result,/Indaga y Crea/);assert.ok(!result.includes("Aurelio"));assert.ok(!result.includes("Mariana"));assert.ok(!result.includes("docente@example.com"));
  assert.deepEqual(proposalRequestedCompetencies({safe_texts:["Quiero priorizar [persona] y [persona]"],messages:[{role:"teacher",text:"Quiero priorizar Indaga y Crea"}]},cards),["CYT_INDAGA","COM_ARTE"]);
});
test("Navidad y Perú conservan el tema de la propuesta sin liberar nombres de alumnos",()=>{
 const text=annualJourneySafeText("Quiero un proyecto de Navidad con las familias en Perú. Camila y Aurelio dibujarán.",["Camila"],cards.map(c=>c.name));
 assert.match(text,/Navidad/);assert.match(text,/Perú/);assert.ok(!text.includes("Camila"));assert.ok(!text.includes("Aurelio"));
 assert.deepEqual(namedProposalCompetencies(["Quiero priorizar Lenguajes artísticos."],cards),["COM_ARTE"]);
 // A word in the allowed vocabulary that is an actual child's name is still neutralized first.
 assert.ok(!annualJourneySafeText("Luna dibujó estrellas",["Luna"]).includes("Luna"));
});


test("propósito y contexto pedagógico conservan verbos sin liberar nombres conocidos",()=>{
  const result=annualJourneySafeText("Explorar y compartir decisiones. Tenemos bloques. Aurelio visitará el huerto con Luna.",["Luna"],cards.map(card=>card.name));
  assert.match(result,/Explorar y compartir decisiones/);assert.match(result,/Tenemos bloques/);assert.ok(!result.includes("Aurelio"));assert.ok(!result.includes("Luna"));
});
test("annual context cannot make a new card ready without its own teacher intention", async () => {
  const {proposalConversationAnswer}=await import("./annual-proposal-intent.mjs");
  const ready={status:"ready",message:"Bloques y hojas del año",question:"",chips:[]};
  const guarded=proposalConversationAnswer({messages:[{role:"assistant",text:ready.message}],safe_texts:[]},ready);
  assert.equal(guarded.status,"needs_clarification");assert.match(guarded.question,/crear/);assert.equal(guarded.message.includes("Bloques"),false);
  assert.equal(proposalConversationAnswer({messages:[{role:"teacher",text:"Visitar la granja para observar animales"}],safe_texts:["Visitar la granja"]},ready),ready);
});
test("recovered initial card prompt stays distinct from annual intentions after a reply",async()=>{
 const {proposalConversationMessages}=await import("./annual-proposal-intent.mjs");
 const p={messages:[{role:"assistant",text:"Annual blocks"},{role:"teacher",text:"Granja"},{role:"assistant",text:"Granja acordada"}]};
 const shown=proposalConversationMessages(p);assert.match(shown[0].text,/crear/);assert.deepEqual(shown.slice(1),p.messages.slice(1));assert.equal(p.messages[0].text,"Annual blocks");
});
