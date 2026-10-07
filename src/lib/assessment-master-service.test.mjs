import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createAssessmentMasterRouteHandler } from "../../scripts/assessment-master-routes.mjs";
import { assessmentMasterSourceSnapshot, validateAssessmentMaster } from "./assessment-master-service.mjs";

const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const teacherA=id(1),teacherB=id(2),yearA=id(11),yearB=id(12),classA=id(21),classB=id(22),periodA=id(31),periodB=id(32);
const proposal = { period_summary:"Durante el período se trabajó la comunicación oral en situaciones de juego.",competencies:[{
  competency_id:"COM_ORAL",short_label:"Se comunica",area:"Comunicación",assessment_focus:"Cómo comunica ideas relacionadas con la situación.",
  criteria_worked:["Explica una idea relacionada con el juego."],relevant_evidence:["Explicaciones registradas en actividades."],patterns_to_consider:["Respuesta en más de una situación."],
  progress_signals:["Amplía sus explicaciones."],support_signals:["Requiere preguntas abiertas para continuar."],
  insufficient_information_rules:["Una sola respuesta aislada no permite concluir."],
  contradiction_handling:"Conservar las diferencias y pedir a la docente que contraste las situaciones.",
  context_considerations:["Considerar los apoyos disponibles."],teacher_questions:["¿Ocurrió en otras situaciones?"],
  prohibited_inferences:["No asignar un nivel por una observación aislada."],
  assessment_guidance:"Revisar el conjunto de evidencias antes de proponer una valoración.",
}]};

test("snapshot y contrato del Assessment Master son deterministas y cubren cada competencia",()=>{
  const source={evaluation_period_id:periodA,starts_on:"2026-03-16",ends_on:"2026-05-15",competency_ids:["COM_ORAL"],
    experience_revisions:[`${id(41)}:1`],activity_revisions:[`${id(51)}:1`],criterion_revisions:[`${id(61)}:1`]};
  assert.equal(assessmentMasterSourceSnapshot(source).fingerprint,assessmentMasterSourceSnapshot({...source,competency_ids:["COM_ORAL"]}).fingerprint);
  assert.notEqual(assessmentMasterSourceSnapshot(source).fingerprint,assessmentMasterSourceSnapshot({...source,criterion_revisions:[`${id(61)}:2`]}).fingerprint);
  assert.deepEqual(validateAssessmentMaster(proposal,["COM_ORAL"]),proposal);
  assert.throws(()=>validateAssessmentMaster({...proposal,competencies:[]},["COM_ORAL"]),/cada competencia/);
  assert.throws(()=>validateAssessmentMaster({...proposal,competencies:[{...proposal.competencies[0],competency_id:"OTRA"}]},["COM_ORAL"]),/inválida/);
});

async function fixture(){
  const db=await PGlite.create();
  await db.exec(`create table profiles(user_id uuid primary key);create table school_years(id uuid primary key,owner_id uuid);
    create table classrooms(id uuid primary key,school_year_id uuid,teacher_id uuid);
    create table evaluation_periods(id uuid primary key,school_year_id uuid,label text,starts_on date,ends_on date);
    create table learning_experiences(id uuid primary key,classroom_id uuid,status text,starts_on date,ends_on date,revision integer,details jsonb);
    create table activities(id uuid primary key,experience_id uuid,status text,occurs_on date,revision integer,details jsonb);
    create table activity_criteria(id uuid primary key,activity_id uuid,status text,competency_v4_id text,criterion_text text,revision integer,details jsonb);
    create table competency_assessments(id uuid primary key);`);
  await db.exec(await readFile(new URL("../../local-db/migrations/0054_assessment_masters.sql",import.meta.url),"utf8"));
  await db.query(`insert into profiles values($1),($2)`,[teacherA,teacherB]);
  await db.query(`insert into school_years values($1,$2),($3,$4)`,[yearA,teacherA,yearB,teacherB]);
  await db.query(`insert into classrooms values($1,$2,$3),($4,$5,$6)`,[classA,yearA,teacherA,classB,yearB,teacherB]);
  await db.query(`insert into evaluation_periods values($1,$2,'Bimestre 1','2026-03-16','2026-05-15'),($3,$4,'Bimestre 1','2026-03-16','2026-05-15')`,[periodA,yearA,periodB,yearB]);
  for(const [n,classroom] of [[1,classA],[2,classB]]){
    const experience=id(40+n),activity=id(50+n),criterion=id(60+n);
    await db.query(`insert into learning_experiences values($1,$2,'active','2026-03-16','2026-05-15',1,$3::jsonb)`,
      [experience,classroom,JSON.stringify({flow_version:"project-master-v2",project_master:{activity_blueprints:[]}})]);
    await db.query(`insert into activities values($1,$2,'active','2026-04-10',1,$3::jsonb)`,
      [activity,experience,JSON.stringify({purpose:"Comunicar una idea."})]);
    await db.query(`insert into activity_criteria values($1,$2,'active','COM_ORAL','Explica una idea relacionada con el juego.',1,$3::jsonb)`,
      [criterion,activity,JSON.stringify({expected_evidence:"Explicación oral",observation_focus:["Relación con el juego"]})]);
  }
  const contexts=new Map([[teacherA,{id:classA,school_year_id:yearA,age:5,calendar:{},group_context:"Grupo A"}],
    [teacherB,{id:classB,school_year_id:yearB,age:5,calendar:{},group_context:"Grupo B"}]]);
  const handlers=new Map();
  const providerOptions=[];
  for(const teacherId of [teacherA,teacherB]){
    const pending=new Map(),responses=[];
    const handler=createAssessmentMasterRouteHandler({db,teacherId,annualPlanningContext:async()=>contexts.get(teacherId),
      readJson:async(request)=>request.body,send:(_response,status,body)=>responses.push({status,body}),pending,
      metadataForAudit:(metadata)=>metadata,loadKnowledgeBase:async()=>({competencyCards:[{id:"COM_ORAL",runtime_selectable_by_age:{"5":true}}]}),
      createProvider:(_plan,options)=>{providerOptions.push(options);return {};},generate:async()=>({output:proposal,metadata:{model:"mock-sol"}})});
    handlers.set(teacherId,async(method,path,body)=>{responses.length=0;await handler({request:{method,body},url:new URL(`http://local${path}`),response:{},origin:null});return responses[0];});
  }
  return {db,callA:handlers.get(teacherA),callB:handlers.get(teacherB),providerOptions};
}

test("versiona, confirma, detecta cambios y aísla dos docentes y aulas",async()=>{
  const f=await fixture();
  const generated=await f.callA("POST","/api/ai/assessment-masters/generate",{periodId:periodA});
  assert.equal(generated.status,200,JSON.stringify(generated.body));
  assert.deepEqual(f.providerOptions,[],"El contexto se calcula sin proveedor IA.");
  assert.equal((await f.callA("POST","/api/assessment-masters",{periodId:periodA,proposal:generationSafe(generated),generationId:generated.body.generation_id})).status,200);
  const draft=(await f.callA("GET",`/api/assessment-masters?periodId=${periodA}`)).body.current;
  assert.equal(draft.status,"draft");
  assert.equal((await f.callB("GET",`/api/assessment-masters?periodId=${periodA}`)).status,422);
  assert.equal((await f.callB("PUT",`/api/assessment-masters/${draft.id}`,{proposal})).status,422);
  const confirmed=await f.callA("POST",`/api/assessment-masters/${draft.id}/confirm`);
  assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
  const active=(await f.callA("GET",`/api/assessment-masters?periodId=${periodA}`)).body.current;
  assert.equal(active.status,"active");assert.equal(active.stale,false);
  assert.equal((await f.callB("POST",`/api/assessment-masters/${active.id}/copy`)).status,422);
  await f.db.query(`update activity_criteria set revision=2 where activity_id=$1`,[id(51)]);
  assert.equal((await f.callA("GET",`/api/assessment-masters?periodId=${periodA}`)).body.current.stale,true);
  await f.db.close();
});

function generationSafe(response){return response.body.proposal;}

test("la migración remota limita lectura al aula propia y bloquea escrituras directas",async()=>{
  const sql=await readFile(new URL("../../supabase/migrations/202609260003_assessment_masters.sql",import.meta.url),"utf8");
  assert.match(sql,/alter table public\.assessment_masters enable row level security/);
  assert.match(sql,/private\.owns_classroom\(classroom_id\)/);
  assert.match(sql,/revoke insert,update,delete,truncate,references,trigger on public\.assessment_masters from authenticated/);
  assert.match(sql,/revoke all on public\.assessment_masters from anon/);
});
