import {documentProjectPlanningFixture,documentProjectPlanningV3Fixture,documentProjectPlanningV4Fixture,documentActivityPlanningFixture} from './fixtures/document-generator-planning.mjs';
import { createAIProviderForPlan } from '../src/lib/ai-provider-factory.mjs';
import {resolveDocumentGeneratorExecutionPlan} from '../src/lib/document-generator-ai-routing.mjs';
import {isDocumentGenerator} from '../src/lib/ayni-product-mode.mjs';
import { multiAgeAnnualContext, multiAgeAnnualWorkspace, sampleMultiAgeAnnualProposal } from '../src/lib/multi-age-annual.mjs';
import {officialPerformances} from '../src/lib/official-performance-references.mjs';
import {usesDocumentBackground,documentBackgroundProviderOptions} from '../src/lib/multi-age-generation-provider-state.mjs';
import {documentProjectLastActivityDate} from '../src/lib/document-generator-project-planning.mjs';

export const multiAgeGenerationTimeout=(kind,{documentsOnly=false}={})=>kind==='annual'&&documentsOnly?600_000:documentsOnly&&['activity','activity_batch'].includes(kind)?300_000:['annual','activity_batch'].includes(kind)?300_000:90_000;

/** No fallback to existing OpenAI/Mirai keys or arbitrary base URLs. */
export function multiAgeAIConfig(env=process.env) {
  const mode=env.AYNI_MULTI_AGE_AI_MODE??'off';
  if(!['off','fixture','openai'].includes(mode))throw new TypeError('Modo de IA multiedad inválido.');
  if(mode==='openai'&&!env.AYNI_MULTI_AGE_OPENAI_API_KEY)throw new Error('Configura una clave propia de IA para esta base de prueba.');
  return {mode};
}
export function multiAgeProviderForJob(db,env=process.env,{createProvider=createAIProviderForPlan}={}) {
  const {mode}=multiAgeAIConfig(env);
  return async job=>{
    if(job.provider_mode!==mode)throw new Error('El proveedor de la tarea no coincide con la configuración.');
    const documentsOnly=['annual','activity','activity_batch'].includes(job.kind)&&job.teacher_id?await isDocumentGenerator(db,job.teacher_id):false;
    if(mode==='openai')return createProvider(resolveDocumentGeneratorExecutionPlan({workflow:job.kind==='conversation'?(job.input.projectId||job.input.annualSlotId?'project_conversation':'annual_journey_conversation'):job.kind==='annual'?'annual_plan':job.kind==='diagnostic'?'diagnostic_individual_assist':job.input.projectId?'activity':'project_master',documentsOnly}),
      {apiKey:env.AYNI_MULTI_AGE_OPENAI_API_KEY,timeoutMs:multiAgeGenerationTimeout(job.kind,{documentsOnly}),store:false,streamResponse:documentsOnly,
       ...(usesDocumentBackground(job.kind,documentsOnly)?await documentBackgroundProviderOptions(db,job):{})});
    if(mode!=='fixture')throw new Error('La IA está desactivada.');
    return {generate:async request=>{
      const c=request.ai_context_bundle;let output;
      if(job.kind==='conversation'){
        output=c.document_generation_mode&&job.input.annualSlotId?{assistant_text:'Simulación del proyecto: tomaremos esa situación para planificar con los niños y proponer experiencias conectadas. ¿Qué recursos del aula puedes usar en este proyecto?',suggestions:['Tenemos los utensilios habituales.','Quiero continuar con lo disponible.']}:c.document_generation_mode?{assistant_text:'Simulación del generador: podemos preparar Mi año con las ideas y condiciones que nos cuentas. ¿Qué materiales o espacios quieres aprovechar (por ejemplo, patio, bloques o cuentos)?',suggestions:['Tenemos patio y cuentos.','Ayúdame a elegir ideas para el año.','Quiero crear Mi año con lo disponible.']}:{assistant_text:'Propuesta simulada: podemos ajustar la organización con momentos comunes y acompañamiento por turnos. Conservaremos criterios propios de 3, 4 y 5 años. Tu mensaje está guardado; solo lo incorporaremos a próximas propuestas si tú lo confirmas.',suggestions:['¿Qué observaré en cada edad?','Quiero acompañar a un grupo por turno.']};
        if(c.document_generation_mode&&request.output_schema.properties?.ready_to_generate){
          const ready=/crear|generar|preparar|continuar|basta|disponible|está bien/i.test(c.teacher_message);
          output.ready_to_generate=ready;
          if(ready){output.assistant_text='Con lo conversado podemos preparar '+(job.input.annualSlotId?'este proyecto':'Mi año')+'. Puedes usar el botón para generar o seguir conversando para afinarlo.';output.suggestions=[];}
        }
      }else if(job.kind==='annual'){
        const data=await multiAgeAnnualContext(db,job.teacher_id,job.classroom_id);
        output=sampleMultiAgeAnnualProposal(data);
        if(data.documentsOnly){
          const workspace=await multiAgeAnnualWorkspace(db,job.teacher_id,job.classroom_id),active=workspace.plans.find(p=>p.status==='active');
          const protectedSlots=new Set(workspace.protectedSlots.map(slot=>slot.slotId));
          if(active)output.proposals=output.proposals.map(proposal=>protectedSlots.has(proposal.slot_id)?structuredClone(active.proposal.proposals.find(p=>p.slot_id===proposal.slot_id)):proposal);
        }
        output.title='Propuesta simulada de Mi año · revisar';
      }else if(job.kind==='diagnostic'){
        output={findings:[...new Set(c.teacher_observations.filter(o=>o.status!=='insufficient_information').map(o=>o.competency_id))].map(id=>({competency_id:id,
          observation_ids:c.teacher_observations.filter(o=>o.competency_id===id&&o.status!=='insufficient_information').map(o=>o.id),
          teacher_reading:'Propuesta simulada: el registro aporta información inicial de esta competencia. Continuar observando sin asignar un nivel final.',planning_priority:'consider'}))};
      }else{
        const p=c.confirmed_annual_position.proposal;
        const project=c.confirmed_annual_position.confirmed_project;
        output={title:p.title+' · actividad '+(c.confirmed_annual_position.activity_position??1)+' · propuesta simulada',purpose:p.purpose,occursOn:c.task.occurs_on,participantAges:c.task.participant_age_groups,
          commonSequence:{opening:p.common_invitation,development:p.one_teacher_organization,closure:'Invitar a compartir voluntariamente y registrar solo lo observado.'},
          criteriaFamilies:project?project.criteria_families.filter(f=>c.task.confirmed_competency_ids.includes(f.competency_id)).map(f=>({competency_id:f.competency_id,variants:f.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.official_performance_refs}))})):c.task.confirmed_competency_ids.map(id=>({competency_id:id,variants:p.opportunities.filter(o=>o.competency_id===id).map(o=>({curricular_age:o.age,
            criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs??officialPerformances(id,o.age).slice(0,1).map(p=>p.id)}))}))};
      }
      if(request.output_schema.properties?.projectPlanning){output.projectPlanning=request.output_schema.properties.projectPlanning.properties.version.enum.includes(4)?documentProjectPlanningV4Fixture(c.task.participant_age_groups,c.confirmed_annual_position.project_schedule.selected_dates,c.task.confirmed_competency_ids):request.output_schema.properties.projectPlanning.properties.version.enum.includes(3)?documentProjectPlanningV3Fixture(c.task.participant_age_groups,c.confirmed_annual_position.project_schedule.selected_dates,c.task.confirmed_competency_ids):documentProjectPlanningFixture(c.task.participant_age_groups);output.projectCriteriaFamilies=structuredClone(output.criteriaFamilies);output.title='Planificamos el proyecto con los niños';}
      if(request.output_schema.properties?.activityPlanning)output.activityPlanning=documentActivityPlanningFixture(c.task.participant_age_groups);
      if(job.kind==='activity_batch')output={proposals:c.task.activity_dates.map((date,i)=>({...output,...(request.output_schema.properties.proposals.items.properties?.activityPlanning?{activityPlanning:documentActivityPlanningFixture(c.task.participant_age_groups)}:{}),title:pTitle(output.title,c.task.first_activity_position+i),occursOn:date,commonSequence:{...output.commonSequence,opening:`Actividad ${c.task.first_activity_position+i}: ${output.commonSequence.opening}`}}))};
      const route=output.projectPlanning?.dailyRoute;
      const align=(a,day)=>{a.title=day.title;a.purpose=day.purpose;a.criteriaFamilies=a.criteriaFamilies.filter(f=>day.competencyIds.includes(f.competency_id));a.activityPlanning??=documentActivityPlanningFixture(c.task.participant_age_groups);};
      if(route){align(output,route[0]);if(output.projectPlanning.version===4)for(const day of route)delete day.startingPoint;}
      if(c.task?.project_daily_plan)align(output,c.task.project_daily_plan);
      if(c.task?.project_daily_plans)for(const a of output.proposals)align(a,c.task.project_daily_plans.find(d=>d.occursOn===a.occursOn));
      const item=request.output_schema.properties.proposals?.items;
      const annotationSchema=request.output_schema.properties.activityPlanning??item?.properties?.activityPlanning??item?.anyOf?.[0]?.properties?.activityPlanning;
      if(annotationSchema?.properties.version.enum.includes(3))for(const a of output.proposals??[output])a.activityPlanning=documentActivityPlanningFixture(c.task.participant_age_groups,{version:3,final:a.occursOn===documentProjectLastActivityDate(c.confirmed_annual_position)});
      const firstCriteria=request.output_schema.properties.criteriaFamilies;
      if(output.projectCriteriaFamilies&&firstCriteria.type!=='object'&&!firstCriteria.items.anyOf?.[0]?.properties.variants.items.anyOf?.[0]?.properties.official_performance_refs)for(const family of output.criteriaFamilies)for(const variant of family.variants)delete variant.official_performance_refs;
      const keyed=families=>Object.fromEntries(families.map(f=>[f.competency_id,{...f,variants:Object.fromEntries(f.variants.map(v=>[String(v.curricular_age),v]))}]));
      if(output.projectCriteriaFamilies&&request.output_schema.properties.projectCriteriaFamilies.type==='object')output.projectCriteriaFamilies=keyed(output.projectCriteriaFamilies);
      for(const activity of output.proposals??[output]){
       const own=request.output_schema.properties.proposals?.items.anyOf?.find(s=>s.properties.occursOn.enum.includes(activity.occursOn))??request.output_schema;
       if(own.properties.criteriaFamilies?.type==='object')activity.criteriaFamilies=keyed(activity.criteriaFamilies);
      }
      return {output,provider_metadata:{provider:'fixture'}};
    }};
  };
}
function pTitle(title,position){return title.replace(/ · actividad \d+/,` · actividad ${position}`);}
