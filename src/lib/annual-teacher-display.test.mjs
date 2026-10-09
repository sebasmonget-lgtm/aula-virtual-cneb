import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { annualDisplaySubjects, annualTeacherText, annualTeacherProposalView } from "./annual-teacher-display.mjs";

test("los nombres se resuelven por fuentes propias históricas; orden, baja y otra docente no cambian identidad", async () => {
  const db = new PGlite();
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
  try {
    await db.exec(`create table school_years(id uuid,owner_id uuid);
      create table classrooms(id uuid,teacher_id uuid,school_year_id uuid);
      create table students(id uuid,classroom_id uuid,first_name text,preferred_name text,status text);
      create table ordinary_observations(id uuid,student_id uuid,classroom_id uuid);
      create table diagnostic_spontaneous_observations(id uuid,student_id uuid,classroom_id uuid);
      create table diagnostic_experience_observations(id uuid,student_id uuid,classroom_id uuid);
      create table student_family_interviews(id uuid,student_id uuid,classroom_id uuid);
      create table student_observations(id uuid,diagnostic_entry_id uuid);
      create table diagnostic_entries(id uuid,student_id uuid,session_id uuid);
      create table diagnostic_sessions(id uuid,classroom_id uuid);`);
    await db.query("insert into school_years values($1,$2),($3,$4)",[id(1),id(2),id(3),id(4)]);
    await db.query("insert into classrooms values($1,$2,$3),($4,$5,$6)",[id(5),id(2),id(1),id(6),id(4),id(3)]);
    await db.query("insert into students values($1,$2,'Luciana',null,'inactive'),($3,$2,'Mateo',null,'active'),($4,$5,'Ajena',null,'active')",[id(9),id(5),id(7),id(8),id(6)]);
    await db.query("insert into ordinary_observations values($1,$2,$3),($4,$5,$6)",[id(10),id(9),id(5),id(11),id(8),id(6)]);
    await db.query("insert into student_family_interviews values($1,$2,$3)",[id(12),id(7),id(5)]);
    const facts = [
      {subject:"child_1",source_refs:[{id:id(10)}]},
      {subject:"child_2",source_refs:[{id:id(12)}]},
      {subject:"child_3",source_refs:[{id:id(11)}]}
    ];
    const proposal={classroom_snapshot:{facts}};
    assert.deepEqual(await annualDisplaySubjects(db,{teacherId:id(2),classroomId:id(5),proposal}),{child_1:"Luciana",child_2:"Mateo"});
    assert.deepEqual(await annualDisplaySubjects(db,{teacherId:id(4),classroomId:id(5),proposal}),{});
    const ambiguous={classroom_snapshot:{facts:[...facts,{subject:"child_1",source_refs:[{id:id(12)}]}]}};
    assert.equal((await annualDisplaySubjects(db,{teacherId:id(2),classroomId:id(5),proposal:ambiguous})).child_1,undefined);
  } finally { await db.close(); }
});

test("la vista docente conserva el objeto confirmado, alias y citas internos; usa nombres y abstiene desconocidos", () => {
  const stored={proposed_experiences:[{proposal_id:"p",rationale:"Child_1 observa; child_2 pregunta.",source_fact_keys:["child_1"]}],
    evidence_interpretations:[{interpretation:"CHILD_1 lo contó.",fact_keys:["child_1"]}],
    classroom_snapshot:{facts:[{subject:"child_1",support_text:"Luciana dijo: mi mamá cuida cuyes.",source_refs:[{id:"source"}]}]}};
  const before=JSON.stringify(stored),shown=annualTeacherProposalView(stored,{child_1:"Luciana"});
  assert.equal(shown.proposed_experiences[0].rationale,"Luciana observa; un niño o niña pregunta.");
  assert.equal(shown.evidence_interpretations[0].interpretation,"Luciana lo contó.");
  assert.equal(shown.classroom_snapshot.facts[0].subject,"child_1");
  assert.deepEqual(shown.proposed_experiences[0].source_fact_keys,["child_1"]);
  assert.equal(shown.classroom_snapshot.facts[0].support_text,stored.classroom_snapshot.facts[0].support_text);
  assert.equal(JSON.stringify(stored),before);
  assert.equal(annualTeacherText("Child_10 y child_1",{child_1:"Luciana"}),"un niño o niña y Luciana");
});
