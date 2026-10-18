import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {createPilotClassroom} from "./pilot-onboarding-service.mjs";
import {defaultInitialStage} from "./annual-plan-calendar.mjs";
import {generationFixture} from "./test-fixtures/annual-journey.mjs";
import {assertProposalPreviewScope} from "./annual-proposal-preview.mjs";
import {handleAnnualJourneyRoutes} from "../../scripts/annual-journey-routes.mjs";

test("chat de cambio: revisión privada antes de aplicar, CAS, propiedad y protección",async t=>{
  const db=new PGlite();
  try{
    for(const file of (await readdir(new URL("../../local-db/migrations/",import.meta.url))).filter(file=>file.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(`../../local-db/migrations/${file}`,import.meta.url),"utf8"));
    const teacherId=randomUUID(),created=await createPilotClassroom(db,teacherId,{teacherName:"QA chat",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    const context={id:created.classroomId,school_year_id:created.schoolYearId,curriculum_version_id:(await db.query("select id from curriculum_versions limit 1")).rows[0].id,
      year:2026,age:5,available_resources:[],calendar:{initial_stage:defaultInitialStage()}};
    let calls=0,invalidPatch=false,invalidChat=false,chatRequests=[];
    const route=async(path,body,user=teacherId)=>{
      let result;
      await handleAnnualJourneyRoutes({request:{method:body===undefined?"GET":"POST"},response:{},url:new URL(`http://localhost/api/annual-journey/${path}`),db,teacherId:user,
        readJson:async()=>body,send:(_r,status,data)=>{result={status,data};},annualPlanningContext:async()=>context,annualDocumentContext:()=>({teacher_name:"QA"}),
        createProvider:()=>({generate:async request=>{
          calls++;
          if(request.output_schema.id==='project-change-conversation-v1'){
            chatRequests.push(request.ai_context_bundle);
            return{output:{message:invalidChat?'Respuesta inválida':'Podemos usar botellas recicladas para explorar.',question:request.ai_context_bundle.conversation.filter(m=>m.role==='teacher').length===1?'¿Lo hacemos en el patio?':'',ready:request.ai_context_bundle.conversation.filter(m=>m.role==='teacher').length>1,chips:[],competency_ids:[invalidChat?'NON_CNEB':request.ai_context_bundle.curriculum.competency_cards[0].id]}};
          }
          if(request.workflow==="annual_journey_review")return{output:{issues:[]}};
          if(request.workflow==="annual_journey_repair"){
            assert.ok((request.ai_context_bundle.changes??[]).every(change=>typeof change.text==='string'));
            const rows=request.ai_context_bundle.proposals,cards=request.ai_context_bundle.curriculum.competency_cards;
            return{output:{replacements:rows.map((row,index)=>({proposal_id:invalidPatch?randomUUID():row.proposal_id,change_reason:"Pedido docente",...generationFixture(cards).proposals[index],
              opportunities:generationFixture(cards).everyday_opportunities.slice(0,2).map(({moment,...item})=>{void moment;return item;}),title:"Exploramos la naturaleza",purpose:"Explorar hojas y compartir lo que descubrimos.",children_actions:["Mirar hojas del patio.","Contar lo que ven."],materials:["Hojas del patio","Papel"]}))}};
          }
          const fixture=generationFixture(request.ai_context_bundle.curriculum.competency_cards);
          return{output:{...fixture,proposals:fixture.proposals.map(row=>({...row,opportunities:fixture.everyday_opportunities.slice(0,2).map(({moment,...item})=>{void moment;return item;})}))}};
        }})});return result;
    };
    const start=await route("start");
    const initial=await route("generate",{teacherIdeas:"",sourceFingerprint:start.data.snapshot.source_fingerprint});assert.equal(initial.status,201,JSON.stringify(initial.data));
    let plan=initial.data;
    const proposalId=plan.proposal.proposed_experiences.find(row=>row.planned_start_date>="2026-10-19").proposal_id;
    const baseline=structuredClone(plan.proposal);let countBefore=calls;
    const reordered=Object.fromEntries(Object.entries(baseline).reverse().map(([key,value])=>[key,value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value]));
    assert.doesNotThrow(()=>assertProposalPreviewScope(baseline,reordered,proposalId),'JSONB key order is not a change of dates or scope');
    const read=async()=> (await db.query("select * from annual_plans where id=$1",[plan.id])).rows[0];
    let preview;
    await t.test('diálogo multitur no muta el año; recuperación, idempotencia, CAS y competencia oficial',async()=>{
      const original=structuredClone(plan.proposal),firstId=randomUUID(),before=calls;
      const first=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Quiero materiales reciclados.',turnId:firstId,expectedConversationRevision:0});assert.equal(first.status,200,JSON.stringify(first.data));
      const again=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Quiero materiales reciclados.',turnId:firstId,expectedConversationRevision:0});assert.equal(again.data.id,first.data.id);assert.equal(calls,before+1);
      const second=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Sí, en el patio y con canales.',turnId:randomUUID(),conversationId:first.data.id,expectedConversationRevision:1});assert.equal(second.status,200);
      assert.equal(second.data.messages.filter(m=>m.role==='teacher').length,2);assert.equal(second.data.ready,true);
      assert.deepEqual((await route(`${plan.id}/proposal-chat?proposalId=${proposalId}`)).data,second.data);assert.equal(calls,before+2);
      assert.equal(chatRequests.at(-1).conversation.filter(m=>m.role==='teacher').length,2);
      assert.equal((await route(`${plan.id}/proposal-chat?proposalId=${proposalId}`,undefined,randomUUID())).status,404);
      assert.equal((await route(`${plan.id}/proposal-chat`,{proposalId,text:'Otro pedido',turnId:randomUUID(),conversationId:first.data.id,expectedConversationRevision:1})).status,409);
      assert.deepEqual((await read()).proposal,original);
      invalidChat=true;const failedId=randomUUID();
      const failed=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Más exploración',turnId:failedId,conversationId:first.data.id,expectedConversationRevision:2});assert.equal(failed.status,422);
      const recovered=(await route(`${plan.id}/proposal-chat?proposalId=${proposalId}`)).data;assert.equal(recovered.pendingTurn,failedId);assert.equal(recovered.messages.filter(m=>m.role==='teacher').length,3);
      invalidChat=false;const retried=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Más exploración',turnId:failedId,conversationId:first.data.id,expectedConversationRevision:2,retry:true});assert.equal(retried.status,200);assert.equal(retried.data.messages.filter(m=>m.role==='teacher').length,3);
      assert.deepEqual((await read()).proposal,original);
      const generated=await route(`${plan.id}/proposal-preview`,{proposalId,expectedRevision:plan.revision,conversationId:first.data.id,conversationRevision:3});assert.equal(generated.status,200,JSON.stringify(generated.data));plan=await read();
      const count=calls,same=await route(`${plan.id}/proposal-preview`,{proposalId,expectedRevision:plan.revision,conversationId:first.data.id,conversationRevision:3});assert.equal(same.data.preview.id,generated.data.preview.id);assert.equal(calls,count);
      const newer=await route(`${plan.id}/proposal-chat`,{proposalId,text:'Añadir papel',turnId:randomUUID(),conversationId:first.data.id,expectedConversationRevision:3});assert.equal(newer.status,200);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:plan.revision,previewId:generated.data.preview.id})).status,409,'new conversation decisions invalidate the stored candidate');
      assert.equal((await route(`${plan.id}/proposal-preview?proposalId=${proposalId}`)).data.preview,null);
      // A later explicit generation replaces the stale private candidate.
    });
    countBefore=calls;
    await t.test("generar y reabrir conserva la propuesta hasta aceptar",async()=>{
      const result=await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Más naturaleza. DNI: 12345678"});
      assert.equal(result.status,200);preview=result.data;plan=await read();
      assert.deepEqual(plan.proposal,baseline);assert.equal(preview.preview.proposal.title,"Exploramos la naturaleza");
      assert.equal(calls,countBefore+1); // Existing scoped repair; deterministic review needs no extra model call.
      assert.equal((await route(`${plan.id}/proposal-preview?proposalId=${proposalId}`)).data.preview.id,preview.preview.id);
      assert.equal(calls,countBefore+1);
    });
    await t.test("un cliente ajeno o un candidato inventado no puede aplicar",async()=>{
      assert.equal((await route(`${plan.id}/proposal-preview?proposalId=${proposalId}`,undefined,randomUUID())).status,404);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:plan.revision,previewId:preview.preview.id},randomUUID())).status,404);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:plan.revision,previewId:randomUUID(),proposal:{title:"Manipulado"}})).status,409);
      assert.deepEqual((await read()).proposal,baseline);
    });
    await t.test("cancelar retira solo la vista previa; confirmar conserva el original",async()=>{
      const result=await route(`${plan.id}/proposal-preview/discard`,{expectedRevision:plan.revision,previewId:preview.preview.id});assert.equal(result.status,200);
      plan=await read();assert.deepEqual(plan.proposal,baseline);assert.equal((await route(`${plan.id}/proposal-preview?proposalId=${proposalId}`)).data.preview,null);
      assert.equal((await route(`${plan.id}/confirm`,{expectedRevision:plan.revision,interpretationsReviewed:true,futureCoverageAcknowledged:true})).status,200);
      const original=await read();assert.equal(original.status,"active");
      const copy=await route(`${plan.id}/copy`,{expectedRevision:original.revision});assert.equal(copy.status,201);plan=copy.data;
    });
    const originalId=initial.data.id;
    await t.test("editar pedido reemplaza el candidato y no toca fechas ni otros proyectos",async()=>{
      const before=structuredClone(plan.proposal);
      const first=await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Más conversación"});assert.equal(first.status,200);
      const second=await route(`${plan.id}/proposal-preview`,{expectedRevision:first.data.revision,proposalId,text:"Más naturaleza"});assert.equal(second.status,200);
      assert.notEqual(first.data.preview.id,second.data.preview.id);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:first.data.revision,previewId:first.data.preview.id})).status,409);
      const accepted=await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:second.data.revision,previewId:second.data.preview.id,proposal:{title:"Ignorado"}});assert.equal(accepted.status,200);
      plan=await read();assert.equal(plan.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId).title,"Exploramos la naturaleza");
      assert.deepEqual(plan.proposal.proposed_experiences.filter(row=>row.proposal_id!==proposalId),before.proposed_experiences.filter(row=>row.proposal_id!==proposalId));
      assert.deepEqual(plan.proposal.resolved_calendar,before.resolved_calendar);
      assert.deepEqual((await db.query("select proposal from annual_plans where id=$1",[originalId])).rows[0].proposal,baseline);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:second.data.revision,previewId:second.data.preview.id})).status,409);
    });
    await t.test("cambio concurrente invalida el candidato, sin sobrescribir el borrador",async()=>{
      const generated=await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Incluir familias"});assert.equal(generated.status,200);
      const other=plan.proposal.proposed_experiences.find(row=>row.proposal_id!==proposalId&&row.planned_start_date>="2026-10-19").proposal_id;
      const kept=await route(`${plan.id}/keep`,{expectedRevision:generated.data.revision,proposalId:other});assert.equal(kept.status,200);
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:generated.data.revision,previewId:generated.data.preview.id})).status,409);
      plan=await read();assert.equal((await route(`${plan.id}/proposal-preview?proposalId=${proposalId}`)).data.preview,null);
    });
    await t.test("respuesta IA fuera de alcance no se guarda ni se aplica",async()=>{
      const before=structuredClone(plan.proposal);invalidPatch=true;
      const result=await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Más juego"});assert.equal(result.status,422);
      assert.deepEqual((await read()).proposal,before);invalidPatch=false;
    });
    await t.test("trabajo vinculado después de generar impide aceptar",async()=>{
      const generated=await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Más naturaleza"});assert.equal(generated.status,200);
      await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,source_proposal_id)
        values($1,$2,'project','QA iniciado','QA','2026-10-01','2026-10-30','draft','{}'::jsonb,$3,$4)`,[randomUUID(),context.id,originalId,proposalId]);
      const before=(await read()).proposal;
      assert.equal((await route(`${plan.id}/proposal-preview/accept`,{expectedRevision:generated.data.revision,previewId:generated.data.preview.id})).status,422);
      assert.deepEqual((await read()).proposal,before);
      const prior=calls;plan=await read();assert.equal((await route(`${plan.id}/proposal-preview`,{expectedRevision:plan.revision,proposalId,text:"Más movimiento"})).status,422);assert.equal(calls,prior);
    });
    await t.test("guardas de alcance rechazan movimientos y decisiones globales",()=>{
      const before=plan.proposal,changed=structuredClone(before);
      changed.resolved_calendar.projects[0].starts_on="2026-03-01";
      assert.throws(()=>assertProposalPreviewScope(before,changed,proposalId),error=>error.reason==="invalid_scope");
      const global=structuredClone(before);global.family_collaboration=["Cambio global no autorizado"];
      assert.throws(()=>assertProposalPreviewScope(before,global,proposalId),error=>error.reason==="invalid_scope");
    });
  }finally{await db.close();}
});
