import test from 'node:test';import assert from 'node:assert/strict';
import{familyEvaluationReadiness}from'./period-evaluation-service.mjs';import{assessmentSourceSnapshot}from'./assessment-v4-service.mjs';import{sourceAssessmentSnapshot}from'./descriptive-conclusion-v4-service.mjs';import{batchTasks}from'../../scripts/period-batch-routes.mjs';
const sourceRows=[{id:'obs',observation_text:'Cuenta lo que hizo',observed_at:'2026-10-20',competency_v4_id:'COM_ORAL'}];
const assessment={id:'grade',version:1,updated_at:'2026-10-20',achievement_level:'A',teacher_confirmed_at:'2026-10-20',source_evidence_snapshot:assessmentSourceSnapshot(sourceRows)};
const conclusion={assessment_id:'grade',source_assessment_snapshot:sourceAssessmentSnapshot(assessment)};
const row={student_id:'child',competency_v4_id:'COM_ORAL',sourceRows,assessment,conclusion};
const model=(rows)=>({students:[{id:'child'}],rows});
test('informe necesita evaluación y conclusiones vigentes, también para AD, sin exigir cierre formal',()=>{
 assert.equal(familyEvaluationReadiness(model([row])).ready,true);
 for(const changed of [{assessment:null},{draft:{id:'draft'}},{conclusion:null},{assessment:{...assessment,achievement_level:'AD'}},{sourceRows:[{...sourceRows[0],observation_text:'Cambió el registro'}]}])assert.equal(familyEvaluationReadiness(model([{...row,...changed}])).ready,false);
 assert.equal(familyEvaluationReadiness(model([])).ready,false);
 assert.equal(familyEvaluationReadiness(model([{...row,sourceRows:[],assessment:null,conclusion:null}])).ready,false);
 assert.throws(()=>batchTasks(model([{...row,conclusion:null}]),'family'),/Termina la evaluación/);
});
test('competencia sin observaciones no fuerza nota ni bloquea informes del resto',()=>{
 const absent={...row,sourceRows:[],assessment:null,conclusion:null};
 assert.equal(familyEvaluationReadiness(model([row,absent])).ready,true);
 assert.equal(familyEvaluationReadiness(model([row,{...absent,draft:{id:'started'}}])).ready,false);
});
