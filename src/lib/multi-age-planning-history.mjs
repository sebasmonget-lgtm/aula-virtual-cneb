import {curriculumHash} from './classroom-curriculum-scope.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {periodEditState} from './period-edit-guard.mjs';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>curriculumHash(canonical(v));

export async function annualProjectLinks(db,planId){
 const rows=(await db.query(`select id as project_id,details->>'annual_slot_id' as slot_id from learning_experiences
  where annual_plan_id=$1 and details->>'curriculum_contract_version'='2' and status='active'
  union select project_id,slot_id from multi_age_annual_project_links where annual_plan_id=$1 order by slot_id,project_id`,[planId])).rows;
 if(new Set(rows.map(r=>r.slot_id)).size!==rows.length)throw new VersionConflictError('Hay dos proyectos vinculados al mismo tramo.');
 return rows;
}
export async function annualPreservation(db,scope,base,proposal){
 if(!base)return {links:[],fingerprint:null,protectedSlots:[]};
 const links=await annualProjectLinks(db,base.id),protectedSlots=[];
 const periods=(await db.query('select id,starts_on::text,ends_on::text from evaluation_periods where school_year_id=$1',[scope.school_year_id])).rows;
 const closed=[];for(const p of periods)if((await periodEditState(db,scope.id,p.id)).closed)closed.push(p);
 for(const slot of base.document_context.calendar.projects){
  const reason=links.some(l=>l.slot_id===slot.slot_id)?'prepared':closed.some(p=>p.starts_on<=slot.ends_on&&p.ends_on>=slot.starts_on)?'closed':null;
  if(!reason)continue;
  protectedSlots.push({slotId:slot.slot_id,reason});
  const original=base.proposal.proposals.find(r=>r.slot_id===slot.slot_id),replacement=proposal.proposals.find(r=>r.slot_id===slot.slot_id);
  if(hash(original)!==hash(replacement))throw new VersionConflictError(reason==='prepared'?'Este tramo ya tiene actividades preparadas. Conserva su propuesta y edita el proyecto para las próximas actividades.':'Reabre el bimestre antes de cambiar sus tramos de Mi año.');
 }
 const projects=[];
 for(const link of links){
  const project=(await db.query('select id,details,title,purpose from learning_experiences where id=$1 and classroom_id=$2',[link.project_id,scope.id])).rows[0];
  if(!project)throw new VersionConflictError('Un proyecto dejó de pertenecer a este año.');
  const latest=(await db.query('select id,version,fingerprint from multi_age_project_versions where project_id=$1 order by version desc limit 1',[project.id])).rows[0]??null;
  const activities=(await db.query('select id,details,occurs_on::text,status from activities where experience_id=$1 order by id',[project.id])).rows;
  projects.push({...link,project,latest,activities});
 }
 return {links,protectedSlots,fingerprint:hash({basePlanId:base.id,baseRevision:Number(base.revision),projects,closed:closed.map(p=>p.id).sort()})};
}
