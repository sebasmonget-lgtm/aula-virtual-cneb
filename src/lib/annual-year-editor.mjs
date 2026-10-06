import { journeyFail } from "./annual-journey-contract.mjs";
import { horizonAssignments } from "./annual-experience-context.mjs";

// Display only: preserve the literal stored title, including historical numbering/dates.
export const annualDisplayTitle = title => String(title ?? "").replace(/^\s*\d{1,2}\s*[.)·:-]\s*/u, "").replace(/\s*·\s*\d{1,2}\/\d{1,2}\s*[–-]\s*\d{1,2}\/\d{1,2}\s*$/u, "").trim();
export const proposalCompetencies = row => [...new Set([...(row.primary_competency_ids ?? []), ...(row.opportunities ?? []).map(o=>o.competency_id)])];
export function annualCoverage(plan, curriculum = plan.curriculum_reference ?? []) {
  const everyday=new Set((plan.everyday_opportunities ?? []).map(o=>o.competency_id));
  return curriculum.map(card=>{
    const rows=(plan.proposed_experiences ?? []).filter(row=>proposalCompetencies(row).includes(card.id));
    return { id:card.id,name:card.name ?? card.official_name,total:rows.length,
      periods:[1,2,3,4].map(p=>rows.filter(row=>row.period===`Bimestre ${p}`).length),
      proposal_ids:rows.map(row=>row.proposal_id),everyday:everyday.has(card.id) };
  });
}
export function coverageDelta(before, after) {
  const next=new Map(annualCoverage(after).map(card=>[card.id,card]));
  return annualCoverage(before).map(card=>({id:card.id,name:card.name,before:card.total,after:next.get(card.id)?.total ?? 0,
    missing:!(next.get(card.id)?.total || next.get(card.id)?.everyday)})).filter(card=>card.before!==card.after || card.missing);
}
export function rowInSlot(row, slot) {
  return {...row,experience_type:row.experience_type ?? "project",slot_id:slot.slot_id,period:slot.period,
    month:Number(slot.starts_on.slice(5,7)),duration_weeks:slot.duration_weeks,planned_start_date:slot.starts_on,
    planned_end_date:slot.ends_on,planned_instructional_days:slot.instructional_dates.length,instructional_dates:[...slot.instructional_dates]};
}
export function libraryRow(row) {
  const copy={...row};
  for(const key of ["slot_id","period","month","duration_weeks","planned_start_date","planned_end_date","planned_instructional_days","instructional_dates"]) delete copy[key];
  return copy;
}
export function assignAnnualSlots(plan, slots, rows, library=plan.available_experiences ?? []) {
  const byId=new Map(rows.map(row=>[row.proposal_id,row]));
  const proposed_experiences=slots.filter(slot=>slot.proposal_id).map(slot=>rowInSlot(byId.get(slot.proposal_id),slot));
  const initial=plan.resolved_calendar.initial_stage;
  const assignments=horizonAssignments(initial,slots);
  return {...plan,editor_version:3,proposed_experiences,available_experiences:library,
    resolved_calendar:{...plan.resolved_calendar,version:3,projects:slots,assignments}};
}
/** Structural edits only. Slot dates are read from the stored, server-validated calendar.
 * @param {object} plan
 * @param {{kind:string,proposalId:string,targetSlotId?:string}} action
 * @param {{protectedIds?:string[],today?:string}} [options]
 */
export function editAnnualStructure(plan, action, { protectedIds=[], today="" }={}) {
  if(!action || !["place","remove"].includes(action.kind))journeyFail("invalid_action","Elige colocar o retirar una propuesta.");
  if(plan.editor_version!==3 || plan.resolved_calendar.projects.length!==15) journeyFail("editor_upgrade_required","Organiza primero este borrador en los 15 tramos.");
  const slots=plan.resolved_calendar.projects.map(slot=>({...slot})), rows=[...plan.proposed_experiences], library=[...(plan.available_experiences ?? [])];
  const source=slots.find(slot=>slot.proposal_id===action.proposalId), incoming=rows.find(row=>row.proposal_id===action.proposalId) ?? library.find(row=>row.proposal_id===action.proposalId);
  if(!incoming) journeyFail("invalid_scope","La propuesta no pertenece a este año ni a su Biblioteca.");
  const target=action.targetSlotId==null?null:slots.find(slot=>slot.slot_id===action.targetSlotId);
  const displacedId=target?.proposal_id;
  const affectedIds=[...new Set([incoming.proposal_id,displacedId].filter(Boolean))];
  if(action.kind!=="remove" && !target) journeyFail("invalid_slot","Suelta la propuesta en uno de los tramos del año.");
  const blocked=row=>row&&(row.teacher_protected || protectedIds.includes(row.proposal_id) || today && row.planned_start_date<today);
  if(blocked(incoming) || blocked(rows.find(row=>row.proposal_id===target?.proposal_id)) || target && today && target.starts_on<today)
    journeyFail("protected_proposal","Este cambio afectaría una propuesta pasada, protegida o vinculada a trabajo. Elige un tramo futuro disponible.");
  if(action.kind==="remove") {
    if(!source) journeyFail("invalid_scope","Esta propuesta ya está en Biblioteca.");
    source.proposal_id=null; library.push(libraryRow(incoming));
  } else if(source) {
    const displaced=target.proposal_id;target.proposal_id=source.proposal_id;source.proposal_id=displaced;
  } else {
    const outgoing=rows.find(row=>row.proposal_id===target.proposal_id);
    if(outgoing)library.push(libraryRow(outgoing));
    target.proposal_id=incoming.proposal_id;
  }
  const activeIds=new Set(slots.map(slot=>slot.proposal_id));
  const next=assignAnnualSlots(plan,slots,[...rows,...library],library.filter(row=>!activeIds.has(row.proposal_id)));
  return {...next,change_history:[...(plan.change_history ?? []),{kind:"structural",action,affected_proposal_ids:affectedIds,source_slot_id:source?.slot_id ?? null,target_slot_id:target?.slot_id ?? null,displaced_proposal_id:displacedId ?? null,applied_at:new Date().toISOString(),ai_calls:0}]};
}
export function annualCreationContext(plan) {
  const coverage=annualCoverage(plan);
  return {proposals:plan.proposed_experiences.map(row=>({title:annualDisplayTitle(row.title),period:row.period,competency_ids:proposalCompetencies(row)})),
    coverage,lower_presence:coverage.filter(card=>card.total<=1).map(card=>({id:card.id,total:card.total,everyday:card.everyday})),
    everyday_opportunities:plan.everyday_opportunities,teacher_decisions:plan.classroom_snapshot.facts.filter(f=>f.kind==="teacher_decision").map(f=>f.ai_support_text===undefined?f.support_text:f.ai_support_text ?? "Información privada omitida"),
    library:(plan.available_experiences ?? []).map(row=>({title:annualDisplayTitle(row.title),competency_ids:proposalCompetencies(row)})),
    available_slots:plan.resolved_calendar.projects.filter(slot=>!slot.proposal_id).map(({slot_id,period,duration_weeks})=>({slot_id,period,duration_weeks}))};
}
