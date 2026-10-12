import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { initialClassroomDashboard } from "./initial-classroom-dashboard.mjs";
import { measureSetupPhase, withSetupPerformance } from "./setup-performance.mjs";

const tables = ["profiles","levels","age_grades","school_years","institution_profiles","institution_assets","classrooms","school_calendar_versions","school_calendar_days","calendar_blocks","initial_stages"];
class RolledBackMeasurement extends Error { constructor(result) { super("QA rollback"); this.result=result; } }

// No production table writes: transaction-local clones, explicitly qualified source reads,
// savepoints in place of service BEGIN/COMMIT, and an unconditional outer rollback.
export async function benchmarkSetup(db, { teacherId, scenario, logoStorage, loadDashboard, clock }) {
  if (!["before-logo","after-logo","after-basic"].includes(scenario)) throw new TypeError("Prueba QA inválida.");
  const paths = new Set();
  const storage = logoStorage && {
    save:async args => { const key=await logoStorage.save(args); paths.add(key); return key; },
    remove:async (key,owner) => { if (!paths.has(key) || owner!==teacherId) throw new Error("Archivo ajeno a la prueba."); await logoStorage.remove(key,owner); paths.delete(key); },
  };
  let result;
  try {
    await db.transaction(async tx => {
      for (const name of tables) await tx.exec(`create temporary table ${name} (like public.${name} including all) on commit drop`);
      await tx.exec("set local search_path=pg_temp,public");
      await tx.exec("insert into school_calendar_versions select * from public.school_calendar_versions where school_year_id is null and calendar_year=2026 and status='active'");
      await tx.exec("insert into school_calendar_days select d.* from public.school_calendar_days d join school_calendar_versions v on v.id=d.calendar_version_id");
      let count=0;
      const sandbox = {
        query:(sql,args)=>tx.query(sql,args),
        exec:sql=>tx.exec(({begin:"SAVEPOINT qa_classroom_save",commit:"RELEASE SAVEPOINT qa_classroom_save",rollback:"ROLLBACK TO SAVEPOINT qa_classroom_save"})[String(sql).toLowerCase()]??sql),
        transaction:async work=>{const name=`qa_nested_${++count}`;await tx.exec(`SAVEPOINT ${name}`);try{const value=await work(sandbox);await tx.exec(`RELEASE SAVEPOINT ${name}`);return value;}catch(error){await tx.exec(`ROLLBACK TO SAVEPOINT ${name}`);throw error;}},
      };
      const input={submissionId:randomUUID(),teacherName:"Docente ficticia QA",institutionName:"Colegio ficticio QA",section:"Prueba temporal",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"};
      if (scenario!="after-basic") {
        if (!storage) throw new Error("Storage QA no disponible.");
        const bytes=await sharp({create:{width:256,height:256,channels:4,background:scenario==="before-logo"?"#087d96":"#f6c85f"}}).png().toBuffer();
        input.logoUpload={mimeType:"image/png",base64:bytes.toString("base64")};
      }
      // Read the shared source before measuring; the old path did 305 individual inserts.
      const official=(await tx.query("select * from school_calendar_days order by date")).rows;
      if (official.length!==305) throw new Error("La fuente oficial QA no está completa.");
      let saved;
      const measured=await withSetupPerformance(async()=>{
        saved=await measureSetupPhase("save",()=>createPilotClassroom(sandbox,teacherId,input,{logoStorage:storage}));
        if (scenario==="before-logo") {
          await measureSetupPhase("calendar",async()=>{
            const version=randomUUID();
            await tx.query(`insert into school_calendar_versions(id,school_year_id,calendar_year,name,version,source_name,source_url)
              values($1,$2,2026,'QA anterior','MINEDU-2026-RM-501-2025-v1','MINEDU','https://www.gob.pe/minedu')`,[version,saved.schoolYearId]);
            for (const day of official) await tx.query(`insert into school_calendar_days(id,calendar_version_id,date,day_of_week,calendar_type,is_instructional,source,reason,editable,school_override)
              values($1,$2,$3::date,$4,$5,$6,$7,$8,$9,false)`,[randomUUID(),version,day.date,day.day_of_week,day.calendar_type,day.is_instructional,day.source,day.reason,day.editable]);
          });
          return measureSetupPhase("dashboard",()=>loadDashboard(sandbox));
        }
        return initialClassroomDashboard(saved,clock,"https://qa.invalid");
      });
      const replay=await createPilotClassroom(sandbox,teacherId,input,{logoStorage:storage});
      const rows=Number((await tx.query("select count(*)::int as n from classrooms")).rows[0].n);
      const idempotent=replay.replayed===true&&replay.classroomId===saved.classroomId&&rows===1;
      const report={scenario,metrics:measured.metrics,idempotent,calendarDayInserts:scenario==="before-logo"?305:0,temporaryLogoCount:paths.size};
      if (!idempotent) throw new Error("Falló la protección de solicitudes repetidas.");
      throw new RolledBackMeasurement(report);
    });
  } catch(error) { if (!(error instanceof RolledBackMeasurement)) throw error; result=error.result; }
  finally { for (const key of [...paths]) await storage.remove(key,teacherId); }
  return {...result,rolledBack:true,temporaryLogosRemoved:paths.size===0};
}
