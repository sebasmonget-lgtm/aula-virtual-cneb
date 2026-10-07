import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";
import { withAIQATrace, recordAIQAResult } from "../../src/lib/ai-qa-trace.mjs";
import { suggestDiagnosticGroupReview } from "../../src/lib/ai-diagnostic-evaluation-service.mjs";
import { buildAnnualClassroomSnapshot } from "../../src/lib/annual-classroom-snapshot.mjs";
import { generateAnnualJourney } from "../../src/lib/annual-journey-service.mjs";
import { validateExperienceContext } from "../../src/lib/annual-experience-context.mjs";
import { fixtureCalendar } from "../../src/lib/test-fixtures/annual-journey.mjs";
import { generateProjectMaster, projectDetails } from "../../src/lib/project-flow-service.mjs";
import { generateTeacherActivity } from "../../src/lib/ai-activity-ui-service.mjs";
import { buildAssessmentContext, assessmentMasterEntry } from "../../src/lib/assessment-master-service.mjs";
import { buildAssessmentInput, sanitizeEvidenceForAssessment } from "../../src/lib/assessment-v4-service.mjs";
import { generateAIWorkflowV4 } from "../../src/lib/ai-generation-v4.mjs";
import { buildDescriptiveConclusionInput } from "../../src/lib/descriptive-conclusion-v4-service.mjs";
import { buildFamilyReportInput, preserveConfirmedFamilySections } from "../../src/lib/family-report-v4-service.mjs";
import { createAIProviderForPlan } from "../../src/lib/ai-provider-factory.mjs";

/** Explicit CLI opt-in; all inputs are fictional, no application database is accessed. */
export async function runModernQA({ outputDir = resolve(".local/modern-ai-qa"), progress = console.info, resume = false } = {}) {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error("Proveedor no configurado"),{reason:"api_key_missing"});
  if (process.env.VERCEL_ENV === "production") throw new Error("QA ficticia fuera de Production solamente");
  process.env.AYNI_AI_QA_TRACE = "1";
  const kb = await loadKnowledgeBaseV4();
  const ids = ["COM_ORAL","MAT_CANTIDAD","CYT_INDAGA"];
  const cards = kb.competencyCards.filter(card=>ids.includes(card.id));
  const curriculum = cards.map(card=>({id:card.id,name:card.official_name,capacities:card.capacities.map(capacity=>typeof capacity==="string"?capacity:capacity.official_name)}));
  const students = Array.from({length:6},(_,index)=>({id:`fictional_${index+1}`}));
  const texts = ["Al comparar dos grupos de semillas señaló el grupo con más y explicó su elección.",
    "En un juego con bloques explicó cómo hizo una torre; después pidió apoyo para continuar.",
    "En una conversación respondió con gestos y una palabra; en otro juego contó una idea completa.",
    "Miró las hojas con una lupa y preguntó por los puntos que encontró.",
    "Intentó comparar dos grupos; cambió la respuesta cuando se movieron las semillas.",
    "Aún no hay observaciones suficientes de este niño."];
  const observed=students.slice(0,5).map((student,index)=>({id:`fictional_obs_${index+1}`,student_id:student.id,observation_text:texts[index],competency_v4_id:ids[index%3],observed_at:"2026-10-05T15:00:00Z"}));
  const sources={age:5,student_count:6,known_names:[],competency_options:cards,
    source_snapshot:[{id:"fictional-scope",fingerprint:"synthetic-v1"}],comments:[],
    observed_records:observed.map((row,index)=>({child:`child_${index+1}`,notes:[{source_id:`child_${index+1}_observation_1`,source_type:"direct_observation",text:row.observation_text,competency_ids:[row.competency_v4_id]}]})),
    family_reported_context:[{child:"child_3",source_id:"child_3_family_v1",source_type:"family_reported_context",version:1,details:{interests:"Le gustan las plantas",family_statement:"En casa cuenta relatos largos; es un reporte familiar, no una observación escolar.",resources:"Hay pocas plantas y tiempo breve para conversar"}}]};
  let outputs={};
  if(resume) {try{outputs=JSON.parse(await readFile(resolve(outputDir,"results.partial.json"),"utf8"));}catch{const trace=JSON.parse(await readFile(resolve(outputDir,"six_children_modern-1.json"),"utf8"));if(trace.workflow==="diagnostic_group_synthesis"&&trace.teacher_visible_result)outputs.diagnostic={details:trace.teacher_visible_result};}}
  await mkdir(outputDir,{recursive:true});
  return withAIQATrace({fixtureId:resume?"six_children_modern_resume":"six_children_modern",synthetic:true,outputDir},async traces=>{
    const step=async(name,action)=>{if(outputs[name]){progress(JSON.stringify({stage:name,status:"restored"}));return;}progress(JSON.stringify({stage:name,status:"running"}));outputs[name]=await action();await writeFile(resolve(outputDir,"results.partial.json"),JSON.stringify(outputs,null,2));progress(JSON.stringify({stage:name,status:"passed",calls:traces.length}));};
    await step("diagnostic",()=>suggestDiagnosticGroupReview({query:async()=>({rows:[]})},"synthetic_teacher","synthetic_draft",{loadSources:async()=>sources}));
    const snapshot=buildAnnualClassroomSnapshot({students,names:[],fingerprint:"synthetic-v1",observations:observed,interviews:[]},{available_resources:["Semillas, bloques, papel y lupas"],diagnostic_summary:outputs.diagnostic.details.strengths},curriculum);
    await step("annual",()=>generateAnnualJourney({context:{year:2026,age:5},snapshot,curriculum,calendar:fixtureCalendar(),experienceContext:validateExperienceContext({contextItems:[{text:"La profesora cuenta con semillas, bloques y lupas del aula",source_turn:1}],historicalProjects:[]},curriculum,"2026-10-07"),teacherIdeas:"Dar oportunidades de juego, conversación y exploración con semillas. No se han registrado intereses del grupo."}));
    const source={...outputs.annual.proposed_experiences.find(row=>row.primary_competency_ids.includes("COM_ORAL")),primary_competency_ids:["COM_ORAL","CYT_INDAGA"]};
    const decisions={context_summary:"La profesora propone explorar semillas y conversar sobre cambios; no afirma un interés observado del grupo.",purpose:"Explorar semillas y explicar las ideas con palabras, gestos y dibujos.",competency_ids:["COM_ORAL","CYT_INDAGA"],additional_context:"Podemos usar semillas y lupas del aula. Las familias no necesitan comprar materiales."};
    await step("project",()=>generateProjectMaster({context:{modern:true,age:5,annual_proposal:source,curriculum:cards.filter(card=>decisions.competency_ids.includes(card.id)),teacher_context_sources:[{source_turn:"fictitious_turn_1",support_text:decisions.additional_context,source_type:"teacher_decision"}]},decisions,availableDates:["2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13"]}));
    const details=projectDetails({source,decisions,dependents:outputs.project.dependents,master:outputs.project.output});
    const experience={id:"synthetic_project",type:"project",title:source.title,purpose:decisions.purpose,details:{...details,flow_version:"project-master-v2"}};
    await step("activity",()=>generateTeacherActivity({request:{routeItemId:details.activity_route[0].id},classroom:{id:"synthetic_classroom",age:5,group_context:"Aula ficticia",available_resources:[]},learningExperience:experience}));
    await recordAIQAResult("activity",outputs.activity.proposal,{validators:["inherited_blueprint", "competency", "activity_schema"],downstream:["teacher_observation"]});
    const criterion={competency_id:"COM_ORAL",criterion_text:"Explica una idea relacionada con su exploración y escucha otras ideas.",expected_evidence:"Palabras, gestos o dibujos que comunican lo que probó.",observation_focus:["Qué explica y cómo responde a otra idea."]};
    const computed=buildAssessmentContext({age:5,competencyCards:cards,snapshot:{fingerprint:"synthetic-completed-context"},sources:{criteria:[criterion],period:{starts_on:"2026-09-01",ends_on:"2026-10-30"}}});
    const evidenceRows=[{id:"synthetic_e1",observed_on:"2026-10-05",observed_at:"2026-10-05T15:00:00Z",observation_text:"Explicó que una semilla tenía puntos y mostró dónde miró.",activity_title:"Miramos semillas",criterion_text:criterion.criterion_text,details:criterion},
      {id:"synthetic_e2",observed_on:"2026-10-06",observed_at:"2026-10-06T15:00:00Z",observation_text:"En otro juego respondió con un gesto y pidió ayuda para explicar.",activity_title:"Conversamos sobre lo probado",criterion_text:criterion.criterion_text,details:criterion}];
    const providerFactory=plan=>createAIProviderForPlan(plan,{timeoutMs:180000});
    await step("assessment",()=>generateAIWorkflowV4(buildAssessmentInput({age:5,competencyId:"COM_ORAL",assessmentMaster:assessmentMasterEntry(computed,"COM_ORAL"),evidenceHistory:evidenceRows.map(row=>sanitizeEvidenceForAssessment(row)),criteriaHistory:[criterion]}),{providerFactory}));
    const assessment={id:"synthetic_assessment",achievement_level:"B",teacher_confirmed_at:"2026-10-07T15:00:00Z",details:outputs.assessment.output};
    await step("conclusion",()=>generateAIWorkflowV4(buildDescriptiveConclusionInput({age:5,competencyId:"COM_ORAL",assessment,assessmentMaster:assessmentMasterEntry(computed,"COM_ORAL"),evidenceRows}),{providerFactory}));
    const conclusions=[{id:"synthetic_conclusion",competency_v4_id:"COM_ORAL",period_start:"2026-09-01",period_end:"2026-10-30",details:outputs.conclusion.output}];
    await step("family",()=>generateAIWorkflowV4(buildFamilyReportInput({age:5,competencyIds:["COM_ORAL"],conclusions,familyRecommendationContext:{source_type:"family_reported_context",interests:["Plantas"],resources:"Tiempo breve para conversar, sin compras"}}),{providerFactory}));
    outputs.family.output=preserveConfirmedFamilySections(outputs.family.output,conclusions);
    await recordAIQAResult("family_report",outputs.family.output,{validators:["confirmed_conclusions_preserved", "family_context_recommendations_only"],downstream:["teacher_confirmation", "docx"]});
    const summary={synthetic:true,status:"PASS",calls:traces.length,workflows:traces.map(trace=>({workflow:trace.workflow,model:trace.model,reasoning_effort:trace.reasoning_effort,latency_ms:trace.latency_ms,cost_usd:trace.cost_usd,validation:trace.validation})),total_cost_usd:traces.reduce((sum,trace)=>sum+(trace.cost_usd??0),0)};
    await writeFile(resolve(outputDir,"results.json"),JSON.stringify(outputs,null,2));
    await writeFile(resolve(outputDir,"summary.json"),JSON.stringify(summary,null,2));return summary;
  });
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv.includes("--real")) {console.error("Añade --real para ejecutar IA con el aula ficticia.");process.exitCode=1;}
  else try {console.info(JSON.stringify(await runModernQA({resume:process.argv.includes("--resume")})));}catch(error){console.error(JSON.stringify({status:"FAIL",reason:error.reason??error.name}));process.exitCode=1;}
}
