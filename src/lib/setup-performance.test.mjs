import test from "node:test";
import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { effectiveCalendarDay, ensureSchoolCalendar, loadEffectiveCalendar } from "./school-calendar-service.mjs";
import { provisionAccountSchoolYear } from "./account-school-year.mjs";
import { initialClassroomDashboard } from "./initial-classroom-dashboard.mjs";
import { measureSetupPhase, withSetupPerformance } from "./setup-performance.mjs";
import { benchmarkSetup } from "./qa-setup-benchmark.mjs";
const teacher="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const input=()=>({submissionId:randomUUID(),teacherName:"Docente QA",institutionName:"Colegio ficticio",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});
async function database(){const db=await PGlite.create();const root=new URL("../../local-db/migrations/",import.meta.url);for(const f of (await readdir(root)).filter(f=>f.endsWith(".sql")).sort())await db.exec(await readFile(new URL(f,root),"utf8"));return db;}

test("calendario precargado se comparte, sin nuevas filas al crear dos aulas; año asignado y futuro sin fechas",async()=>{
  const db=await database();try{
    const before=(await db.query("select count(*)::int n from school_calendar_days")).rows[0].n;
    const assigned=await provisionAccountSchoolYear(db,teacher,2026);
    const a=await createPilotClassroom(db,teacher,input()),b=await createPilotClassroom(db,other,input());
    assert.equal(a.schoolYearId,assigned.schoolYearId);
    assert.equal((await ensureSchoolCalendar(db,a.schoolYearId)).id,(await ensureSchoolCalendar(db,b.schoolYearId)).id);
    assert.equal((await db.query("select count(*)::int n from school_calendar_days")).rows[0].n,before);
    const cal=await loadEffectiveCalendar(db,{teacherId:teacher,from:"2026-03-02",to:"2026-12-31"});
    assert.equal(cal.days.length,305);assert.equal(cal.days.find(d=>d.date==="2026-07-28").calendar_type,"national_holiday");
    assert.equal(cal.days.find(d=>d.date==="2026-05-20").calendar_type,"management_week");
    assert.ok(cal.blocks.every(b=>b.editable===false));
    assert.deepEqual(await provisionAccountSchoolYear(db,other,2027),{year:2027,calendarAvailable:false});
    assert.equal((await db.query("select count(*)::int n from school_years where year=2027")).rows[0].n,0);
  }finally{await db.close();}
});

test("respuesta perdida y reintento conservan aula, niños y logo; misma clave con otros datos se rechaza",async()=>{
  const db=await database(),objects=new Set();let uploads=0;
  const storage={save:async({assetId})=>{uploads++;objects.add(assetId);return assetId;},remove:async key=>objects.delete(key)};
  try{
    const body={...input(),createLogo:true,logoInitials:"QA"};
    const first=await createPilotClassroom(db,teacher,body,{logoStorage:storage});
    const student=randomUUID();await db.query("insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Ficticia','QA')",[student,first.classroomId]);
    const repeat=await createPilotClassroom(db,teacher,body,{logoStorage:storage});
    assert.equal(repeat.classroomId,first.classroomId);assert.equal(repeat.replayed,true);assert.equal(uploads,1);assert.equal(objects.size,1);
    await assert.rejects(createPilotClassroom(db,teacher,{...body,section:"Otro"},{logoStorage:storage}),{reason:"version_conflict"});
    await assert.rejects(createPilotClassroom(db,teacher,{...body,submissionId:randomUUID()},{logoStorage:storage}),{reason:"version_conflict"});
    assert.equal((await db.query("select count(*)::int n from students where classroom_id=$1",[first.classroomId])).rows[0].n,1);
    assert.throws(()=>initialClassroomDashboard(repeat,{date:"2026-02-16",time:"08:00"},""),/alta recién/);
  }finally{await db.close();}
});

test("COMMIT confirmado con respuesta perdida nunca elimina el logo vinculado; error previo revierte todo",async()=>{
  const db=await database(),objects=new Set();
  const storage={save:async({assetId})=>{objects.add(assetId);return assetId;},remove:async key=>objects.delete(key)};
  try{
    let lost=true;
    const network={query:db.query.bind(db),exec:async sql=>{const value=await db.exec(sql);if(sql==="commit"&&lost){lost=false;throw new Error("Respuesta perdida");}return value;}};
    const saved=await createPilotClassroom(network,teacher,{...input(),createLogo:true,logoInitials:"QA"},{logoStorage:storage});
    assert.equal(saved.replayed,true);assert.equal(objects.size,1);
    const failing={exec:db.exec.bind(db),query:async(sql,args)=>{if(sql.includes("insert into classrooms("))throw new Error("Red antes del commit");return db.query(sql,args);}};
    await assert.rejects(createPilotClassroom(failing,other,{...input(),createLogo:true,logoInitials:"QA"},{logoStorage:storage}),/antes del commit/);
    assert.equal(objects.size,1);assert.equal((await db.query("select count(*)::int n from classrooms where teacher_id=$1",[other])).rows[0].n,0);
  }finally{await db.close();}
});

test("prueba remota aislada revierte sus clones y retira solo los dos logos nuevos",async()=>{
  const db=await database(),objects=new Set(["logo-original"]),removed=[];
  const storage={save:async({assetId})=>{objects.add(assetId);return assetId;},remove:async key=>{assert.notEqual(key,"logo-original");removed.push(key);objects.delete(key);}};
  try{
    const existing=await createPilotClassroom(db,teacher,input());
    const before=JSON.stringify((await db.query("select * from classrooms order by id")).rows);
    for(const scenario of ["before-logo","after-logo","after-basic"]){
      const result=await benchmarkSetup(db,{teacherId:teacher,scenario,logoStorage:storage,clock:{date:"2026-02-16",time:"08:00"},loadDashboard:async()=>({students:[]})});
      assert.equal(result.rolledBack,true);assert.equal(result.idempotent,true);assert.equal(result.temporaryLogosRemoved,true);
      assert.equal(result.calendarDayInserts,scenario==="before-logo"?305:0);
    }
    assert.equal(removed.length,2);assert.deepEqual([...objects],["logo-original"]);
    assert.equal(JSON.stringify((await db.query("select * from classrooms order by id")).rows),before);
    assert.equal((await db.query("select id from classrooms where teacher_id=$1",[teacher])).rows[0].id,existing.classroomId);
  }finally{await db.close();}
});

test("mediciones concurrentes separadas y sin datos personales",async()=>{
  const [a,b]=await Promise.all([withSetupPerformance(()=>measureSetupPhase("save",()=>measureSetupPhase("db_query",async()=>42))),withSetupPerformance(()=>measureSetupPhase("logo_upload",async()=>"ok"))]);
  assert.equal(a.metrics.queries,1);assert.equal(b.metrics.queries,0);assert.equal(a.result,42);
  assert.match(a.timing,/db_query;dur=[\d.]+;desc="1 calls"/);assert.equal(b.metrics.save,undefined);
});

test("una excepción antigua no habilita feriados, gestión o fines de semana",()=>{
  for(const calendar_type of ["national_holiday","management_week","weekend"]){
    const base={date:"2026-04-02",calendar_type,is_instructional:false,reason:"Oficial"};
    assert.deepEqual(effectiveCalendarDay(base,{id:"antiguo",new_calendar_type:"school_instructional_override",new_is_instructional:true,reason:"Recuperación"}),base);
  }
});

test("migración Supabase conserva versiones propias y RLS permite solo lectura del calendario compartido",async()=>{
  const db=await PGlite.create();try{
    const root=new URL("../../local-db/migrations/",import.meta.url);
    for(const f of(await readdir(root)).filter(f=>f.endsWith(".sql")&&!f.startsWith("0074_")).sort())await db.exec(await readFile(new URL(f,root),"utf8"));
    await db.exec(`create role authenticated;create role anon;create schema auth;create schema private;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function private.owns_school_year(target_id uuid) returns boolean language sql as $$select exists(select 1 from school_years where id=target_id and owner_id=auth.uid())$$;
      grant usage on schema auth,private to authenticated;grant select on school_years to authenticated;
      alter table school_calendar_versions enable row level security;alter table school_calendar_days enable row level security;
      create policy teacher_read_own on school_calendar_versions for select to authenticated using(private.owns_school_year(school_year_id));
      create policy teacher_read_own on school_calendar_days for select to authenticated using(exists(select 1 from school_calendar_versions v where v.id=calendar_version_id and private.owns_school_year(v.school_year_id)));
      grant select on school_calendar_versions,school_calendar_days to authenticated;`);
    // Owned historical version and referenced day remain byte-for-byte unchanged.
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente histórica')",[teacher]);
    const year=randomUUID(),version=randomUUID(),day=randomUUID();
    await db.query("insert into school_years(id,owner_id,year,starts_on,ends_on) values($1,$2,2026,'2026-03-02','2026-12-31')",[year,teacher]);
    await db.query("insert into school_calendar_versions(id,school_year_id,calendar_year,name,version,source_name,source_url) values($1,$2,2026,'Original','original','MINEDU','https://www.gob.pe/minedu')",[version,year]);
    await db.query("insert into school_calendar_days(id,calendar_version_id,date,day_of_week,calendar_type,is_instructional,source,reason) values($1,$2,'2026-04-06',1,'instructional_day',true,'MINEDU','Original')",[day,version]);
    const before=JSON.stringify((await db.query("select * from school_calendar_days where id=$1",[day])).rows);
    await db.exec(await readFile(new URL("../../supabase/migrations/202610110001_shared_official_calendar.sql",import.meta.url),"utf8"));
    assert.equal(JSON.stringify((await db.query("select * from school_calendar_days where id=$1",[day])).rows),before);
    assert.equal((await ensureSchoolCalendar(db,year)).id,version);
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`);
    assert.equal((await db.query("select count(*)::int n from school_calendar_days")).rows[0].n,305);
    assert.equal((await db.query("select count(*)::int n from school_calendar_versions")).rows[0].n,1);
    await assert.rejects(db.query("update school_calendar_days set reason='Manipulado'"),/permission denied/);
    await db.exec(`set request.jwt.claim.sub='${teacher}'`);
    assert.equal((await db.query("select count(*)::int n from school_calendar_days")).rows[0].n,306);
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select * from school_calendar_days"),/permission denied/);
  }finally{await db.close();}
});
