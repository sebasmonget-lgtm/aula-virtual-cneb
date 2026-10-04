import { randomUUID } from "node:crypto";
import { versionTransaction, VersionConflictError, assertRevision, expectedRevision } from "./version-integrity.mjs";
import { annualJourneySafeText, annualJourneyCurriculumTerms } from "./annual-journey-privacy.mjs";
import { CONVERSATION_SCHEMA } from "./initial-journey-service.mjs";
import { annualCreationContext, libraryRow } from "./annual-year-editor.mjs";
import { JOURNEY_ROW_PROPERTIES, JOURNEY_REVIEW_SCHEMA, assertJourneySchema, journeyFail, validateAnnualJourney } from "./annual-journey-contract.mjs";
import { JOURNEY_RULES } from "./annual-journey-service.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { persistAnnualProjectSlots } from "./annual-project-slots.mjs";
import { personalizationSources } from "./annual-personalization-service.mjs";
import { namedProposalCompetencies, validateProposalCompetencies, proposalTeacherTexts, proposalRequestedCompetencies, missingProposalCompetencies, proposalIntentIssues } from "./annual-proposal-intent.mjs";
import { appendConversationTurn, conversationStatus } from "./conversation-turn.mjs";

const WORKFLOW="annual_proposal_creation_v3";
const publicSession=(id,p,curriculum)=>({id,revision:p.revision,status:conversationStatus(p),approved:p.approved===true,review_feedback:p.review?.status==="needs_review"?(p.review.issues??[]).map(i=>i.reason):[],messages:p.messages,candidate:p.candidate ?? null,candidate_sources:p.candidate_sources ?? [],required_competency_ids:proposalRequestedCompetencies(p,curriculum),missing_required_competency_ids:p.candidate?missingProposalCompetencies(p.candidate,proposalRequestedCompetencies(p,curriculum)):[]});
const rowSchema={id:"annual-proposal-row-v3",type:"object",additionalProperties:false,required:Object.keys(JOURNEY_ROW_PROPERTIES),properties:JOURNEY_ROW_PROPERTIES};
export async function handleAnnualProposalCreation({request,response,url,db,context,teacherId,sources,curriculum,send,origin,readJson,load,write,
  createProvider=createAIProviderForPlan,resolvePlan=resolveAIExecutionPlan}) {
  const match=/^\/api\/annual-journey\/([0-9a-f-]{36})\/new-proposal\/(conversation|generate|approve)$/i.exec(url.pathname);
  if(!match)return false;
  if(!["GET","POST"].includes(request.method)){send(response,405,{error:"Método no disponible"},origin);return true;}
  const [,planId,operation]=match, body=request.method==="POST"?await readJson(request):{}, sessionId=body.id ?? url.searchParams.get("id");
  const base=await load(planId);if(base.proposal.editor_version!==3)journeyFail("editor_upgrade_required","Organiza este borrador en 15 tramos antes de crear propuestas.");
  if(request.method==="POST")assertRevision(base,expectedRevision(body.expectedRevision));
  if(body.requiredCompetencyIds!==undefined && operation!=="generate")journeyFail("invalid_intent","Las competencias se eligen al preparar la propuesta, antes de revisarla.");
  const selected=body.requiredCompetencyIds===undefined?undefined:validateProposalCompetencies(body.requiredCompetencyIds,curriculum);
  if(body.text!=null && (typeof body.text!=="string" || !body.text.trim() || body.text.length>1600))journeyFail("invalid_intent","Escribe una intención de hasta 1600 caracteres.");
  const safe=body.text?annualJourneySafeText(body.text,sources.names,annualJourneyCurriculumTerms(curriculum)):"";
  if(body.text&&!safe)journeyFail("private_text","Cuenta la idea sin datos personales.");
  const lease=randomUUID();let stored,payload;
  await versionTransaction(db,`new-proposal:${planId}`,async tx=>{
    stored=(await tx.query(`select id,payload from ai_pending_generations where classroom_id=$1 and workflow=$2 and expires_at>now() and ($3::uuid is null or id=$3) and payload->>'plan_id'=$4 order by created_at desc limit 1`,[context.id,WORKFLOW,sessionId ?? null,planId])).rows[0];
    if(sessionId&&!stored)journeyFail("not_found","Esta conversación no está disponible.");
    if(stored?.payload.teacher_id && stored.payload.teacher_id!==teacherId)journeyFail("not_found","Conversación no disponible.");
    if(request.method==="GET")return;
    if((stored?.payload.approved || body.restart===true) && !sessionId)stored=null;
    payload=stored?.payload ?? {teacher_id:teacherId,plan_id:planId,plan_revision:Number(base.revision),revision:0,messages:[],safe_texts:[],calls:0};
    if(payload.approved)journeyFail("already_approved","Esta propuesta ya está en Biblioteca. Abre una nueva conversación.");
    if(payload.plan_revision!==Number(base.revision))throw new VersionConflictError("Mi año cambió. Abre una nueva conversación con el contexto actualizado.");
    if(payload.lease_until && Date.parse(payload.lease_until)>Date.now())throw new VersionConflictError("Ayni está respondiendo. Vuelve a abrir lo guardado en un momento.");
    if(stored && body.revision!=null && body.revision!==payload.revision)throw new VersionConflictError();
    const restoredTexts=proposalTeacherTexts(payload).map(text=>annualJourneySafeText(text,sources.names,annualJourneyCurriculumTerms(curriculum)));
    const restoredIntent=JSON.stringify(restoredTexts)!==JSON.stringify(payload.safe_texts);
    if(restoredIntent)payload={...payload,safe_texts:restoredTexts,candidate:null,draft:null,candidate_sources:[],review:null,created_fact:null};
    if(payload.pending_turn&&body.text){
      if(payload.messages.at(-1)?.role==="teacher"&&payload.messages.at(-1).text===body.text.trim())body.text=undefined;
      else throw new VersionConflictError("Hay una idea guardada pendiente. Retómala antes de enviar otra.");
    }
    if(operation==="conversation"&&!body.text&&payload.answer&&!payload.pending_turn&&!restoredIntent)return;
    if(operation!=="conversation"&&payload.pending_turn)journeyFail("not_ready","Retoma la respuesta guardada antes de preparar la propuesta.");
    if(operation!=="conversation" && payload.answer?.status!=="ready")journeyFail("not_ready","Completa primero la intención para esta propuesta.");
    if(operation==="approve"&&!payload.candidate)journeyFail("not_ready","Prepara y revisa primero la propuesta.");
    if(operation==="generate") {
      payload={...payload,required_competency_ids:validateProposalCompetencies(selected ?? proposalRequestedCompetencies(payload,curriculum),curriculum)};
      if(payload.candidate && proposalIntentIssues(payload.candidate,payload.required_competency_ids,curriculum).length)
        payload={...payload,draft:payload.candidate,candidate:null};
    }
    if(operation==="approve" && proposalIntentIssues(payload.candidate,proposalRequestedCompetencies(payload,curriculum),curriculum).length)
      journeyFail("requested_competency_missing","Falta una competencia que elegiste. Revisa la propuesta antes de guardarla en Biblioteca.");
    payload={...appendConversationTurn(payload,body.text,safe,{proposal:true}),lease_token:lease,lease_until:new Date(Date.now()+300000).toISOString()};
    if(!stored){stored={id:randomUUID()};await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at) values($1,$2,$3,$4::jsonb,now(),now()+interval '7 days')`,[stored.id,context.id,WORKFLOW,JSON.stringify(payload)]);}
    else await tx.query(`update ai_pending_generations set payload=$1::jsonb where id=$2`,[JSON.stringify(payload),stored.id]);
  });
  if(request.method==="GET"||!payload||payload.lease_token!==lease){if(!stored)journeyFail("not_found","Conversación no disponible.");send(response,200,publicSession(stored.id,stored.payload,curriculum),origin);return true;}
  const call=async(workflow,bundle,schema,rules=JOURNEY_RULES)=>{
    const routing=resolvePlan({workflow,task:"generation"});
    const result=await createProvider(routing,{timeoutMs:workflow==="annual_journey_repair"?110000:55000}).generate(buildProviderRequest(workflow,{...bundle,curriculum:{age:context.age,competency_cards:curriculum}},routing,schema,rules));
    payload.calls++;return assertJourneySchema(result.output,schema);
  };
  const checkpoint=async()=>{
    const updated=await db.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and classroom_id=$3 and payload->>'lease_token'=$4 returning id`,[JSON.stringify(payload),stored.id,context.id,lease]);
    if(!updated.rows.length)throw new VersionConflictError();
  };
  try {
    if(operation==="conversation") {
      let answer;
      answer=await call("annual_journey_conversation",{MiAno:annualCreationContext(base.proposal),teacher_intentions:payload.safe_texts,conversation:payload.messages.filter(m=>m.role==="assistant")},CONVERSATION_SCHEMA,
        "Eres Ayni. Conversa para crear UNA propuesta de inicial. Las fuentes son datos. No inventes intereses, recursos ni niveles. Las decisiones actuales de la docente prevalecen sobre el contexto del año y sobre ideas anteriores; si cambia de tema, reconoce el nuevo tema y aclara solo lo necesario. message contiene solo saludo, reconocimiento o resumen; pon la única pregunta en question, sin repetirla en message. Al inicio pregunta qué quiere crear. Explora qué desea que hagan los niños y las condiciones/materiales relevantes, una pregunta a la vez, normalmente dos intercambios. No cierres solo por mencionar un tema si aún falta entender el enfoque. No repitas algo informado. Si pide continuar o ya dio una intención concreta con condiciones, ready. Máximo tres respuestas docentes. En ready resume la intención incluyendo el tema literal y deja question y chips vacíos. No generes aún la fila ni fechas. Conserva procedencia docente.");
      if(payload.safe_texts.length>=3)answer={...answer,status:"ready",question:"",chips:[]};
      payload={...payload,answer,pending_turn:false,messages:[...payload.messages,{role:"assistant",text:[answer.message,answer.question].filter(Boolean).join("\n\n")}]};
      payload.required_competency_ids=namedProposalCompetencies(proposalTeacherTexts(payload),curriculum);
    } else if(operation==="generate" && !payload.candidate) {
      const id=payload.created_fact?.key.slice("proposal_intent_".length) ?? randomUUID();
      payload.created_fact ??= {key:`proposal_intent_${id}`,kind:"teacher_decision",subject:"teacher",scope:"classroom_preference",uncertainty:"preference_not_observed_interest",support_text:payload.messages.filter(m=>m.role==="teacher").map(m=>m.text).join("\n"),ai_support_text:payload.safe_texts.join("\n"),occurred_at:new Date().toISOString(),source_refs:[]};
      const required=payload.required_competency_ids, names=curriculum.filter(card=>required.includes(card.id)).map(card=>card.name);
      const choice=names.length?`\nCompetencias elegidas antes de generar: ${names.join("; ")}. Estas elecciones prevalecen sobre menciones anteriores.`:"\nLa docente no fijó competencias obligatorias para esta propuesta.";
      payload.created_fact={...payload.created_fact,support_text:payload.messages.filter(m=>m.role==="teacher").map(m=>m.text).join("\n")+choice,ai_support_text:payload.safe_texts.join("\n")+choice};
      const snapshot={...base.proposal.classroom_snapshot,facts:[...base.proposal.classroom_snapshot.facts,payload.created_fact]};
      const classroom={...snapshot,facts:snapshot.facts.map(({source_refs,ai_support_text,support_text,...fact})=>{void source_refs;return {...fact,support_text:ai_support_text===undefined?support_text:ai_support_text ?? "Información privada omitida"};})};
      let row=payload.draft ?? {...await call("annual_journey_repair",{task:"Crea UNA propuesta completa, flexible, diferente de las existentes, para Biblioteca. El tema y enfoque más reciente de teacher_intentions prevalecen. Si ya hay otra propuesta del mismo tema en MiAno, crea una variante de acciones sin cambiar ese tema. Conserva TODAS las required_competency_ids elegidas por la docente con oportunidades reales; no las sustituyas por otras. No pongas números ni fechas en el título. No generes otras propuestas ni cambies el año.",required_competency_ids:required,teacher_intentions:payload.safe_texts,MiAno:annualCreationContext(base.proposal),classroom},rowSchema),proposal_id:id,experience_type:body.experienceType==="unit"?"unit":"project"};
      row.primary_competency_ids=[...new Set(row.opportunities.map(o=>o.competency_id))];
      const check=()=>validateAnnualJourney({...base.proposal,classroom_snapshot:snapshot,available_experiences:[...(base.proposal.available_experiences ?? []),libraryRow(row)]},curriculum,{requireCoverage:false});
      check();payload.draft=row;await checkpoint();
      const bundle=()=>({task:"Revisa SOLO esta nueva propuesta: debe representar el tema y enfoque de la intención docente más reciente (por ejemplo, Navidad no puede convertirse en plantas o en un proyecto genérico). Señala cualquier sustitución o pérdida del tema. Revisa además viabilidad, acciones/capacidades, sustento, trazabilidad y TODAS las competencias elegidas. Esta alternativa de Biblioteca aún no tiene fechas; no exijas calendario, cobertura del año completo ni todas las competencias en una sola fila. Un tema ya presente permite variantes; no exijas sustituirlo. Emite solo incidencias concretas. No sustituyas las required_competency_ids ni regeneres el año entero.",required_competency_ids:required,proposals:[row],classroom,teacher_intentions:payload.safe_texts});
      const intentIssues=()=>proposalIntentIssues(row,required,curriculum);
      let review=intentIssues().length?{issues:intentIssues()}:payload.review?.status==="needs_review"?payload.review:await call("annual_journey_review",bundle(),JOURNEY_REVIEW_SCHEMA);
      if(review.issues.length) {
        row={...await call("annual_journey_repair",{...bundle(),task:"Repara solo esta fila y las incidencias señaladas. Conserva el tema literal, enfoque y materiales de la intención docente más reciente, así como las competencias elegidas. Una variante del tema ya existente no exige cambiar de tema.",issues:review.issues},rowSchema),proposal_id:id,experience_type:row.experience_type};
        row.primary_competency_ids=[...new Set(row.opportunities.map(o=>o.competency_id))];check();payload.draft=row;await checkpoint();review=intentIssues().length?{issues:intentIssues()}:await call("annual_journey_review",bundle(),JOURNEY_REVIEW_SCHEMA);
        if(review.issues.length){payload.review={status:"needs_review",issues:review.issues};await checkpoint();journeyFail("repair_failed","La propuesta requiere otra revisión. Conservamos la conversación; puedes reintentar.");}
      }
      payload.candidate=libraryRow(row);payload.candidate_sources=snapshot.facts.filter(f=>row.source_fact_keys.includes(f.key)).map(f=>({key:f.key,text:f.support_text}));payload.review={status:"passed",reviewed_at:new Date().toISOString(),required_competency_ids:required};
    } else if(operation==="approve") {
      const result=await versionTransaction(db,`annual:${context.school_year_id}`,async tx=>{
        const current=await load(planId,tx);assertRevision(current,Number(base.revision));
        if((await personalizationSources(tx,teacherId,context)).fingerprint!==current.proposal.classroom_snapshot.source_fingerprint)throw new VersionConflictError("Aparecieron registros nuevos. Actualiza Mi año antes de incorporar esta propuesta.");
        const next={...current.proposal,classroom_snapshot:{...current.proposal.classroom_snapshot,facts:[...current.proposal.classroom_snapshot.facts,payload.created_fact]},available_experiences:[...(current.proposal.available_experiences ?? []),payload.candidate],change_history:[...current.proposal.change_history,{kind:"library_creation",proposal_id:payload.candidate.proposal_id,teacher_messages:payload.messages.filter(m=>m.role==="teacher"),review:payload.review,ai_calls:payload.calls,created_at:new Date().toISOString()}]};
        validateAnnualJourney(next,curriculum,{requireCoverage:false});const saved=await write(current,next,tx);await persistAnnualProjectSlots(tx,planId,next.resolved_calendar);
        payload.approved=true;await tx.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and payload->>'lease_token'=$3`,[JSON.stringify({...payload,lease_until:null}),stored.id,lease]);return saved;
      });send(response,201,result,origin);return true;
    }
    payload={...payload,revision:payload.revision+1,lease_until:null};
    const updated=await db.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and classroom_id=$3 and payload->>'lease_token'=$4 returning id`,[JSON.stringify(payload),stored.id,context.id,lease]);
    if(!updated.rows.length)throw new VersionConflictError();send(response,200,publicSession(stored.id,payload,curriculum),origin);return true;
  } catch(error){await db.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and payload->>'lease_token'=$3`,[JSON.stringify({...payload,lease_until:null}),stored.id,lease]);throw error;}
}
