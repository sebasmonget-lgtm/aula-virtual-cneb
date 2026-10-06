import { preparationFingerprint } from "./preparation-jobs.mjs";
import { VersionConflictError } from "./version-integrity.mjs";

/** Reuses the domain handlers; request is an internal, allowlisted adapter, never a client URL. */
export function preparationExecutor({db,request,pending,prepareDocument,partitionDocuments}) {
  return async (job,checkpoint)=>{
    const p=structuredClone(job.payload);
    if(job.kind==="document_export"){
      const item=p.items.find(item=>!item.artifact_id);
      if(item){const artifact=await prepareDocument(job,item);if(!artifact)throw new Error("Documento no disponible.");item.artifact_id=artifact.id;item.byte_length=artifact.byte_length;await checkpoint(p);return false;}
      p.parts=partitionDocuments(p.items.map(item=>({id:item.artifact_id,byte_length:item.byte_length})));
      p.stage="ready";await checkpoint(p);return true;
    }
    const call=async(path,body,method,extra)=>request(job,path,body,method,extra);
    const generatedCall=async(path,body)=>{
      if(p.attempt_pending)throw Object.assign(new Error("Uncertain provider result"),{uncertain:true});
      p.attempt_pending=true;await checkpoint(p);
      try { const result=await call(path,body);p.attempt_pending=false;return result; }
      catch(error){error.uncertain=error.status==null || error.status>=500;throw error;}
    };
    if(job.kind==="project"){
      const plan=(await db.query(`select * from annual_plans where id=$1 and classroom_id=$2 and status='active'`,[job.source_id,job.classroom_id])).rows[0];
      if(!plan || Number(plan.revision)!==Number(job.source_revision))throw new VersionConflictError("Mi año cambió. Revisa la planificación antes de preparar el proyecto.");
      const proposal=plan.proposal.proposed_experiences.find(row=>row.proposal_id===p.proposal_id);
      if(!proposal)throw new VersionConflictError("La propuesta ya no pertenece a Mi año.");
      if(!p.project_id){const result=await call("/api/project-flow/start",{annualPlanId:plan.id,proposalId:p.proposal_id});p.project_id=result.experience.id;p.stage="criteria";await checkpoint(p);return false;}
      const {experience:row}=await call(`/api/project-flow/${p.project_id}`);
      if(row.details.dependents && (row.details.decisions?.additional_context??"") !== (p.additional_context??""))
        throw new VersionConflictError("Este proyecto fue preparado con otro contexto. Conserva la preparación o solicita una nueva versión desde Mi año.");
      if(row.status==="active" || row.details.stage==="map_review"){p.stage="ready";p.attempt_pending=false;await checkpoint(p);return true;}
      const decisions={context_summary:proposal.rationale,purpose:proposal.purpose,competency_ids:proposal.primary_competency_ids,additional_context:p.additional_context};
      if(!row.details.dependents){await generatedCall(`/api/project-flow/${row.id}/dependents`,{decisions,expectedRevision:row.revision});p.stage="calendar";await checkpoint(p);return false;}
      // An interrupted write is recovered by inspecting the persisted row before considering another model call.
      if(p.stage==="criteria"){p.attempt_pending=false;p.stage="calendar";await checkpoint(p);return false;}
      if(p.stage==="calendar"){
        const calendar=await call(`/api/project-flow/${row.id}/calendar`);
        if(calendar.selection.status!=="confirmed")await call(`/api/project-flow/${row.id}/calendar`,{
          selectedDates:calendar.days.filter(day=>day.selected&&day.is_instructional).map(day=>day.date),
          exclusions:Object.fromEntries(calendar.days.filter(day=>day.is_instructional&&!day.selected).map(day=>[day.date,day.exclusion_reason||"No se utilizará en este proyecto"])),confirm:true},"PUT");
        p.stage="master";await checkpoint(p);return false;
      }
      await generatedCall(`/api/project-flow/${row.id}/master`,{dependents:row.details.dependents,expectedRevision:row.revision});
      p.stage="ready";await checkpoint(p);return true;
    }
    const project=(await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='active'`,[job.source_id,job.classroom_id])).rows[0];
    if(!project || Number(project.revision)!==Number(job.source_revision) || preparationFingerprint(project.details)!==job.input_fingerprint)
      throw new VersionConflictError("La versión del proyecto cambió. Conservamos lo preparado.");
    const item=p.items.find(item=>!item.activity_id);
    if(!item)return true;
    const existing=(await db.query(`select id,details from activities where experience_id=$1 and
      (preparation_item_id=$2 or details->>'route_item_id'=$3) and status in ('draft','active') order by version desc limit 1`,[project.id,item.id,item.route_item_id])).rows[0];
    if(existing){item.activity_id=existing.id;item.stage="ready";p.attempt_pending=false;await checkpoint(p);return p.items.every(item=>item.activity_id);}
    if(!item.generated){
      const generated=await generatedCall("/api/ai/activities/generate",{experienceId:project.id,routeItemId:item.route_item_id});
      item.generated=generated;item.pending=await pending.get(generated.generation_id);item.stage="save";
      if(!item.pending)throw Object.assign(new Error("Missing generation checkpoint"),{uncertain:true});
      await checkpoint(p);return false;
    }
    // The durable result outlives the short handoff TTL. Restoring its token does not call the model.
    await pending.set(item.generated.generation_id,{...item.pending,createdAt:Date.now()});
    const saved=await call("/api/activities",{experienceId:project.id,generationId:item.generated.generation_id,
      proposal:item.generated.proposal,workshopProposal:item.generated.workshop_proposal,occursOn:item.date},"POST",{preparationItemId:item.id});
    item.activity_id=saved.id;item.stage="ready";delete item.generated;delete item.pending;await checkpoint(p);
    return p.items.every(item=>item.activity_id);
  };
}
