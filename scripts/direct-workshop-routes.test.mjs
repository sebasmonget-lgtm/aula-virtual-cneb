import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile,readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "../src/lib/pilot-onboarding-service.mjs";
import { handleDirectWorkshop } from "./direct-workshop-routes.mjs";
import { generateDirectWorkshop } from "../src/lib/workshop-master-service.mjs";

const proposal={title:"Dibujamos lo que miramos",purpose:"Compartir una idea sobre las semillas",workshop_type:"gráfico-plástico",competency_id:"COM_ORAL",sheet_id:null,materials:["Papel","Colores"],criterion_or_observation_focus:"Explica una idea con palabras o gestos",opening:"Recordar lo que probaron",development:"Dibujar libremente y conversar sobre el dibujo",closure:"Escuchar una idea de otro niño",evidence_expected:"Explicación sobre lo representado"};

test("taller directo: una llamada Luna; un fallo de calidad permite un solo Sol low",async()=>{
  const activity={title:"Semillas",purpose:"Explicar una idea",details:{child_actions:"Mirar y conversar",competency_id:"COM_ORAL"}};
  const calls=[];
  const good=await generateDirectWorkshop({age:5,activity,createProvider:()=>({generate:async request=>{calls.push(request);return{output:proposal};}})});
  assert.equal(good.metadata.model,"gpt-6-luna");assert.equal(calls.length,1);
  calls.length=0;
  const repaired=await generateDirectWorkshop({age:5,activity,createProvider:plan=>({generate:async request=>{calls.push(request);return{output:plan.model==="gpt-6-luna"?{...proposal,competency_id:"INVENTADA"}:proposal};}})});
  assert.equal(repaired.metadata.fallback_used,true);assert.equal(calls.length,2);
  assert.deepEqual(calls.map(call=>[call.execution_plan.model,call.execution_plan.reasoning_effort]),[["gpt-6-luna","medium"],["gpt-6.1-sol","low"]]);
});

test("taller a pedido persiste sin master IA; fechas, ownership, CAS, duplicados e historial están protegidos",async()=>{
  const db=new PGlite(),teacherId=randomUUID(),projectId=randomUUID(),activityId=randomUUID(),pending=new Map();let calls=0;
  try {
    for(const file of (await readdir(new URL("../local-db/migrations/",import.meta.url))).filter(file=>file.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(`../local-db/migrations/${file}`,import.meta.url),"utf8"));
    const created=await createPilotClassroom(db,teacherId,{teacherName:"Docente ficticia",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details) values($1,$2,'project','Semillas','Explorar','2026-11-02','2026-11-13','active',$3::jsonb)`,[projectId,created.classroomId,JSON.stringify({experience_contract:1})]);
    await db.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,status,details) values($1,$2,'2026-11-02','2026-11-02','Mirar semillas','Explicar una idea','active',$3::jsonb)`,[activityId,projectId,JSON.stringify({competency_id:"COM_ORAL",child_actions:"Mirar semillas y conversar"})]);
    const call=async(action,body,classroomId=created.classroomId,today="2026-10-07")=>{
      let result;
      await handleDirectWorkshop({request:{method:"POST"},url:new URL(`http://localhost/api/activities/${activityId}/workshop/${action}`),response:{},db,pending,today,annualPlanningContext:async()=>({id:classroomId,age:5}),readJson:async()=>body,send:(_response,status,data)=>{result={status,data};},generate:async()=>{calls++;return{proposal,metadata:{model:"gpt-6-luna",reasoning_effort:"medium"}};}});
      return result;
    };
    assert.equal((await call("generate",{expectedRevision:1,preference:""},randomUUID())).status,422);assert.equal(calls,0);
    assert.equal((await call("generate",{expectedRevision:2,preference:""})).status,409);assert.equal(calls,0);
    const generated=await call("generate",{expectedRevision:1,preference:""});assert.equal(generated.status,200,JSON.stringify(generated.data));assert.equal(calls,1);
    const body={expectedRevision:1,generationId:generated.data.generation_id,proposal};
    const confirmed=await call("confirm",body);assert.equal(confirmed.status,200,JSON.stringify(confirmed.data));
    const stored=(await db.query(`select a.occurs_on,a.linked_main_activity_id,e.details from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1`,[confirmed.data.id])).rows[0];
    assert.equal(new Date(stored.occurs_on).toISOString().slice(0,10),"2026-11-02");assert.equal(stored.linked_main_activity_id,activityId);assert.equal(stored.details.schema,"direct-workshops-v1");
    assert.equal((await call("confirm",body)).status,422);
    assert.equal((await call("generate",{expectedRevision:1,preference:""})).status,422);assert.equal(calls,1);
    assert.equal((await call("generate",{expectedRevision:1,preference:""},created.classroomId,"2026-11-03")).status,409);assert.equal(calls,1);
  } finally {await db.close();}
});
