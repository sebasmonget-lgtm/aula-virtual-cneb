import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { planningFeedbackText, projectPlanningFeedback } from "./planning-feedback.mjs";

test("contexto grupal usa solo valoraciones confirmadas y elimina nombres",()=>{
  const students=["Ana","Luis","Mía"].map((name,index)=>({id:String(index),first_name:name,last_name:"Prueba",preferred_name:null}));
  const cards=[{id:"COM_ORAL",official_name:"Se comunica oralmente"}];
  const rows=students.map((student,index)=>({student_id:student.id,competency_v4_id:"COM_ORAL",state:"confirmed",
    sourceRows:index?[]:[{id:"e1",observed_on:"2026-05-10"}],
    assessment:{details:{support_needs:["Dar más tiempo a Ana para conversar."],next_opportunities:["Ofrecer diálogo en grupos pequeños."]}}}));
  rows.push({student_id:"0",competency_v4_id:"MAT_CANTIDAD",state:"draft",sourceRows:[],assessment:{details:{support_needs:["Dato privado"]}}});
  const feedback=projectPlanningFeedback({model:{students,scope:["COM_ORAL"],rows},cards,period:{id:"p1",label:"Bimestre 1"}});
  assert.equal(feedback.confirmed_assessments,3);
  assert.equal(feedback.competencies[0].students_without_record,2);
  assert.match(planningFeedbackText(feedback),/Dar más tiempo a \[estudiante\]/);
  assert.doesNotMatch(JSON.stringify(feedback),/\bAna\b|Dato privado|observed_on|first_name|sourceRows/);
});

test("Planificar solicita contexto solo por decisión expresa y mantiene el ciclo normal",async()=>{
  const [server,planning,experience,activity,journey]=await Promise.all([
    readFile(new URL("../../scripts/local-db-server.mjs",import.meta.url),"utf8"),
    readFile(new URL("../features/dashboard/components/teacher-workspace.tsx",import.meta.url),"utf8"),
    readFile(new URL("../features/dashboard/components/learning-experience-generator.tsx",import.meta.url),"utf8"),
    readFile(new URL("../features/dashboard/components/parent-activity-generator.tsx",import.meta.url),"utf8"),
    readFile(new URL("./planning-journey.mjs",import.meta.url),"utf8"),
  ]);
  assert.match(server,/body\.usePlanningFeedback===true/);
  assert.match(server,/loadPlanningFeedback\(db,\{teacherId,classroomId/);
  assert.match(planning,/PlanningFeedbackOption/);
  assert.match(experience,/usePlanningFeedback:Boolean\(feedbackPeriodId\)/);
  assert.match(activity,/usePlanningFeedback:Boolean\(feedbackPeriodId\)/);
  assert.match(journey,/mode:activities\.some/);
});
