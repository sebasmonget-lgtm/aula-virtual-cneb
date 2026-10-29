import test from "node:test";
import assert from "node:assert/strict";

test('una frase cortada se repara una vez sin regenerar la secuencia ni facturar de nuevo al recuperar',async()=>{
  const planning={shared_challenge:'¿Cómo cambian las plantas?',planning_with_children:'Recojan preguntas y acuerden qué observar.',child_decisions:'Eligen qué planta observar.',organization:'Organizan los registros antes de',mediation:'Pide mostrar qué cambió.',age_support:'Permite señalar antes de explicar.',closing_review:'Comparen los registros con sus preguntas.',transversal_approaches:[{name:'Enfoque ambiental',attitude:'Cuidan las plantas.',teacherAction:'Acompaña el cuidado.'}]};
  const output={...master,...dependents,meaningful_situation:'Los niños del aula exploraron las plantas y preguntaron cómo cambian.',document_planning:planning,activities:master.activities.map((row,index)=>({...row,title:index===0?'Planificamos el proyecto con los niños':row.title,child_decisions:'Eligen qué registro mostrar.'}))};
  const repaired={...planning,organization:'Organizan los registros en una mesa. Trabajan juntos para comparar sus dibujos.'};
  const dates=['2026-04-13','2026-04-14'],checkpoint={},calls=[];
  const createProvider=(_plan,options)=>({generate:async request=>{
    calls.push({id:request.output_schema.id,resume:options.resumeResponseId});
    if(request.output_schema.id==='project-single-master-v6')return {output};
    assert.equal(request.output_schema.id,'project-document-planning-repair-v1');
    assert.deepEqual(request.output_schema.required,['document_planning']);
    assert.deepEqual(request.ai_context_bundle.invalid_document_planning,planning);
    assert.deepEqual(request.ai_context_bundle.confirmed_decisions,decisions);
    assert.equal(request.output_schema.properties.activities,undefined);
    if(!options.resumeResponseId){await options.onResponseStarted('resp_planning_only');throw Object.assign(new Error('Pending'),{reason:'response_pending'});}
    assert.equal(options.resumeResponseId,'resp_planning_only');return {output:{document_planning:repaired}};
  }});
  const args={context:{modern:true,age:5},decisions,availableDates:dates,checkpoint,backgroundExecution:true,onCheckpoint:async()=>{},createProvider,loadSkill:async()=> 'Skill'};
  await assert.rejects(()=>generateProjectMaster(args),error=>error.reason==='response_pending');
  const result=await generateProjectMaster(args);
  assert.equal(calls.filter(row=>row.id==='project-single-master-v6').length,1);
  assert.equal(calls.filter(row=>row.id==='project-document-planning-repair-v1'&&!row.resume).length,1);
  assert.equal(result.metadata.repair_scope,'document_planning');
  assert.deepEqual(result.output.activities,output.activities);
  assert.deepEqual(result.dependents,dependents);
  assert.deepEqual(result.output.document_planning,repaired);
  assert.equal(validateProjectMaster(output,decisions,dependents,dates).document_planning.organization,planning.organization,'Leer un histórico no aplica restricciones nuevas');
  for(const response of [{document_planning:planning},{}]){
    let attempts=0;
    await assert.rejects(()=>generateProjectMaster({...args,checkpoint:{},backgroundExecution:false,createProvider:()=>({generate:async()=>({output:++attempts===1?output:response})})}),error=>['incomplete_document_planning_text','incomplete_document_planning'].includes(error.reason));
    assert.equal(attempts,2,'No hay bucle ilimitado ni regeneración completa al fallar la reparación puntual');
  }
});

import { nationalCalendarBlocks2026, nationalSchoolHolidays2026 } from "./annual-plan-calendar.mjs";
import { fixtureCalendar } from "./test-fixtures/annual-journey.mjs";
import { solveAnnualJourneyCalendar } from "./annual-journey-calendar.mjs";
import { candidateProjectDates, validateSelectedInstructionalDates } from "./school-calendar-service.mjs";
import { generateProjectPreview, generateProjectDependents, generateProjectMaster,
  instructionalDates, validateProjectMaster, preserveTeacherMapEdits, projectDetails,
  validateEditedActivityMap, validateProjectDependents, generateProjectFormal } from "./project-flow-service.mjs";

const calendar = { blocks: nationalCalendarBlocks2026(), exceptions: nationalSchoolHolidays2026() };
const decisions = { context_summary: "El grupo pregunta por plantas cercanas.", purpose: "Investigar cómo cambian las plantas.",
  competency_ids: ["CYT_INDAGA"], additional_context: "" };
const dependents = { guiding_questions: ["¿Qué vemos?", "¿Qué cambió?"], journey: [
  { title: "Preguntamos", description: "Formulamos preguntas." },
  { title: "Observamos", description: "Miramos y comparamos." }],
  general_criteria: [{ competency_id: "CYT_INDAGA", criterion: "Observa y compara cambios.",
    official_performance_refs: ["PCI2016.CYT_INDAGA.5.03"],
    expected_evidence: ["Explicaciones", "Dibujos"] }] };
const master = { meaningful_situation: "La docente recoge preguntas de algunos niños sobre las plantas cercanas. Propone observar sus cambios y compartir lo descubierto: ¿cómo podemos averiguar qué necesitan para crecer?", foundation: "El grupo pregunta por cambios visibles.", closing_description: "Compartir lo observado.",
  closing_rationale: "Permite conversar sobre las preguntas iniciales.", resources: ["Plantas del patio"],
  activities: [{ date: "2026-04-13", title: "Miramos las plantas", purpose: "Observar cambios.",
    competency_ids: ["CYT_INDAGA"], criterion_competency_id: "CYT_INDAGA",
    official_performance_refs: ["PCI2016.CYT_INDAGA.5.03"],
    pedagogical_intention: "Abrir una indagación desde lo visible.", criterion_text: "Observa y compara cambios.",
    expected_evidence: "Explicaciones y dibujos sobre cambios.", acceptable_evidence_variations: ["Explicación oral", "Dibujo comentado"],
    observation_focus: ["Cómo compara lo observado"], materials: ["Plantas del patio"],
    mediation_notes: "Preguntar sin anticipar respuestas.", continuity_from_previous: "Inicia desde las preguntas del grupo.",
    continuity_to_next: "Las primeras observaciones orientan una comparación.", flexibility_notes: "Ajustar según las preguntas que aparezcan.",
    role_in_project: "Abrir la investigación.", expected_progression: "Recoger primeras preguntas.", estimated_minutes: 45 },
    { date: "2026-04-14", title: "Compartimos lo que vimos", purpose: "Comunicar hallazgos.",
      competency_ids: ["CYT_INDAGA"], criterion_competency_id: "CYT_INDAGA",
      official_performance_refs: ["PCI2016.CYT_INDAGA.5.05"],
      pedagogical_intention: "Comunicar y contrastar hallazgos.", criterion_text: "Explica cambios que observó.",
      expected_evidence: "Explicación apoyada en un registro.", acceptable_evidence_variations: ["Relato oral", "Dibujo comentado"],
      observation_focus: ["Cómo relaciona su registro con lo que explica"], materials: ["Registros del grupo"],
      mediation_notes: "Invitar a escuchar ideas diferentes.", continuity_from_previous: "Retoma las observaciones registradas.",
      continuity_to_next: "Cierra reconociendo nuevas preguntas.", flexibility_notes: "Permitir distintas formas de comunicar.",
      role_in_project: "Cerrar y compartir.", expected_progression: "Comparar lo aprendido.", estimated_minutes: 45 }] };
const provider = (output, check) => () => ({ generate: async (request) => {
  check?.(request); return { output, provider_metadata: { usage: { input_tokens: 10 } } };
} });

test("una selección curricular de otra edad se repara sin cambiar el criterio ni las decisiones", async () => {
  const calls = [];
  const result = await generateProjectMaster({ context: { modern: true, age: 5 }, decisions,
    availableDates: ["2026-04-13", "2026-04-14"], loadSkill: async () => "Skill",
    createProvider: () => ({ generate: async request => {
      calls.push(request);
      const refs = request.ai_context_bundle.didactic_knowledge.official_performance_catalog;
      assert.equal(refs.competencies.length, 1);
      assert.ok(refs.competencies[0].performances.every(row => row.age === 5));
      const activities = master.activities.map((row, index) => ({ ...row,
        ...(calls.length === 1 && index === 0 ? { official_performance_refs: ["PCI2016.CYT_INDAGA.4.03"] } : {}) }));
      return { output: { ...master, ...dependents, activities } };
    } }) });
  assert.equal(calls.length, 2);
  assert.equal(result.metadata.repair_used, true);
  assert.deepEqual(calls[1].ai_context_bundle.confirmed_decisions, decisions);
  assert.match(calls[1].ai_context_bundle.task,/conserva exactamente 2 actividades, una por fecha/);
  assert.match(calls[1].ai_context_bundle.task,/No agregues días ni dividas una fecha/);
  assert.match(calls[0].ai_context_bundle.task,/no obliga a cada niño a recorrer todas las opciones/);
  assert.equal(result.output.activity_route[0].evaluation_criterion, master.activities[0].criterion_text);
  assert.deepEqual(result.output.activity_route[0].official_performance_refs, master.activities[0].official_performance_refs);
});

test("las nuevas instrucciones docentes incompletas se rechazan sin reescribir históricos", () => {
  const dates = ["2026-04-13", "2026-04-14"];
  const partial = { ...master, activities: master.activities.map(row => ({ ...row, mediation_notes: "La docente acompaña, pero no在" })) };
  assert.throws(() => validateProjectMaster(partial, decisions, dependents, dates, { age: 5, required: true, strictInstructions: true }),
    error => error.reason === "incomplete_teacher_instruction");
  assert.equal(validateProjectMaster(partial, decisions, dependents, dates).activities[0].mediation_notes, partial.activities[0].mediation_notes,
    "La lectura del histórico no aplica nuevas restricciones ni modifica su contenido");
});

test('el Master en segundo plano recupera un ID conocido sin repetir la creación ni aceptar contexto cambiado',async()=>{
 const checkpoint={},saved=[];let creates=0,retrieves=0;
 const createProvider=(_plan,options)=>({generate:async()=>{
  assert.equal(options.background,true);
  if(!options.resumeResponseId){creates++;await options.onResponseStarted('resp_master_known');throw Object.assign(new Error('Pending'),{reason:'response_pending'});}
  assert.equal(options.resumeResponseId,'resp_master_known');retrieves++;
  if(retrieves===1)throw Object.assign(new Error('Pending'),{reason:'response_pending'});
  return {output:{...master,...dependents}};
 }});
 const args={context:{modern:true,age:5},decisions,availableDates:['2026-04-13','2026-04-14'],backgroundExecution:true,checkpoint,
  onCheckpoint:async value=>saved.push(value),createProvider,loadSkill:async()=> 'Skill'};
 await assert.rejects(()=>generateProjectMaster(args),e=>e.reason==='response_pending');
 assert.equal(saved.at(-1).provider_responses.master,'resp_master_known');
 await assert.rejects(()=>generateProjectMaster({...args,availableDates:['2026-04-15','2026-04-16']}),e=>e.name==='VersionConflictError');
 await assert.rejects(()=>generateProjectMaster(args),e=>e.reason==='response_pending');
 const result=await generateProjectMaster(args);
 assert.equal(creates,1);assert.equal(retrieves,2);assert.equal(result.output.activity_route.length,2);
});

test('la reparación del Master conserva sus dos respuestas conocidas y no vuelve a facturar la principal',async()=>{
 const checkpoint={};let creates=0,primaryReads=0;
 const createProvider=(_plan,options)=>({generate:async()=>{
  if(!options.resumeResponseId){creates++;const id=creates===1?'resp_primary':'resp_repair';await options.onResponseStarted(id);throw Object.assign(new Error('Pending'),{reason:'response_pending'});}
  if(options.resumeResponseId==='resp_primary')primaryReads++;
  return {output:{...master,...dependents,...(options.resumeResponseId==='resp_primary'?{foundation:'x'.repeat(1501)}:{})}};
 }});
 const args={context:{modern:true,age:5},decisions,availableDates:['2026-04-13','2026-04-14'],backgroundExecution:true,checkpoint,
  onCheckpoint:async()=>{},createProvider,loadSkill:async()=> 'Skill'};
 await assert.rejects(()=>generateProjectMaster(args),e=>e.reason==='response_pending');
 await assert.rejects(()=>generateProjectMaster(args),e=>e.reason==='response_pending');
 const result=await generateProjectMaster(args);
 assert.equal(creates,2);assert.equal(result.metadata.repair_used,true);
  assert.equal(primaryReads,1,'El resultado primario completo no se recupera ni se vuelve a contabilizar durante la reparación');
 assert.deepEqual(checkpoint.provider_responses,{master:'resp_primary',repair:'resp_repair'});
});

test('el proyecto preparado rechaza recursos y materiales diarios indefinidos',()=>{
 assert.throws(()=>validateProjectMaster({...master,resources:['Soporte por definir']},decisions,dependents,['2026-04-13','2026-04-14']));
 assert.throws(()=>validateProjectMaster({...master,activities:master.activities.map(row=>({...row,materials:['Cuento por seleccionar']}))},decisions,dependents,['2026-04-13','2026-04-14']),/materiales/);
});

test("la docente puede conservar una sola pregunta y esa selección pasa al Master", async () => {
  const oneQuestion = { ...dependents, guiding_questions: ["¿Qué vemos?"] };
  assert.equal(validateProjectDependents(oneQuestion, decisions.competency_ids), oneQuestion);
  await generateProjectMaster({ context: { age: 5 }, decisions, dependents: oneQuestion,
    availableDates: ["2026-04-13", "2026-04-14"], createProvider: provider(master, (request) => {
      assert.deepEqual(request.ai_context_bundle.confirmed_questions, ["¿Qué vemos?"]);
    }), loadSkill: async () => "Skill" });
});

test("las fechas útiles excluyen fines de semana, feriados y gestión", () => {
  assert.deepEqual(instructionalDates(calendar, "2026-04-13", "2026-04-17"),
    ["2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"]);
  assert.deepEqual(instructionalDates(calendar, "2026-05-15", "2026-05-25"), ["2026-05-15", "2026-05-25"]);
});

test("Mi año entrega al Project Master ocho días reales: dos semanas con dos feriados", async () => {
  const effective = fixtureCalendar(), slot = solveAnnualJourneyCalendar(effective).projects[0];
  const selected = candidateProjectDates(effective.days,slot.starts_on,slot.ends_on).filter(day=>day.selected).map(day=>day.date);
  const dates = validateSelectedInstructionalDates(effective.days,selected,slot.starts_on,slot.ends_on);
  assert.equal(slot.duration_weeks,2);
  assert.deepEqual([slot.starts_on,slot.ends_on],["2026-03-30","2026-04-10"]);
  assert.equal(dates.length,8); assert.deepEqual(dates,slot.instructional_dates);
  assert.ok(!dates.includes("2026-04-02") && !dates.includes("2026-04-03"));
  const output = {...master,activities:dates.map((date,index)=>({...master.activities[index%2],title:`Exploración de plantas ${index+1}`,date}))};
  const generated = await generateProjectMaster({context:{age:5},decisions,dependents,availableDates:dates,
    createProvider:provider(output,request=>{
      assert.equal(request.ai_context_bundle.total_activities,8);
      assert.deepEqual(request.ai_context_bundle.instructional_dates,dates);
      assert.match(request.ai_context_bundle.task,/exactamente 8 actividades/);
    }),loadSkill:async()=>"Skill"});
  assert.equal(generated.output.activity_route.length,8);
  assert.deepEqual(generated.output.activity_route.map(item=>item.date),dates);
  assert.equal(generated.output.activity_blueprints,undefined);
});

test("Sol prepara primero contexto y propósitos, después solo dependencias del propósito elegido", async () => {
  const preview = await generateProjectPreview({ context: { age: 5 }, createProvider: provider({
    context_summary: "Hay plantas cercanas.", context_points: ["Hay un patio."],
    additional_context_example: "Hay árboles junto al aula.", purpose_options: ["Observar plantas.", "Comparar cambios."]
  }, (request) => { assert.equal(request.execution_plan.model, "gpt-6.1-sol");
    assert.equal(request.execution_plan.reasoning_effort, "medium");
    assert.equal(request.ai_context_bundle.confirmed_questions, undefined); }), loadSkill: async () => "Skill" });
  assert.equal(preview.output.purpose_options.length, 2);
  const next = await generateProjectDependents({ context: { age: 5 }, decisions,
    createProvider: provider(dependents, (request) => {
      assert.equal(request.ai_context_bundle.confirmed_decisions.purpose, decisions.purpose);
      assert.equal(request.execution_plan.model, "gpt-6.1-sol");
    }), loadSkill: async () => "Skill" });
  assert.equal(next.output.general_criteria[0].competency_id, "CYT_INDAGA");
});

test("Sol devuelve mapa con fechas y competencias válidas; el servidor asigna IDs", async () => {
  const generated = await generateProjectMaster({ context: { age: 5 }, decisions, dependents,
    availableDates: ["2026-04-13", "2026-04-14"],
    createProvider: provider(master, (request) => {
      assert.equal(request.execution_plan.model, "gpt-6.1-sol");
      assert.equal(request.execution_plan.reasoning_effort, "medium");
      assert.deepEqual(request.ai_context_bundle.confirmed_questions, dependents.guiding_questions);
    }), loadSkill: async () => "Skill" });
  assert.equal(generated.output.activity_route[0].date, "2026-04-13");
  assert.ok(generated.output.activity_route[0].id);
  assert.equal(generated.output.activity_route[0].position,1);
  assert.equal(generated.output.activity_route[0].primary_competency_id,"CYT_INDAGA");
  assert.deepEqual(generated.output.activity_route[0].possible_secondary_competency_ids,[]);
  assert.equal(generated.output.activity_route[0].evaluation_criterion, "Observa y compara cambios.");
  assert.deepEqual(generated.output.activity_route[0].acceptable_evidence_variations,["Explicación oral","Dibujo comentado"]);
  assert.throws(() => validateProjectMaster({ ...master, activities: [{ ...master.activities[0], date: "2026-04-26" }] },
    decisions, dependents, ["2026-04-13"]));
});

test("una regeneración localizada conserva el título editado por la docente en la misma fecha", () => {
  const old = [{ id: "11111111-1111-4111-8111-111111111111", date: "2026-04-13", title: "Título docente",
    specific_purpose: "Observar", competency_ids: ["CYT_INDAGA"], competency_id: "CYT_INDAGA",
    criterion_competency_id: "CYT_INDAGA", role_in_project: "Inicio", expected_progression: "Preguntas" }];
  const generated = [{ ...old[0], id: "22222222-2222-4222-8222-222222222222", title: "Título nuevo" }];
  const merged = preserveTeacherMapEdits(generated, old, [{ route_item_id: old[0].id, field: "title" }], decisions);
  assert.equal(merged[0].title, "Título docente");
  assert.equal(merged[0].id, old[0].id);
  assert.throws(() => validateEditedActivityMap([{ ...old[0], id: "inventado" }, old[0]], decisions, dependents,
    ["2026-04-13", "2026-04-14"]));
});

test("el criterio, no el orden de dos competencias, determina la principal del mapa", () => {
  const both = { ...decisions, competency_ids: ["CYT_INDAGA", "TRANS_AUTONOMO"] };
  const output = { ...master, activities: master.activities.map((item) => ({ ...item,
    competency_ids: both.competency_ids, criterion_competency_id: "TRANS_AUTONOMO", official_performance_refs: ["PCI2016.TRANS_AUTONOMO.5.03"], additional_criteria: [{ competency_id: "CYT_INDAGA", criterion_text: "Compara sus registros", expected_evidence: "Señala un cambio", observation_moments: ["development"], official_performance_refs: ["PCI2016.CYT_INDAGA.5.03"] }] })) };
  const validated = validateProjectMaster(output, both, dependents, ["2026-04-13", "2026-04-14"]);
  assert.equal(validated.activity_route[0].competency_id, "TRANS_AUTONOMO");
  const edited = validateEditedActivityMap(validated.activity_route, both, dependents, ["2026-04-13", "2026-04-14"]);
  assert.equal(edited[0].competency_id, "TRANS_AUTONOMO");
  assert.deepEqual(edited[0].possible_secondary_competency_ids, ["CYT_INDAGA"]);
});

test('un proyecto no puede dejar una competencia elegida fuera de todo su recorrido',()=>{
  assert.throws(()=>validateProjectMaster(master,{...decisions,competency_ids:['CYT_INDAGA','COM_ORAL']},dependents,['2026-04-13','2026-04-14']),error=>error.reason==='missing_competency_opportunity');
});

test("un borrador nuevo persiste solo un mapa canónico y conserva preguntas y criterios", () => {
  const validated = validateProjectMaster(master, decisions, dependents, ["2026-04-13", "2026-04-14"]);
  const details = projectDetails({ source: { title: "El huerto", primary_competency_ids: ["CYT_INDAGA"] },
    preview: { context_summary: "Hay plantas" }, decisions, dependents, master: validated });
  assert.equal(details.flow_version, "project-master-v2");
  assert.equal(details.project_master.activity_blueprints, undefined);
  assert.equal(details.activity_route.length, 2);
  assert.equal(details.dependents.guiding_questions[0], "¿Qué vemos?");
  assert.equal(details.dependents.general_criteria[0].competency_id, "CYT_INDAGA");
});


test("proyecto moderno: una generación high, calendario exacto y formal por código", async () => {
  const calls=[];
  const context={modern:true,age:5};
  const generated=await generateProjectMaster({context,decisions,availableDates:["2026-04-13","2026-04-14"],createProvider:provider({...master,...dependents},request=>calls.push(request)),loadSkill:async()=>"Skill"});
  assert.equal(calls.length,1);
  assert.equal(calls[0].execution_plan.model,"gpt-6.1-sol");
  assert.equal(calls[0].execution_plan.reasoning_effort,"high");
  assert.equal(calls[0].output_schema.properties.foundation.maxLength,1500);
  assert.match(calls[0].ai_context_bundle.task,/hasta 1200 caracteres, con frases completas/);
  assert.equal(calls[0].output_schema.properties.activities.items.properties.mediation_notes.maxLength,800);
  assert.equal(generated.dependents.general_criteria.length,1);
  const details=projectDetails({source:{title:"Plantas",primary_competency_ids:["CYT_INDAGA"]},preview:{context_summary:"Propuesta docente"},decisions,dependents:generated.dependents,master:generated.output});
  const formal=await generateProjectFormal({context:{modern:true,confirmed_project_master:details},createProvider:()=>{throw new Error("Formal no debe facturar");}});
  assert.equal(formal.metadata.provider_calls,0);
  assert.ok(formal.output.foundation);
  assert.equal(details.project_master.meaningful_situation,master.meaningful_situation);
  assert.equal(formal.output.situation,master.meaningful_situation);
  assert.ok(calls[0].output_schema.required.includes('meaningful_situation'));
  assert.match(calls[0].ai_context_bundle.task,/incluido additional_context/);
  assert.match(calls[0].ai_context_bundle.task,/invitación docente basada en una oportunidad curricular/);
  assert.match(calls[0].ai_context_bundle.task,/conserva el alcance individual o de subgrupo/);
});

test('una situación ausente se repara con las mismas fuentes y sin inventar contexto',async()=>{
  for(const value of [undefined,'','a'.repeat(1201)])assert.throws(()=>validateProjectMaster({...master,meaningful_situation:value},decisions,dependents,['2026-04-13','2026-04-14']),error=>error.reason==='missing_meaningful_situation');
  const calls=[],confirmed={...decisions,additional_context:'La docente confirma acceso acompañado al huerto cercano.'};
  const result=await generateProjectMaster({context:{modern:true,age:5},decisions:confirmed,availableDates:['2026-04-13','2026-04-14'],loadSkill:async()=> 'Skill',createProvider:()=>({generate:async request=>{
    calls.push(request);return {output:{...master,...dependents,...(calls.length===1?{meaningful_situation:''}:{})}};
  }})});
  assert.equal(calls.length,2);assert.equal(result.metadata.repair_used,true);
  assert.deepEqual(calls[1].ai_context_bundle.confirmed_decisions,confirmed);
  assert.match(calls[1].ai_context_bundle.task,/No inventes curiosidades/);
  assert.equal(result.output.meaningful_situation,master.meaningful_situation);
});

test("una fundamentación fuera del límite se repara sin relajar el contrato ni cambiar fuentes",async()=>{
  const calls=[];
  const createProvider=()=>({generate:async request=>{calls.push(request);return {output:calls.length===1?{...master,...dependents,foundation:"a".repeat(1501)}:{...master,...dependents}};}});
  const result=await generateProjectMaster({context:{modern:true,age:5},decisions,availableDates:["2026-04-13","2026-04-14"],createProvider,loadSkill:async()=>"Skill"});
  assert.equal(calls.length,2);assert.equal(result.metadata.repair_used,true);
  assert.equal(calls[1].ai_context_bundle.invalid_output.foundation.length,1501);
  assert.equal(calls[1].output_schema.properties.foundation.maxLength,1500);
  assert.deepEqual(calls[1].ai_context_bundle.confirmed_decisions,decisions);
  assert.ok(result.output.foundation.length<=1500);
});

test("proyecto moderno: repara una sola vez fechas inválidas y conserva decisiones", async()=>{
  const calls=[];
  const createProvider=()=>({generate:async request=>{calls.push(request);return {output:calls.length===1?{...master,...dependents,activities:master.activities.slice(0,1)}:{...master,...dependents}};}});
  const result=await generateProjectMaster({context:{modern:true,age:5},decisions,availableDates:["2026-04-13","2026-04-14"],createProvider,loadSkill:async()=>"Skill"});
  assert.equal(calls.length,2);assert.equal(result.metadata.repair_used,true);
  assert.deepEqual(calls[1].ai_context_bundle.confirmed_decisions,decisions);
  await assert.rejects(()=>generateProjectMaster({context:{modern:true,age:5},decisions,availableDates:["2026-04-13","2026-04-14"],createProvider:provider({...master,...dependents,activities:[]}),loadSkill:async()=>"Skill"}));
});
test('la nueva guía llega del Master al proyecto y a la actividad sin perder decisiones ni apoyos', async () => {
  const {canonicalProjectDetails,canonicalProjectRoute}=await import('./planning-contract-v3.mjs');
  const {saveActivityDetails}=await import('./experience-lineage.mjs');
  const planning={shared_challenge:'¿Cómo cambian las plantas?',planning_with_children:'Recojan preguntas, propongan acciones y ordenen juntos qué observar.',child_decisions:'Eligen qué planta observar primero.',organization:'Trabajan en una mesa con sus registros.',mediation:'Pregunta qué cambió y pide mostrarlo.',age_support:'Permite señalar antes de explicar.',closing_review:'Comparen los registros con sus primeras preguntas.',transversal_approaches:[{name:'Enfoque ambiental',attitude:'Cuidan las plantas.',teacherAction:'Acompaña el cuidado sin reemplazar las decisiones.'}]};
  const generated=await generateProjectMaster({context:{modern:true,age:5},decisions,availableDates:['2026-04-13','2026-04-14'],loadSkill:async()=> 'Skill',createProvider:provider({...master,...dependents,meaningful_situation:'Los niños del aula exploran las plantas y preguntan cómo cambian.',document_planning:planning,activities:master.activities.map((row,index)=>({...row,title:index===0?'Planificamos el proyecto con los niños':row.title,child_decisions:index===0?'Eligen qué pregunta explorar.':'Eligen qué registro mostrar.'}))},request=>{
    assert.ok(request.output_schema.required.includes('document_planning'));
    assert.ok(request.output_schema.properties.activities.items.required.includes('child_decisions'));
  })});
  const details=canonicalProjectDetails(projectDetails({source:{title:'Plantas',primary_competency_ids:['CYT_INDAGA']},preview:{context_summary:'Observamos plantas cercanas.'},decisions,dependents:generated.dependents,master:generated.output}));
  assert.deepEqual(details.project_master.document_planning,planning);
  const route=canonicalProjectRoute(details)[0],activity=saveActivityDetails({purpose:route.specific_purpose,competency_id:route.competency_id,evaluation_criterion:route.evaluation_criterion,expected_evidence:route.expected_evidence},route);
  assert.equal(activity.child_decisions,'Eligen qué pregunta explorar.');
  assert.equal(activity.age_support,planning.age_support);
  assert.equal(activity.age_mediation,planning.mediation);
  assert.equal(activity.document_template_version,'activity-unified-v1');
  assert.throws(()=>validateProjectMaster({...generated.output,meaningful_situation:'La docente relata que los niños encontraron semillas.'},decisions,generated.dependents,['2026-04-13','2026-04-14']),error=>error.reason==='adult_centered_meaningful_situation');
  for(const approaches of [[{...planning.transversal_approaches[0],name:'Cuidado de lo compartido'}],[planning.transversal_approaches[0],planning.transversal_approaches[0]]]){
    assert.throws(()=>validateProjectMaster({...generated.output,document_planning:{...planning,transversal_approaches:approaches}},decisions,generated.dependents,['2026-04-13','2026-04-14']),error=>error.reason==='incomplete_document_planning');
  }
});
