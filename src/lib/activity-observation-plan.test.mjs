import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { saveOrdinaryObservation } from "./ordinary-observation-service.mjs";
import { loadConfirmedOrdinaryEvaluationRows } from "./ordinary-evaluation-adapter.mjs";
import { stampProjectV3 } from "./project-v3-snapshot.mjs";
import { stampActivityV3, activityCriteriaV3 } from "./activity-v3-snapshot.mjs";
import { generateTeacherActivity } from "./ai-activity-ui-service.mjs";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";
import { validateActivityV4 } from "./activity-v4-validation.mjs";
import { activityPedagogicalBlocks } from "./pedagogical-blocks.mjs";
import { criterionMoments, validCriterionMoments } from "./activity-observation-plan.mjs";
import { resourceReadiness, assertResourceReadiness } from "./project-resource-readiness.mjs";

test("varias etiquetas explícitas de observación conservan los dos momentos y rechazan valores ajenos",()=>{
  assert.deepEqual(criterionMoments({},"Desarrollo: al comparar. Cierre: al explicar."),["development","closure"]);
  assert.deepEqual(criterionMoments({},"Desarrollo o Cierre: al comparar y explicar."),["development","closure"]);
  assert.equal(validCriterionMoments(["development","development"]),false);
  assert.equal(validCriterionMoments(["recreo"]),false);
});

test("recursos inciertos requieren confirmación explícita para esa propuesta y no alteran el original",()=>{
  const proposal={materials:["Macetas del patio, acceso por confirmar","Crayones"]},before=JSON.stringify(proposal);
  assert.throws(()=>resourceReadiness(proposal,false,"teacher"),/Confirma/);
  const receipt=resourceReadiness(proposal,true,"teacher");assertResourceReadiness(proposal,receipt);
  assert.throws(()=>assertResourceReadiness({materials:["Huerto, acceso por confirmar"]},receipt),/Confirma/);
  assert.equal(resourceReadiness({materials:["Crayones"]},false,"teacher"),null);
  assert.equal(JSON.stringify(proposal),before);
});

test("tres competencias atraviesan generación, confirmación real y momentos sin perder criterios ni crear overrides",async()=>{
  const db=new PGlite();try{
    for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
    const teacher=randomUUID(), classroom=await createPilotClassroom(db,teacher,{teacherName:"Elena",institutionName:"Semillas",section:"Celeste",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    const ids=["CYT_INDAGA","COM_ORAL","MAT_CANTIDAD"],date="2026-10-19";
    const route={id:randomUUID(),date,number:1,title:"Comparamos semillas",specific_purpose:"Observar, contar y explicar diferencias",competency_id:ids[0],criterion_competency_id:ids[0],competency_ids:ids,
      evaluation_criterion:"Compara dos semillas",expected_evidence:"Señala una diferencia visible",observation_moments:["development"],observation_focus:["Qué diferencia encuentra"],materials:["Semillas"],mediation_notes:"Permite mirar y contar",expected_progression:"Compara lo que encontró",official_performance_refs:["PCI2016.CYT_INDAGA.5.03"],
      additional_criteria:[{competency_id:ids[1],criterion_text:"Explica lo que encontró y escucha a otro niño",expected_evidence:"Su explicación y una respuesta a su compañero",observation_moments:["closure"],official_performance_refs:["PCI2016.COM_ORAL.5.02"]},
        {competency_id:ids[2],criterion_text:"Cuenta las semillas que agrupó",expected_evidence:"Usa el conteo al comparar sus grupos",observation_moments:["development","closure"],official_performance_refs:["PCI2016.MAT_CANTIDAD.5.05"]}]};
    const project={id:randomUUID(),version:1,status:"draft",title:route.title,purpose:route.specific_purpose,details:{
      decisions:{purpose:route.specific_purpose,context_summary:"Interés por semillas",competency_ids:ids},dependents:{guiding_questions:["¿Cuántas hay?"],journey:[{title:"Mirar",description:"Comparar"}],general_criteria:ids.map(id=>({competency_id:id,criterion:id,expected_evidence:["Actuación"]}))},
      project_master:{foundation:"Preguntas sobre semillas",resources:["Semillas"],closing_description:"Compartir hallazgos"},activity_route:[route]}};
    project.details=stampProjectV3(project,project.details,{plan:{id:randomUUID(),version:1},proposalId:randomUUID(),slot:{id:randomUUID()},source:{title:route.title}},"kb-test",[date]);project.status="active";
    assert.equal(project.details.activity_route[0].criterion_refs.length,3);
    await db.query("insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details) values($1,$2,'project',$3,$4,$5,$5,'active',$6::jsonb)",[project.id,classroom.classroomId,project.title,project.purpose,date,JSON.stringify(project.details)]);
    const before=JSON.stringify(project),plan={workflow:"activity",model:"mock",provider:"mock",reasoning_effort:"medium"};
    const generated=await generateTeacherActivity({request:{routeItemId:route.id},classroom:{age:5,id:classroom.classroomId},learningExperience:project,resolvePlan:()=>plan,createProvider:()=>({}),loadSkill:async()=>"",
      generate:async(input)=>{assert.deepEqual(input.competency_ids,ids);assert.deepEqual(input.learning_experience_context.inherited_route_item.additional_criteria,route.additional_criteria);
        return {output:{title:route.title,purpose:"Ignorar",meaningful_situation:"Mirar semillas",teacher_preparation:"Preparar las semillas",child_actions:"Inicio: Eligen semillas.\nDesarrollo: Miran, agrupan y cuentan.\nCierre: Explican lo que encontraron.",mediation:"Inicio: Ofrece semillas.\nDesarrollo: Pregunta qué ven.\nCierre: Escucha sus explicaciones.",evidence_opportunities:"Desarrollo: al comparar. Cierre: al explicar.",closure_or_continuity:"Guardar sus grupos",competency_status:"confirmed",competency_id:ids[0]},metadata:{workflow:"activity",model:"mock",execution_plan:plan}};}});
    validateActivityV4(generated.proposal,new Set(ids));
    const activity={id:randomUUID(),experience_id:project.id,status:"draft",version:1,occurs_on:date};
    const details=stampActivityV3(activity,generated.proposal,project),criteria=activityCriteriaV3(details);
    assert.throws(()=>stampActivityV3(activity,{...generated.proposal,official_performance_refs:["PCI2016.CYT_INDAGA.5.01"]},project),/conserva los desempeños/);
    assert.deepEqual(details.teacher_overrides,[]);assert.deepEqual(criteria.map(item=>item.competency_id),ids);
    await db.query("insert into activities(id,experience_id,occurs_on,title,purpose,status,details) values($1,$2,$3,$4,$5,'draft',$6::jsonb)",[activity.id,project.id,date,route.title,route.specific_purpose,JSON.stringify(details)]);
    await confirmActivityWithCriterion(db,activity.id,criteria);
    const rows=(await db.query("select * from activity_criteria where activity_id=$1 and status='active'",[activity.id])).rows;
    assert.equal(rows.length,3);const blocks=activityPedagogicalBlocks(details,[],rows),find=id=>rows.find(row=>row.competency_v4_id===id).id;
    for (const row of rows) assert.deepEqual(row.details.official_performance_refs, [route,...route.additional_criteria].find(item=>(item.competency_id??item.criterion_competency_id)===row.competency_v4_id).official_performance_refs);
    assert.equal(blocks[0].observations,undefined);
    assert.deepEqual(new Set(blocks[1].observations.map(item=>item.id)),new Set([find(ids[0]),find(ids[2])]));
    assert.deepEqual(new Set(blocks[2].observations.map(item=>item.id)),new Set([find(ids[1]),find(ids[2])]));
    const students=await importStudentsForTeacher(db,teacher,[{firstName:"Ana",lastName:"Ramírez"}],{returnReceipt:true});
    const capture={studentId:students.studentIds[0],clientRequestId:randomUUID(),sourceKind:"guided",activityId:activity.id,criterionId:find(ids[1]),momentId:"closure",rawText:"Mostró su grupo de semillas y respondió la pregunta de su compañero."};
    const saved=await saveOrdinaryObservation(db,teacher,capture,{occurredAt:new Date(date+"T15:00:00Z")});
    assert.equal(saved.observation.context_snapshot.captured_competency_id,ids[1]);assert.equal(saved.observation.context_snapshot.moment_id,"closure");
    assert.equal((await saveOrdinaryObservation(db,teacher,capture,{occurredAt:new Date(date+"T15:00:00Z")})).created,false);
    await assert.rejects(()=>saveOrdinaryObservation(db,teacher,{...capture,clientRequestId:randomUUID(),momentId:"development"}),/momento/);
    const evaluation=await loadConfirmedOrdinaryEvaluationRows(db,{classroomId:classroom.classroomId,period:{starts_on:date,ends_on:date}});
    assert.equal(evaluation.length,1);assert.equal(evaluation[0].competency_v4_id,ids[1]);assert.equal(evaluation[0].criterion_id,find(ids[1]));assert.equal(evaluation[0].observation_text,capture.rawText);
    assert.equal(JSON.stringify(project),before);await assert.rejects(()=>confirmActivityWithCriterion(db,activity.id,criteria),/confirmada/);
    assert.equal((await db.query("select count(*)::int as n from activity_criteria where activity_id=$1",[activity.id])).rows[0].n,3);
  }finally{await db.close();}
});
