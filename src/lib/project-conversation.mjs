import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const schema = { id: "project-conversation-v1", type: "object", additionalProperties: false,
  required: ["question", "ready"], properties: { question: { type: "string" }, ready: { type: "boolean" } } };

export async function projectConversation({ card, knownContext, messages, names = [], createProvider = createAIProviderForPlan }) {
  const turns = messages.filter(message => message.role === "teacher");
  if (turns.length >= 3 || /hazlo con lo que|continuar|preparar proyecto/i.test(turns.at(-1)?.text ?? ""))
    return { question: "Con estas decisiones podemos preparar el proyecto.", ready: true, metadata: { execution: "code" } };
  const clean = value => neutralizeAssessmentText(String(value ?? ""), names);
  const plan = resolveAIExecutionPlan({ workflow: "project_conversation" });
  const result = await createProvider(plan).generate(buildProviderRequest("project_conversation", {
    card: { title: clean(card.title), purpose: clean(card.purpose), competency_ids: card.primary_competency_ids,
      invitation:clean(card.invitation),children_actions:(card.children_actions??[]).map(clean),
      materials:(card.materials??[]).map(clean),supports:(card.supports??[]).map(clean),flexibility:clean(card.flexibility) },
    known_context: clean(knownContext), messages: messages.map(message => ({ role: message.role, text: clean(message.text),
      ...(message.source_turn ? { source_turn: message.source_turn, support_text: clean(message.support_text ?? message.text) } : {}) })),
    task: "Haz una sola pregunta breve sobre decisiones que cambien cómo desarrollar este proyecto: espacios, materiales, participación familiar o cierre. No vuelvas a preguntar título, propósito, competencias, edad, fechas ni datos ya conocidos. Incluye un ejemplo cotidiano. Normalmente bastan una o dos respuestas, máximo tres. Si ya hay información suficiente, termina. No generes preguntas orientadoras, criterios ni actividades." }, plan, schema));
  const output = result.output;
  if (typeof output?.question !== "string" || output.question.length > 500 || typeof output.ready !== "boolean"
      || clean(output.question) !== output.question || (!output.ready && !output.question.trim()))
    throw new Error("No pudimos preparar la pregunta. Puedes continuar con lo que ya conoces.");
  return { ...output, metadata: { model: plan.model, reasoning_effort: plan.reasoning_effort, usage: result.provider_metadata?.usage } };
}

const changeSchema={id:"project-change-conversation-v1",type:"object",additionalProperties:false,required:["message","question","ready","chips","competency_ids"],properties:{
  message:{type:"string",maxLength:700},question:{type:"string",maxLength:350},ready:{type:"boolean"},chips:{type:"array",maxItems:3,items:{type:"string",maxLength:100}},
  competency_ids:{type:"array",maxItems:5,items:{type:"string"}}}};
export async function projectChangeConversation({card,messages,curriculum,names=[],futureOnly=false,createProvider=createAIProviderForPlan}){
  const clean=value=>neutralizeAssessmentText(String(value??""),names);
  const routing=resolveAIExecutionPlan({workflow:"project_conversation"});
  const result=await createProvider(routing).generate(buildProviderRequest("project_conversation",{
    project:{title:clean(card.title),purpose:clean(card.purpose),invitation:clean(card.invitation),children_actions:(card.children_actions??[]).map(clean),materials:(card.materials??[]).map(clean),competency_ids:card.primary_competency_ids},
    conversation:messages.map(message=>({role:message.role,text:clean(message.text)})),curriculum:{competency_cards:curriculum},
    ...(futureOnly?{execution_scope:"Este proyecto ya tiene actividades preparadas. Solo ajusta el desarrollo de los días futuros sin registros, manteniendo propósito, competencias y fechas del proyecto confirmado. Explica este límite si pide otro propósito o competencias. Conserva lo trabajado y las evidencias."}:{}),
    task:"Eres Ayni, aliada de una profesora de Inicial. Conversa para personalizar SOLO este proyecto. Recuerda todas las decisiones docentes, sus materiales y espacios confirmados; distingue sugerencias de disponibilidad real. Permite cambiar propósito, enfoque, experiencias, materiales, espacios y resultado, sin cambiar fechas ni otros proyectos. Reconoce el pedido y pregunta una sola cosa breve si falta información importante, sin interrogatorio: normalmente bastan una o dos respuestas docentes. Pregunta solo por una condición imprescindible que falte, especialmente materiales o espacio; con información suficiente di «Ya tengo lo necesario para preparar la propuesta», ready=true y question vacío. No busques conservar el tema original si la docente quiere cambiarlo. Las fechas las conserva el servidor y no son una pregunta de la conversación. No repitas preguntas contestadas. Las competencias solicitadas necesitan acciones y capacidades pertinentes del CNEB; si no tienen sentido para el pedido, explícalo de forma amable y ofrece una alternativa, sin forzar su incorporación. competency_ids contiene solo competencias que propones trabajar tras este diálogo, no niveles ni evaluaciones. No generes aún la propuesta ni actividades. message es breve, question no se repite en message; chips hasta tres respuestas cortas. Con suficiente información, ready=true y question vacío. Nunca inventes observaciones ni inventario."},routing,changeSchema));
  const answer=result.output,allowed=new Set(curriculum.map(card=>card.id));
  if(typeof answer?.message!=="string"||!answer.message.trim()||answer.message.length>700||typeof answer.question!=="string"||answer.question.length>350||typeof answer.ready!=="boolean"||
    !Array.isArray(answer.chips)||answer.chips.length>3||answer.chips.some(value=>typeof value!=="string"||value.length>100)||
    !Array.isArray(answer.competency_ids)||answer.competency_ids.length>5||answer.competency_ids.some(id=>!allowed.has(id))||
    clean(answer.message)!==answer.message||clean(answer.question)!==answer.question||futureOnly&&answer.competency_ids.some(id=>!card.primary_competency_ids.includes(id)))throw new Error("No pudimos recuperar una respuesta válida. Tus decisiones siguen guardadas.");
  return {...answer,metadata:{model:routing.model,usage:result.provider_metadata?.usage}};
}
