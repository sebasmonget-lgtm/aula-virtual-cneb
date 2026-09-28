import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as feedbackService from './planning-feedback.mjs';
import { generateProjectPreview, generateProjectDependents, projectDetails } from './project-flow-service.mjs';

const feedback = { period_id:'p1',period_label:'Bimestre 1',students_total:15,confirmed_assessments:16,
  competencies:[{competency_id:'PS_CONVIVE',levels:{AD:0,A:3,B:11,C:0},students_without_grade:1,
    students_without_record:1,support_needs:[],next_opportunities:[]}],suggested_adjustments:[] };

test('opt-in carga el período autorizado; opt-out no consulta ni reutiliza datos anteriores',async()=>{
  assert.equal(typeof feedbackService.resolveProjectPlanningFeedback,'function');
  let calls=0;
  const loadFeedback=async periodId=>{calls++;assert.equal(periodId,'p1');return feedback;};
  const selected=await feedbackService.resolveProjectPlanningFeedback({request:{usePlanningFeedback:true,planningFeedbackPeriodId:'p1'},loadFeedback});
  assert.deepEqual(selected,feedback);
  assert.equal(await feedbackService.resolveProjectPlanningFeedback({request:{usePlanningFeedback:false},persisted:feedback,loadFeedback}),null);
  assert.equal(calls,1);
  await assert.rejects(()=>feedbackService.resolveProjectPlanningFeedback({request:{usePlanningFeedback:true},loadFeedback}),/período/);
  const forbidden=async()=>{throw new Error('Período no autorizado');};
  await assert.rejects(()=>feedbackService.resolveProjectPlanningFeedback({request:{usePlanningFeedback:true,planningFeedbackPeriodId:'ajeno'},loadFeedback:forbidden}),/no autorizado/);
});

test('el mapa reutiliza exactamente el snapshot ya revisado, sin recargar ni cambiar decisiones',async()=>{
  assert.equal(typeof feedbackService.resolveProjectPlanningFeedback,'function');
  const saved=JSON.parse(JSON.stringify(feedback));
  assert.deepEqual(await feedbackService.resolveProjectPlanningFeedback({persisted:saved,loadFeedback:()=>assert.fail('No recargar')}),feedback);
  const details=projectDetails({source:{title:'Repartir',experience_type:'unit',primary_competency_ids:['PS_CONVIVE']},
    preview:{},decisions:{context_summary:'Contexto docente',purpose:'Compartir',competency_ids:['PS_CONVIVE']},
    dependents:{journey:[],general_criteria:[]},master:{resources:[],activity_route:[]},previous:{planning_feedback:saved}});
  assert.deepEqual(details.planning_feedback,feedback);
  assert.equal(details.purpose,'Compartir');
});

test('preview y preguntas de una unidad reciben 11 B sin convertir al alumno sin evidencia en C',async()=>{
  const context={age:5,planning_feedback:feedback};
  const provider=output=>()=>({generate:async request=>{
    assert.deepEqual(request.ai_context_bundle.planning_feedback,feedback);
    assert.match(request.ai_context_bundle.task,/evaluaciones|valoraciones/);
    return {output,provider_metadata:{usage:{input_tokens:1}}};
  }});
  await generateProjectPreview({context,workflow:'unit',loadSkill:async()=>'',createProvider:provider({
    context_summary:'Hay 11 valoraciones B de convivencia y un caso pendiente.',context_points:['11 B; sin evidencia no es C'],
    purpose_options:['Compartir con acuerdos.','Repartir en juegos.'],additional_context_example:'Un nuevo juego para revisar acuerdos.'})});
  await generateProjectDependents({context,workflow:'unit',loadSkill:async()=>'',createProvider:provider({
    guiding_questions:['¿Cómo repartimos?','¿Qué hacemos si cambia el grupo?'],journey:[{title:'Probamos',description:'Variar materiales.'},{title:'Revisamos',description:'Ajustar acuerdos.'}],
    general_criteria:[{competency_id:'PS_CONVIVE',criterion:'Propone y ajusta acuerdos.',expected_evidence:['Acuerdos observados']}] }),
    decisions:{context_summary:'Docente',purpose:'Compartir',additional_context:'',competency_ids:['PS_CONVIVE']}});
});

test('el flujo visible nuevo transporta el opt-in y permite recuperar un preview sin borrar un mapa',async()=>{
  const teacher=await readFile(new URL('../features/dashboard/components/teacher-workspace.tsx',import.meta.url),'utf8');
  const ui=await readFile(new URL('../features/dashboard/components/project-development-workspace.tsx',import.meta.url),'utf8');
  const server=await readFile(new URL('../../scripts/local-db-server.mjs',import.meta.url),'utf8');
  assert.match(teacher,/<ProjectDevelopmentWorkspace[\s\S]{0,650}feedbackPeriodId=\{feedbackPeriodId\}/);
  assert.match(ui,/usePlanningFeedback: Boolean\(feedbackPeriodId\)/);
  assert.match(ui,/planningFeedbackPeriodId: feedbackPeriodId/);
  assert.match(ui,/refreshPreview: true/);
  assert.match(server,/previous\.details\?\.decisions[\s\S]{0,350}assertRevision\(previous/);
  assert.match(server,/planning_feedback: planningFeedback/);
});
