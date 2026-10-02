import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { validatePlanningPreferences, teacherIdeaPlacements } from "./annual-planning-preferences.mjs";
import { generateAnnualPreplan, PERSONALIZED_PREPLAN_OUTPUT_SCHEMA, validateAnnualPreplan, validatePreplanTrace } from "./annual-preplan-service.mjs";
import { preparePersonalization, savePersonalizationDraft, confirmPersonalization } from "./annual-personalization-service.mjs";
import { saveRegeneratedAnnualDraft } from "./annual-preplan-regeneration.mjs";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { ensureSchoolCalendar } from "./school-calendar-service.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026 } from "./annual-plan-calendar.mjs";
import { confirmAnnualPlanVersion } from "./annual-plan-version-service.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const teacher = id(901);
const curriculum = [{id:"COM_ORAL",name:"Comunicación oral"}];
const calendar = {school_year:2026,blocks:nationalCalendarBlocks2026(),initial_stage:defaultInitialStage()};
const ideas = [
  {id:id(10),title:"Los animales de nuestra comunidad",explanation:"Explorar los animales que vemos cerca del jardín.",requested_month:10},
  {id:id(11),title:"Un huerto en enero",explanation:"Sembrar con las familias.",requested_month:1},
  {id:id(12),title:"Colección de cuentos",explanation:"Compartir historias.",requested_month:null},
];
const details = {group_profile:"Estamos conociendo al grupo.",interests:[],priorities:[],context_opportunities:[],classroom_conditions:[],
  evidence_coverage:{observations:0},needs_more_observation:["Seguir observando."],additional_notes:""};
async function generate(context, { ideas: teacherIdeas = ideas, mutate = (output) => output } = {}) {
  let request;
  const preferences = {version:1,teacher_ideas:teacherIdeas};
  const result = await generateAnnualPreplan({context:{...context,personalization:{id:context.preparationId ?? id(20),details:{...context.details ?? details,planning_preferences:preferences}}},curriculum,
    loadSkill:async()=>"Guía vigente",createProvider:()=>({generate:async(value)=>{
      request=value;
      const slotRows = value.ai_context_bundle.initial_slots;
      const october = slotRows.findIndex((slot)=>slot.month===10);
      const output={proposals:slotRows.map((slot,i)=>({experience_type:"project",title:`Exploramos nuestro entorno ${i+1}`,
        period:slot.period,month:slot.month,duration_weeks:slot.duration_weeks,rationale:"Razón",purpose:"Conversar y explorar el entorno.",primary_competency_ids:["COM_ORAL"],
        source_interest_keys:[],source_priority_keys:[],source_context_keys:[],source_condition_keys:[],
        ...(teacherIdeas.length ? {source_teacher_idea_keys:i===october?["h1"]:i===2&&teacherIdeas[1]?["h2"]:[],planning_origin:i===october||i===2&&teacherIdeas[1]?"teacher_idea":"diagnosis"}:{} )})),
        ...(teacherIdeas.length ? {idea_feedback:teacherIdeas.map((_,i)=>({idea_key:`h${i+1}`,explanation:i===0?"Se propone explorar los animales en octubre junto con comunicación oral.":i===1?"Enero está fuera de los períodos lectivos del calendario. Se propone sembrar durante abril.":"Esta idea no se incorporó en estas doce propuestas para evitar repetir experiencias; puede revisarse más adelante."}))}: {})};
      return {output:mutate(output),provider_metadata:{}};
    }})});
  return {result,request};
}
const base = {id:id(2),year:2026,age:5,calendar,source_diagnostic_review_id:null,source_priority_review_id:null};

test("preferencias admiten cero, una y varias ideas, mes opcional y rechazan datos inválidos",()=>{
  for(const count of [0,1,3]) assert.equal(validatePlanningPreferences({version:1,teacher_ideas:ideas.slice(0,count)}).teacher_ideas.length,count);
  assert.equal(validatePlanningPreferences(undefined),undefined);
  for(const invalid of [{...ideas[0],title:""},{...ideas[0],requested_month:13},{...ideas[0],requested_month:"10"}])
    assert.throws(()=>validatePlanningPreferences({version:1,teacher_ideas:[invalid]}),/necesita/);
  assert.throws(()=>validatePlanningPreferences({version:1,teacher_ideas:[ideas[0],ideas[0]]}),/necesita/);
});

test("sin ideas conserva esquema y generación anteriores; no crea señales diagnósticas",async()=>{
  const {result,request}=await generate(base,{ideas:[]});
  assert.deepEqual(request.output_schema,PERSONALIZED_PREPLAN_OUTPUT_SCHEMA);
  assert.equal(request.ai_context_bundle.planning_preferences,undefined);
  assert.equal(result.proposal.proposed_experiences.length,12);
  assert.deepEqual(request.ai_context_bundle.confirmed_priorities,[]);
  assert.equal(result.proposal.teacher_idea_feedback,undefined);
});

test("ideas son fuente separada, respetan octubre y explican alternativa de enero y una omisión",async()=>{
  const {result,request}=await generate(base);
  assert.equal(request.ai_context_bundle.planning_preferences.teacher_ideas.length,3);
  assert.deepEqual(request.ai_context_bundle.confirmed_priorities,[]);
  assert.deepEqual(request.ai_context_bundle.personalization.interests,[]);
  assert.match(request.ai_context_bundle.task,/nunca evidencia/);
  const placements=teacherIdeaPlacements(result.proposal);
  assert.equal(placements[0].outcome,"incorporated");assert.deepEqual(placements[0].months,[10]);
  assert.equal(placements[1].outcome,"alternative");assert.match(placements[1].explanation,/Enero.*fuera/);
  assert.equal(placements[2].outcome,"not_incorporated");assert.match(placements[2].explanation,/no se incorporó/);
  const reloaded=validateAnnualPreplan(JSON.parse(JSON.stringify(result.proposal)),["COM_ORAL"],2026);
  assert.deepEqual(reloaded,result.proposal);
  assert.ok(result.proposal.proposed_experiences.some((row)=>row.planning_origin==="teacher_idea"&&row.source_teacher_idea_ids.includes(ideas[0].id)));
  assert.throws(()=>validatePreplanTrace({...result.proposal,planning_preferences:{version:1,teacher_ideas:[]}}, {...details,planning_preferences:{version:1,teacher_ideas:ideas}}),/preparación confirmada/);
});

test("citas inventadas y explicaciones ausentes no llegan a persistencia",async()=>{
  await assert.rejects(generate(base,{mutate:(output)=>({...output,idea_feedback:[]})}),/explicar/);
  await assert.rejects(generate(base,{mutate:(output)=>({...output,proposals:output.proposals.map((row,i)=>i?row:{...row,source_teacher_idea_keys:["h99"]})})}),/inexistente/);
});

test("nombres de niños en ideas no se envían al proveedor y el título docente se conserva",async()=>{
  const namedIdea={...ideas[0],title:"Historias de Lucía Flores",explanation:"Lucía Flores contó una historia."};
  const {result,request}=await generate({...base,student_names:["Lucía","Flores","Lucía Flores"]},{ideas:[namedIdea]});
  assert.doesNotMatch(JSON.stringify(request.ai_context_bundle.planning_preferences),/Lucía|Flores/);
  assert.equal(result.proposal.planning_preferences.teacher_ideas[0].title,namedIdea.title);
});

test("ideas persisten en su preparación y regenerar solo actualiza el borrador autorizado con revisión vigente",async()=>{
  const db=await PGlite.create();
  try {
    const directory=new URL("../../local-db/migrations/",import.meta.url);
    for(const name of (await readdir(directory)).filter((name)=>name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name,directory),"utf8"));
    const created=await createPilotClassroom(db,teacher,{teacherName:"María",institutionName:"Jardín Los Pinos",section:"Mariposas",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    await importStudentsForTeacher(db,teacher,[{firstName:"Lucía",lastName:"Flores",preferredName:""}]);
    await ensureSchoolCalendar(db,created.schoolYearId);
    const context={...base,id:created.classroomId,school_year_id:created.schoolYearId,available_resources:[],annual_planning_context:{},context_v4:{source_fingerprint:"classroom"}};
    const first=await preparePersonalization(db,teacher,context);
    const confirmed=await confirmPersonalization(db,teacher,context,first.id,first.details,first.snapshot);
    const activeId=randomUUID(), draftId=randomUUID();
    const curriculumVersion=(await db.query("select id from curriculum_versions limit 1")).rows[0].id;
    const original=(await generate({...context,preparationId:confirmed.id,details:confirmed.details},{ideas:[]})).result.proposal;
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,source_personalization_review_id)
      values($1,$2,$3,$4,1,'active',$5::jsonb,'{}',$6)`,[activeId,context.id,context.school_year_id,curriculumVersion,JSON.stringify(original),confirmed.id]);
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,source_personalization_review_id,supersedes_plan_id)
      values($1,$2,$3,$4,2,'draft',$5::jsonb,'{}',$6,$7)`,[draftId,context.id,context.school_year_id,curriculumVersion,JSON.stringify(original),confirmed.id,activeId]);
    const next=await preparePersonalization(db,teacher,context,{refresh:true});
    const saved=await savePersonalizationDraft(db,teacher,context,next.id,{...next.details,planning_preferences:{version:1,teacher_ideas:ideas}},next.snapshot);
    assert.deepEqual((await preparePersonalization(db,teacher,context)).details.planning_preferences.teacher_ideas,ideas);
    assert.deepEqual(saved.details.priorities,confirmed.details.priorities);
    assert.deepEqual(saved.details.evidence_coverage,confirmed.details.evidence_coverage);
    const updatedIdeas=ideas.slice(0,2).map((idea,i)=>i?idea:{...idea,title:"Los animales que conocemos"});
    const edited=await savePersonalizationDraft(db,teacher,context,saved.id,{...saved.details,planning_preferences:{version:1,teacher_ideas:updatedIdeas}},saved.snapshot);
    const newPreparation=await confirmPersonalization(db,teacher,context,edited.id,edited.details,edited.snapshot);
    const generated=(await generate({...context,preparationId:newPreparation.id,details:newPreparation.details},{ideas:updatedIdeas})).result;
    await assert.rejects(saveRegeneratedAnnualDraft(db,id(999),context,draftId,1,generated,{}),/versión|disponible/);
    const replaced=await saveRegeneratedAnnualDraft(db,teacher,context,draftId,1,generated,{});
    assert.equal(replaced.status,"draft");assert.ok(replaced.revision>1);
    await assert.rejects(saveRegeneratedAnnualDraft(db,teacher,context,draftId,1,generated,{}),/versión|cambió/);
    assert.equal((await db.query("select status from annual_plans where id=$1",[activeId])).rows[0].status,"active");
    assert.deepEqual((await db.query("select proposal from annual_plans where id=$1",[activeId])).rows[0].proposal,original);
    assert.deepEqual((await db.query("select details from annual_personalization_reviews where id=$1",[confirmed.id])).rows[0].details,confirmed.details);
    const reloaded=(await db.query("select proposal from annual_plans where id=$1",[draftId])).rows[0].proposal;
    assert.deepEqual(reloaded.planning_preferences.teacher_ideas,updatedIdeas);
    await confirmAnnualPlanVersion(db,context,draftId,replaced.revision,async(row)=>validatePreplanTrace(row.proposal,newPreparation.details));
    assert.equal((await db.query("select status from annual_plans where id=$1",[activeId])).rows[0].status,"archived");
    assert.equal((await db.query("select status from annual_plans where id=$1",[draftId])).rows[0].status,"active");
  } finally {await db.close();}
});
