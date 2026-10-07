import { neutralizeAssessmentText, assessmentStudentNames } from "./assessment-v4-service.mjs";

/** Grounded excerpts, never inferred levels or group-wide generalizations. */
export function diagnosticBrief({students,observations,interests=[],interviews=[]}) {
  const names=assessmentStudentNames(students);
  const records=[...new Map(observations.filter(row=>row.observation_text?.trim()).map(row=>[row.id,row])).values()];
  const patterns=interests.filter(item=>item.count>=3 && students.length>=5);
  const parts=[],sources=[];
  const hasGroupSupport=patterns.length>0||new Set(records.map(row=>row.student_id)).size>=3;
  if(!hasGroupSupport)parts.push("Todavía falta conocer mejor al grupo para elaborar una síntesis grupal. Conservamos los registros concretos que ya tenemos; no permiten generalizar.");
  if(patterns.length)parts.push(`Varias familias mencionan ${patterns.slice(0,3).map(item=>item.label.toLocaleLowerCase("es-PE")).join(", ")} entre los intereses de sus niños. Es contexto familiar; no indica un nivel de aprendizaje.`);
  if(patterns.length)sources.push(...interviews.filter(row=>patterns.some(item=>row.details?.interest_tags?.includes(item.key))).map(row=>({id:row.id,version:row.version,source_type:"family_interview"})));
  for(const row of records.slice(-3)) {
    const text=neutralizeAssessmentText(row.observation_text,names);
    if(!text?.trim())continue;
    parts.push(`En un registro de ${new Date(row.observed_at??row.observed_on).toLocaleDateString("es-PE",{timeZone:"America/Lima"})} se anotó: «${text.slice(0,350)}».`);
    sources.push({id:row.id,source_type:row.experience_id==="spontaneous"?"spontaneous_observation":"diagnostic_observation"});
  }
  if(records.length||patterns.length)parts.push("Estos registros describen situaciones concretas; no representan a todo el grupo. Puedes añadir lo que conoces y corregir esta síntesis antes de confirmarla.");
  return {text:parts.join("\n\n"),source_refs:sources,information_status:hasGroupSupport?"information_available":"insufficient_information"};
}
