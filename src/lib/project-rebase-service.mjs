import { randomUUID } from "node:crypto";
import { assertRevision,VersionConflictError,versionTransaction } from "./version-integrity.mjs";
import { lockClassroomSchedule,limaToday } from "./activity-schedule-integrity.mjs";
import { jsonValuesDiffer } from "./project-draft-changes.mjs";
import { annualCalendarDay } from "./annual-plan-schedule.mjs";

export function projectSourceDiscrepancy(project,source,slot){
  const previous=project.details?.source_proposal_snapshot;
  if(!previous)return {changed:project.annual_plan_id!==source.planId,reason:"Revisa la preparación anterior y la versión vigente de Mi año."};
  const fields=["title","purpose","experience_type","primary_competency_ids","opportunities","children_actions","materials","supports","rationale"];
  const changed=fields.some(field=>jsonValuesDiffer(previous[field],source.proposal[field])) ||
    annualCalendarDay(project.starts_on)!==slot.starts_on || annualCalendarDay(project.ends_on)!==slot.ends_on;
  return {changed,reason:changed?"Mi año cambió esta propuesta o sus fechas. El proyecto preparado conserva la versión anterior.":null};
}
export async function assertProjectUnstarted(tx,project,today=limaToday()){
  const date=project.starts_on instanceof Date?project.starts_on.toISOString().slice(0,10):String(project.starts_on).slice(0,10);
  if(date<today)throw new VersionConflictError("Este proyecto ya pertenece al pasado. Su preparación se conserva.");
  const recorded=(await tx.query(`select 1 from activities a join learning_experiences e on e.id=a.experience_id
    where (e.lineage_id=$1 or e.parent_project_id in (select id from learning_experiences where lineage_id=$1))
    and (exists(select 1 from evidences evidence where evidence.activity_id=a.id)
      or exists(select 1 from ordinary_observations o where o.activity_id=a.id)
      or exists(select 1 from class_schedule_entries s join daily_execution_logs l on l.schedule_entry_id=s.id
        where s.activity_id=a.id and (l.status<>'planned' or l.actual_started_at is not null or l.actual_ended_at is not null))) limit 1`,[project.lineage_id])).rows.length;
  if(recorded)throw new VersionConflictError("El proyecto tiene trabajo registrado. Conserva esa versión y elige un tramo futuro.");
}
export async function assertAnnualDescendant(tx,newPlanId,oldPlanId,classroomId){
  const result=(await tx.query(`with recursive ancestry as (
    select id,supersedes_plan_id from annual_plans where id=$1 and classroom_id=$3 and status='active'
    union all select p.id,p.supersedes_plan_id from annual_plans p join ancestry a on p.id=a.supersedes_plan_id where p.classroom_id=$3)
    select id from ancestry where id=$2`,[newPlanId,oldPlanId,classroomId])).rows;
  if(!result.length)throw new VersionConflictError("El año nuevo no continúa la planificación que originó este proyecto.");
}
export async function rebaseProject(db,teacherId,source,annual,revision){
  return versionTransaction(db,`experience:${source.lineage_id}`,async tx=>{
    await lockClassroomSchedule(tx,source.classroom_id);
    const current=(await tx.query(`select e.* from learning_experiences e join classrooms c on c.id=e.classroom_id and c.teacher_id=$2
      where e.id=$1 and e.status='active' for update of e`,[source.id,teacherId])).rows[0];
    if(!current)throw new VersionConflictError("El proyecto ya cambió.");assertRevision(current,revision);
    await assertProjectUnstarted(tx,current);await assertAnnualDescendant(tx,annual.plan.id,current.annual_plan_id,current.classroom_id);
    if(current.source_proposal_id!==annual.proposalId || current.type!==annual.source.experience_type)throw new VersionConflictError("La propuesta cambió de identidad. Prepárala desde Mi año como un proyecto distinto.");
    const existing=(await tx.query(`select * from learning_experiences where lineage_id=$1 and status='draft'`,[source.lineage_id])).rows[0];
    if(existing){if(existing.annual_plan_id===annual.plan.id)return existing;throw new VersionConflictError("Ya hay una nueva versión en borrador. Revísala primero.");}
    const details={flow_version:"project-master-v1",stage:"decisions",preview:{context_summary:annual.source.rationale,context_points:[],purpose_options:[annual.source.purpose],additional_context_example:"Puedes añadir materiales, espacios o visitas."},
      rebased_from:{experience_id:current.id,annual_plan_id:current.annual_plan_id},experience_contract:1};
    return (await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,
      source_proposal_index,source_proposal_id,version,supersedes_experience_id,lineage_id,generation_metadata)
      values($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,'planned',$10,$11,$12,$13,$14,'{"workflow":"explicit_project_rebase"}'::jsonb) returning *`,
      [randomUUID(),current.classroom_id,current.type,annual.source.title,annual.source.purpose,annual.slot.starts_on,annual.slot.ends_on,JSON.stringify(details),
        annual.plan.id,annual.index,annual.proposalId,Number(current.version)+1,current.id,current.lineage_id])).rows[0];
  });
}
