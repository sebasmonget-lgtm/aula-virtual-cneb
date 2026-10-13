import { explicitPlanningSignals } from './annual-classroom-snapshot.mjs';
import { projectFamilyAssessmentContext } from './family-interview-projection.mjs';
/** A projection of real sources, not a generated group diagnosis. No names, raw JSON or keyword inference. */
export function annualChatSummary(sources,snapshot,curriculum){
 const interests=explicitPlanningSignals(sources).interests.sort((a,b)=>b.distinct_children-a.distinct_children)
   .map(item=>({label:item.label,families:item.distinct_children}));
 const names=new Map(curriculum.map(item=>[item.id,item.name]));
 const activities=[...new Set(sources.interviews.flatMap(row=>projectFamilyAssessmentContext(row.details).home_activities))];
 return {studentCount:snapshot.student_count,interviewCount:sources.interviews.length,observationCount:sources.observations.filter(row=>row.observation_text?.trim()).length,familyActivities:activities,
   familyInterests:interests,observedCompetencies:snapshot.competency_information.filter(item=>item.recorded_performances>0)
     .map(item=>({id:item.competency_id,name:names.get(item.competency_id),records:item.recorded_performances})),
   resources:snapshot.resources,teacherContext:snapshot.facts.filter(item=>['teacher_context','teacher_decision'].includes(item.kind)).map(item=>item.ai_support_text??"").filter(text=>text&&!/^\s*[\[{]/.test(text))};
}
