import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";
import {createPilotClassroom} from "./pilot-onboarding-service.mjs";
import {candidateProjectDates,classifyCalendarDay,effectiveCalendarDay,ensureSchoolCalendar,
  loadEffectiveCalendar,reprogramActivity,saveClassroomOverride,validateBlueprintDates,
  validateSelectedInstructionalDates} from "./school-calendar-service.mjs";

const teacher="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function database(){const db=await PGlite.create();const migrations=new URL("../../local-db/migrations/",import.meta.url);for(const file of(await readdir(migrations)).filter((name)=>name.endsWith(".sql")).sort())await db.exec(await readFile(new URL(file,migrations),"utf8"));return db;}

test("clasifica fin de semana, feriado, gestión y día lectivo sin IA",()=>{
  assert.equal(classifyCalendarDay({date:"2026-04-11",block:{type:"instructional",label:"Lectivo"}}).calendar_type,"weekend");
  assert.equal(classifyCalendarDay({date:"2026-04-02",block:{type:"instructional",label:"Lectivo"},holiday:{name:"Jueves Santo"}}).calendar_type,"national_holiday");
  assert.equal(classifyCalendarDay({date:"2026-05-20",block:{type:"management",label:"Gestión"}}).calendar_type,"management_week");
  assert.equal(classifyCalendarDay({date:"2026-04-06",block:{type:"instructional",label:"Lectivo"}}).is_instructional,true);
});

test("override y exclusión del proyecto son capas separadas",()=>{
  const base={date:"2026-04-06",calendar_type:"instructional_day",is_instructional:true,source:"MINEDU",reason:"Lectivo",editable:true,school_override:false};
  const changed=effectiveCalendarDay(base,{id:"o1",new_calendar_type:"school_non_instructional",new_is_instructional:false,reason:"Aniversario"});
  assert.equal(changed.school_override,true);assert.equal(changed.reason,"Aniversario");
  const days=candidateProjectDates([base,{...base,date:"2026-04-07"}],"2026-04-06","2026-04-07",[{date:"2026-04-07",exclusion_reason:"Salida"}]);
  assert.deepEqual(days.map((day)=>day.selected),[true,false]);
});

test("las fechas y blueprints mantienen correspondencia exacta",()=>{
  const days=[{date:"2026-04-06",is_instructional:true},{date:"2026-04-07",is_instructional:true},{date:"2026-04-08",is_instructional:false}];
  assert.deepEqual(validateSelectedInstructionalDates(days,["2026-04-06","2026-04-07"],"2026-04-06","2026-04-10"),["2026-04-06","2026-04-07"]);
  assert.throws(()=>validateSelectedInstructionalDates(days,["2026-04-08"],"2026-04-06","2026-04-10"),/no es un día/);
  assert.equal(validateBlueprintDates([{planned_date:"2026-04-06"},{planned_date:"2026-04-07"}],["2026-04-06","2026-04-07"]),true);
  assert.throws(()=>validateBlueprintDates([{planned_date:"2026-04-06"}],["2026-04-06","2026-04-07"]),/exactamente/);
});

test("la consulta real de confirmación guarda la identidad UUID y permite volver a borrador",async()=>{
  const db=await database();try{
    const setup=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31",castellanoL2Applicable:false,religionApplicable:false});
    const experience=randomUUID(),selection=randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'project','Compartimos','Acuerdos','2026-03-30','2026-04-10','draft','{}')`,[experience,setup.classroomId]);
    await db.query(`insert into project_calendar_selections(id,learning_experience_id,starts_on,ends_on)
      values($1,$2,'2026-03-30','2026-04-10')`,[selection,experience]);
    // Exercise the SQL used by the HTTP route, not a second copy with different casts.
    const server=await readFile(new URL("../../scripts/local-db-server.mjs",import.meta.url),"utf8");
    const sql=server.match(/update project_calendar_selections set status=\$1[\s\S]*?returning \*/)?.[0];
    assert.ok(sql);
    const confirmed=(await db.query(sql,["confirmed",teacher,selection])).rows[0];
    assert.equal(confirmed.status,"confirmed");assert.equal(confirmed.confirmed_by,teacher);
    assert.ok(confirmed.confirmed_at);assert.equal(confirmed.revision,2);
    const draft=(await db.query(sql,["draft",teacher,selection])).rows[0];
    assert.equal(draft.status,"draft");assert.equal(draft.confirmed_by,null);
    assert.equal(draft.confirmed_at,null);assert.equal(draft.revision,3);
  }finally{await db.close();}
});

test("calendario 2026 aplica feriados, gestión, overrides y conserva proyectos antiguos",{timeout:90000},async()=>{
  const db=await database();try{
    const setup=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31",castellanoL2Applicable:false,religionApplicable:false});
    await db.query(`update calendar_blocks set start_date='2026-04-20' where school_year_id=$1 and type='instructional' and sort_order=1`,[setup.schoolYearId]);
    await ensureSchoolCalendar(db,setup.schoolYearId);
    const calendar=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:setup.classroomId,from:"2026-04-02",to:"2026-05-20"});
    assert.equal(calendar.days.find((day)=>day.date==="2026-04-02").calendar_type,"national_holiday");
    assert.equal(calendar.days.find((day)=>day.date==="2026-04-06").calendar_type,"instructional_day");
    assert.equal(calendar.days.find((day)=>day.date==="2026-05-20").calendar_type,"management_week");
    await saveClassroomOverride(db,{teacherId:teacher,classroomId:setup.classroomId,date:"2026-04-06",isInstructional:false,reason:"Actividad institucional"});
    const effective=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:setup.classroomId,from:"2026-04-06",to:"2026-04-06"});
    assert.equal(effective.days[0].is_instructional,false);assert.equal(effective.days[0].school_override,true);
    await assert.rejects(saveClassroomOverride(db,{teacherId:teacher,classroomId:setup.classroomId,date:"2026-04-02",isInstructional:true,reason:"Recuperación"}),/flujo autorizado/);
    await saveClassroomOverride(db,{teacherId:teacher,classroomId:setup.classroomId,date:"2026-04-02",isInstructional:true,reason:"Jornada recuperada por el aula",confirmOfficialException:true});
    const exception=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:setup.classroomId,from:"2026-04-02",to:"2026-04-02"});
    assert.equal(exception.days[0].is_instructional,true);
    assert.equal(exception.days[0].school_override,true);
    assert.equal(exception.days[0].calendar_type,"school_instructional_override");
    assert.deepEqual(validateSelectedInstructionalDates(exception.days,["2026-04-02"],"2026-04-02","2026-04-02"),["2026-04-02"]);
    assert.equal((await db.query(`select calendar_type from school_calendar_days where id=$1`,[exception.days[0].id])).rows[0].calendar_type,"national_holiday");
    const experience=randomUUID();await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'project','Proyecto antiguo','Explorar','2026-04-01','2026-04-30','active','{}'::jsonb)`,[experience,setup.classroomId]);
    const oldActivity=randomUUID();await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status,details) values($1,$2,'2026-04-07','Actividad antigua','Explorar','active','{}'::jsonb)`,[oldActivity,experience]);
    const loaded=await loadEffectiveCalendar(db,{teacherId:teacher,classroomId:setup.classroomId,from:"2026-04-07",to:"2026-04-07"});
    assert.equal(loaded.activities[0].title,"Actividad antigua");assert.equal(loaded.activities[0].planned_date,null);
  }finally{await db.close();}
});

test("reprogramar valida calendario, evita conflictos y sincroniza Hoy",{timeout:90000},async()=>{
  const db=await database();try{
    const setup=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31",castellanoL2Applicable:false,religionApplicable:false});await ensureSchoolCalendar(db,setup.schoolYearId);
    const experience=randomUUID(),activity=randomUUID();await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details) values($1,$2,'project','Plantas','Explorar','2026-04-06','2026-04-17','active','{}')`,[experience,setup.classroomId]);
    await db.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,status,details) values($1,$2,'2026-04-07','2026-04-07','Semillas','Observar','active','{}')`,[activity,experience]);
    await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title) values($1,$2,'2026-04-07','09:00','09:45','activity',$3,'Semillas')`,[randomUUID(),setup.classroomId,activity]);
    await assert.rejects(reprogramActivity(db,{teacherId:teacher,activityId:activity,newDate:"2026-04-11",reason:"Cambio"}),/no es un día/);
    const changed=await reprogramActivity(db,{teacherId:teacher,activityId:activity,newDate:"2026-04-08",reason:"Suspensión"});assert.equal(changed.occurs_on,"2026-04-08");
    const pair=(await db.query(`select a.occurs_on::text,se.scheduled_on::text from activities a join class_schedule_entries se on se.activity_id=a.id where a.id=$1`,[activity])).rows[0];
    assert.equal(pair.occurs_on,pair.scheduled_on);assert.equal(pair.occurs_on,"2026-04-08");
    assert.equal(Number((await db.query(`select count(*) as n from activity_schedule_changes where activity_id=$1`,[activity])).rows[0].n),1);
  }finally{await db.close();}
});
