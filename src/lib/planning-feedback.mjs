import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { cardIsApplicable } from "./ai-context-builder-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { dateOnly, loadPeriodEvaluationRows } from "./period-evaluation-service.mjs";
import { projectPedagogicalCoverage } from "./pedagogical-coverage.mjs";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(value,names)=>neutralizeAssessmentText(value,names)?.trim().slice(0,200);

export function projectPlanningFeedback({model,cards,period}) {
  const coverage=projectPedagogicalCoverage({students:model.students,cards,model});
  const names=model.students.flatMap((student)=>[student.first_name,student.last_name,student.preferred_name,
    [student.first_name,student.last_name].filter(Boolean).join(" ")]).filter(Boolean);
  const confirmed=model.rows.filter((row)=>row.state==="confirmed");
  const patterns=(field,competencyId)=>{
    const frequency=new Map();
    for(const row of confirmed.filter((item)=>item.competency_v4_id===competencyId)){
      for(const raw of new Set(Array.isArray(row.assessment?.details?.[field])?row.assessment.details[field]:[])){
        const value=clean(raw,names);
        if(value&&value.length>=8)frequency.set(value,(frequency.get(value)??0)+1);
      }
    }
    return [...frequency].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([value])=>value);
  };
  const competencies=coverage.by_competency.filter((item)=>item.planned||item.students_with_evidence).map((item)=>{
    const assessed=confirmed.filter((row)=>row.competency_v4_id===item.competency_id).length;
    const groupReady=assessed>=3;
    return {competency_id:item.competency_id,competency_name:item.competency_name,
      confirmed_assessments:assessed,students_without_record:item.students_without_record,
      students_with_evidence:item.students_with_evidence,
      support_needs:groupReady?patterns("support_needs",item.competency_id):[],
      next_opportunities:groupReady?patterns("next_opportunities",item.competency_id):[]};
  });
  return {period_id:period.id,period_label:period.label,students_total:model.students.length,
    confirmed_assessments:confirmed.length,competencies};
}

/** Resolve the selected period and classroom again on the server before any AI call. */
export async function loadPlanningFeedback(db,{teacherId,classroomId,periodId,loadKnowledgeBase=loadKnowledgeBaseV4}){
  if(!uuid.test(classroomId??"")||!uuid.test(periodId??""))throw new Error("Elige un aula y un período válidos.");
  const classroom=(await db.query(`select c.id,c.school_year_id,c.castellano_l2_applicable,c.religion_applicable,ag.age_years as age
    from classrooms c join school_years sy on sy.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
    where c.id=$1 and c.teacher_id=$2 and sy.owner_id=$2`,[classroomId,teacherId])).rows[0];
  if(!classroom)throw new Error("Aula no disponible.");
  const period=(await db.query(`select id,label,starts_on,ends_on from evaluation_periods where id=$1 and school_year_id=$2`,[periodId,classroom.school_year_id])).rows[0];
  if(!period)throw new Error("El período no corresponde al aula.");
  const applicable=(await loadKnowledgeBase()).competencyCards.filter((card)=>card.runtime_selectable_by_age?.[String(classroom.age)]&&cardIsApplicable(card,{castellanoL2Applicable:classroom.castellano_l2_applicable===true,religionApplicable:classroom.religion_applicable===true}));
  const model=await loadPeriodEvaluationRows(db,{classroomId:classroom.id,period:{...period,starts_on:dateOnly(period.starts_on),ends_on:dateOnly(period.ends_on)},applicableIds:new Set(applicable.map((card)=>card.id))});
  return projectPlanningFeedback({model,cards:applicable,period});
}

export function planningFeedbackText(feedback){
  const parts=feedback.competencies.filter((item)=>item.confirmed_assessments||item.students_without_record)
    .slice(0,5).map((item)=>`${item.competency_name}: ${item.students_without_record} sin registro; ${item.confirmed_assessments} valoraciones confirmadas.${item.support_needs.length?` Necesidades compartidas: ${item.support_needs.join("; ")}.`:""}${item.next_opportunities.length?` Próximas oportunidades: ${item.next_opportunities.join("; ")}.`:""}`);
  return parts.length?`Hallazgos grupales confirmados del ${feedback.period_label}. Son orientativos; la docente decide cómo usarlos. ${parts.join(" ")}`:"";
}
