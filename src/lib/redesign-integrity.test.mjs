import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";
import {createPilotClassroom} from "./pilot-onboarding-service.mjs";
import {ensureSchoolCalendar,syncActivitySchedule} from "./school-calendar-service.mjs";
import {swapActivityDates} from "./activity-swap-service.mjs";
import {rebaseProject,assertProjectUnstarted,assertAnnualDescendant,projectSourceDiscrepancy} from "./project-rebase-service.mjs";
import {confirmLearningExperienceVersion} from "./learning-experience-version-service.mjs";
import {periodFutureProjection} from "./period-future-review.mjs";
import {projectEventWarning} from "./project-event-warning.mjs";
import {partitionDocumentArtifacts,ZIP_MAX_BYTES} from "./document-sync-package.mjs";
import {enqueuePreparation,runPreparationStep} from "./preparation-jobs.mjs";
import {preparationExecutor} from "./preparation-executor.mjs";

async function fixture(){const db=new PGlite();const dir=new URL("../../local-db/migrations/",import.meta.url);
  for(const file of (await readdir(dir)).filter(name=>name.endsWith(".sql")).sort())await db.exec(await readFile(new URL(file,dir),"utf8"));
  const teacher=randomUUID(),classroom=await createPilotClassroom(db,teacher,{teacherName:"QA",institutionName:"QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
  await ensureSchoolCalendar(db,classroom.schoolYearId);
  const project=(await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,teacher_confirmed_at)
    values($1,$2,'project','Plantas','Explorar','2026-10-19','2026-11-06','active','{"starting_point":"Juego"}',now()) returning *`,[randomUUID(),classroom.classroomId])).rows[0];
  const make=async(date,experienceId=project.id,linked=null)=>{const id=randomUUID();await db.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,status,teacher_confirmed_at,details,linked_main_activity_id,workshop_item_index)
    values($1,$2,$3::date,$3::date,'QA','Explorar','active',now(),'{"meaningful_situation":"QA"}',$4,case when $4::uuid is null then null else 1 end)`,[id,experienceId,date,linked]);await syncActivitySchedule(db,{activityId:id,classroomId:classroom.classroomId,title:"QA",occursOn:date});return (await db.query("select * from activities where id=$1",[id])).rows[0];};
  return {db,teacher,classroom,project,make};
}
test("intercambio de Hoy es atómico, conserva fecha pedagógica y protege talleres/ejecución/pasado",async()=>{
  const {db,teacher,classroom,project,make}=await fixture();try{
    const a=await make("2026-10-19"),b=await make("2026-10-20");
    const input={activityId:a.id,otherActivityId:b.id,expectedRevision:a.revision,otherExpectedRevision:b.revision};
    const failing={transaction:work=>db.transaction(tx=>work({query:async(sql,params)=>{if(sql.includes("activity_schedule_changes"))throw Error("audit failed");return tx.query(sql,params);}}))};
    await assert.rejects(swapActivityDates(failing,teacher,input,{today:"2026-10-19"}),/audit failed/);
    assert.equal((await db.query("select occurs_on::text as date from activities where id=$1",[a.id])).rows[0].date,"2026-10-19");
    await assert.rejects(swapActivityDates(db,randomUUID(),input,{today:"2026-10-19"}));
    await assert.rejects(swapActivityDates(db,teacher,{...input,expectedRevision:999},{today:"2026-10-19"}));
    const result=await swapActivityDates(db,teacher,input,{today:"2026-10-19"});assert.equal(result.occurs_on,"2026-10-20");
    const saved=(await db.query("select occurs_on::text,planned_date::text,revision from activities where id=$1",[a.id])).rows[0];
    assert.equal(saved.planned_date,"2026-10-19");assert.equal(saved.occurs_on,"2026-10-20");assert.ok(saved.revision>a.revision);
    const workshop=randomUUID();await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,parent_project_id) values($1,$2,'workshop','Taller','QA','2026-10-19','2026-11-06','active',$3)`,[workshop,classroom.classroomId,project.id]);
    const w=await make("2026-10-20",workshop,a.id),s=(await db.query("select id from class_schedule_entries where activity_id=$1",[w.id])).rows[0];
    await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status) values($1,$2,'2026-10-20','active')`,[randomUUID(),s.id]);
    const newB=(await db.query("select revision from activities where id=$1",[b.id])).rows[0];
    await assert.rejects(swapActivityDates(db,teacher,{...input,expectedRevision:saved.revision,otherExpectedRevision:newB.revision},{today:"2026-10-19"}),/ejecución/);
    await assert.rejects(assertProjectUnstarted(db,project,"2026-10-05"),/trabajo registrado/);
    await assert.rejects(swapActivityDates(db,teacher,{...input,expectedRevision:saved.revision,otherExpectedRevision:newB.revision},{today:"2026-10-21"}),/pasado/);
  }finally{await db.close();}
});
test("rebase explícito conserva padre, identidad y actividades; exige descendencia y vuelve a verificar al confirmar",async()=>{
  const {db,teacher,classroom,project,make}=await fixture();try{
    const curriculum=(await db.query("select id from curriculum_versions where active=true limit 1")).rows[0].id;
    const old=randomUUID(),next=randomUUID(),proposalId=randomUUID();
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal) values($1,$2,$3,$4,1,'archived','{}')`,[old,classroom.classroomId,classroom.schoolYearId,curriculum]);
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,supersedes_plan_id) values($1,$2,$3,$4,2,'active','{}',$5)`,[next,classroom.classroomId,classroom.schoolYearId,curriculum,old]);
    // Canonical source is established before teacher confirmation; immutable confirmed columns cannot be patched.
    const source=(await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,source_proposal_id,origin,source_proposal_index,teacher_confirmed_at)
      values($1,$2,'project','Plantas','Explorar','2026-10-19','2026-11-06','active','{"starting_point":"Juego"}',$3,$4,'planned',0,now()) returning *`,[randomUUID(),classroom.classroomId,old,proposalId])).rows[0];
    const a=await make("2026-10-19",source.id);
    const annual={plan:{id:next},proposalId,index:1,source:{title:"Plantas",purpose:"Explorar",experience_type:"project",rationale:"Observar"},slot:{starts_on:"2026-11-09",ends_on:"2026-11-20"}};
    await assert.rejects(assertAnnualDescendant(db,next,randomUUID(),classroom.classroomId),/no continúa/);
    await assert.rejects(rebaseProject(db,randomUUID(),source,annual,source.revision));
    const draft=await rebaseProject(db,teacher,source,annual,source.revision);
    assert.equal(draft.supersedes_experience_id,source.id);assert.equal(draft.annual_plan_id,next);assert.equal(draft.source_proposal_id,proposalId);
    assert.equal((await rebaseProject(db,teacher,source,annual,source.revision)).id,draft.id);
    assert.equal((await db.query("select status from learning_experiences where id=$1",[source.id])).rows[0].status,"active");
    const schedule=(await db.query("select id from class_schedule_entries where activity_id=$1",[a.id])).rows[0];
    await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status) values($1,$2,'2026-10-19','active')`,[randomUUID(),schedule.id]);
    await assert.rejects(confirmLearningExperienceVersion(db,classroom.classroomId,draft.id,draft.revision),/trabajo registrado/);
    assert.equal((await db.query("select experience_id from activities where id=$1",[a.id])).rows[0].experience_id,source.id);
    assert.equal(projectSourceDiscrepancy({...source,details:{source_proposal_snapshot:annual.source}},{planId:next,proposal:annual.source},annual.slot).changed,true);
    await assert.rejects(assertProjectUnstarted(db,project,"2026-10-20"),/pasado/);
  }finally{await db.close();}
});
test("revisión distingue realización/evidencia/futuro y advertencias usan fechas literales",()=>{
  const result=periodFutureProjection({period:{id:"p"},feedback:{students_total:20,competencies:[]},curriculum:[{id:"indaga",name:"Indaga"}],opportunities:[{competency_id:"indaga",planned:10,worked:0}],plan:{id:"year",proposal:{proposed_experiences:[{proposal_id:"x",title:"Nuestro huerto",planned_start_date:"2026-11-09",planned_end_date:"2026-11-20",opportunities:[{competency_id:"indaga"}]}]}},today:"2026-10-05"});
  const row=result.competencies[0];assert.equal(row.worked_opportunities,0);assert.equal(row.planned_opportunities,10);assert.equal(row.students_without_evidence,20);assert.equal(row.future_projects[0].title,"Nuestro huerto");assert.match(row.continuity,/antes de decidir/);
  assert.match(projectEventWarning({title:"Navidad"},{starts_on:"2026-10-19",ends_on:"2026-11-06"}),/diciembre/);
  assert.equal(projectEventWarning({title:"Feria escolar"},{starts_on:"2026-10-19",ends_on:"2026-11-06"}),null);
});
test("descarga durable retoma sin volver a renderizar y divide límites por bytes y cantidad",async()=>{
  const {db,teacher,classroom}=await fixture();try{
    const job=await enqueuePreparation(db,{teacherId:teacher,classroomId:classroom.classroomId,kind:"document_export",sourceId:classroom.classroomId,sourceRevision:1,input:["a","b"],payload:{items:[{source_id:"a"},{source_id:"b"}]}});
    let renders=0;const execute=preparationExecutor({db,prepareDocument:async()=>({id:randomUUID(),byte_length:(renders++,28*1024*1024)}),partitionDocuments:partitionDocumentArtifacts});
    assert.equal((await runPreparationStep(db,execute)).completed,1);assert.equal((await runPreparationStep(db,execute)).completed,2);
    const finished=await runPreparationStep(db,execute);assert.equal(finished.id,job.id);assert.equal(finished.status,"succeeded");assert.equal(finished.parts.length,2);assert.equal(renders,2);
    assert.equal(partitionDocumentArtifacts(Array.from({length:101},(_,id)=>({id,byte_length:1}))).length,2);
    assert.throws(()=>partitionDocumentArtifacts([{id:"x",byte_length:ZIP_MAX_BYTES+1}]),/límite/);
  }finally{await db.close();}
});
