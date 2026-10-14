import {createHash, randomUUID} from "node:crypto";
import {appendJourneyIntent, applyAnnualJourneyChanges} from "./annual-journey-service.mjs";
import {journeyFail, validateAnnualJourney} from "./annual-journey-contract.mjs";
import {annualJourneySafeText, annualJourneyCurriculumTerms} from "./annual-journey-privacy.mjs";
import {effectiveCalendarFingerprint} from "./annual-journey-calendar.mjs";
import {assertRevision, expectedRevision, versionTransaction, VersionConflictError} from "./version-integrity.mjs";

const hash = proposal => createHash("sha256").update(JSON.stringify(proposal)).digest("hex");
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

/** A model cannot move a slot, alter another proposal, or replace annual decisions. */
export function assertProposalPreviewScope(before, after, proposalId, protectedIds = []) {
  const original = before.proposed_experiences.find(row => row.proposal_id === proposalId);
  const changed = after.proposed_experiences.find(row => row.proposal_id === proposalId);
  if (!original || !changed) journeyFail("invalid_scope", "Elige un proyecto de este año.");
  if (protectedIds.includes(proposalId)) journeyFail("protected_proposal", "Este proyecto conserva trabajo iniciado. Elige un proyecto futuro.");
  const stable=plan=>Object.fromEntries(Object.entries(plan).filter(([key])=>!["proposed_experiences","pending_changes","change_history","metrics","pedagogical_review","organization_criteria"].includes(key)));
  if (!same(stable(before),stable(after)) ||
    !same(before.pending_changes.filter(change=>change.proposal_id!==proposalId),after.pending_changes.filter(change=>change.proposal_id!==proposalId)) ||
    !same(before.proposed_experiences.filter(row=>row.proposal_id!==proposalId),after.proposed_experiences.filter(row=>row.proposal_id!==proposalId)) ||
    !same(before.resolved_calendar,after.resolved_calendar) ||
    ["planned_start_date","planned_end_date","planned_instructional_days","duration_weeks","period","teacher_protected"].some(key=>!same(original[key],changed[key])) ||
    ["everyday_opportunities","evidence_interpretations","experience_context","available_experiences","classroom_snapshot"].some(key=>!same(before[key],after[key])))
    journeyFail("invalid_scope", "El cambio debe conservar las fechas y los demás proyectos.");
}

export function publicProposalPreview(preview) {
  if (!preview) return null;
  const before=preview.before, after=preview.proposal.proposed_experiences.find(row=>row.proposal_id===preview.proposal_id);
  const labels={title:"Título",purpose:"Lo que buscamos",children_actions:"Lo que harán los niños",materials:"Materiales",opportunities:"Oportunidades para observar",supports:"Apoyos",invitation:"Invitación al juego"};
  return {id:preview.id,proposalId:preview.proposal_id,request:preview.request,proposal:after,
    changes:Object.entries(labels).filter(([key])=>!same(before[key],after[key])).map(([,label])=>label)};
}

/** Saved in existing private draft metadata; never trust a candidate sent by the browser. */
export async function handleAnnualProposalPreview({request,response,url,db,context,sources,curriculum,calendar,
  origin,send,readJson,load,write,protectedIds,loadFreshSources,loadFreshCalendar,createProvider,resolvePlan}) {
  const match=/^\/api\/annual-journey\/([0-9a-f-]{36})\/proposal-preview(?:\/(accept|discard))?$/i.exec(url.pathname);
  if (!match) return false;
  const [,id,action]=match;
  if(request.method==="GET"&&!action){
    const row=await load(id),saved=row.generation_metadata?.proposal_change_preview;
    const proposalId=url.searchParams.get("proposalId");
    const valid=saved&&saved.proposal_id===proposalId&&saved.base_hash===hash(row.proposal);
    send(response,200,{planId:id,revision:Number(row.revision),preview:valid?publicProposalPreview(saved):null,
      pendingRequest:(row.proposal.pending_changes??[]).filter(change=>change.proposal_id===proposalId).map(change=>change.text).join("\n")},origin);
    return true;
  }
  if(request.method!=="POST") {send(response,405,{error:"Acción no disponible."},origin);return true;}
  const body=await readJson(request),revision=expectedRevision(body.expectedRevision);
  const base=await load(id);assertRevision(base,revision);
  const ensureFresh=async(tx,row)=>{
    const freshSources=await loadFreshSources(tx),freshCalendar=await loadFreshCalendar(tx);
    if(freshSources.fingerprint!==row.proposal.classroom_snapshot.source_fingerprint ||
      effectiveCalendarFingerprint(freshCalendar)!==row.proposal.resolved_calendar.calendar_fingerprint)
      throw new VersionConflictError("Cambió la información del aula o el calendario. Actualiza Mi año antes de continuar.");
  };
  let preview;
  if(!action){
    if(!base.proposal.resolved_calendar?.projects?.length)journeyFail("preparation_only","Primero termina de preparar Mi año.");
    const proposalId=body.proposalId;
    assertProposalPreviewScope(base.proposal,base.proposal,proposalId,await protectedIds(base));
    if(sources.fingerprint!==base.proposal.classroom_snapshot.source_fingerprint || effectiveCalendarFingerprint(calendar)!==base.proposal.resolved_calendar.calendar_fingerprint)
      throw new VersionConflictError("Actualiza Mi año con la información actual antes de pedir el cambio.");
    const working={...base.proposal,pending_changes:base.proposal.pending_changes.filter(change=>change.proposal_id!==proposalId)};
    const requested=appendJourneyIntent(working,body.text,proposalId);
    const safeText=annualJourneySafeText(body.text,sources.names,annualJourneyCurriculumTerms(curriculum));
    if(!safeText)journeyFail("private_text","Escribe el cambio sin nombres ni datos privados.");
    const candidate=await applyAnnualJourneyChanges({...requested,pending_changes:requested.pending_changes.map(change=>change===requested.pending_changes.at(-1)?{...change,text:safeText}:change)},
      {context,curriculum,proposalId,protectedIds:await protectedIds(base),createProvider,resolvePlan});
    candidate.change_history.at(-1).changes=[requested.pending_changes.at(-1)];
    assertProposalPreviewScope(base.proposal,candidate,proposalId,await protectedIds(base));
    validateAnnualJourney(candidate,curriculum,{requireCoverage:true});
    preview={id:randomUUID(),proposal_id:proposalId,request:body.text.trim(),base_hash:hash(base.proposal),
      before:base.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId),proposal:candidate};
  }
  const result=await versionTransaction(db,`annual:${context.school_year_id}`,async tx=>{
    const row=await load(id,tx);assertRevision(row,revision);
    let metadata={...row.generation_metadata};
    if(action){
      preview=metadata.proposal_change_preview;
      if(!preview||preview.id!==body.previewId||preview.base_hash!==hash(row.proposal))
        throw new VersionConflictError("La propuesta cambió. Genera y revisa una nueva antes de aplicarla.");
      if(action==="accept"){
        await ensureFresh(tx,row);
        assertProposalPreviewScope(row.proposal,preview.proposal,preview.proposal_id,await protectedIds(row,tx));
        validateAnnualJourney(preview.proposal,curriculum,{requireCoverage:true});
        // Existing write/CAS path preserves immutable active versions and pedagogical protections.
        const next=await write(row,preview.proposal,tx);
        // Keep metadata as the audit of the generated candidate; the content hash invalidates replay.
        return {planId:id,revision:Number(next.revision),preview:null};
      }
      delete metadata.proposal_change_preview;
    }else{
      await ensureFresh(tx,row);
      assertProposalPreviewScope(row.proposal,preview.proposal,preview.proposal_id,await protectedIds(row,tx));
      metadata.proposal_change_preview=preview;
    }
    const saved=(await tx.query(`update annual_plans set generation_metadata=$1::jsonb,updated_at=now()
      where id=$2 and status='draft' and revision=$3 returning revision`,[JSON.stringify(metadata),id,revision])).rows[0];
    if(!saved)throw new VersionConflictError();
    return {planId:id,revision:Number(saved.revision),preview:action?null:publicProposalPreview(preview)};
  });
  send(response,200,result,origin);return true;
}
