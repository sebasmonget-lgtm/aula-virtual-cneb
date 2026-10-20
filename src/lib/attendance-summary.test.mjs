import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {createPilotClassroom} from "./pilot-onboarding-service.mjs";
import {loadAttendanceSummary,summarizeAttendance} from "./attendance-summary.mjs";

test("asistencia: calendario, corte, tarde, justificada y ausencia de datos se distinguen",()=>{
  const days=[{date:'2026-10-08',is_instructional:false},{date:'2026-10-12',is_instructional:false},...['19','20','21','22'].map(day=>({date:`2026-10-${day}`,is_instructional:true}))];
  const result=summarizeAttendance({students:[{id:'a',name:'Ana'},{id:'b',name:'Bruno'},{id:'c',name:'Camila'}],days,from:'2026-10-01',to:'2026-10-31',today:'2026-10-21',records:[
    {student_id:'a',attendance_date:'2026-10-08',status:'present'},
    {student_id:'a',attendance_date:'2026-10-19',status:'present'},
    {student_id:'a',attendance_date:'2026-10-20',status:'late'},
    {student_id:'a',attendance_date:'2026-10-21',status:'excused'},
    {student_id:'b',attendance_date:'2026-10-19',status:'absent'},
    {student_id:'b',attendance_date:'2026-10-22',status:'present'},
  ]});
  assert.equal(result.instructional_days,3);
  assert.equal(result.children[0].percentage,66.67);assert.equal(result.children[0].excused,1);
  assert.equal(result.children[1].absent,1);assert.equal(result.children[1].pending,2);
  assert.equal(result.children[2].percentage,null);assert.equal(result.children[2].absent,0);
  assert.equal(result.totals.total,9);assert.equal(result.totals.attended,2);assert.equal(result.totals.pending,5);
});

test("el resumen bimestral usa el calendario efectivo y rechaza aulas y períodos ajenos",async()=>{
  const db=new PGlite();try{
    for(const name of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+name,import.meta.url),'utf8'));
    const teacher=randomUUID(),a=await createPilotClassroom(db,teacher,{teacherName:'Elena Ramírez',institutionName:'IE Semillas',section:'Girasoles',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    const result=await loadAttendanceSummary(db,{teacherId:teacher,classroomId:a.classroomId,today:'2026-03-18'});
    assert.equal(result.instructional_days,3);assert.ok(result.periods.length>=4);assert.equal(result.totals.percentage,null);
    await assert.rejects(()=>loadAttendanceSummary(db,{teacherId:randomUUID(),classroomId:a.classroomId}),/aula/);
    await assert.rejects(()=>loadAttendanceSummary(db,{teacherId:teacher,classroomId:a.classroomId,periodId:randomUUID()}),/bimestre/);
  }finally{await db.close();}
});
