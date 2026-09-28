import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { applicableCompetencyCards } from "./competency-applicability.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { dateOnly, loadPeriodEvaluationRows } from "./period-evaluation-service.mjs";
import { loadDiagnosticCoverageRecords, projectPedagogicalCoverage } from "./pedagogical-coverage.mjs";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(value,names)=>neutralizeAssessmentText(value,names)?.trim().slice(0,200);

export function projectPlanningFeedback({model,cards,period,diagnosticRecords=[]}) {
  const coverage=projectPedagogicalCoverage({students:model.students,cards,model,diagnosticRecords,today:dateOnly(period.ends_on)});
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
    const decisions=confirmed.filter((row)=>row.competency_v4_id===item.competency_id);
    const assessed=decisions.length;
    const levels=Object.fromEntries(['AD','A','B','C'].map(level=>[level,decisions.filter(row=>row.assessment?.achievement_level===level).length]));
    const studentsWithEvidence=new Set(model.rows.filter(row=>row.competency_v4_id===item.competency_id&&row.sourceRows?.length).map(row=>row.student_id)).size;
    const groupReady=assessed>=3;
    return {competency_id:item.competency_id,competency_name:item.competency_name,
      confirmed_assessments:assessed,levels,students_without_grade:Math.max(0,model.students.length-assessed),
      students_needing_development:levels.B+levels.C,
      students_without_record:Math.max(0,model.students.length-studentsWithEvidence),
      students_with_evidence:studentsWithEvidence,
      support_needs:groupReady?patterns("support_needs",item.competency_id):[],
      next_opportunities:groupReady?patterns("next_opportunities",item.competency_id):[]};
  });
  // Mostrar lo realmente valorado antes de las competencias aún sin registros.
  competencies.sort((a,b)=>b.confirmed_assessments-a.confirmed_assessments||b.students_with_evidence-a.students_with_evidence);
  const suggested_adjustments=competencies.flatMap((item)=>{
    const suggestions=[];
    if(item.students_needing_development>=3) suggestions.push({competency_id:item.competency_id,reason:`${item.students_needing_development} de ${model.students.length} estudiantes tienen una valoración docente en nivel B o C en ${item.competency_name}.`,suggestion:"Ofrecer oportunidades variadas para seguir desarrollando esta competencia; conservar los apoyos concretos que confirme la docente, sin atribuir la misma necesidad a todo el grupo."});
    if(item.students_without_record===model.students.length) suggestions.push({competency_id:item.competency_id,reason:`No hay registros de ${item.competency_name} en este período.`,suggestion:"Proponer una situación para observar sin asignar un nivel por ausencia de registros."});
    else if(item.students_without_record>0) suggestions.push({competency_id:item.competency_id,reason:`${item.students_without_record} de ${model.students.length} estudiantes aún no tienen registros de ${item.competency_name}.`,suggestion:"Ofrecer otra oportunidad de observación; la docente decide a quién y cuándo observar."});
    return suggestions;
  });
  return {period_id:period.id,period_label:period.label,students_total:model.students.length,
    confirmed_assessments:confirmed.length,competencies,suggested_adjustments};
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
  const applicable=applicableCompetencyCards((await loadKnowledgeBase()).competencyCards,classroom.age,{castellanoL2Applicable:classroom.castellano_l2_applicable===true,religionApplicable:classroom.religion_applicable===true});
  const model=await loadPeriodEvaluationRows(db,{classroomId:classroom.id,period:{...period,starts_on:dateOnly(period.starts_on),ends_on:dateOnly(period.ends_on)},applicableIds:new Set(applicable.map((card)=>card.id))});
  const diagnosticRecords=await loadDiagnosticCoverageRecords(db,classroom.id,period);
  return projectPlanningFeedback({model,cards:applicable,period,diagnosticRecords});
}

export function planningFeedbackText(feedback){
  const parts=feedback.competencies.filter((item)=>item.confirmed_assessments||item.students_without_record)
    .map((item)=>`${item.competency_name}: ${item.students_without_record} sin registro del período; ${item.confirmed_assessments} valoraciones confirmadas; ${item.students_without_grade} sin valoración. Distribución docente AD: ${item.levels.AD}, A: ${item.levels.A}, B: ${item.levels.B}, C: ${item.levels.C}.${item.support_needs.length?` Necesidades compartidas: ${item.support_needs.join("; ")}.`:""}${item.next_opportunities.length?` Próximas oportunidades: ${item.next_opportunities.join("; ")}.`:""}`);
  const suggestions=(feedback.suggested_adjustments??[]).map((item)=>`${item.reason} ${item.suggestion}`);
  return parts.length?`Registros y hallazgos confirmados del ${feedback.period_label}. Las ausencias de registro no indican bajo desempeño. Son orientativos; la docente decide cómo usarlos y el plan no cambia automáticamente. ${parts.join(" ")} ${suggestions.join(" ")}`:"";
}

/** A new decision loads authorized server data; a later stage keeps the reviewed snapshot. */
export async function resolveProjectPlanningFeedback({request,persisted=null,loadFeedback}){
  if(!request || !Object.hasOwn(request,'usePlanningFeedback'))return persisted;
  if(request.usePlanningFeedback!==true)return null;
  if(typeof request.planningFeedbackPeriodId!=='string'||!request.planningFeedbackPeriodId.trim())
    throw new Error('Elige el período de las evaluaciones que deseas usar.');
  return loadFeedback(request.planningFeedbackPeriodId);
}
