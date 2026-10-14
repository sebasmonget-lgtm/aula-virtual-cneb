import {randomUUID} from "node:crypto";
import {versionTransaction,VersionConflictError} from "./version-integrity.mjs";
import {journeyFail} from "./annual-journey-contract.mjs";
import {projectChangeConversation} from "./project-conversation.mjs";
const WORKFLOW="annual_project_change_chat_v1";
const initial="¿Qué te gustaría ajustar en este proyecto? Cuéntame tu idea y la prepararemos juntas.";
export const publicProjectChat=row=>({id:row?.id??null,revision:row?.payload?.revision??0,messages:row?.payload?.messages??[{role:"assistant",text:initial}],
  ready:row?.payload?.answer?.ready??false,chips:row?.payload?.answer?.chips??[],pendingTurn:row?.payload?.pending_turn??null,status:row?.payload?.pending_turn?(row.payload.uncertain?"uncertain":"interrupted"):"ready"});
export async function loadProjectChat(db,classroomId,proposalId,id){
  const row=(await db.query(`select * from ai_pending_generations where classroom_id=$1 and workflow=$2 and payload->>'proposal_id'=$3
    and ($4::uuid is null or id=$4) order by created_at desc limit 1`,[classroomId,WORKFLOW,proposalId,id??null])).rows[0];
  if(id&&!row)journeyFail("not_found","Conversación no disponible en este aula.");return row;
}
export async function handleAnnualProjectChat({request,response,url,db,context,sources,curriculum,origin,send,readJson,load,protectedIds,createProvider}){
  const match=/^\/api\/annual-journey\/([0-9a-f-]{36})\/proposal-chat$/i.exec(url.pathname);if(!match)return false;
  const plan=await load(match[1],db,false);
  if(!["active","draft"].includes(plan.status))journeyFail("invalid_scope","Esta versión es histórica. Abre Mi año actual.");
  const body=request.method==="POST"?await readJson(request):null,proposalId=body?.proposalId??url.searchParams.get("proposalId");
  let card=plan.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId);if(!card)journeyFail("invalid_scope","El proyecto no pertenece a este año.");
  const projectId=body?.projectId??url.searchParams.get('projectId');
  let futureOnly=false;
  if(projectId){const project=(await db.query("select * from learning_experiences where id=$1 and classroom_id=$2 and source_proposal_id=$3 and status='active'",[projectId,context.id,proposalId])).rows[0];
    if(!project||plan.status!=='active'||project.details.experience_contract!==1)journeyFail('invalid_scope','Abre el proyecto confirmado para ajustar sus días futuros.');
    futureOnly=true;card={...card,title:project.title,purpose:project.purpose,primary_competency_ids:project.details.decisions.competency_ids};}
  if(request.method==="GET"){send(response,200,publicProjectChat(await loadProjectChat(db,context.id,proposalId)),origin);return true;}
  if(request.method!=="POST"){send(response,405,{error:"Acción no disponible."},origin);return true;}
  if(!futureOnly&&(await protectedIds(plan)).includes(proposalId))journeyFail("protected_proposal","Este proyecto conserva trabajo iniciado. Podemos ajustar solo los días futuros desde una nueva versión.");
  if(typeof body.text!=="string"||!body.text.trim()||body.text.length>1600||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(body.turnId??""))journeyFail("invalid_intent","Escribe un mensaje breve para Ayni.");
  let row,lease=randomUUID(),replay=false;
  await versionTransaction(db,`project-chat:${context.id}:${proposalId}`,async tx=>{
    row=await loadProjectChat(tx,context.id,proposalId,body.conversationId);
    const p=row?.payload??{proposal_id:proposalId,revision:0,messages:[{role:"assistant",text:initial}],completed_turns:[]};
    if(p.completed_turns.includes(body.turnId)){replay=true;return;}
    if(p.lease_until&&Date.parse(p.lease_until)>Date.now())throw new VersionConflictError("Ayni está respondiendo el mensaje anterior.");
    if(p.revision!==body.expectedConversationRevision)throw new VersionConflictError("La conversación cambió. Vuelve a abrirla para recuperar los mensajes.");
    if(p.pending_turn && (body.retry!==true||p.pending_turn!==body.turnId||p.uncertain&&body.acceptPotentialRepeat!==true))
      throw new VersionConflictError("La respuesta quedó interrumpida. Recupera la conversación antes de reintentar.");
    if(!p.pending_turn&&p.messages.filter(m=>m.role==="teacher").length>=20)journeyFail("invalid_intent","Revisa la propuesta con las decisiones guardadas antes de continuar.");
    const payload={...p,lease,lease_until:new Date(Date.now()+180000).toISOString(),pending_turn:body.turnId,
      messages:p.pending_turn?p.messages:[...p.messages,{role:"teacher",text:body.text.trim(),turn_id:body.turnId}],annual_plan_id:plan.id};
    if(!row){row=(await tx.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at)
      values($1,$2,$3,$4::jsonb,now(),now()+interval '1 year') returning *`,[randomUUID(),context.id,WORKFLOW,JSON.stringify(payload)])).rows[0];}
    else {await tx.query("update ai_pending_generations set payload=$1::jsonb where id=$2",[JSON.stringify(payload),row.id]);row={...row,payload};}
  });
  if(replay){send(response,200,publicProjectChat(row),origin);return true;}
  try{
    const answer=await projectChangeConversation({card,messages:row.payload.messages,curriculum,names:sources.names,futureOnly,createProvider});
    const payload={...row.payload,answer,pending_turn:null,lease_until:null,uncertain:false,revision:row.payload.revision+1,
      completed_turns:[...row.payload.completed_turns,body.turnId],messages:[...row.payload.messages,{role:"assistant",text:[answer.message,answer.question].filter(Boolean).join("\n\n")}]};
    const saved=(await db.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and payload->>'lease'=$3 returning *`,[JSON.stringify(payload),row.id,lease])).rows[0];
    if(!saved)throw new VersionConflictError();send(response,200,publicProjectChat(saved),origin);return true;
  }catch(error){await db.query(`update ai_pending_generations set payload=$1::jsonb where id=$2 and payload->>'lease'=$3`,[JSON.stringify({...row.payload,lease_until:null,uncertain:error?.name==="OpenAIProviderError"||error?.uncertain===true}),row.id,lease]);throw error;}
}
