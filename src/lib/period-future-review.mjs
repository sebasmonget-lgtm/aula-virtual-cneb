import { loadPlanningFeedback } from "./planning-feedback.mjs";
import { dateOnly } from "./period-evaluation-service.mjs";
import { limaToday } from "./activity-schedule-integrity.mjs";

export function periodFutureProjection({period,feedback,curriculum,opportunities,plan,today}){
  const future=(plan?.proposal.proposed_experiences??[]).filter(row=>row.planned_end_date>=today);
  const competencies=curriculum.map(card=>{
    const actual=opportunities.find(row=>row.competency_id===card.id)??{planned:0,worked:0};
    const records=feedback.competencies.find(row=>row.competency_id===card.id);
    const plannedProjects=future.filter(row=>(row.opportunities??[]).some(item=>item.competency_id===card.id))
      .map(row=>({proposal_id:row.proposal_id,title:row.title,starts_on:row.planned_start_date}));
    const worked=Number(actual.worked),planned=Number(actual.planned),withEvidence=records?.students_with_evidence??0;
    return {competency_id:card.id,name:card.name,planned_opportunities:planned,worked_opportunities:worked,
      students_with_evidence:withEvidence,students_without_evidence:Math.max(0,feedback.students_total-withEvidence),
      confirmed_assessments:records?.confirmed_assessments??0,support_decisions:records?.students_needing_development??0,
      support_needs:records?.support_needs??[],future_projects:plannedProjects,
      interpretation:worked===0?"Sin oportunidades de actividad registradas como realizadas":withEvidence===0?"Hay actividades realizadas, pero falta evidencia para concluir":
        records?.students_needing_development?"Hay valoraciones docentes que requieren acompañamiento":"Revisa la evidencia y las valoraciones docentes",
      continuity:plannedProjects.length?`Ya está prevista en ${plannedProjects.map(row=>`«${row.title}»`).join(" y ")}. Revisa esas oportunidades antes de decidir un reemplazo.`:
        "No aparece con una oportunidad explícita en los proyectos restantes. Puedes decidir si conviene proponer una oportunidad nueva."};
  });
  return {period,annual_plan_id:plan?.id??null,annual_revision:plan?.revision??null,students_total:feedback.students_total,
    competencies,interests:[],interests_note:"Puedes agregar intereses nuevos que hayas observado; la ausencia de registros no permite inferirlos.",
    rule:"La revisión no cambia Mi año ni asigna niveles. Las oportunidades previstas y realizadas se cuentan por separado."};
}
export async function loadPeriodFutureReview(db,{teacherId,classroomId,periodId,curriculum,today=limaToday()}){
  const feedback=await loadPlanningFeedback(db,{teacherId,classroomId,periodId});
  const period=(await db.query(`select p.id,p.label,p.starts_on::text,p.ends_on::text from evaluation_periods p join classrooms c on c.school_year_id=p.school_year_id
    where c.id=$1 and c.teacher_id=$2 and p.id=$3`,[classroomId,teacherId,periodId])).rows[0];
  if(!period)throw new Error("Período no disponible.");
  const opportunities=(await db.query(`select k.competency_v4_id as competency_id,count(distinct a.lineage_id)::int as planned,
    count(distinct a.lineage_id) filter(where exists(select 1 from class_schedule_entries s join daily_execution_logs l on l.schedule_entry_id=s.id
      where s.activity_id=a.id and l.status in ('active','completed') and l.execution_date between $2::date and $3::date))::int as worked
    from activities a join learning_experiences e on e.id=a.experience_id join activity_criteria k on k.activity_id=a.id
    where e.classroom_id=$1 and a.status in ('active','archived') and k.status in ('active','archived') and a.occurs_on between $2::date and $3::date and coalesce(a.schedule_status,'planned') not in ('cancelled','not_worked')
    group by k.competency_v4_id`,[classroomId,dateOnly(period.starts_on),dateOnly(period.ends_on)])).rows;
  const plan=(await db.query(`select id,revision,proposal from annual_plans where classroom_id=$1 and status='active'`,[classroomId])).rows[0];
  return periodFutureProjection({period,feedback,curriculum,opportunities,plan,today});
}
